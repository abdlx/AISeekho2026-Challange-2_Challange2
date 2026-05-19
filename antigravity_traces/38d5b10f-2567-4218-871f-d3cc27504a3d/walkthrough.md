# Walkthrough: Level 2 Supply Chain System Upgrade

The backend has been completely upgraded to meet the advanced "Level 2" criteria of the AISeekho 2026 challenge.

## 1. Database Schema Overhaul
The `supabase_schema.sql` file has been updated to reflect the new **Supply Chain Scenario**. 
- **New Tables:** `inventory`, `suppliers`, `emergency_orders`, `system_notifications`.
- **Action:** If you have already run the previous SQL, you must run the new `supabase_schema.sql` to drop the old tables and seed the new inventory and supplier data.

## 2. API Route Enhancements (`/api/orchestrate`)

### Multi-Source Ingestion
The API now accepts an array of `sources` instead of a single prompt. This allows the agent to read emails, spreadsheets, and news simultaneously to detect contradictions.

### Constraint Enforcement & Failure Recovery
The `place_emergency_order` tool has a hardcoded `100,000 PKR` budget limit. 
If the LLM tries to spend more, the tool throws a `CONSTRAINT VIOLATION` error. The Gemini 1.5 Pro agent is instructed to catch this error, adjust its plan (e.g., lower the quantity), and retry. This perfectly satisfies the "Failure Recovery" judging criteria.

### Advanced Action Chain
The agent is instructed to execute a 3-5 step action chain for every request:
1. `verify_inventory_truth`
2. `evaluate_supplier`
3. `place_emergency_order`
4. `notify_stakeholders`
5. `update_delivery_estimates`

## 3. How to Test It

You can test the multi-source contradiction logic by sending the following POST request payload to `/api/orchestrate`:

```json
{
  "sessionId": "test-session-001",
  "sources": [
    { "type": "spreadsheet", "timestamp": "2026-05-10", "content": "SKU_X99 Stock: 500 units. Status: Healthy", "credibility": 0.9 },
    { "type": "supplier_email", "timestamp": "2026-05-14", "content": "Our next shipment of SKU_X99 is delayed by 14 days.", "credibility": 0.95 },
    { "type": "customer_complaints", "timestamp": "2026-05-14", "content": "30 complaints about SKU_X99 out of stock online.", "credibility": 0.8 }
  ]
}
```

> [!NOTE]
> When you run this, check the Supabase `agent_traces` table. You will see the agent realize that the spreadsheet is old, call the `verify_inventory_truth` tool, and then execute a complex action chain to order more stock under the 100k PKR limit!
