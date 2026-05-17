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

    const { userInput, sessionId, userLocation = '33.6844, 73.0479' } = await req.json();

    if (!userInput || !sessionId) {
      return Response.json({ error: 'Missing required fields: userInput, sessionId' }, { status: 400 });
    }

    const stream = new ReadableStream({
      async start(controller) {
        const sendTrace = (step: string, msg: string) => {
          try {
            controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ type: 'trace', step, message: msg })}\n\n`));
          } catch (_e) { }
        };
        const sendResult = (data: unknown) => {
          try {
            controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ type: 'result', data })}\n\n`));
          } catch (_e) { }
        };
        const sendError = (msg: string) => {
          try {
            controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ type: 'error', error: msg })}\n\n`));
          } catch (_e) { }
        };

        // ── Closure-captured tool results (reliable regardless of SDK internals) ──
        let capturedTargetLocation: string = userLocation;
        let capturedProviders: unknown[] = [];
        let capturedRankingReasoning: string | null = null;
        let capturedBookingDetails: any = null;
        let capturedFollowUpDetails: any = null;

        try {
          sendTrace('linguistic', 'Linguistic Agent: Extracting intent...');
          const linguisticResult = await linguisticAgent(userInput);

          if (!linguisticResult.success || !linguisticResult.data) {
            sendError(linguisticResult.error || 'Linguistic agent failed');
            controller.close();
            return;
          }
          const linguisticAnalysis = linguisticResult.data;
          const displayLocation = linguisticAnalysis.locationName || userLocation;
          sendTrace('success', `Service: ${linguisticAnalysis.serviceType} | Location: ${displayLocation} | Urgency: ${linguisticAnalysis.urgency}`);

          await adminClient.from('agent_traces').insert({
            session_id: sessionId,
            step_type: 'linguistic_analysis',
            agent_name: 'Linguistic Agent',
            payload: linguisticAnalysis,
            user_id: user?.id || null,
          });

          const result = await generateText({
            model: openrouter('google/gemini-3.1-flash-lite-preview'),
            system: `You are the MAIN SUPERVISOR AGENT.

The LINGUISTIC AGENT has already analyzed the request:
- Intent: ${linguisticAnalysis.intent}
- Service: ${linguisticAnalysis.serviceType}
- Location Mentioned: ${linguisticAnalysis.locationName}
- Scheduled Time: ${linguisticAnalysis.scheduledTime || 'Now'}
- Priority: ${linguisticAnalysis.priority || 'balanced'}

Your goal is to coordinate LOGISTICS, DISCOVERY, RANKING, and TRANSACTION to find and book the best provider.

User priority: ${linguisticAnalysis.priority || 'balanced'}. 
When calling rank_providers, pass this priority so providers are ranked accordingly.

CRITICAL RULES (follow in exact order):
1. If a location was mentioned, call 'geocode_location' first to get coordinates. If no location, use: ${userLocation}.
2. Call 'find_providers' with those coordinates and service type '${linguisticAnalysis.serviceType}'.
3. Call 'rank_providers' with the providers 'data' array from step 2 and the priority '${linguisticAnalysis.priority || 'balanced'}'.
4. Call 'calculate_travel' using the best provider's 'location' field as providerLocation.
5. Call 'book_provider' — pass the provider's 'location' field as providerLocation (e.g. "24.9200, 67.0300"), the provider's 'id' as providerId, 'name' as providerName, the provider's 'hourly_rate_pkr' as estimatedCost, and the provider's 'hourly_rate_pkr' as pricePerHour.
6. After booking, ALWAYS call 'schedule_followup' with the bookingId.
7. FINAL STEP: After all tools have executed, provide a brief, professional summary in natural language (English) explaining that you've secured the booking and mention the provider name. This summary will be shown to the user as "Agent Reasoning".

CRITICAL RULE: If find_providers or rank_providers returns no providers or bestMatch is null, DO NOT call calculate_travel or book_provider. Instead, immediately finish and explain that no providers were found.`,
            prompt: `Original User Input: ${userInput}`,
            tools: {
              geocode_location: tool({
                description: 'LOGISTICS AGENT: Convert a place name or address to lat,lng coordinates.',
                inputSchema: z.object({ address: z.string() }),
                execute: async ({ address }) => {
                  sendTrace('logistics', `Logistics Agent: Geocoding "${address}"...`);
                  const res = await logisticsAgent(address);
                  if (res.success && res.location) {
                    capturedTargetLocation = res.location;
                    sendTrace('success', `Coordinates: ${res.location}`);
                    return res.location;
                  }
                  return null;
                },
              }),

              find_providers: tool({
                description: 'DISCOVERY AGENT: Search the database for matching service providers near given coordinates.',
                inputSchema: z.object({
                  serviceType: z.string(),
                  location: z.string().describe('lat,lng string of the target area'),
                }),
                execute: async ({ serviceType, location }) => {
                  sendTrace('discovery', 'Discovery Agent: Finding nearby providers...');
                  const [lat, lng] = location.split(',').map(Number);
                  const res = await discoveryAgent(serviceType, lat, lng);
                  capturedProviders = res.data || [];
                  sendTrace('success', `${res.data?.length || 0} providers found nearby`);
                  return res;
                },
              }),

              rank_providers: tool({
                description: 'RANKING AGENT: Score and rank providers. Returns the best match.',
                inputSchema: z.object({
                  priority: z.enum(['cheapest', 'fastest', 'nearest', 'balanced']).default('balanced'),
                  providers: z.array(z.object({
                    id: z.string(),
                    name: z.string(),
                    rating: z.number().nullable().optional(),
                    distanceKm: z.number(),
                    is_available: z.boolean(),
                    hourly_rate_pkr: z.number().nullable().optional(),
                  })),
                }),
                execute: async ({ providers, priority }) => {
                  sendTrace('ranking', `Ranking Agent: Scoring providers using priority: ${priority}...`);
                  
                  if (!providers || providers.length === 0) {
                    sendTrace('error', 'No providers available.');
                    return { rankedProviders: [], bestMatch: null, reasoning: 'No providers to rank.' };
                  }

                  const prices = providers.map(p => p.hourly_rate_pkr ?? 2000);
                  const distances = providers.map(p => p.distanceKm);
                  const min_price = Math.min(...prices);
                  const max_price = Math.max(...prices);
                  const min_dist = Math.min(...distances);
                  const max_dist = Math.max(...distances);

                  const scored = providers.map(p => {
                    const price = p.hourly_rate_pkr ?? 2000;
                    const distance = p.distanceKm;
                    const rating = p.rating ?? 4.5;

                    const price_score = max_price === min_price ? 10 : 10 - (((price - min_price) / (max_price - min_price)) * 10);
                    const distance_score = max_dist === min_dist ? 10 : 10 - (((distance - min_dist) / (max_dist - min_dist)) * 10);
                    const rating_score = (rating / 5) * 10;

                    let w_price = 0.33, w_distance = 0.34, w_rating = 0.33;
                    if (priority === 'cheapest') {
                      w_price = 0.60; w_distance = 0.25; w_rating = 0.15;
                    } else if (priority === 'fastest') {
                      w_distance = 0.60; w_rating = 0.25; w_price = 0.15;
                    } else if (priority === 'nearest') {
                      w_distance = 0.70; w_rating = 0.20; w_price = 0.10;
                    }

                    const totalScore = parseFloat(((price_score * w_price) + (distance_score * w_distance) + (rating_score * w_rating)).toFixed(2));
                    return { ...p, totalScore };
                  });

                  const ranked = scored.sort((a, b) => b.totalScore - a.totalScore);
                  const best = ranked[0];

                  if (!best) {
                    sendTrace('error', 'No providers available.');
                    return { rankedProviders: [], bestMatch: null, reasoning: 'No providers to rank.' };
                  }

                  const bestPrice = best.hourly_rate_pkr ?? 2000;
                  const bestDist = best.distanceKm;
                  const bestRating = best.rating ?? 4.5;

                  const reasoning = `Selected as ${priority} option — PKR ${bestPrice}/hr, ${bestDist.toFixed(1)}km away, ${bestRating}★`;

                  capturedRankingReasoning = reasoning;
                  sendTrace('success', `Top pick: ${best.name} — PKR ${bestPrice}/hr, ${bestDist.toFixed(1)}km, ${bestRating}★`);
                  return { rankedProviders: ranked, bestMatch: best, reasoning };
                },
              }),

              calculate_travel: tool({
                description: 'LOGISTICS AGENT: Calculate real-time driving ETA between provider and customer.',
                inputSchema: z.object({
                  providerLocation: z.string(),
                  customerLocation: z.string().optional(),
                }),
                execute: async ({ providerLocation, customerLocation }) => {
                  sendTrace('logistics', 'Logistics Agent: Calculating ETA...');
                  const res = await calculateTravelAgent(providerLocation, customerLocation || userLocation);
                  if (res.success) {
                    sendTrace('success', `ETA: ${res.eta}`);
                    return res.eta;
                  }
                  throw new Error(res.error);
                },
              }),

              book_provider: tool({
                description: 'TRANSACTION AGENT: Finalize the booking in the database.',
                inputSchema: z.object({
                  providerId: z.string().uuid(),
                  providerName: z.string(),
                  providerLocation: z.string().describe('The exact lat,lng string of the provider from the find_providers result (e.g. "24.9200, 67.0300")'),
                  estimatedCost: z.number(),
                  pricePerHour: z.number().optional(),
                }),
                execute: async ({ providerId, providerName, providerLocation, estimatedCost, pricePerHour }) => {
                  sendTrace('transaction', 'Transaction Agent: Booking slot...');
                  console.log(`[BOOK_PROVIDER] providerLocation="${providerLocation}" name="${providerName}"`);

                  const res = await transactionAgent(
                    providerId,
                    providerName,
                    estimatedCost,
                    userLocation,
                    linguisticAnalysis.serviceType,
                    linguisticAnalysis.scheduledTime,
                    user?.id || null,
                  );

                  if (res.success) {
                    capturedBookingDetails = {
                      confirmationCode: res.confirmationCode,
                      provider: res.provider,
                      providerName,
                      providerLocation,          // ← DB coordinates for the map pin
                      bookingId: res.bookingId,
                      scheduledTime: res.scheduledTime,
                      message: res.message,
                      status: res.status,
                      pricePerHour: pricePerHour || estimatedCost,
                    };
                    console.log('[BOOK_PROVIDER] Captured:', JSON.stringify(capturedBookingDetails));
                    sendTrace('success', `Confirmed: ${String(res.bookingId).slice(0, 8)} | ${linguisticAnalysis.scheduledTime || 'ASAP'}`);
                    return capturedBookingDetails;
                  }
                  throw new Error(res.error);
                },
              }),

              schedule_followup: tool({
                description: 'FOLLOW-UP AGENT: Schedule a reminder 1 hour before the appointment.',
                inputSchema: z.object({
                  bookingId: z.string().uuid(),
                  scheduledTime: z.string().describe('ISO timestamp of the appointment'),
                  providerName: z.string(),
                }),
                execute: async ({ bookingId, scheduledTime, providerName }) => {
                  sendTrace('followup', 'Follow-up Agent: Scheduling reminder...');
                  const res = await followupAgent(bookingId, scheduledTime, providerName);
                  if (res.success) {
                    capturedFollowUpDetails = res as Record<string, unknown>;
                    sendTrace('success', `Reminder set for ${new Date(scheduledTime).toLocaleTimeString()}`);
                    return res;
                  }
                  throw new Error(res.error);
                },
              }),
            },
            stopWhen: stepCountIs(8),
          });

          // ── Build action chain from steps ────────────────────────────────────
          const executedActions: string[] = [];
          for (const step of result.steps) {
            const toolName = step.toolCalls?.[0]?.toolName || null;
            if (toolName) executedActions.push(toolName);

            const agentName =
              toolName === 'find_providers' ? 'Discovery Agent' :
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
              user_id: user?.id || null,
            });
          }

          // ── Send final result (all data from closures — no SDK parsing needed) ─
          sendResult({
            status: 'success',
            insight: result.text?.trim() || `I have successfully coordinated the ${executedActions.length} steps required to book your ${linguisticAnalysis.serviceType} service. Your provider, ${capturedBookingDetails ? (capturedBookingDetails as any).providerName : 'the specialist'}, is confirmed.`,
            actionChainExecuted: executedActions,
            targetLocation: capturedTargetLocation,
            userLocation,
            providers: capturedProviders,
            rankingReasoning: capturedRankingReasoning,
            bookingDetails: capturedBookingDetails,
            followUpDetails: capturedFollowUpDetails,
            scheduledTime: linguisticAnalysis.scheduledTime,
            metrics: {
              latencyMs: Date.now() - startTime,
              providerFound: executedActions.includes('find_providers'),
              bookingConfirmed: executedActions.includes('book_provider'),
            },
            sessionId,
          });

          controller.close();
        } catch (err: unknown) {
          sendError(err instanceof Error ? err.message : String(err));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error: unknown) {
    console.error('Service Orchestration Error:', error);
    return Response.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}