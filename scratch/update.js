const fs = require('fs');
const path = require('path');

const routePath = path.join(__dirname, '../src/app/api/orchestrate/route.ts');
const pagePath = path.join(__dirname, '../src/app/page.tsx');

let routeContent = fs.readFileSync(routePath, 'utf8');

const newRoutePost = `export async function POST(req: Request) {
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
        const sendTrace = (msg: string) => {
          try {
            controller.enqueue(new TextEncoder().encode(\`data: \${JSON.stringify({ type: 'trace', message: msg })}\\n\\n\`));
          } catch (e) {}
        };
        const sendResult = (data: any) => {
          try {
            controller.enqueue(new TextEncoder().encode(\`data: \${JSON.stringify({ type: 'result', data })}\\n\\n\`));
          } catch (e) {}
        };
        const sendError = (msg: string) => {
          try {
            controller.enqueue(new TextEncoder().encode(\`data: \${JSON.stringify({ type: 'error', error: msg })}\\n\\n\`));
          } catch (e) {}
        };

        try {
          sendTrace('🔍 Linguistic Agent: Extracting intent...');
          const linguisticResult = await linguisticAgent(userInput);
          
          if (!linguisticResult.success || !linguisticResult.data) {
            sendError(linguisticResult.error || 'Linguistic agent failed');
            controller.close();
            return;
          }
          const linguisticAnalysis = linguisticResult.data;
          
          sendTrace(\`✅ Service: \${linguisticAnalysis.serviceType} | Location: \${linguisticAnalysis.locationName || 'None'} | Urgency: \${linguisticAnalysis.urgency}\`);

          await adminClient.from('agent_traces').insert({
            session_id: sessionId,
            step_type: 'linguistic_analysis',
            agent_name: 'Linguistic Agent',
            payload: linguisticAnalysis,
            user_id: user?.id || null
          });

          const result = await generateText({
            model: openrouter('google/gemini-3.1-flash-lite-preview'),
            system: \`You are the MAIN SUPERVISOR AGENT.
            
            The LINGUISTIC AGENT has already analyzed the request:
            - Intent: \${linguisticAnalysis.intent}
            - Service: \${linguisticAnalysis.serviceType}
            - Location Mentioned: \${linguisticAnalysis.locationName}
            - Scheduled Time: \${linguisticAnalysis.scheduledTime || 'Now'}
            
            Your goal is to coordinate LOGISTICS, DISCOVERY, RANKING, and TRANSACTION to find and book the best provider.
            
            RULES:
            1. If a location was mentioned, geocode it first.
            2. Call 'find_providers' for \${linguisticAnalysis.serviceType}.
            3. Call 'rank_providers' with the results.
            4. Use 'calculate_travel' on the best match only.
            5. Call 'book_provider' to finalize the booking.
            6. After booking, ALWAYS call 'schedule_followup' to schedule a reminder.\`,
            prompt: \`Original User Input: \${userInput}\`,
            tools: {
              geocode_location: tool({
                description: 'LOGISTICS AGENT: Convert address to coordinates.',
                inputSchema: z.object({
                  address: z.string(),
                }),
                execute: async ({ address }) => {
                  sendTrace(\`📍 Logistics Agent: Geocoding \${address}...\`);
                  const res = await logisticsAgent(address);
                  if (res.success) {
                    sendTrace(\`✅ Coordinates: \${res.location}\`);
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
                  sendTrace(\`🔎 Discovery Agent: Finding nearby providers...\`);
                  const [lat, lng] = location.split(',').map(Number);
                  const res = await discoveryAgent(serviceType, lat, lng);
                  sendTrace(\`✅ \${res.length} providers found nearby\`);
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
                  sendTrace(\`⚖️ Ranking by ETA + rating...\`);
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
                     sendTrace(\`❌ No providers available.\`);
                     return { rankedProviders: [], bestMatch: null, reasoning: 'No providers to rank.' };
                  }

                  const reasoning = \`\${best.name} selected as best match with a composite score of \${best.totalScore}/10. \` +
                    \`Key factors: \${best.distanceKm.toFixed(1)}km away (proximity score: \${(Math.max(0,10-best.distanceKm)*0.4).toFixed(1)}), \` +
                    \`\${best.rating || 4.5}⭐ rating (rating score: \${(((best.rating || 4.5)/5)*10*0.4).toFixed(1)}), \` +
                    \`availability: \${best.is_available ? 'confirmed ✓' : 'unavailable ✗'}.\`;

                  sendTrace(\`✅ Top pick: \${best.name} — \${best.distanceKm.toFixed(1)}km, \${best.rating || 4.5}★\`);
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
                  sendTrace(\`📍 Logistics Agent: Calculating ETA...\`);
                  const res = await calculateTravelAgent(providerLocation, customerLocation || userLocation);
                  if (res.success) {
                    sendTrace(\`✅ ETA: \${res.eta}\`);
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
                  sendTrace(\`📋 Transaction Agent: Booking slot...\`);
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
                    sendTrace(\`✅ Confirmed: \${res.data?.id?.slice(0, 8) || 'BK-' + Math.floor(Math.random()*10000)} | \${linguisticAnalysis.scheduledTime || 'ASAP'}\`);
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
                  sendTrace(\`🔔 Follow-up Agent: Scheduling reminder...\`);
                  const res = await followupAgent(bookingId, scheduledTime, providerName);
                  if (res.success) {
                    sendTrace(\`✅ Reminder set for \${new Date(scheduledTime).toLocaleTimeString()}\`);
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
}`;

routeContent = routeContent.replace(/export async function POST\(req: Request\) \{[\s\S]*$/, newRoutePost);
fs.writeFileSync(routePath, routeContent);


let pageContent = fs.readFileSync(pagePath, 'utf8');

// Add traces state
pageContent = pageContent.replace(
  "const [error, setError] = useState<string | null>(null);",
  "const [error, setError] = useState<string | null>(null);\n  const [traces, setTraces] = useState<string[]>([]);"
);

// Update handleRunAgent
const oldHandleRunAgent = `const handleRunAgent = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!userInput.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/orchestrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: crypto.randomUUID(),
          userInput: userInput,
          userLocation: userLocation
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to run agent');
      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };`;

const newHandleRunAgent = `const handleRunAgent = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!userInput.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);
    setTraces([]);

    try {
      const response = await fetch('/api/orchestrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: crypto.randomUUID(),
          userInput: userInput,
          userLocation: userLocation
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to run agent');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let buffer = '';

      while (!done && reader) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        if (value) {
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\\n\\n');
          buffer = lines.pop() || '';
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = JSON.parse(line.slice(6));
              if (data.type === 'trace') {
                setTraces(prev => [...prev, data.message]);
              } else if (data.type === 'result') {
                setResult(data.data);
                setLoading(false);
              } else if (data.type === 'error') {
                throw new Error(data.error);
              }
            }
          }
        }
      }
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };`;

pageContent = pageContent.replace(oldHandleRunAgent, newHandleRunAgent);

// Replace the Loading State UI
const oldLoadingState = `{/* Loading State */}
              <AnimatePresence>
                {loading && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex-1 flex flex-col items-center justify-center space-y-8"
                  >
                    <div className="relative w-24 h-24">
                      <div className="absolute inset-0 border-[3px] border-accent/10 rounded-full"></div>
                      <div className="absolute inset-0 border-[3px] border-accent rounded-full border-t-transparent animate-spin-slow"></div>
                      <div className="absolute inset-4 border border-accent/20 rounded-full animate-pulse"></div>
                    </div>
                    <p className="text-accent/80 animate-pulse font-serif italic text-lg tracking-wider">Orchestrating logistics...</p>
                  </motion.div>
                )}
              </AnimatePresence>`;

const newLoadingState = `{/* Loading State & Traces */}
              <AnimatePresence>
                {loading && traces.length === 0 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex-1 flex flex-col items-center justify-center space-y-8"
                  >
                    <div className="relative w-24 h-24">
                      <div className="absolute inset-0 border-[3px] border-accent/10 rounded-full"></div>
                      <div className="absolute inset-0 border-[3px] border-accent rounded-full border-t-transparent animate-spin-slow"></div>
                      <div className="absolute inset-4 border border-accent/20 rounded-full animate-pulse"></div>
                    </div>
                    <p className="text-accent/80 animate-pulse font-serif italic text-lg tracking-wider">Orchestrating logistics...</p>
                  </motion.div>
                )}
                {loading && traces.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex-1 flex flex-col justify-center max-w-lg mx-auto w-full space-y-3 pb-20"
                  >
                    {traces.map((trace, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={\`p-3 rounded-xl text-sm font-medium \${trace.startsWith('✅') ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : trace.startsWith('❌') ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-white/5 text-stone-300 border border-white/10'}\`}
                      >
                        {trace}
                      </motion.div>
                    ))}
                    <div className="flex items-center gap-3 text-stone-500 text-xs uppercase tracking-widest mt-4 ml-2">
                       <span className="relative flex h-2 w-2">
                         <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
                         <span className="relative inline-flex rounded-full h-2 w-2 bg-accent"></span>
                       </span>
                       Agentic workflow in progress...
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>`;

pageContent = pageContent.replace(oldLoadingState, newLoadingState);

fs.writeFileSync(pagePath, pageContent);
console.log('Update successful!');
