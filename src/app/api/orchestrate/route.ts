import { google } from '@ai-sdk/google';
import { generateText, tool, stepCountIs } from 'ai';
import { z } from 'zod';
import { createAdminClient, createServerSupabaseClient } from '@/lib/supabase-server';
import { getShippingETA } from '@/lib/google-maps';
import { linguisticAgent } from '@/lib/agents/linguistic';
import { discoveryAgent } from '@/lib/agents/discovery';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const startTime = Date.now();

  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    const adminClient = createAdminClient();

    const { userInput, sessionId, userLocation = "33.6844, 73.0479" } = await req.json();

    if (!userInput || !sessionId) {
      return Response.json({ error: 'Missing required fields: userInput, sessionId' }, { status: 400 });
    }

    // PHASE 1: Delegate to Linguistic Agent
    const linguisticAnalysis = await linguisticAgent(userInput);
    
    await adminClient.from('agent_traces').insert({
      session_id: sessionId,
      step_type: 'linguistic_analysis',
      agent_name: 'Linguistic Agent',
      payload: linguisticAnalysis,
      user_id: user?.id || null
    });

    // PHASE 2: Supervisor & Logistics Coordination
    const result = await generateText({
      model: google('gemini-3-flash-preview'),
      system: `You are the MAIN SUPERVISOR AGENT.
      
      The LINGUISTIC AGENT has already analyzed the request:
      - Intent: ${linguisticAnalysis.intent}
      - Service: ${linguisticAnalysis.serviceType}
      - Location Mentioned: ${linguisticAnalysis.locationName}
      
      Your goal is to coordinate LOGISTICS and DISCOVERY to find the best provider.
      
      RULES:
      1. If a location was mentioned, geocode it first.
      2. Call 'find_providers' for ${linguisticAnalysis.serviceType}.
      3. Use LOGISTICS to rank providers by travel time.
      4. Book the best match.`,
      prompt: `Original User Input: ${userInput}`,
      tools: {
        geocode_location: tool({
          description: 'LOGISTICS AGENT: Convert address to coordinates.',
          inputSchema: z.object({
            address: z.string(),
          }),
          execute: async ({ address }) => {
            const apiKey = process.env.GOOGLE_MAPS_API_KEY;
            const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`;
            const resp = await fetch(url);
            const data = await resp.json();
            if (data.status === 'OK') {
              const loc = data.results[0].geometry.location;
              return `${loc.lat}, ${loc.lng}`;
            }
            return null;
          },
        }),
        find_providers: tool({
          description: 'DISCOVERY AGENT: Search database for matching providers near the user.',
          inputSchema: z.object({
            serviceType: z.string(),
            location: z.string().describe('The lat,lng coordinates of the user.'),
          }),
          execute: async ({ serviceType, location }) => {
            const [lat, lng] = location.split(',').map(Number);
            return await discoveryAgent(serviceType, lat, lng);
          },
        }),
        calculate_travel: tool({
          description: 'LOGISTICS AGENT: Calculate real-time travel time.',
          inputSchema: z.object({
            providerLocation: z.string(),
            customerLocation: z.string().optional(),
          }),
          execute: async ({ providerLocation, customerLocation }) => {
            return await getShippingETA(providerLocation, customerLocation || userLocation);
          },
        }),
        book_provider: tool({
          description: 'TRANSACTION AGENT: Finalize the booking.',
          inputSchema: z.object({
            providerId: z.string().uuid(),
            providerName: z.string(),
            estimatedCost: z.number(),
          }),
          execute: async ({ providerId, providerName, estimatedCost }) => {
            const { data, error } = await adminClient
              .from('service_bookings')
              .insert({
                provider_id: providerId,
                customer_location: userLocation,
                scheduled_time: new Date().toISOString(),
                total_cost_pkr: estimatedCost,
                status: 'confirmed',
                user_id: user?.id || null
              })
              .select()
              .single();
            
            if (error) throw new Error(`Booking Error: ${error.message}`);
            return {
              status: 'success',
              confirmationCode: `BK-${Math.floor(Math.random() * 10000)}`,
              provider: providerName,
              message: `Booking confirmed for ${providerName}.`
            };
          },
        }),
      },
      stopWhen: stepCountIs(6),
    });

    const executedActions: string[] = [];

    // Log traces with Agent Attribution
    for (const step of result.steps) {
      const toolName = step.toolCalls?.[0]?.toolName || null;
      if (toolName) executedActions.push(toolName);

      const agentName = toolName === 'find_providers' ? 'Discovery Agent' : 
                        (toolName === 'geocode_location' || toolName === 'calculate_travel') ? 'Logistics Agent' : 
                        toolName === 'book_provider' ? 'Transaction Agent' : 'Supervisor';

      await adminClient.from('agent_traces').insert({
        session_id: sessionId,
        step_type: 'multi_agent_orchestration',
        agent_name: agentName,
        tool_name: toolName,
        payload: step,
        user_id: user?.id || null
      });
    }

    return Response.json({
      status: 'success',
      insight: result.text,
      actionChainExecuted: executedActions,
      targetLocation: (result.steps.find(s => s.toolCalls.some(tc => tc.toolName === 'geocode_location'))?.toolResults?.[0] as any)?.result || userLocation,
      providers: (result.steps.find(s => s.toolCalls.some(tc => tc.toolName === 'find_nearby_providers'))?.toolResults?.[0] as any)?.result || [],
      bookingDetails: (result.steps.find(s => s.toolCalls.some(tc => tc.toolName === 'book_service_provider'))?.toolResults?.[0] as any)?.result || null,
      metrics: {
        latencyMs: Date.now() - startTime,
        providerFound: executedActions.includes('find_nearby_providers'),
        bookingConfirmed: executedActions.includes('book_service_provider')
      },
      sessionId
    });

  } catch (error: any) {
    console.error('Service Orchestration Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
