const SUPABASE_URL = "https://vavppeevglpvyfoorfje.supabase.co";
// Real Supabase JWT anon key — must be a valid JWT (eyJ...) from Supabase Dashboard > Settings > API
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhdnBwZWV2Z2xwdnlmb29yZmplIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY4ODEwNTksImV4cCI6MjA5MjQ1NzA1OX0.3PI_2nJsIHaJUzvEc_cNggcwbv147Q2aGlRhVdBncuA";

export async function authenticateUser(email: string, password: string): Promise<{ success: boolean; token?: string; userId?: string; email?: string; error?: string }> {
  try {
    console.log("[Focusnyx Extension] Authenticating user:", email);
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
      console.error("[Focusnyx Extension] Auth failed:", errorMsg);
      return { success: false, error: errorMsg };
    }

    console.log("[Focusnyx Extension] Auth successful. User ID:", data.user?.id);
    return {
      success: true,
      token: data.access_token,
      userId: data.user?.id,
      email: data.user?.email || email,
    };
  } catch (err: any) {
    console.error("[Focusnyx Extension] Auth network error:", err);
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
  if (!token) {
    console.warn("[Focusnyx Extension] syncBlockEvent skipped: no auth token available");
    return;
  }

  // Decode user_id from JWT safely (handles base64url in Supabase JWTs)
  let userId: string | null = null;
  try {
    const base64Url = token.split(".")[1];
    if (base64Url) {
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      const pad = base64.length % 4;
      const padded = pad ? base64 + "=".repeat(4 - pad) : base64;
      const jsonPayload = decodeURIComponent(
        atob(padded)
          .split("")
          .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
          .join("")
      );
      const parsed = JSON.parse(jsonPayload);
      userId = parsed.sub || parsed.user_id || null;
    }
  } catch (e) {
    console.warn("[Focusnyx Extension] JWT decode warning:", e);
  }

  if (!userId) {
    console.warn("[Focusnyx Extension] syncBlockEvent skipped: could not extract user_id from JWT");
    return;
  }

  const resolvedDomain = domain || (url ? (() => { try { return new URL(url).hostname; } catch { return url; } })() : "unknown");
  const now = new Date().toISOString();

  console.log("[Focusnyx Extension] Logging distraction:", { type, domain: resolvedDomain, url });

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/distraction_logs`, {
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
        timestamp: now,
        details: details || { url, timestamp: now },
      }),
    });
    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      console.error("[Focusnyx Extension] Failed to insert distraction_log:", res.status, errBody);
    } else {
      console.log("[Focusnyx Extension] Distraction log saved successfully for:", resolvedDomain);
    }
  } catch (err) {
    console.warn("[Focusnyx Extension] Failed to sync block event:", err);
  }
}

export async function fetchBlocklist(token: string): Promise<string[]> {
  if (!token) return [];
  // Fetch active blocked sites from the blocklist_sites table
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/blocklist_sites?select=domain&is_active=eq.true`, {
      headers: {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": `Bearer ${token}`,
      },
    });
    if (!res.ok) {
      console.warn("[Focusnyx Extension] Failed to fetch blocklist:", res.status);
      return [];
    }
    const data = await res.json();
    return (data || []).map((row: { domain: string }) => row.domain).filter(Boolean);
  } catch (err) {
    console.warn("[Focusnyx Extension] Error fetching blocklist:", err);
    return [];
  }
}
