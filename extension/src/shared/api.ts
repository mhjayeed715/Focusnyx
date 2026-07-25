const SUPABASE_URL = "https://vavppeevglpvyfoorfje.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_daFD2p7ydAis9gUmaMtVxQ_OD7ccyze";

export async function authenticateUser(email: string, password: string): Promise<{ success: boolean; token?: string; userId?: string; email?: string; error?: string }> {
  try {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      const errorMsg = data.error_description || data.message || data.msg || "Invalid email or password";
      return { success: false, error: errorMsg };
    }

    return {
      success: true,
      token: data.access_token,
      userId: data.user?.id,
      email: data.user?.email || email,
    };
  } catch (err: any) {
    return { success: false, error: "Network error connecting to authentication server." };
  }
}

export async function syncBlockEvent(
  token: string,
  sessionId: string,
  url: string,
  type: string = "navigation_blocked",
  domain?: string,
  details?: Record<string, any>
): Promise<void> {
  if (!token) return;

  // Decode user_id from JWT
  let userId: string | null = null;
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    userId = payload.sub || null;
  } catch { }

  if (!userId) return;

  const resolvedDomain = domain || (url ? (() => { try { return new URL(url).hostname; } catch { return url; } })() : "unknown");
  const now = new Date().toISOString();

  await fetch(`${SUPABASE_URL}/rest/v1/distraction_logs`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_ANON_KEY,
      "Authorization": `Bearer ${token}`,
      "Prefer": "return=minimal",
    },
    body: JSON.stringify({
      user_id: userId,
      type,
      domain: resolvedDomain,
      blocked_at: now,
      details: details || { url, timestamp: now },
    }),
  }).catch((err) => console.warn("[Focusnyx Extension] Failed to sync block event:", err));
}

export async function fetchBlocklist(token: string): Promise<string[]> {
  if (!token) return [];
  // Fetch from Supabase profiles blocklist if available
  const res = await fetch(`${SUPABASE_URL}/rest/v1/profiles?select=blocklist`, {
    headers: {
      "apikey": SUPABASE_ANON_KEY,
      "Authorization": `Bearer ${token}`,
    },
  }).catch(() => null);
  if (!res?.ok) return [];
  const data = await res.json();
  return data?.[0]?.blocklist ?? [];
}
