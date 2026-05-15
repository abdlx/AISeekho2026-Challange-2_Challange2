import { google } from '@ai-sdk/google';
import { generateText, tool, stepCountIs } from 'ai';
import { z } from 'zod';
import { createAdminClient, createServerSupabaseClient } from '@/lib/supabase-server';
import { getShippingETA } from '@/lib/google-maps';

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

    const result = await generateText({
      model: google('gemini-2.5-flash'),
      system: `You are an AI Service Orchestrator for the Informal Economy.
      
      Your goal is to handle user service requests (plumbers, AC technicians, etc.), find the best providers near them, and automate the booking process.
      
      CRITICAL RULES:
      1. Intent Extraction: Support Urdu, Roman Urdu, and English. Extract the Service Type, Location, and Time. 
      2. Location Priority: If the user specifies a location in their request (e.g. "Nazimabad", "G-13"), you MUST use 'geocode_location' to get coordinates. This takes absolute priority over the 'User Current Location (GPS)'.
      3. Provider Discovery: Use 'find_nearby_providers' to get a list of technicians.
      4. Logistics & Ranking: Use 'calculate_travel_logistics' with the geocoded location.
      5. Simulation: Once a provider is selected, use 'book_service_provider'.
      6. Reasoning: Always explain why you chose a specific provider and confirm the location you used.
      
      Current Context:
      Session ID: ${sessionId}
      User Current Location (GPS): ${userLocation}
      `,
      prompt: userInput,
      tools: {
        geocode_location: tool({
          description: 'Convert a place name or address into lat,lng coordinates.',
          inputSchema: z.object({
            address: z.string().describe('The name of the place or address to geocode'),
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
        find_nearby_providers: tool({
          description: 'Search the database for service providers matching a specific type.',
          inputSchema: z.object({
            serviceType: z.string().describe('The type of service needed (e.g., AC Technician, Plumber)'),
          }),
          execute: async ({ serviceType }) => {
            const { data, error } = await adminClient
              .from('service_providers')
              .select('*')
              .ilike('service_type', `%${serviceType}%`)
              .eq('is_available', true);
            
            if (error) throw new Error(`Provider Search Error: ${error.message}`);
            return data;
          },
        }),
        calculate_travel_logistics: tool({
          description: 'Calculate real-time travel time and distance between the user and a provider.',
          inputSchema: z.object({
            providerId: z.string().uuid(),
            providerLocation: z.string().describe('The lat,lng of the provider'),
            customerLocation: z.string().optional().describe('The lat,lng of the user. Use the geocoded location if the user specified one in text, otherwise use the GPS location.'),
          }),
          execute: async ({ providerLocation, customerLocation }) => {
            return await getShippingETA(providerLocation, customerLocation || userLocation);
          },
        }),
        book_service_provider: tool({
          description: 'Simulate booking a service provider and generating a confirmation.',
          inputSchema: z.object({
            providerId: z.string().uuid(),
            providerName: z.string(),
            scheduledTime: z.string().describe('ISO timestamp or relative time'),
            estimatedCost: z.number(),
          }),
          execute: async ({ providerId, providerName, scheduledTime, estimatedCost }) => {
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
              message: `Booking confirmed for ${scheduledTime}. ${providerName} is on the way.`
            };
          },
        }),
      },
      stopWhen: stepCountIs(6),
    });

    const executedActions: string[] = [];

    // Log traces for Challenge requirement
    for (const step of result.steps) {
      const toolName = step.toolCalls?.[0]?.toolName || null;
      if (toolName) executedActions.push(toolName);

      await adminClient.from('agent_traces').insert({
        session_id: sessionId,
        step_type: 'service_orchestration',
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
