import { createBrowserClient } from "@supabase/ssr";

let client: ReturnType<typeof createBrowserClient> | null = null;

// Bypass navigator.locks to prevent "lock stole" errors in Chrome concurrent requests
const noOpLock = async (
  _name: string,
  _acquireTimeout: number,
  fn: () => Promise<unknown>
) => {
  return await fn();
};

export function createClient() {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Missing Supabase environment variables for browser client.");

  client = createBrowserClient(url, key, {
    auth: {
      lock: noOpLock,
      persistSession: true,
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    },
  });
  return client;
}
