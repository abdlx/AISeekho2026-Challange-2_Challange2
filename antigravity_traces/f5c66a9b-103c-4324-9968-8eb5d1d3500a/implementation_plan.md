# Implementation Plan - Price Awareness & Smart Ranking in Multi-Agent Service Orchestrator

This plan outlines the required fixes and enhancements to build a price-aware, smart multi-agent booking system for **AISO (AI Service Orchestrator)**. 

---

## User Review Required

> [!IMPORTANT]
> The database migration alters the `service_providers` table. We will execute this migration using a standalone TS script runner (`npx tsx`) to ensure immediate availability of the `price_per_hour_pkr` column.
>
> We will also update `src/scripts/seed-providers.ts` dynamically so future seeding automatically populates the `price_per_hour_pkr` column with correct price ranges matching the AC/plumbing/electrical rules.

---

## Proposed Changes

### 1. Database & Seeding Component

#### [MODIFY] [migrate.ts](file:///d:/code/Others/AISeekho2026_After-Shortlisting_Project/src/scripts/migrate.ts)
- Add migration to alter the `service_providers` table and add `price_per_hour_pkr` if it does not exist.
- Populate `price_per_hour_pkr` using the provided randomized CASE SQL logic:
  - AC: 1500 to 3000 PKR
  - Plumber: 800 to 2000 PKR
  - Electrician: 1000 to 2500 PKR
  - Default: 1000 to 2000 PKR

#### [MODIFY] [seed-providers.ts](file:///d:/code/Others/AISeekho2026_After-Shortlisting_Project/src/scripts/seed-providers.ts)
- Update seed data mapping to dynamically inject the `price_per_hour_pkr` value matching the exact database CASE logic rules so future seeds are completely aligned with the schema.

---

### 2. Intelligent Agents & Schema

#### [MODIFY] [linguistic.ts](file:///d:/code/Others/AISeekho2026_After-Shortlisting_Project/src/lib/agents/linguistic.ts)
- Add `priority` field to Zod schema (`cheapest`, `fastest`, `nearest`, `balanced`) defaulting to `balanced`.
- Update system prompt with Urdu/English priority detection triggers:
  - **cheapest**: "budget nahi hai", "sasta", "mehenga nahi", "budget mein", "zayada nahi hai", "kam paise", "affordable"
  - **fastest**: "jaldi", "urgent", "abhi", "emergency", "jitna jaldi"
  - **nearest**: "paas", "nearest", "qareeb", "nazdik"
  - **balanced**: (fallback / no clear preference)

#### [MODIFY] [transaction.ts](file:///d:/code/Others/AISeekho2026_After-Shortlisting_Project/src/lib/agents/transaction.ts)
- Add safety null/undefined checks at the beginning of `transactionAgent`:
  ```typescript
  if (!providerId || !providerName) {
    return { success: false, error: 'Provider data incomplete' };
  }
  ```

---

### 3. Supervisor & Ranking API

#### [MODIFY] [route.ts](file:///d:/code/Others/AISeekho2026_After-Shortlisting_Project/src/app/api/orchestrate/route.ts)
- **Rank Providers Tool**:
  - Accept `priority` and array of providers including `price_per_hour_pkr`.
  - Safely handle division-by-zero check if min/max boundaries are equal.
  - Apply weighted scores:
    - **cheapest**: price 60%, distance 25%, rating 15%
    - **fastest**: distance 60%, rating 25%, price 15%
    - **nearest**: distance 70%, rating 20%, price 10%
    - **balanced**: distance 34%, rating 33%, price 33%
  - Generate the exact decision output:
    `Selected as [priority] option — PKR {price}/hr, {distance}km away, {rating}★`
- **Supervisor Orchestrator**:
  - Extract the detected priority from the linguistic agent output.
  - Inject the priority into the supervisor's system prompt and instruct it to pass this priority to the `rank_providers` tool call.
  - Pass the provider's `price_per_hour_pkr` as `estimatedCost` and `pricePerHour` to `book_provider`.
  - Capture `pricePerHour` in `capturedBookingDetails`.
  - Add robust flow-gate: If no provider is returned or `bestMatch` is null, do not attempt to call travel logistics or book, but exit cleanly.

---

### 4. Booking Receipt UI

#### [MODIFY] [page.tsx](file:///d:/code/Others/AISeekho2026_After-Shortlisting_Project/src/app/page.tsx)
- Update `fetchHistory` to fetch `price_per_hour_pkr` in the Supabase join query.
- Update `handleViewPastBooking` to capture and pass `pricePerHour` to the details screen.
- Update the booking details receipt ticket component to display:
  - **Price per hour**: `PKR {price}/hr`
  - **Selection reason**: Displaying the descriptive reasoning string computed from the ranking agent score logic.

---

## Verification Plan

### Automated Verification
- Run `npm run build` to confirm there are no syntax, typescript, or build errors.

### Manual & Log Verification
- Run the migration using `npx tsx src/scripts/migrate.ts` and verify database results.
- Test sample queries through the UI / API using the browser or manual curl requests to verify:
  1. Priority detection works correctly (e.g. Roman Urdu sasta, abhi, qareeb triggers).
  2. Smart ranking sorts correctly matching the selected weights.
  3. Booking succeeds without any null-pointer failures.
