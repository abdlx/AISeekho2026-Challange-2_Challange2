import { createOpenRouter } from '@openrouter/ai-sdk-provider';

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});
import { generateText, tool, stepCountIs } from 'ai';
import { z } from 'zod';
import { createAdminClient, createServerSupabaseClient } from '@/lib/supabase-server';
import { linguisticAgent } from '@/lib/agents/linguistic';
import { discoveryAgent } from '@/lib/agents/discovery';
import { logisticsAgent, calculateTravelAgent } from '@/lib/agents/logistics';
import { transactionAgent } from '@/lib/agents/transaction';
import { followupAgent } from '@/lib/agents/followup';

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

    const stream = new ReadableStream({
      async start(controller) {
        const sendTrace = (step: string, msg: string) => {
          try {
            controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ type: 'trace', step, message: msg })}\n\n`));
          } catch (e) { }
        };
        const sendResult = (data: any) => {
          try {
            controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ type: 'result', data })}\n\n`));
          } catch (e) { }
        };
        const sendError = (msg: string) => {
          try {
            controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ type: 'error', error: msg })}\n\n`));
          } catch (e) { }
        };

        try {
          sendTrace('linguistic', 'Linguistic Agent: Extracting intent...');
          const linguisticResult = await linguisticAgent(userInput);

          if (!linguisticResult.success || !linguisticResult.data) {
            sendError(linguisticResult.error || 'Linguistic agent failed');
            controller.close();
            return;
          }
          const linguisticAnalysis = linguisticResult.data;

          sendTrace('success', `Service: ${linguisticAnalysis.serviceType} | Location: ${linguisticAnalysis.locationName || 'None'} | Urgency: ${linguisticAnalysis.urgency}`);

          await adminClient.from('agent_traces').insert({
            session_id: sessionId,
            step_type: 'linguistic_analysis',
            agent_name: 'Linguistic Agent',
            payload: linguisticAnalysis,
            user_id: user?.id || null
          });

          const result = await generateText({
            model: openrouter('google/gemini-3.1-flash-lite-preview'),
            system: `You are the MAIN SUPERVISOR AGENT.
            
            The LINGUISTIC AGENT has already analyzed the request:
            - Intent: ${linguisticAnalysis.intent}
            - Service: ${linguisticAnalysis.serviceType}
            - Location Mentioned: ${linguisticAnalysis.locationName}
            - Scheduled Time: ${linguisticAnalysis.scheduledTime || 'Now'}
            
            Your goal is to coordinate LOGISTICS, DISCOVERY, RANKING, and TRANSACTION to find and book the best provider.
            
            RULES:
            1. If a location was mentioned, geocode it first.
            2. Call 'find_providers' for ${linguisticAnalysis.serviceType}.
            3. Call 'rank_providers' with the results.
            4. Use 'calculate_travel' on the best match only.
            5. Call 'book_provider' to finalize the booking.
            6. After booking, ALWAYS call 'schedule_followup' to schedule a reminder.`,
            prompt: `Original User Input: ${userInput}`,
            tools: {
              geocode_location: tool({
                description: 'LOGISTICS AGENT: Convert address to coordinates.',
                inputSchema: z.object({
                  address: z.string(),
                }),
                execute: async ({ address }) => {
                  sendTrace('logistics', `Logistics Agent: Geocoding ${address}...`);
                  const res = await logisticsAgent(address);
                  if (res.success) {
                    sendTrace('success', `Coordinates: ${res.location}`);
                    return res.location;
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
                  sendTrace('discovery', `Discovery Agent: Finding nearby providers...`);
                  const [lat, lng] = location.split(',').map(Number);
                  const res = await discoveryAgent(serviceType, lat, lng);
                  sendTrace('success', `${res.data?.length || 0} providers found nearby`);
                  return res;
                },
              }),
              rank_providers: tool({
                description: 'RANKING AGENT: Scores and ranks a list of providers by distance, availability, and rating. Returns the best match with explicit reasoning.',
                inputSchema: z.object({
                  providers: z.array(z.object({
                    id: z.string(),
                    name: z.string(),
                    rating: z.number().nullable().optional(),
                    distanceKm: z.number(),
                    is_available: z.boolean(),
                  })),
                }),
                execute: async ({ providers }) => {
                  sendTrace('ranking', `Ranking by ETA + rating...`);
                  const scored = providers.map(p => {
                    const distanceScore = Math.max(0, 10 - p.distanceKm) * 0.4;
                    const ratingScore = ((p.rating || 4.5) / 5) * 10 * 0.4;
                    const availabilityScore = p.is_available ? 10 * 0.2 : 0;
                    const totalScore = distanceScore + ratingScore + availabilityScore;
                    return { ...p, totalScore: parseFloat(totalScore.toFixed(2)) };
                  });

                  const ranked = scored.sort((a, b) => b.totalScore - a.totalScore);
                  const best = ranked[0];

                  if (!best) {
                    sendTrace('error', 'No providers available.');
                    return { rankedProviders: [], bestMatch: null, reasoning: 'No providers to rank.' };
                  }

                  const reasoning = `${best.name} selected as best match with a composite score of ${best.totalScore}/10. ` +
                    `Key factors: ${best.distanceKm.toFixed(1)}km away (proximity score: ${(Math.max(0, 10 - best.distanceKm) * 0.4).toFixed(1)}), ` +
                    `${best.rating || 4.5}⭐ rating (rating score: ${(((best.rating || 4.5) / 5) * 10 * 0.4).toFixed(1)}), ` +
                    `availability: ${best.is_available ? 'confirmed ✓' : 'unavailable ✗'}.`;

                  sendTrace('success', `Top pick: ${best.name} — ${best.distanceKm.toFixed(1)}km, ${best.rating || 4.5}★`);
                  return { rankedProviders: ranked, bestMatch: best, reasoning };
                },
              }),
              calculate_travel: tool({
                description: 'LOGISTICS AGENT: Calculate real-time travel time.',
                inputSchema: z.object({
                  providerLocation: z.string(),
                  customerLocation: z.string().optional(),
                }),
                execute: async ({ providerLocation, customerLocation }) => {
                  sendTrace('logistics', `Logistics Agent: Calculating ETA...`);
                  const res = await calculateTravelAgent(providerLocation, customerLocation || userLocation);
                  if (res.success) {
                    sendTrace('success', `ETA: ${res.eta}`);
                    return res.eta;
                  }
                  throw new Error(res.error);
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
                  sendTrace('transaction', `Transaction Agent: Booking slot...`);
                  const res = await transactionAgent(
                    providerId,
                    providerName,
                    estimatedCost,
                    userLocation,
                    linguisticAnalysis.serviceType,
                    linguisticAnalysis.scheduledTime,
                    user?.id || null
                  );
                  if (res.success) {
                    sendTrace('success', `Confirmed: ${res.bookingId?.slice(0, 8) || 'BK-' + Math.floor(Math.random() * 10000)} | ${linguisticAnalysis.scheduledTime || 'ASAP'}`);
                    return res;
                  }
                  throw new Error(res.error);
                },
              }),
              schedule_followup: tool({
                description: 'FOLLOW-UP AGENT: Schedules a reminder 1 hour before the appointment. Writes to database.',
                inputSchema: z.object({
                  bookingId: z.string().uuid(),
                  scheduledTime: z.string().describe('ISO timestamp of the appointment'),
                  providerName: z.string(),
                }),
                execute: async ({ bookingId, scheduledTime, providerName }) => {
                  sendTrace('followup', `Follow-up Agent: Scheduling reminder...`);
                  const res = await followupAgent(bookingId, scheduledTime, providerName);
                  if (res.success) {
                    sendTrace('success', `Reminder set for ${new Date(scheduledTime).toLocaleTimeString()}`);
                    return res;
                  }
                  throw new Error(res.error);
                },
              }),
            },
            stopWhen: stepCountIs(8),
          });

          const executedActions: string[] = [];

          for (const step of result.steps) {
            const toolName = step.toolCalls?.[0]?.toolName || null;
            if (toolName) executedActions.push(toolName);

            const agentName = toolName === 'find_providers' ? 'Discovery Agent' :
              (toolName === 'geocode_location' || toolName === 'calculate_travel') ? 'Logistics Agent' :
                toolName === 'rank_providers' ? 'Ranking Agent' :
                  toolName === 'book_provider' ? 'Transaction Agent' :
                    toolName === 'schedule_followup' ? 'Follow-up Agent' : 'Supervisor';

            await adminClient.from('agent_traces').insert({
              session_id: sessionId,
              step_type: 'multi_agent_orchestration',
              agent_name: agentName,
              tool_name: toolName,
              payload: step,
              user_id: user?.id || null
            });
          }

          sendResult({
            status: 'success',
            insight: result.text,
            actionChainExecuted: executedActions,
            targetLocation: (result.steps.find(s => s.toolCalls.some(tc => tc.toolName === 'geocode_location'))?.toolResults?.[0] as any)?.result || userLocation,
            providers: (result.steps.find(s => s.toolCalls.some(tc => tc.toolName === 'find_providers'))?.toolResults?.[0] as any)?.result || [],
            rankingReasoning: (result.steps.find(s => s.toolCalls.some(tc => tc.toolName === 'rank_providers'))?.toolResults?.[0] as any)?.result?.reasoning || null,
            bookingDetails: (result.steps.find(s => s.toolCalls.some(tc => tc.toolName === 'book_provider'))?.toolResults?.[0] as any)?.result || null,
            followUpDetails: (result.steps.find(s => s.toolCalls.some(tc => tc.toolName === 'schedule_followup'))?.toolResults?.[0] as any)?.result || null,
            scheduledTime: linguisticAnalysis.scheduledTime,
            metrics: {
              latencyMs: Date.now() - startTime,
              providerFound: executedActions.includes('find_providers'),
              bookingConfirmed: executedActions.includes('book_provider')
            },
            sessionId
          });

          controller.close();
        } catch (err: any) {
          sendError(err.message);
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error: any) {
    console.error('Service Orchestration Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}