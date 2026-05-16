-- Google Maps Integration: Supabase Schema Updates

-- 1. Add location to suppliers
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS location TEXT;

-- Update existing demo suppliers with real coordinates in Islamabad/Rawalpindi
-- Assuming 'TechComponents Inc' and 'Global Supply LLC' exist from previous seed
UPDATE suppliers SET location = '33.7215,73.0433' WHERE name = 'TechComponents Inc';
UPDATE suppliers SET location = '33.6460,73.1020' WHERE name = 'Global Supply LLC';

-- 2. Add warehouse location to inventory
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS warehouse_location TEXT DEFAULT '33.6938,73.0652';

-- Ensure the demo SKU has the warehouse location
UPDATE inventory SET warehouse_location = '33.6938,73.0652' WHERE sku = 'SKU_X99';

-- Note: The locations are stored as "lat,lng" strings to easily pass to Google Maps APIs.
