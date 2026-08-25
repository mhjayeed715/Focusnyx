import { Router, Request, Response, NextFunction } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import { getSupabaseAdminClient } from "../lib/supabase.js";
import { env } from "../config/env.js";

export const coachRoutes = Router();

coachRoutes.use(requireAuth);

coachRoutes.get("/", (_request: Request, response: Response) => {
  response.json({ ok: true, module: "coach" });
});

function getBdtDateString(date = new Date()): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Dhaka",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(date);
}

coachRoutes.post("/chat", async (request: Request, response: Response, next: NextFunction) => {
  try {
    const user = request.authUser!;
    const body = request.body || {};
    const supabase = getSupabaseAdminClient();

    // 1. Check if user has a custom API key saved in their profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("groq_api_key, gemini_api_key, ai_provider")
      .eq("id", user.id)
      .maybeSingle();

    const provider = profile?.ai_provider === "gemini" ? "gemini" : "groq";
    const customKey = provider === "gemini" 
      ? profile?.gemini_api_key?.trim()
      : profile?.groq_api_key?.trim();

    const hasCustomKey = Boolean(customKey && customKey.length > 10);

    let apiKey = "";
    let isCustomKey = false;
    let currentUsage = 0;
    let limit = 5;

    if (hasCustomKey) {
      apiKey = customKey!;
      isCustomKey = true;
      limit = Infinity;
    } else {
      // 2. Free tier check: 5 requests per day, resetting at 12:00 AM BDT
      const bdtDate = getBdtDateString();
      let metadata: Record<string, any> = (user as any).user_metadata || {};
      
      try {
        const { data: userData } = await supabase.auth.admin.getUserById(user.id);
        if (userData?.user?.user_metadata) {
          metadata = userData.user.user_metadata;
        }
      } catch {}

      let usageDate = metadata.ai_usage_date;
      let usageCount = Number(metadata.ai_usage_count || 0);

      if (usageDate !== bdtDate) {
        usageCount = 0;
        usageDate = bdtDate;
      }

      if (usageCount >= 5) {
        response.status(403).json({
          error: "Daily free AI usage limit reached (5/5). Resets at 12:00 AM BDT (6:00 PM UTC). Please add your own Groq/Gemini API key in Settings for unlimited AI usage!",
          currentUsage: 5,
          limit: 5,
          resetTime: "12:00 AM BDT (6:00 PM UTC)",
        });
        return;
      }

      const nextCount = usageCount + 1;
      currentUsage = nextCount;

      // Update user_metadata asynchronously via admin client if available
      try {
        await supabase.auth.admin.updateUserById(user.id, {
          user_metadata: {
            ...metadata,
            ai_usage_date: bdtDate,
            ai_usage_count: nextCount,
          },
        });
      } catch {}

      apiKey = env.GROQ_API_KEY || process.env.GROQ_API_KEY || "";
      if (!apiKey) {
        response.status(500).json({ error: "Server Groq API key is missing. Please add your own API key in Settings." });
        return;
      }
    }

    // 3. Make completion request
    if (provider === "gemini" && isCustomKey) {
      const geminiContents = (body.messages || []).map((m: any) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content || "" }]
      }));
      const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: geminiContents }),
      });
      if (!geminiRes.ok) {
        const errorData = await geminiRes.json().catch(() => ({}));
        response.status(geminiRes.status).json({ error: "Gemini API error", details: errorData });
        return;
      }
      const data = await geminiRes.json();
      response.json({
        ...data,
        currentUsage,
        limit,
        isCustomKey,
      });
      return;
    }

    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: body.model || "llama-3.1-8b-instant",
        messages: body.messages || [],
        temperature: body.temperature ?? 0.7,
        max_tokens: body.max_tokens ?? 800,
      }),
    });

    if (!groqRes.ok) {
      const errorData = await groqRes.json().catch(() => ({}));
      response.status(groqRes.status).json({ error: "Groq API error", details: errorData });
      return;
    }

    const data = await groqRes.json();
    response.json({
      ...data,
      currentUsage,
      limit,
      isCustomKey,
    });
  } catch (err) {
    next(err);
  }
});
