import { SupabaseClient } from "@supabase/supabase-js";

export interface AiUsageStatus {
  allowed: boolean;
  isCustomKey: boolean;
  currentUsage: number;
  limit: number;
  error?: string;
  bdtDate: string;
}

/**
 * Returns current date string in Asia/Dhaka (Bangladesh Time - BDT).
 * Resets at 12:00 AM BDT (which corresponds to 6:00 PM UTC of previous calendar day).
 */
export function getBdtDateString(date = new Date()): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Dhaka",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(date);
}

/**
 * Checks and increments the daily AI usage for a user.
 * 
 * Rules:
 * 1. If user provides a custom API key (e.g. Groq/Gemini key in settings/header), usage is UNLIMITED.
 * 2. Without a custom key, user gets 5 free AI requests per day across all AI features.
 * 3. Daily quota resets at 12:00 AM BDT (6:00 PM UTC of previous day).
 */
export async function checkAndIncrementAiUsage(
  userId: string,
  supabase: SupabaseClient,
  customApiKey?: string
): Promise<AiUsageStatus> {
  const bdtDate = getBdtDateString();

  // 1. Check if user provided an explicit custom key in request header/body
  if (customApiKey && customApiKey.trim().length > 10 && !customApiKey.includes("your-api-key")) {
    return {
      allowed: true,
      isCustomKey: true,
      currentUsage: 0,
      limit: Infinity,
      bdtDate,
    };
  }

  // 2. Check if user has saved a custom key in their database profile
  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("groq_api_key, gemini_api_key")
      .eq("id", userId)
      .maybeSingle();

    if (
      (profile?.groq_api_key && profile.groq_api_key.trim().length > 10) ||
      (profile?.gemini_api_key && profile.gemini_api_key.trim().length > 10)
    ) {
      return {
        allowed: true,
        isCustomKey: true,
        currentUsage: 0,
        limit: Infinity,
        bdtDate,
      };
    }
  } catch {}

  // 3. Built-in free tier check (5 free requests / day, resetting at 12:00 AM BDT)
  try {
    const { data: userRes } = await supabase.auth.getUser();
    const user = userRes?.user;
    const userMetadata = user?.user_metadata || {};
    
    let usageDate = userMetadata.ai_usage_date;
    let usageCount = userMetadata.ai_usage_count || 0;

    // Reset usage if it's a new day in Bangladesh Time (12:00 AM BDT / 6:00 PM UTC)
    if (usageDate !== bdtDate) {
      usageCount = 0;
      usageDate = bdtDate;
    }

    if (usageCount >= 5) {
      return {
        allowed: false,
        isCustomKey: false,
        currentUsage: 5,
        limit: 5,
        bdtDate,
        error: "Daily free AI usage limit reached (5/5). Resets at 12:00 AM BDT (6:00 PM UTC). Please add your own Groq/Gemini API key in Settings for unlimited AI usage!",
      };
    }

    const nextCount = usageCount + 1;

    // Increment usage in metadata (async non-blocking)
    await supabase.auth.updateUser({
      data: {
        ai_usage_date: bdtDate,
        ai_usage_count: nextCount,
      },
    }).catch(() => {});

    return {
      allowed: true,
      isCustomKey: false,
      currentUsage: nextCount,
      limit: 5,
      bdtDate,
    };
  } catch {
    // Fallback: allow request if user metadata fetch fails
    return {
      allowed: true,
      isCustomKey: false,
      currentUsage: 1,
      limit: 5,
      bdtDate,
    };
  }
}
