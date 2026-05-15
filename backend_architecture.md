# Architecture: AI Service Orchestrator

## 1. Stack
- **Framework:** Next.js 16 (App Router)
- **Agent:** Vercel AI SDK (Antigravity Core)
- **Model:** Gemini 1.5 Pro
- **Database:** Supabase (PostgreSQL)
- **Maps:** Google Maps Platform (Distance Matrix, Maps JS)

## 2. Data Flow
1. **POST /api/orchestrate**: Receives natural language input.
2. **Gemini Intent Extraction**: Determines service type (e.g., 'Plumber') and location.
3. **find_nearby_providers**: SQL query to Supabase.
4. **calculate_travel_logistics**: Fetch real-time traffic data from Google Maps.
5. **book_service_provider**: Insert record into `service_bookings`.
6. **Response**: Returns reasoning, metrics, and confirmation.

## 3. Database Schema
- `service_providers`: Name, service_type, location (lat,lng), rating.
- `service_bookings`: provider_id, customer_location, status, scheduled_time.
- `agent_traces`: reasoning steps and tool logs.
