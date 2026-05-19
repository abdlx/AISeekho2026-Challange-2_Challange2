# Gap Analysis: Current Codebase vs. Challenge 2 Requirements

> [!IMPORTANT]
> This report cross-references **every** requirement in `challenge.md` against the live code. Gaps are rated by their impact on the evaluation score.

---

## ✅ What's Already Done (Solid)

| Requirement | Implementation | Location |
| :--- | :--- | :--- |
| Intent Understanding (Urdu/English) | **Linguistic Agent** with `generateObject` | `src/lib/agents/linguistic.ts` |
| Provider Discovery | **Discovery Agent** + Haversine distance filter | `src/lib/agents/discovery.ts` |
| Geocoding | `geocode_location` tool (Google Maps API) | `src/app/api/orchestrate/route.ts` |
| Travel Time Calculation | `calculate_travel` tool (Distance Matrix API) | `src/lib/google-maps.ts` |
| Booking Simulation (DB write) | `book_provider` tool writes to `service_bookings` | `src/app/api/orchestrate/route.ts` |
| Booking Receipt in UI | Confirmation code, provider name card shown | `src/app/page.tsx` L327–350 |
| Agent Traces / Logs | Every step logged to `agent_traces` table | `src/app/api/orchestrate/route.ts` L129–146 |
| Mobile-first UI | Full mobile layout with glassmorphic design | `src/app/page.tsx` |
| Google Gemini / Antigravity | Gemini 3 Flash used as core LLM | Throughout |

---

## ❌ Gap 1: Ranking Agent — MISSING (High Impact: 20% of score)

**What the challenge says:**
> Rank providers based on: Distance, Availability, Rating. **Provide clear reasoning for selection.**

**What the code does:**
The `discovery.ts` agent sorts by distance only (`a.distanceKm - b.distanceKm`). It returns a raw array to the Supervisor. The Supervisor may *implicitly* pick the first result, but there is **no dedicated Ranking Agent**, no explicit multi-factor scoring (distance + availability + rating combined), and **no reasoning text generated** explaining *why* a provider was picked.

**The "Agent Insight" card in the UI** (`result.insight`) shows the Supervisor's final summary text — but this text is not explicitly prompted to include the ranking rationale. It's whatever the LLM happens to say.

**Fix Required:**
1. Add a `ranking_agent` tool to the orchestration pipeline that takes the provider list and scores each by a formula (e.g., `score = (1/distanceKm * 0.4) + (rating * 0.4) + (isAvailable * 0.2)`).
2. Return a `rankingReasoning` string like: *"Ali AC Expert chosen: highest composite score (9.2/10) due to 0.8km proximity and 4.8 ⭐ rating."*
3. Surface `rankingReasoning` in the UI as a distinct card (not mixed into `insight`).

---

## ❌ Gap 2: Follow-up Agent — MISSING (Explicit Challenge Requirement)

**What the challenge says:**
> **Simulate:** Reminders, Status updates, Completion confirmation.
> **Example Output:** *"Reminder scheduled 1 hour before appointment"*

**What the code does:**
There's a client-side fake animation in `page.tsx` (L63–71):
```js
// FAKE — pure setTimeout, nothing in the database
const t3 = setTimeout(() => setBookingStatus('Follow-up Reminder Sent'), 9000);
```
This is a **UI trick**, not an agent action. Nothing is written to any DB table. No `follow_ups` table exists in the active `service_orchestrator_schema.sql`. No `scheduled_reminder_time` field exists in `service_bookings`. The `supabase_schema.sql` has `DROP TABLE IF EXISTS follow_ups` — it's explicitly removed.

**Fix Required:**
1. Add a `follow_ups` table to the schema with `booking_id`, `reminder_time`, `status`.
2. Add a `schedule_followup` tool to the orchestration pipeline (the **Follow-up Agent**).
3. After booking is confirmed, the Supervisor should call this tool to insert a real DB row (e.g., `reminder_time = scheduled_time - 1 hour`).
4. Return `followUpDetails` in the API response and display in the UI: *"⏰ Reminder scheduled for 9:00 AM"*.

---

## ⚠️ Gap 3: `user_id` in `service_bookings` — Schema Mismatch (Medium Impact)

**What the code does:**
The `book_provider` tool (route.ts L101–112) inserts `user_id` into `service_bookings`. However, **`user_id` is not defined in `service_orchestrator_schema.sql`** (lines 16–26). This will cause a runtime error for any authenticated user.

**Fix Required:**
Add `user_id UUID REFERENCES auth.users(id)` to the `service_bookings` table definition.

---

## ⚠️ Gap 4: `agent_name` Missing from `agent_traces` Schema (Medium Impact)

**What the code does:**
The orchestration route inserts `agent_name` into `agent_traces` (L32, L141), but the schema in `service_orchestrator_schema.sql` (L29–36) does **not** define an `agent_name` column. The Supabase client will silently ignore this or throw an error depending on RLS settings.

**Fix Required:**
Add `agent_name TEXT` to the `agent_traces` table definition.

---

## ⚠️ Gap 5: Providers Not Returned in API Response (Low-Medium Impact)

**What the code does:**
The API response at `route.ts` L153 tries to find providers from a tool called `find_nearby_providers`, but the actual tool is named `find_providers`. This means `result.providers` will **always be an empty array `[]`**, so the map will never show provider pins.

```typescript
// BUG: tool name mismatch
providers: (result.steps.find(s => s.toolCalls.some(tc => tc.toolName === 'find_nearby_providers'))...
//                                                                           ^^^^^^^^^^^^^^^^^^^^^^^^^
// Actual tool name is 'find_providers'
```
Same bug exists for `bookingDetails` (L154) and `providerFound`/`bookingConfirmed` in metrics (L157–158) — wrong tool names.

**Fix Required:** Correct all tool name references in the response construction to match the actual registered tool names.

---

## ⚠️ Gap 6: Time Extraction Not Used (Low Impact)

**What the challenge says:**
> **Extract:** Service type, Location, **Time**

**What the code does:**
The Linguistic Agent schema (`linguistic.ts` L14–19) extracts `intent`, `serviceType`, `locationName`, and `urgency` — but **no `time` field**. The challenge's primary example ("kal subah" = tomorrow morning) requires time extraction. It's never parsed, stored, or used in the booking `scheduled_time`.

**Fix Required:**
Add `scheduledTime: z.string().nullable().describe('Requested date/time, if mentioned')` to the Linguistic Agent's Zod schema and pass it to the `book_provider` tool instead of `new Date().toISOString()`.

---

## 📊 Summary Table

| Gap | Challenge Section | Severity | Eval Impact |
| :--- | :--- | :--- | :--- |
| **1. Ranking Agent + Reasoning** | §3 Matching & Ranking | 🔴 Critical | ~20% of score |
| **2. Follow-up Agent (DB-backed)** | §6 Follow-Up Automation | 🔴 Critical | Demo requirement |
| **3. `user_id` schema mismatch** | §5 Action Simulation | 🟡 Medium | Runtime crash |
| **4. `agent_name` column missing** | §7 Agentic Workflow (Traces) | 🟡 Medium | Trace logs broken |
| **5. Tool name mismatch in response** | §5 Action Simulation | 🟡 Medium | Map/booking UI always empty |
| **6. Time not extracted** | §1 Intent Understanding | 🟠 Low | Incomplete intent |

---

## 🎯 Recommended Fix Priority

**Do these before demo video:**

1. **Fix Gap 5 first** (5-minute fix, tool name typos — enables the map and booking UI to actually work)
2. **Fix Gap 4** (add `agent_name` to schema SQL)
3. **Fix Gap 3** (add `user_id` to schema SQL)
4. **Add Ranking Agent** (new tool in orchestrate route + UI card)
5. **Add Follow-up Agent** (new table + tool + UI card)
6. **Fix Gap 6** (add time to Linguistic Agent schema)
