import { createAdminClient } from '../lib/supabase-server';

async function runMigration() {
  console.log("Starting migration...");
  const adminClient = createAdminClient();
  
  const sql = `
    ALTER TABLE agent_traces ADD COLUMN IF NOT EXISTS agent_name TEXT;
    ALTER TABLE agent_traces ADD COLUMN IF NOT EXISTS user_id UUID;
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
