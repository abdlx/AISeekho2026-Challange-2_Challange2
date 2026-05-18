# AISO: AI Service Orchestrator for Pakistan's Informal Economy
### Google AI Seekho 2026 — Challenge 2 Final Submission

AISO (AI Service Orchestrator) is a state-of-the-art, production-grade agentic system designed to automate the end-to-end lifecycle of informal service matching (plumbers, electricians, AC technicians, tutors) across Pakistan. Powered by **Google Antigravity** and **Gemini 3.1 Flash**, AISO transitions informal referrals and WhatsApp messages into structured, real-time geocoded bookings with automated follow-up reminders.

---

## 🌌 System Architecture

AISO implements a highly isolated, robust multi-agent orchestration pipeline. The system coordinates six specialized agents through a central supervisor via a reactive, Event-Driven Stream (SSE).

```mermaid
graph TD
    User([User Prompt: Urdu/Roman/English]) --> Supervisor[Supervisor Agent]
    
    subgraph Multi-Agent Pipeline
        Supervisor -->|1. Extract Intent| Linguistic[Linguistic Agent]
        Supervisor -->|2. Geocode Address| LogisticsGeocode[Logistics Agent]
        Supervisor -->|3. Proximity Search| Discovery[Discovery Agent]
        Supervisor -->|4. Multi-Factor Score| Ranking[Ranking Agent]
        Supervisor -->|5. Drive Route & ETA| LogisticsTravel[Logistics Agent]
        Supervisor -->|6. Write Booking DB| Transaction[Transaction Agent]
        Supervisor -->|7. Reminder Triggers| FollowUp[Follow-up Agent]
    end

    Linguistic -->|Structured JSON| Supervisor
    LogisticsGeocode -->|Lat, Lng| Supervisor
    Discovery -->|Available Providers| Supervisor
    Ranking -->|Optimal Pick + Rationale| Supervisor
    LogisticsTravel -->|ETA Minutes| Supervisor
    Transaction -->|Receipt & Confirmation| Supervisor
    FollowUp -->|Notification Slots| Supervisor

    Supervisor -->|Real-time SSE Timeline| UI[Mobile Client View]
```

### Isolated Agent Definitions
1. **Linguistic Specialist ([linguistic.ts](file:///d:/code/Others/AISeekho2026_After-Shortlisting_Project/src/lib/agents/linguistic.ts)):** Extracts structured service requests, schedules, urgencies, and user priority parameters from Urdu, Roman Urdu, and English mixed text.
2. **Logistics Coordinator ([logistics.ts](file:///d:/code/Others/AISeekho2026_After-Shortlisting_Project/src/lib/agents/logistics.ts)):** Executes spatial geocoding and calculates travel ETAs using the Google Maps & Distance Matrix APIs.
3. **Provider Discovery Agent ([discovery.ts](file:///d:/code/Others/AISeekho2026_After-Shortlisting_Project/src/lib/agents/discovery.ts)):** Queries the database for available technicians matching the service category within a 50km radius.
4. **Ranking Engine (Inline Tool):** Scores and ranks matched providers based on user priority (cheapest, fastest, nearest, balanced) using a custom weighted normalization formula.
5. **Transaction Agent ([transaction.ts](file:///d:/code/Others/AISeekho2026_After-Shortlisting_Project/src/lib/agents/transaction.ts)):** Simulates database booking insertions, generates secure order confirmation codes, and enforces transactional safety.
6. **Follow-up Automator ([followup.ts](file:///d:/code/Others/AISeekho2026_After-Shortlisting_Project/src/lib/agents/followup.ts)):** Configures reminder triggers exactly 1 hour before and status/completion reviews 1 hour after bookings.

---

## 🛠️ Database Schema

Implemented on **Supabase (PostgreSQL)**, our schema supports transaction tracing, spatial logging, and persistent follow-up automation.

```sql
-- 1. Service Providers Dataset
CREATE TABLE service_providers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    service_type TEXT NOT NULL,       -- e.g., 'AC Technician', 'Plumber'
    location TEXT NOT NULL,           -- "lat,lng"
    rating FLOAT DEFAULT 4.5,
    hourly_rate_pkr INTEGER DEFAULT 2000,
    is_available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 2. Service Bookings Table
CREATE TABLE service_bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider_id UUID REFERENCES service_providers(id),
    customer_name TEXT,
    customer_location TEXT,           -- "lat,lng"
    service_type TEXT,
    scheduled_time TIMESTAMP,
    total_cost_pkr INTEGER,
    status TEXT DEFAULT 'confirmed',   -- 'confirmed', 'completed', 'cancelled'
    user_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- 3. Google Antigravity Audit & Trace Log
CREATE TABLE agent_traces (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL,
    step_type TEXT NOT NULL,          -- 'linguistic_analysis' | 'multi_agent_orchestration'
    tool_name TEXT,                   -- The executed tool
    agent_name TEXT,                  -- Attributed agent
    payload JSONB,                    -- Complete execution details
    user_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- 4. Follow-up Reminders Queue
CREATE TABLE service_followups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID REFERENCES service_bookings(id) ON DELETE CASCADE,
    reminder_time TIMESTAMP NOT NULL, -- Calculated as (scheduled_time - 1 hour)
    status TEXT DEFAULT 'scheduled',  -- 'scheduled', 'sent', 'cancelled'
    message TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 📊 Baseline Comparison: Agentic vs. Non-Agentic

| Metric / Capability | Simple Keyword-Matching (Non-Agentic) | AISO Agentic System (Antigravity Powered) |
| :--- | :--- | :--- |
| **Multilingual Extraction** | Fails on mixed syntax, Roman Urdu spellings (e.g. *"kam budget"*). | **Linguistic Agent** decodes intention, schedules, and priorities regardless of script or dialect. |
| **Provider Discovery** | Static database query matching absolute strings. | **Discovery Agent** uses fuzzy ILIKE lookups and **Haversine formula** to calculate precise proximity. |
| **Matching Logic** | Hardcoded sorting (e.g., sort strictly by rating). | **Ranking Agent** scores via dynamically weighted composite normalization tailored to user priority. |
| **Resilience & Fallbacks** | System crashes or returns blank pages on API key/network failures. | Retries queries with exponential backoffs; triggers mock geospatial simulation if API is down. |
| **Traceability** | None. Database logs show only the final database booking record. | Full execution logs recorded in `agent_traces` table detailing each agent’s observations and tool inputs. |

---

## 🧪 Robustness & Failure Scenarios

AISO incorporates production-ready error recovery patterns to ensure seamless execution in the local Pakistani connectivity environment:
1. **Fuzzy Location Defaults:** If a user types a request without specifying a location, AISO skips geocoding and defaults to the user's actual device GPS coordinates (`userLocation`).
2. **Multilingual Script Parsing:** Gemini 3.1 Flash parses native Urdu (اے سی خراب ہے) and mixed Roman Urdu ("sasta wala plumber chahiye") into matching categories.
3. **No Providers Available:** If discovery returns `0 results`, the supervisor halts further downstream actions (skips travel estimation and bookings) and returns a clean, user-friendly "No Match Found" status.
4. **Google Maps API Failure:** If the API key is missing or down, the geocoding and travel utilities transparently fallback to high-fidelity simulated routes without interrupting the user journey.
5. **Database Connection Retries:** Every Supabase query is wrapped in an exponential backoff helper (`withRetry`), retrying up to 3 times (500ms, 1000ms, 2000ms delays) before flagging errors.

---

## ⚙️ Cost, Latency & Scale Estimates

### 1. Cost per Orchestration Call
Calculated for an average user session utilizing **Gemini 3.1 Flash Lite** via OpenRouter:
- **Input Tokens (Prompt + System Instruction + Tools):** ~6,000 tokens → **$0.00045**
- **Output Tokens (Structured JSON + Rationale):** ~800 tokens → **$0.00024**
- **Google Maps Geocoding & Distance Matrix API:** 2 requests → **$0.01000**
- **Total Estimated Cost per Booking:** **~$0.01069** (approx. PKR 3.00)

### 2. Latency Breakdown
- **Linguistic Parsing:** ~800ms
- **Geocoding & Discovery:** ~400ms
- **Weighted Ranking Engine:** ~10ms (highly optimized local routine)
- **Logistics (ETA Travel):** ~300ms
- **Database Write & Follow-up Scheduling:** ~150ms
- **Total Pipeline Execution Latency:** **~1.6s to 2.2s** (fully streamed via SSE to eliminate user-perceived lag)

### 3. Scaling Plan (10x / 100x Loads)
- **Supabase Connection Pooler (PgBouncer):** Enforced to handle high-concurrency connections safely.
- **Geospatial Caching:** Caching geocoding lookups in Redis (e.g., mapping common sector names like "G-13", "DHA Phase 6" to coordinates) to eliminate 90% of Maps API latency and costs.
- **Queued Notification Dispatch:** Offloading SMS/WhatsApp reminder notifications (scheduled via `service_followups`) to a worker queue (e.g., BullMQ or Celery) running in the background.

---

## 🛰️ Google Antigravity Role

Google Antigravity acts as the core runtime platform. Rather than using fixed code paths, Antigravity:
1. **Orchestrates Workflows:** Dynamically plans the execution path based on extracted constraints (e.g., skipping travel ETAs if provider is unavailable).
2. **Manages Tooling Boundaries:** Binds specific agents to tools (`geocode_location`, `find_providers`, `rank_providers`, `calculate_travel`, `book_provider`, `schedule_followup`) ensuring high isolation.
3. **Controls Execution Depth:** Enforces `stopWhen: stepCountIs(8)` limits to prevent recursive logic traps or infinite tool-calling loops.
4. **Powers Live Timeline Logs:** Streams traces incrementally to the Capacitor mobile client via `ReadableStream` Server-Sent Events, letting the user observe agentic reasoning live.

---

## ⚠️ Limitations & Future Work
- **Static Dataset seed:** The system currently operates on pre-seeded locations for G-13 and Islamabad. Future versions will integrate live Google Places merchant directories.
- **Offline Writes:** While reads are cached via service workers, offline transaction bookings are held in local storage and queued until internet connectivity is restored.

---

## ⚙️ Setup & Installation

Follow these steps to run the AISO system locally in development or prepare for deployment:

### 1. Clone & Install Dependencies
```bash
# Clone the repository and navigate to root
cd AISeekho2026_After-Shortlisting_Project

# Install package dependencies
npm install
```

### 2. Configure Environment Variables
Create a `.env.local` file in your project root with the following variables:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
GOOGLE_MAPS_API_KEY=your_google_maps_api_key
OPENROUTER_API_KEY=your_openrouter_api_key
```

### 3. Initialize Database Schemas
Execute the SQL DDL commands in [service_orchestrator_schema.sql](file:///d:/code/Others/AISeekho2026_After-Shortlisting_Project/sql_schema/service_orchestrator_schema.sql) using the Supabase SQL Editor to spin up the table schemas and seed sample provider locations.

### 4. Boot Dev Server
```bash
# Start Next.js development server
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the AISO mobile dashboard interface.

---

## 💡 Core Assumptions
1. **Device Location Access:** It is assumed the user has approved the mobile application's geolocation query to ensure precise proximity sorting. If blocked or unavailable, the system defaults dynamically to the centroid coordinates of G-13, Islamabad (`33.6844, 73.0479`).
2. **Provider Telemetry:** Service providers keep their availability status (`is_available = true`) and pricing values updated in real time via their own dedicated provider portals.
3. **Logistics Calculations:** ETA and distance matrices presume default street networks, normal vehicle classes, and standard transit flow metrics across urban Pakistani sectors.

---

## 🔒 Privacy & Security Note
- **Row-Level Security (RLS):** Enabled on all Supabase tables (`service_bookings`, `agent_traces`, `service_followups`). Queries and mutations are dynamically locked to the specific authenticated `user_id` context.
- **Geospatial Anonymization:** Exact user GPS telemetry is captured solely in-memory to execute proximity searches and geocode travel times. User positions are never permanently recorded or tracked outside the transient booking receipt database.
- **Agent Logging Protection:** Personal identifiable information (PII) is automatically filtered out from the `payload` object before being saved to `agent_traces`.

