# Task Sheet: Challenge 2 Gap Closures

> **Goal:** Close all 6 identified gaps before submission demo video.
> **Time estimate:** ~3–4 hours total.

---

## Phase 1 — Schema Fixes (Supabase SQL Editor) ~15 min

- `[ ]` **1.1** Add `agent_name TEXT` column to `agent_traces` table
- `[ ]` **1.2** Add `user_id UUID` column to `agent_traces` table
- `[ ]` **1.3** Add `user_id UUID` column to `service_bookings` table
- `[ ]` **1.4** Add `service_type TEXT` column to `service_bookings` table (already in code, missing from schema)
- `[ ]` **1.5** Create `service_followups` table with columns: `id`, `booking_id`, `reminder_time`, `status`, `message`, `created_at`
- `[ ]` **1.6** Update `service_orchestrator_schema.sql` file in the repo to reflect all schema changes above (for reproducibility)

---

## Phase 2 — Bug Fix: Tool Name Mismatches (Gap 5) ~10 min

**File:** `src/app/api/orchestrate/route.ts`

- `[ ]` **2.1** Fix L153: Change `find_nearby_providers` → `find_providers` in response builder
- `[ ]` **2.2** Fix L154: Change `book_service_provider` → `book_provider` in response builder
- `[ ]` **2.3** Fix L157: Change `find_nearby_providers` → `find_providers` in metrics
- `[ ]` **2.4** Fix L158: Change `book_service_provider` → `book_provider` in metrics
- `[ ]` **2.5** Test: Verify map pins render and booking receipt card appears after a request

---

## Phase 3 — Feature: Time Extraction (Gap 6) ~20 min

**File:** `src/lib/agents/linguistic.ts`

- `[ ]` **3.1** Add `scheduledTime: z.string().nullable()` field to the `generateObject` Zod schema
- `[ ]` **3.2** Add descriptive prompt to handle Urdu time phrases (kal subah, abhi, 3 baje)

**File:** `src/app/api/orchestrate/route.ts`

- `[ ]` **3.3** Pass `linguisticAnalysis.scheduledTime` into the Supervisor system prompt
- `[ ]` **3.4** Update the `book_provider` tool's `execute` function to use `linguisticAnalysis.scheduledTime` instead of `new Date().toISOString()` for `scheduled_time`
- `[ ]` **3.5** Return `scheduledTime` in the API response object
- `[ ]` **3.6** Test: Input "kal subah 10 baje" and verify extracted time appears in booking

---

## Phase 4 — Feature: Ranking Agent (Gap 1) ~60 min

### Backend

**File:** `src/app/api/orchestrate/route.ts`

- `[ ]` **4.1** Add `rank_providers` tool definition with weighted scoring formula (distance 40% + rating 40% + availability 20%)
- `[ ]` **4.2** Update Supervisor system prompt to include the ranking step between discovery and travel calculation
- `[ ]` **4.3** Add `rankingReasoning` to the API response by extracting it from the `rank_providers` tool result step
- `[ ]` **4.4** Add `agent_name: 'Ranking Agent'` to the trace log for `rank_providers` tool calls

### Frontend

**File:** `src/app/page.tsx`

- `[ ]` **4.5** Import `BarChart3` icon from `lucide-react`
- `[ ]` **4.6** Add "Ranking Decision" card component to the result screen (above "Agent Reasoning" card)
- `[ ]` **4.7** Card must show the full reasoning text from `result.rankingReasoning`
- `[ ]` **4.8** Use green accent (`text-emerald-400`) to visually distinguish from the gold "Agent Reasoning" card
- `[ ]` **4.9** Test: Full end-to-end — verify the ranking card appears with explicit reasoning text in the demo

---

## Phase 5 — Feature: Follow-up Agent (Gap 2) ~60 min

### Backend

**File:** `src/app/api/orchestrate/route.ts`

- `[ ]` **5.1** Add `schedule_followup` tool definition that writes to `service_followups` table
- `[ ]` **5.2** Tool must calculate `reminderTime = scheduledTime - 1 hour`
- `[ ]` **5.3** Tool must return `{ status, reminderTime, message }` with a human-readable time string
- `[ ]` **5.4** Update Supervisor system prompt: after a successful `book_provider` call, always call `schedule_followup`
- `[ ]` **5.5** Add `followUpDetails` to the API response by extracting from `schedule_followup` tool step
- `[ ]` **5.6** Add `agent_name: 'Follow-up Agent'` to the trace log for `schedule_followup` tool calls

### Frontend

**File:** `src/app/page.tsx`

- `[ ]` **5.7** Remove the fake `setTimeout` chain for follow-up (L63–71 in current file)
- `[ ]` **5.8** Add a real "Follow-up Scheduled" card to result screen, driven by `result.followUpDetails`
- `[ ]` **5.9** Card must show: BellRing icon + "Reminder scheduled for [TIME]"
- `[ ]` **5.10** Test: Verify `service_followups` table has a new row in Supabase after a booking
- `[ ]` **5.11** Test: Verify the "Follow-up Scheduled" card appears in the UI with the correct time

---

## Phase 6 — Final Validation

- `[ ]` **6.1** Run `npm run build` — zero TypeScript errors
- `[ ]` **6.2** Full demo run: Input *"Mujhe kal subah G-13 mein AC technician chahiye"*
  - `[ ]` Map shows provider pins
  - `[ ]` Booking receipt appears with confirmation code
  - `[ ]` Ranking Decision card shows: *"Ali AC Expert selected... composite score 8.4/10..."*
  - `[ ]` Follow-up card shows: *"Reminder scheduled for 9:00 AM"*
  - `[ ]` Agent Reasoning card shows Supervisor's final summary
- `[ ]` **6.3** Check Supabase tables:
  - `[ ]` `agent_traces` — has `agent_name` column populated for each step
  - `[ ]` `service_bookings` — has new row with correct `user_id` and `scheduled_time`
  - `[ ]` `service_followups` — has corresponding row with `reminder_time`
- `[ ]` **6.4** Record the 3–5 minute demo video showing the full workflow
