-- ADD AUTH SUPPORT TO SERVICE ORCHESTRATOR

-- 1. Add user_id to service_bookings
ALTER TABLE service_bookings ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- 2. Add user_id to agent_traces
ALTER TABLE agent_traces ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- 3. Enable RLS (Optional but good for security score)
ALTER TABLE service_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_traces ENABLE ROW LEVEL SECURITY;

-- Allow users to see only their own bookings
CREATE POLICY "Users can view their own bookings" 
ON service_bookings FOR SELECT 
USING (auth.uid() = user_id);

-- Allow users to see only their own agent traces
CREATE POLICY "Users can view their own traces" 
ON agent_traces FOR SELECT 
USING (auth.uid() = user_id);

-- Public can view service providers
CREATE POLICY "Public can view providers" 
ON service_providers FOR SELECT 
USING (true);
