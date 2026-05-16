-- REFACTORED SCHEMA FOR CHALLENGE 2: SERVICE ORCHESTRATOR

-- 1. Service Providers
CREATE TABLE IF NOT EXISTS service_providers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    service_type TEXT NOT NULL, -- e.g., 'AC Technician', 'Plumber', 'Electrician'
    location TEXT NOT NULL, -- "lat,lng" for Google Maps
    rating FLOAT DEFAULT 4.5,
    hourly_rate_pkr INTEGER DEFAULT 2000,
    is_available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 2. Service Bookings
CREATE TABLE IF NOT EXISTS service_bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider_id UUID REFERENCES service_providers(id),
    customer_name TEXT,
    customer_location TEXT, -- "lat,lng"
    service_type TEXT,
    scheduled_time TIMESTAMP,
    total_cost_pkr INTEGER,
    status TEXT DEFAULT 'confirmed', -- 'confirmed', 'completed', 'cancelled'
    user_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- 3. Agent Traces (Keep this as is for logging)
CREATE TABLE IF NOT EXISTS agent_traces (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL,
    step_type TEXT NOT NULL,
    tool_name TEXT,
    agent_name TEXT,
    payload JSONB,
    user_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- 4. Follow-ups
CREATE TABLE IF NOT EXISTS service_followups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID REFERENCES service_bookings(id) ON DELETE CASCADE,
    reminder_time TIMESTAMP NOT NULL,
    status TEXT DEFAULT 'scheduled', -- 'scheduled', 'sent', 'cancelled'
    message TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- SEED DATA for G-13 / Islamabad area
INSERT INTO service_providers (name, service_type, location, rating, hourly_rate_pkr)
VALUES 
('Ali AC Expert', 'AC Technician', '33.6844, 73.0479', 4.8, 2500),
('Islamabad Repairs (Khan)', 'Electrician', '33.6938, 73.0652', 4.2, 1800),
('Perfect Plumb Services', 'Plumber', '33.6701, 73.0550', 4.5, 2000);
