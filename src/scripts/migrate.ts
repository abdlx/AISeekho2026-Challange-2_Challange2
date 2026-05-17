import { createAdminClient } from '../lib/supabase-server';

async function runMigration() {
  console.log("Starting migration...");
  const adminClient = createAdminClient();
  
  const sql = `
    ALTER TABLE agent_traces ADD COLUMN IF NOT EXISTS agent_name TEXT;
    ALTER TABLE agent_traces ADD COLUMN IF NOT EXISTS user_id UUID;

    UPDATE service_providers SET hourly_rate_pkr = CASE
      WHEN service_type ILIKE '%ac%' THEN floor(random() * (3000-1500+1) + 1500)
      WHEN service_type ILIKE '%plumb%' THEN floor(random() * (2000-800+1) + 800)
      WHEN service_type ILIKE '%electric%' THEN floor(random() * (2500-1000+1) + 1000)
      ELSE floor(random() * (2000-1000+1) + 1000)
    END WHERE hourly_rate_pkr IS NULL OR hourly_rate_pkr = 2000;
  `;

  console.log("Running SQL:\n", sql);

  // The standard supabase-js client does not support DDL statements directly
  // unless there is a custom RPC function defined like 'exec_sql'
  const { data, error } = await adminClient.rpc('exec_sql', { sql_string: sql });
  
  if (error) {
    console.error("Migration error (Note: If 'exec_sql' does not exist, run this directly in Supabase SQL editor):", error.message);
  } else {
    console.log("Migration successful:", data);
  }
}

runMigration().catch(console.error);
