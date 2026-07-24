import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { collectWeeklyData, WeeklySummary } from "@/lib/weeklyDataCollector";

export async function POST(req: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey =
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

    const sb = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll() {},
      },
    });

    const {
      data: { user },
      error: authErr,
    } = await sb.auth.getUser();

    let userId = user?.id;

    let parsedBody: any = {};
    try {
      const bodyText = await req.text();
      if (bodyText) parsedBody = JSON.parse(bodyText);
    } catch {}

    if (!userId && parsedBody?.userId) {
      userId = parsedBody.userId;
    }
    
    const isForce = !!parsedBody?.force;

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized / Missing userId" },
        { status: 401 }
      );
    }

    const weekChunk = getCurrentWeekChunk();
    const weekStartStr = weekChunk.start.split("T")[0];
    const weekEndStr = weekChunk.end.split("T")[0];

    // Check if report already exists for this week chunk
    if (!isForce) {
      const { data: existingReport } = await sb
        .from("weekly_reports")
        .select("*")
        .eq("user_id", userId)
        .eq("week_start", weekStartStr)
        .maybeSingle();

      if (existingReport) {
        return NextResponse.json({ report: existingReport });
      }
    } else {
      // Delete old report if forcing regenerate
      await sb
        .from("weekly_reports")
        .delete()
        .eq("user_id", userId)
        .eq("week_start", weekStartStr);
    }

    // Collect weekly data
    const weeklyData = await collectWeeklyData(userId, sb, weekChunk.start, weekChunk.end);
    const { summary } = weeklyData;

    // Call Groq API
    const groqApiKey = process.env.GROQ_API_KEY;
    let aiReport = "";

    if (groqApiKey) {
      const prompt = buildInsightPrompt(summary);
      try {
        const groqRes = await fetch(
          "https://api.groq.com/openai/v1/chat/completions",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${groqApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "llama-3.3-70b-versatile",
              messages: [
                {
                  role: "system",
                  content: `You are an empathetic AI study coach named Nyx, built into Focusnyx — a productivity app for Bangladeshi university students. 
You write weekly behavioral insights in a warm, motivating, and honest tone.
Never use bullet points — write in natural flowing paragraphs.
Keep it under 300 words. Always end with one specific, actionable advice for next week.
If data is missing or zero for some areas, acknowledge it kindly and encourage tracking.
Write like a friend who knows their habits well, not like a corporate report.`,
                },
                {
                  role: "user",
                  content: prompt,
                },
              ],
              temperature: 0.75,
              max_tokens: 500,
            }),
          }
        );

        if (groqRes.ok) {
          const completion = await groqRes.json();
          aiReport = completion.choices?.[0]?.message?.content || "";
        } else {
          console.warn("Groq API returned error status:", groqRes.status);
        }
      } catch (gErr) {
        console.error("Groq fetch error:", gErr);
      }
    }

    // Fallback AI report if Groq key isn't provided or call failed
    if (!aiReport) {
      aiReport = generateFallbackReport(summary);
    }

    const highlights = extractHighlights(summary);
    const todayIso = new Date().toISOString().split("T")[0];

    // Save report to Supabase
    const { data: savedReport, error: insertErr } = await sb
      .from("weekly_reports")
      .insert({
        user_id: userId,
        week_start: weekStartStr,
        week_end: weekEndStr,
        raw_data: summary,
        ai_report: aiReport,
        highlights,
      })
      .select()
      .single();

    if (insertErr) {
      console.error("Failed to insert report into Supabase:", insertErr);
      // Return fallback payload
      return NextResponse.json({
        report: {
          id: "temp-" + Date.now(),
          user_id: userId,
          week_start: weekStartStr,
          week_end: weekEndStr,
          raw_data: summary,
          ai_report: aiReport,
          highlights,
          generated_at: new Date().toISOString(),
        },
      });
    }

    return NextResponse.json({ report: savedReport });
  } catch (error: any) {
    console.error("Weekly report generation error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to generate report" },
      { status: 500 }
    );
  }
}

function buildInsightPrompt(summary: WeeklySummary): string {
  return `
Here is my study data from the past 7 days. Generate a personalized weekly insight report.

FOCUS DATA:
- Total focus sessions: ${summary.focus.totalSessions}
- Completed sessions: ${summary.focus.completedSessions}
- Total study time: ${summary.focus.totalFocusMinutes} minutes
- Average session length: ${summary.focus.avgSessionLength} minutes
- Best study day: ${summary.focus.bestDay} (${summary.focus.bestDayMinutes} min)

DISTRACTION DATA:
- Total distraction attempts: ${summary.distractions.total}
- Types of distractions: ${JSON.stringify(summary.distractions.byType)}
- Peak distraction time: ${summary.distractions.peakHour}

NOTES & LEARNING:
- Voice notes captured: ${summary.notes.total}
- Subjects covered: ${summary.notes.subjects.join(", ") || "None recorded"}

WELLNESS:
- Average mood score: ${summary.wellness.avgMoodScore || "Not tracked"} out of 5
- Average sleep hours: ${summary.wellness.avgSleepHours || "Not tracked"}
- Mood entries logged: ${summary.wellness.moodEntries}

FINANCE:
- Total spent: ৳${summary.finance.totalSpent}
- Transactions logged: ${summary.finance.entries}

Write a personalized weekly summary. Be warm, specific, and use the actual numbers.
Point out what went well, what pattern you notice, and give one clear recommendation for next week.
`.trim();
}

function extractHighlights(summary: WeeklySummary) {
  return {
    topStat: `${summary.focus.totalFocusMinutes} min focused`,
    distractionCount: summary.distractions.total,
    bestDay: summary.focus.bestDay,
    avgMood: summary.wellness.avgMoodScore,
    sessionsCompleted: summary.focus.completedSessions,
  };
}

function generateFallbackReport(summary: WeeklySummary): string {
  const mins = summary.focus.totalFocusMinutes;
  const sessions = summary.focus.completedSessions;
  const best = summary.focus.bestDay;
  const dist = summary.distractions.total;

  return `Hey there! Looking at your focus logs for this past week, you logged ${mins} minutes across ${sessions} study sessions. Your highest concentration happened on ${best}, which was a strong day for your learning consistency. On the flip side, we detected ${dist} distraction attempts, with peak friction around ${summary.distractions.peakHour}. 

Remember that building deep focus is a journey of small daily wins. For next week, try scheduling your toughest core study block right before your usual peak distraction hours to stay ahead of tiredness!`;
}

function getCurrentWeekChunk(): { start: string, end: string } {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const date = today.getDate();

  let startDay = 1;
  let endDay = 7;

  if (date >= 1 && date <= 7) { startDay = 1; endDay = 7; }
  else if (date >= 8 && date <= 14) { startDay = 8; endDay = 14; }
  else if (date >= 15 && date <= 21) { startDay = 15; endDay = 21; }
  else {
    startDay = 22;
    endDay = new Date(year, month + 1, 0).getDate();
  }

  const start = new Date(year, month, startDay).toISOString();
  const end = new Date(year, month, endDay, 23, 59, 59, 999).toISOString();
  
  return { start, end };
}
