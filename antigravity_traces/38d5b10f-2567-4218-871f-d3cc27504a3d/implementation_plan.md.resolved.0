# Upgrade Plan: Level 2 Agentic System

This plan outlines the architectural and code changes required to upgrade the current "Service Booking" baseline into the "Advanced Insight & Action Orchestrator" required by the new challenge rules.

We will pivot the core scenario to the **Inventory Shortage & Supply Chain** example provided in the rules, as it perfectly demonstrates contradictions, constraints, and multi-step action chains.

## User Review Required
> [!IMPORTANT]
> Please review the new **Tools** and **Database Schema** changes below. 
> Since we are shifting from "Booking Plumbers" to "Supply Chain Orchestration," the database tables and API logic will be completely overhauled. Ensure this scenario aligns with your vision for the demo.

## Open Questions
> [!WARNING]
> 1. Do you want the 5 input sources (PDF, CSV, Email, etc.) to be hardcoded as a "Demo Scenario" in the frontend, or should the API accept them dynamically? (I recommend a hardcoded payload for a smoother demo).
> 2. For the "Outcome Visualization", should the API return a structured "Before/After" JSON object alongside the traces?

---

## Proposed Changes

### 1. Database Schema Update (Supabase)
We will replace the service booking tables with supply chain tables to support the new scenario.

#### [MODIFY] `supabase_schema.sql`
- **[DELETE]** `providers`, `bookings`, `follow_ups` tables.
- **[NEW]** `inventory`: Tracks SKUs, current stock, and last updated timestamps (crucial for contradiction resolution).
- **[NEW]** `suppliers`: Tracks supplier name, reliability score, and max capacity.
- **[NEW]** `emergency_orders`: Tracks the simulated orders, including cost (to test budget constraints).
- **[NEW]** `system_notifications`: Tracks stakeholder alerts.
- **[KEEP]** `agent_traces`: Will still be used for the core logging requirement.

### 2. Orchestration API Update
The orchestrator must handle complex reasoning, noise filtering, and failure recovery.

#### [MODIFY] `src/app/api/orchestrate/route.ts`
- **Input Payload:** Update to accept an array of `sources` (simulating the PDF, Dashboard, Email, etc.) instead of a single prompt.
- **System Prompt Rewrite:**
  - Instruct the agent to perform **Phase 1: Analysis** (detect contradictions between sources based on timestamp/credibility).
  - Instruct the agent to perform **Phase 2: Planning** (create a 3-5 step action chain respecting a hardcoded budget constraint, e.g., max 100,000 PKR).
  - Instruct the agent to handle errors (e.g., if an order exceeds budget, catch the error and try a smaller quantity).

### 3. New Tool Chain
We will replace the simple booking tools with a strict 4-step action chain.

#### [MODIFY] `src/app/api/orchestrate/route.ts` (Tools Section)
- **[NEW] `verify_inventory_truth`**: Simulates querying the master database to resolve conflicting source reports.
- **[NEW] `place_emergency_order`**: Takes `sku`, `quantity`, `cost`. **Crucial:** This tool will intentionally throw an error if `cost > 100,000 PKR` to trigger the "Failure Recovery" requirement.
- **[NEW] `notify_stakeholders`**: Simulates sending an alert. Will only succeed if the emergency order was successful.
- **[NEW] `rollback_transaction`**: Allows the agent to cancel the emergency order if a downstream system fails.
- **[NEW] `schedule_monitoring`**: Final step to update the system state.

---

## Verification Plan

### Automated/Manual Testing
1. **The Contradiction Test:** We will send a payload where "Source 1 (Old)" says stock is fine, but "Source 2 (New Email)" says stock is out.
   - *Verification:* The `agent_traces` must show the agent actively calling `verify_inventory_truth` to resolve the conflict before acting.
2. **The Constraint & Failure Test:** We will force the agent to try placing an order that costs 150,000 PKR.
   - *Verification:* The API should throw a simulated error. The `agent_traces` must show the agent receiving the error, adjusting its plan, and calling `place_emergency_order` again with a lower quantity to stay under the 100,000 PKR budget.
3. **The Action Chain Test:**
   - *Verification:* The final database state must show a new order, a new notification, and a scheduled monitoring task (3+ connected actions).
