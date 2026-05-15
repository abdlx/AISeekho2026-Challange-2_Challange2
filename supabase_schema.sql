-- Enable uuid-ossp extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop old tables if they exist (for clean slate)
DROP TABLE IF EXISTS agent_traces CASCADE;
DROP TABLE IF EXISTS follow_ups CASCADE;
DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS providers CASCADE;

-- 1. Master Inventory
CREATE TABLE IF NOT EXISTS inventory (
    sku TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    current_stock INTEGER NOT NULL,
    status TEXT DEFAULT 'Healthy',
    last_updated TIMESTAMP DEFAULT NOW()
);

-- 2. Suppliers
CREATE TABLE IF NOT EXISTS suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    reliability_score FLOAT, -- Used for agent to choose best supplier
    lead_time_days INTEGER,
    max_capacity INTEGER
);

-- 3. Action State: Emergency Orders
CREATE TABLE IF NOT EXISTS emergency_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sku TEXT REFERENCES inventory(sku),
    supplier_id UUID REFERENCES suppliers(id),
    quantity INTEGER NOT NULL,
    cost_pkr INTEGER NOT NULL,
    status TEXT DEFAULT 'pending_approval',
    created_at TIMESTAMP DEFAULT NOW()
);

-- 4. Action State: Notifications
CREATE TABLE IF NOT EXISTS system_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    department TEXT NOT NULL,
    message TEXT NOT NULL,
    sent_at TIMESTAMP DEFAULT NOW()
);

-- 5. MANDATORY: Agent Traces
CREATE TABLE IF NOT EXISTS agent_traces (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL,
    step_type TEXT NOT NULL, -- 'initial', 'tool-result', 'recovery', 'done'
    tool_name TEXT,
    payload JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- SEED DATA for Scenario
INSERT INTO inventory (sku, name, current_stock, last_updated) 
VALUES ('SKU_X99', 'High-End Microcontroller', 400, '2026-05-10 10:00:00');

INSERT INTO suppliers (name, reliability_score, lead_time_days, max_capacity) 
VALUES 
('TechComponents Inc', 0.95, 3, 1000), 
('Global Supply LLC', 0.60, 10, 5000);
