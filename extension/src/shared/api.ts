const BASE = "http://localhost:4000";
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
  await fetch(`${BASE}/focus/block-event`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      session_id: sessionId,
      url,
      type,
      domain: domain || (url ? (() => { try { return new URL(url).hostname; } catch { return url; } })() : "unknown"),
      details: details || { url, timestamp: new Date().toISOString() },
      timestamp: Date.now()
    }),
  }).catch((err) => console.warn("[Focusnyx API] Failed to sync block event:", err));
}

export async function fetchBlocklist(token: string): Promise<string[]> {
  if (!token) return [];
  const res = await fetch(`${BASE}/blocklist`, {
    headers: { Authorization: `Bearer ${token}` },
  }).catch(() => null);
  if (!res?.ok) return [];
  const data = await res.json();
  return data.domains ?? [];
}
