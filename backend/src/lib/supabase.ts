import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "../config/env.js";

let adminClient: SupabaseClient | null = null;

export function getSupabaseAdminClient() {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Missing Supabase service configuration.");
  }

  if (!adminClient) {
    adminClient = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  return adminClient;
}