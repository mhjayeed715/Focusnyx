import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Determine current date in Bangladesh Timezone
    const now = new Date();
    const bdtTimeStr = now.toLocaleString("en-US", { timeZone: "Asia/Dhaka" });
    const bdtTime = new Date(bdtTimeStr);
    const bdtDateString = `${bdtTime.getFullYear()}-${bdtTime.getMonth() + 1}-${bdtTime.getDate()}`;

    // Get current usage from user metadata
    let ai_usage_date = user.user_metadata?.ai_usage_date;
    let ai_usage_count = user.user_metadata?.ai_usage_count || 0;

    // Reset usage if it's a new day in Bangladesh
    if (ai_usage_date !== bdtDateString) {
      ai_usage_count = 0;
      ai_usage_date = bdtDateString;
    }

    if (ai_usage_count >= 5) {
      return NextResponse.json(
        { error: "Free tier exhausted. Please add your own Groq API key in Settings to continue." },
        { status: 403 }
      );
    }

    const body = await req.json();

    // Use built-in Groq key
    const groqKey = process.env.GROQ_API_KEY;
    if (!groqKey) {
      return NextResponse.json({ error: "Server AI key is missing." }, { status: 500 });
    }

    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${groqKey}`
      },
      body: JSON.stringify(body),
    });

    if (!groqRes.ok) {
      const errorData = await groqRes.json();
      return NextResponse.json({ error: "Groq API error", details: errorData }, { status: groqRes.status });
    }

    const data = await groqRes.json();

    // Increment usage
    await supabase.auth.updateUser({
      data: {
        ai_usage_date: bdtDateString,
        ai_usage_count: ai_usage_count + 1
      }
    });

    return NextResponse.json({ ...data, currentUsage: ai_usage_count + 1, limit: 5 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
