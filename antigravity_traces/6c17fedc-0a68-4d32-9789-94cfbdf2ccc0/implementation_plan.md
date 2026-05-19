# Implementation Plan: Close All Challenge 2 Gaps

## Background

A deep audit of the codebase against `challenge.md` identified **6 gaps** — 2 critical missing agents and 4 hidden bugs. This plan closes them in priority order to maximize evaluation score and ensure a working demo video.

> [!IMPORTANT]
> Fix order matters. Gaps 3–5 are **bugs that break existing functionality** and should be fixed first. Gaps 1, 2, and 6 are **feature additions** that build on top of a working foundation.

---

## Phase 1 — Schema Fixes (No Code, Just SQL)

These are silent bugs that will cause runtime crashes or empty UI. Fix these in Supabase dashboard SQL editor before touching any TypeScript.

---

### Fix A — Add Missing Columns to `agent_traces`

#### [MODIFY] `service_orchestrator_schema.sql`

The `agent_traces` table is missing the `agent_name` column that the orchestration route already tries to insert. Add it:

```sql
ALTER TABLE agent_traces ADD COLUMN IF NOT EXISTS agent_name TEXT;
ALTER TABLE agent_traces ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
```

---

### Fix B — Add Missing `user_id` to `service_bookings`

#### [MODIFY] `service_orchestrator_schema.sql`

The `book_provider` tool inserts `user_id` but the table doesn't have that column:

```sql
ALTER TABLE service_bookings ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE service_bookings ADD COLUMN IF NOT EXISTS service_type TEXT;
```

---

### Fix C — Create `service_followups` Table

#### [MODIFY] `service_orchestrator_schema.sql`

New table needed for the Follow-up Agent (Gap 2):

```sql
CREATE TABLE IF NOT EXISTS service_followups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID REFERENCES service_bookings(id) ON DELETE CASCADE,
    reminder_time TIMESTAMP NOT NULL,
    status TEXT DEFAULT 'scheduled', -- 'scheduled', 'sent', 'cancelled'
    message TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
```

---

## Phase 2 — Bug Fixes in Existing Code

---

### Fix D — Correct Tool Name Mismatches in API Response

#### [MODIFY] `src/app/api/orchestrate/route.ts` (Lines 148–161)

**Root cause:** The response builder references tool names that don't match the registered tool names. This causes `providers`, `bookingDetails`, and all metrics to always be empty/false.

**Current (broken):**
```typescript
providers: result.steps.find(s => s.toolCalls.some(tc => tc.toolName === 'find_nearby_providers'))
bookingDetails: result.steps.find(s => s.toolCalls.some(tc => tc.toolName === 'book_service_provider'))
providerFound: executedActions.includes('find_nearby_providers'),
bookingConfirmed: executedActions.includes('book_service_provider')
```

**Fix (correct tool names):**
```typescript
providers: result.steps.find(s => s.toolCalls.some(tc => tc.toolName === 'find_providers'))
bookingDetails: result.steps.find(s => s.toolCalls.some(tc => tc.toolName === 'book_provider'))
providerFound: executedActions.includes('find_providers'),
bookingConfirmed: executedActions.includes('book_provider')
```

---

## Phase 3 — Feature: Linguistic Agent Time Extraction (Gap 6)

---

### [MODIFY] `src/lib/agents/linguistic.ts`

Add a `scheduledTime` field to the Zod schema so the agent parses time references like "kal subah" (tomorrow morning), "abhi" (now), "3 baje" (at 3 o'clock):

```typescript
schema: z.object({
  intent: z.string(),
  serviceType: z.string(),
  locationName: z.string().nullable(),
  urgency: z.enum(['low', 'medium', 'high', 'emergency']),
  scheduledTime: z.string().nullable().describe('Requested time/date in ISO format or natural language (e.g. "tomorrow morning", "2026-05-16T09:00"). Null if not mentioned.'),
}),
```

Update the Supervisor's system prompt to pass `scheduledTime` to the `book_provider` tool instead of always using `new Date()`.

---

## Phase 4 — Feature: Ranking Agent (Gap 1, 20% of eval score)

This is the most impactful feature addition.

---

### [MODIFY] `src/app/api/orchestrate/route.ts`

Add a new `rank_providers` tool to the orchestration pipeline. The Supervisor should call this **after** `find_providers` and **before** `calculate_travel`.

**Tool definition:**
```typescript
rank_providers: tool({
  description: 'RANKING AGENT: Scores and ranks a list of providers by distance, availability, and rating. Returns the best match with explicit reasoning.',
  inputSchema: z.object({
    providers: z.array(z.object({
      id: z.string(),
      name: z.string(),
      rating: z.number(),
      distanceKm: z.number(),
      is_available: z.boolean(),
    })),
  }),
  execute: async ({ providers }) => {
    const scored = providers.map(p => {
      // Weighted scoring formula
      const distanceScore = Math.max(0, 10 - p.distanceKm) * 0.4;   // 40% weight
      const ratingScore = (p.rating / 5) * 10 * 0.4;               // 40% weight  
      const availabilityScore = p.is_available ? 10 * 0.2 : 0;     // 20% weight
      const totalScore = distanceScore + ratingScore + availabilityScore;
      return { ...p, totalScore: parseFloat(totalScore.toFixed(2)) };
    });

    const ranked = scored.sort((a, b) => b.totalScore - a.totalScore);
    const best = ranked[0];

    const reasoning = `${best.name} selected as best match with a composite score of ${best.totalScore}/10. ` +
      `Key factors: ${best.distanceKm.toFixed(1)}km away (proximity score: ${(Math.max(0,10-best.distanceKm)*0.4).toFixed(1)}), ` +
      `${best.rating}⭐ rating (rating score: ${((best.rating/5)*10*0.4).toFixed(1)}), ` +
      `availability: ${best.is_available ? 'confirmed ✓' : 'unavailable ✗'}.`;

    return { rankedProviders: ranked, bestMatch: best, reasoning };
  },
}),
```

**Update Supervisor system prompt** to include the step:
```
3. Call 'rank_providers' with the results.
4. Use 'calculate_travel' on the best match only.
5. Book the best match.
```

**Update API response** to include:
```typescript
rankingReasoning: result.steps.find(s => s.toolCalls.some(tc => tc.toolName === 'rank_providers'))?.toolResults?.[0]?.result?.reasoning || null,
```

---

### [MODIFY] `src/app/page.tsx`

Add a **Ranking Reasoning Card** to the result screen, directly above the "Agent Reasoning" card:

```tsx
{/* Ranking Decision Card */}
{result.rankingReasoning && (
  <div className="bg-white/5 backdrop-blur-3xl border border-accent/20 p-7 rounded-[2rem] shadow-2xl relative overflow-hidden">
    <div className="absolute top-0 left-0 w-1 h-full bg-emerald-400/60" />
    <h3 className="text-[10px] uppercase tracking-[0.2em] text-emerald-400 font-bold mb-4 flex items-center gap-2">
      <BarChart3 size={14} /> Ranking Decision
    </h3>
    <p className="text-stone-300 leading-relaxed text-sm">
      {result.rankingReasoning}
    </p>
  </div>
)}
```

---

## Phase 5 — Feature: Follow-up Agent (Gap 2, Demo requirement)

---

### [MODIFY] `src/app/api/orchestrate/route.ts`

Add a `schedule_followup` tool. The Supervisor calls this **after** a successful booking:

```typescript
schedule_followup: tool({
  description: 'FOLLOW-UP AGENT: Schedules a reminder 1 hour before the appointment. Writes to database.',
  inputSchema: z.object({
    bookingId: z.string().uuid(),
    scheduledTime: z.string().describe('ISO timestamp of the appointment'),
    providerName: z.string(),
  }),
  execute: async ({ bookingId, scheduledTime, providerName }) => {
    const appointmentTime = new Date(scheduledTime);
    const reminderTime = new Date(appointmentTime.getTime() - 60 * 60 * 1000); // 1 hour before

    const { data, error } = await adminClient
      .from('service_followups')
      .insert({
        booking_id: bookingId,
        reminder_time: reminderTime.toISOString(),
        status: 'scheduled',
        message: `Reminder: Your ${providerName} appointment is in 1 hour.`,
      })
      .select()
      .single();

    if (error) throw new Error(`Follow-up Agent Error: ${error.message}`);

    return {
      status: 'scheduled',
      reminderTime: reminderTime.toISOString(),
      message: `Reminder scheduled for ${reminderTime.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })}.`,
    };
  },
}),
```

**Update API response** to include:
```typescript
followUpDetails: result.steps.find(s => s.toolCalls.some(tc => tc.toolName === 'schedule_followup'))?.toolResults?.[0]?.result || null,
```

---

### [MODIFY] `src/app/page.tsx`

Replace the fake `setTimeout` follow-up animation with a real data-driven card:

```tsx
{/* Follow-up Card */}
{result.followUpDetails && (
  <div className="bg-white/5 backdrop-blur-3xl border border-white/10 p-6 rounded-[2rem] shadow-xl flex items-center gap-5">
    <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-2xl">
      <BellRing size={20} className="text-blue-400" />
    </div>
    <div>
      <p className="text-[10px] uppercase tracking-[0.2em] text-stone-500 font-bold mb-1">Follow-up Scheduled</p>
      <p className="text-stone-200 text-sm">{result.followUpDetails.message}</p>
    </div>
  </div>
)}
```

Remove the `useEffect` setTimeout for follow-up (page.tsx L63–71) and replace with real state from `result.followUpDetails`.

---

## Verification Plan

### Automated
- `npm run build` — must compile with zero TypeScript errors.

### Manual Demo Checklist
- [ ] Type: *"Mujhe kal subah G-13 mein AC technician chahiye"*
- [ ] Map renders provider pins (Gap 5 fix validates this)
- [ ] Booking receipt card appears (Gap 5 fix validates this)
- [ ] Ranking Decision card shows explicit reasoning text (Gap 1)
- [ ] Follow-up card shows "Reminder scheduled for X:XX AM" (Gap 2)
- [ ] `agent_traces` in Supabase shows `agent_name` column populated (Gap 4)
- [ ] `service_followups` table has a row after booking (Gap 2)
- [ ] Linguistic Agent extracts time from input (Gap 6)
