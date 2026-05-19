# Agent Architecture Deep Dive: Antigravity Orchestrator

The Antigravity platform utilizes a **Phase-based Multi-Agent Orchestration** architecture. It follows a "Supervisor-Worker" pattern where a central intelligence coordinates specialized sub-agents through a structured tool-calling pipeline.

## 🏗️ Architecture Overview

The system operates in two distinct phases to ensure maximum accuracy and traceability:

1.  **Phase 1: Deterministic Pre-processing** (Linguistic Analysis)
2.  **Phase 2: Agentic Orchestration** (Main Supervisor + Specialists)

---

## 🤖 The Five Agents

There are **5 distinct agents** currently operating in the system:

### 1. Linguistic Agent
*   **Role**: Linguistic Specialist / Parser.
*   **Location**: `src/lib/agents/linguistic.ts`
*   **Responsibility**: Analyzes raw user input (supports English, Urdu, and Roman Urdu). It extracts structured intent, service type, mentioned locations, and urgency level.
*   **Intelligence**: Gemini 3 Flash (`generateObject`).

### 2. Main Supervisor (The Orchestrator)
*   **Role**: The "Brain" / Coordinator.
*   **Location**: `src/app/api/orchestrate/route.ts`
*   **Responsibility**: Receives the linguistic analysis and the original prompt. It maintains the system state and decides which specialized tools (agents) to invoke to fulfill the user request.
*   **Intelligence**: Gemini 3 Flash (`generateText` with tool-calling).

### 3. Discovery Agent
*   **Role**: Database Specialist / Matchmaker.
*   **Location**: `src/lib/agents/discovery.ts` (Invoked via `find_providers` tool).
*   **Responsibility**: Queries the Supabase database for available service providers matching the requested type and filters them by proximity using the **Haversine formula**.

### 4. Logistics Agent
*   **Role**: Geospatial Specialist.
*   **Location**: `src/lib/google-maps.ts` (Invoked via `geocode_location` and `calculate_travel` tools).
*   **Responsibility**: Interfaces with **Google Maps Platform**. It geocodes addresses into coordinates and calculates real-time travel times (ETAs) between providers and customers.

### 5. Transaction Agent
*   **Role**: Fulfillment Specialist.
*   **Location**: Defined within the orchestration toolset (`book_provider`).
*   **Responsibility**: Executes the final database write to `service_bookings`. It generates confirmation codes and ensures the transaction is finalized with proper status and cost tracking.

---

## 🔄 How They Work Together (The Workflow)

1.  **Ingestion**: User asks: *"I need a plumber near Blue Area, Islamabad ASAP."*
2.  **Analysis**: **Linguistic Agent** identifies:
    *   `intent`: "Book Plumber"
    *   `serviceType`: "Plumbing"
    *   `locationName`: "Blue Area, Islamabad"
    *   `urgency`: "high"
3.  **Coordination**: **Supervisor** receives this analysis and plans:
    *   **Call Logistics Agent** to `geocode_location` ("Blue Area").
    *   **Call Discovery Agent** to `find_providers` near the geocoded coordinates.
    *   **Call Logistics Agent** again to `calculate_travel` for the top 3 matches.
    *   **Synthesize**: Supervisor picks the best match based on ETA.
4.  **Action**: If the user confirms or if the flow is automated, **Transaction Agent** calls `book_provider`.
5.  **Audit**: Every single action taken by any agent is logged into the `agent_traces` table for full observability.

---

## 🔍 Key Technical Features

*   **Multilingual Support**: The Linguistic agent is specifically prompted to handle regional dialects and mixed languages (Urdu/English).
*   **Real-time Precision**: Uses Google Maps instead of static distance for accuracy.
*   **Traceability**: Each tool call is attributed to a specific agent name in the logs, allowing for "agent-level" debugging.
*   **Resiliency**: The Supervisor is configured with a `stepCountIs(6)` limit to prevent infinite loops while allowing complex multi-step reasoning.
