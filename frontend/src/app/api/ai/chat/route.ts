import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { checkAndIncrementAiUsage } from "@/lib/aiUsageLimiter";

export async function POST(req: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const customApiKey = req.headers.get("x-custom-ai-key") || body?.apiKey || "";

    // Check Global Daily AI Usage Limiter (5 requests/day reset at 12:00 AM BDT / 6:00 PM UTC)
    const usageCheck = await checkAndIncrementAiUsage(user.id, supabase, customApiKey);

    if (!usageCheck.allowed) {
      return NextResponse.json(
        {
          error: usageCheck.error,
          currentUsage: usageCheck.currentUsage,
          limit: usageCheck.limit,
          resetTime: "12:00 AM BDT (6:00 PM UTC)",
        },
        { status: 403 }
      );
    }

    // Determine key to use: custom key or server fallback key
    const groqKey = (customApiKey && customApiKey.trim().length > 10) ? customApiKey : process.env.GROQ_API_KEY;

    if (!groqKey) {
      return NextResponse.json({ error: "Server AI key is missing. Add your own Groq key in Settings." }, { status: 500 });
    }

    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${groqKey}`
      },
      body: JSON.stringify({
        model: body.model || "llama-3.3-70b-versatile",
        messages: body.messages || [],
        temperature: body.temperature ?? 0.7,
        max_tokens: body.max_tokens ?? 800,
      }),
    });

    if (!groqRes.ok) {
      const errorData = await groqRes.json().catch(() => ({}));
      return NextResponse.json({ error: "Groq API error", details: errorData }, { status: groqRes.status });
    }

    const data = await groqRes.json();

    return NextResponse.json({
      ...data,
      currentUsage: usageCheck.currentUsage,
      limit: usageCheck.limit,
      isCustomKey: usageCheck.isCustomKey,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
