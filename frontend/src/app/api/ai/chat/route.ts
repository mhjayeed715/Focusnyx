import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { checkAndIncrementAiUsage } from "@/lib/aiUsageLimiter";

export async function POST(req: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    
    // Check Authorization header first, then session cookies
    const authHeader = req.headers.get("authorization");
    let user = null;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "").trim();
      if (token) {
        const { data } = await supabase.auth.getUser(token);
        user = data?.user;
      }
    }

    if (!user) {
      const { data: { user: cookieUser } } = await supabase.auth.getUser();
      user = cookieUser;
    }

    if (!user) {
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

    const candidateModels = [
      body.model,
      "openai/gpt-oss-120b",
      "llama-3.3-70b-versatile",
      "llama-3.1-8b-instant",
      "openai/gpt-oss-20b",
      "qwen/qwen3.8-27b",
      "groq/compound"
    ];
    const modelsToTry = Array.from(new Set(candidateModels.filter(Boolean)));

    let responseData: any = null;
    let lastStatus = 500;
    let lastErrorMessage = "Groq API error";

    for (const model of modelsToTry) {
      try {
        const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${groqKey}`
          },
          body: JSON.stringify({
            model,
            messages: body.messages || [],
            temperature: body.temperature ?? 0.7,
            max_tokens: body.max_tokens ?? 800,
          }),
        });

        if (groqRes.ok) {
          responseData = await groqRes.json();
          break;
        }

        const errorData = await groqRes.json().catch(() => ({}));
        lastStatus = groqRes.status;
        
        const rawMsg = errorData?.error?.message || errorData?.message || (typeof errorData?.error === "string" ? errorData.error : "");
        lastErrorMessage = rawMsg || "Groq API error";

        if (lastStatus === 401 || lastErrorMessage.toLowerCase().includes("invalid api key")) {
          lastErrorMessage = "Server Groq API key is invalid or revoked. Please add your own valid Groq or Gemini API key in Settings → AI Provider.";
          break;
        }

        const errLower = lastErrorMessage.toLowerCase();
        // Only cycle to the next model if it's a model not found / access issue
        if (!errLower.includes("model") && !errLower.includes("not exist") && !errLower.includes("access")) {
          break;
        }
      } catch (err: any) {
        lastErrorMessage = err?.message || "Network error";
      }
    }

    if (!responseData) {
      return NextResponse.json({ error: String(lastErrorMessage) }, { status: lastStatus });
    }

    return NextResponse.json({
      ...responseData,
      currentUsage: usageCheck.currentUsage,
      limit: usageCheck.limit,
      isCustomKey: usageCheck.isCustomKey,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
