import { Router } from "express";
import { getSupabaseAdminClient } from "../lib/supabase.js";
import { requireAuth } from "../middleware/auth.middleware.js";

export const wellnessRoutes = Router();

// Apply auth middleware to all wellness routes
wellnessRoutes.use(requireAuth);

// ─── Wellness: Hydration ─────────────────────────────────────

wellnessRoutes.get("/hydration", async (request, response, next) => {
  try {
    const userId = request.authUser?.id;
    if (!userId) { response.status(401).json({ message: "Unauthorized." }); return; }
    
    const date = String(request.query.date ?? new Date().toISOString().split("T")[0]);
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("wellness_hydration")
      .select("glasses,goal")
      .eq("user_id", userId)
      .eq("log_date", date)
      .maybeSingle();
      
    if (error) throw error;
    response.json({ glasses: data?.glasses ?? 0, goal: data?.goal ?? 8 });
  } catch (error) { next(error); }
});

wellnessRoutes.post("/hydration", async (request, response, next) => {
  try {
    const userId = request.authUser?.id;
    if (!userId) { response.status(401).json({ message: "Unauthorized." }); return; }
    
    const glasses = Math.max(0, Number(request.body.glasses) || 0);
    const goal = Math.max(1, Number(request.body.goal) || 8);
    const date = String(request.body.date ?? new Date().toISOString().split("T")[0]);
    
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("wellness_hydration")
      .upsert({ user_id: userId, log_date: date, glasses, goal }, { onConflict: "user_id,log_date" })
      .select("glasses,goal")
      .single();
      
    if (error) throw error;
    response.json({ glasses: data.glasses, goal: data.goal });
  } catch (error) { next(error); }
});

// ─── Wellness: Sleep Sessions ────────────────────────────────

wellnessRoutes.get("/sleep", async (request, response, next) => {
  try {
    const userId = request.authUser?.id;
    if (!userId) { response.status(401).json({ message: "Unauthorized." }); return; }
    
    const date = String(request.query.date ?? new Date().toISOString().split("T")[0]);
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("wellness_sleep_sessions")
      .select("id,log_date,bedtime,wake_time,quality,duration_hours")
      .eq("user_id", userId)
      .eq("log_date", date)
      .order("created_at", { ascending: false });
      
    if (error) throw error;
    response.json({
      sessions: (data ?? []).map((r) => ({
        id: r.id,
        logDate: r.log_date,
        bedtime: r.bedtime,
        wakeTime: r.wake_time,
        quality: r.quality,
        durationHours: Number(r.duration_hours),
      })),
    });
  } catch (error) { next(error); }
});

wellnessRoutes.post("/sleep", async (request, response, next) => {
  try {
    const userId = request.authUser?.id;
    if (!userId) { response.status(401).json({ message: "Unauthorized." }); return; }
    
    const bedtime = request.body.bedtime ? String(request.body.bedtime) : null;
    const wakeTime = request.body.wake_time ? String(request.body.wake_time) : null;
    const quality = Math.max(1, Math.min(5, Number(request.body.quality) || 3));
    const durationHours = Math.max(0, Number(request.body.duration_hours) || 0);
    const date = String(request.body.date ?? new Date().toISOString().split("T")[0]);
    
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("wellness_sleep_sessions")
      .insert({
        user_id: userId,
        log_date: date,
        bedtime,
        wake_time: wakeTime,
        quality,
        duration_hours: durationHours,
      })
      .select("id")
      .single();
      
    if (error) throw error;
    response.status(201).json({ id: data.id });
  } catch (error) { next(error); }
});

// ─── Wellness: Mood Entries ──────────────────────────────────

wellnessRoutes.get("/mood", async (request, response, next) => {
  try {
    const userId = request.authUser?.id;
    if (!userId) { response.status(401).json({ message: "Unauthorized." }); return; }
    
    const date = String(request.query.date ?? new Date().toISOString().split("T")[0]);
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("wellness_mood_entries")
      .select("id,log_date,mood,note")
      .eq("user_id", userId)
      .eq("log_date", date)
      .order("created_at", { ascending: false });
      
    if (error) throw error;
    response.json({
      entries: (data ?? []).map((r) => ({
        id: r.id,
        logDate: r.log_date,
        mood: r.mood,
        note: r.note,
      })),
    });
  } catch (error) { next(error); }
});

wellnessRoutes.post("/mood", async (request, response, next) => {
  try {
    const userId = request.authUser?.id;
    if (!userId) { response.status(401).json({ message: "Unauthorized." }); return; }
    
    const mood = String(request.body.mood ?? "").trim();
    if (!mood) { response.status(400).json({ message: "mood is required." }); return; }
    const note = request.body.note ? String(request.body.note).trim() : null;
    const date = String(request.body.date ?? new Date().toISOString().split("T")[0]);
    
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("wellness_mood_entries")
      .insert({ user_id: userId, log_date: date, mood, note })
      .select("id")
      .single();
      
    if (error) throw error;
    response.status(201).json({ id: data.id });
  } catch (error) { next(error); }
});

// ─── Wellness: Medications ───────────────────────────────────

wellnessRoutes.get("/medications", async (request, response, next) => {
  try {
    const userId = request.authUser?.id;
    if (!userId) { response.status(401).json({ message: "Unauthorized." }); return; }
    
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("wellness_medications")
      .select("id,name,dosage,frequency,time_of_day,is_active")
      .eq("user_id", userId)
      .eq("is_active", true)
      .order("created_at", { ascending: true });
      
    if (error) throw error;
    response.json({
      medications: (data ?? []).map((r) => ({
        id: r.id,
        name: r.name,
        dosage: r.dosage,
        frequency: r.frequency,
        timeOfDay: r.time_of_day,
        isActive: r.is_active,
      })),
    });
  } catch (error) { next(error); }
});

wellnessRoutes.post("/medications", async (request, response, next) => {
  try {
    const userId = request.authUser?.id;
    if (!userId) { response.status(401).json({ message: "Unauthorized." }); return; }
    
    const name = String(request.body.name ?? "").trim();
    if (!name) { response.status(400).json({ message: "name is required." }); return; }
    const dosage = request.body.dosage ? String(request.body.dosage).trim() : null;
    const frequency = String(request.body.frequency ?? "daily").trim();
    const timeOfDay = String(request.body.time_of_day ?? "morning").trim();
    
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("wellness_medications")
      .insert({ user_id: userId, name, dosage, frequency, time_of_day: timeOfDay })
      .select("id")
      .single();
      
    if (error) throw error;
    response.status(201).json({ id: data.id });
  } catch (error) { next(error); }
});

wellnessRoutes.delete("/medications/:id", async (request, response, next) => {
  try {
    const userId = request.authUser?.id;
    const id = request.params.id;
    if (!userId) { response.status(401).json({ message: "Unauthorized." }); return; }
    
    const supabase = getSupabaseAdminClient();
    const { error } = await supabase
      .from("wellness_medications")
      .update({ is_active: false })
      .eq("id", id)
      .eq("user_id", userId);
      
    if (error) throw error;
    response.json({ success: true });
  } catch (error) { next(error); }
});

wellnessRoutes.get("/medications/logs", async (request, response, next) => {
  try {
    const userId = request.authUser?.id;
    if (!userId) { response.status(401).json({ message: "Unauthorized." }); return; }
    
    const date = String(request.query.date ?? new Date().toISOString().split("T")[0]);
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("wellness_medication_logs")
      .select("medication_id,taken")
      .eq("user_id", userId)
      .eq("log_date", date);
      
    if (error) throw error;
    const logs: Record<string, boolean> = {};
    (data ?? []).forEach((r) => { logs[r.medication_id] = r.taken; });
    response.json({ logs });
  } catch (error) { next(error); }
});

wellnessRoutes.post("/medications/:id/log", async (request, response, next) => {
  try {
    const userId = request.authUser?.id;
    const medicationId = request.params.id;
    if (!userId) { response.status(401).json({ message: "Unauthorized." }); return; }
    
    const taken = Boolean(request.body.taken);
    const date = String(request.body.date ?? new Date().toISOString().split("T")[0]);
    
    const supabase = getSupabaseAdminClient();
    const { error } = await supabase
      .from("wellness_medication_logs")
      .upsert({ user_id: userId, medication_id: medicationId, log_date: date, taken }, { onConflict: "medication_id,log_date" });
      
    if (error) throw error;
    response.json({ success: true });
  } catch (error) { next(error); }
});

// ─── Wellness: Activity (Steps) ──────────────────────────────

wellnessRoutes.get("/activity", async (request, response, next) => {
  try {
    const userId = request.authUser?.id;
    if (!userId) { response.status(401).json({ message: "Unauthorized." }); return; }
    
    const date = String(request.query.date ?? new Date().toISOString().split("T")[0]);
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("wellness_activity")
      .select("steps,goal")
      .eq("user_id", userId)
      .eq("log_date", date)
      .maybeSingle();
      
    if (error) throw error;
    response.json({ steps: data?.steps ?? 0, goal: data?.goal ?? 10000 });
  } catch (error) { next(error); }
});

wellnessRoutes.post("/activity", async (request, response, next) => {
  try {
    const userId = request.authUser?.id;
    if (!userId) { response.status(401).json({ message: "Unauthorized." }); return; }
    
    const steps = Math.max(0, Number(request.body.steps) || 0);
    const goal = Math.max(1, Number(request.body.goal) || 10000);
    const date = String(request.body.date ?? new Date().toISOString().split("T")[0]);
    
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("wellness_activity")
      .upsert({ user_id: userId, log_date: date, steps, goal }, { onConflict: "user_id,log_date" })
      .select("steps,goal")
      .single();
      
    if (error) throw error;
    response.json({ steps: data.steps, goal: data.goal });
  } catch (error) { next(error); }
});

// ─── Wellness: Body Metrics ──────────────────────────────────

wellnessRoutes.get("/body-metrics", async (request, response, next) => {
  try {
    const userId = request.authUser?.id;
    if (!userId) { response.status(401).json({ message: "Unauthorized." }); return; }
    
    const date = String(request.query.date ?? new Date().toISOString().split("T")[0]);
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("wellness_body_metrics")
      .select("weight_kg,height_cm")
      .eq("user_id", userId)
      .eq("log_date", date)
      .maybeSingle();
      
    if (error) throw error;
    response.json({ weightKg: data?.weight_kg ?? null, heightCm: data?.height_cm ?? null });
  } catch (error) { next(error); }
});

wellnessRoutes.post("/body-metrics", async (request, response, next) => {
  try {
    const userId = request.authUser?.id;
    if (!userId) { response.status(401).json({ message: "Unauthorized." }); return; }
    
    const weightKg = request.body.weight_kg !== undefined && request.body.weight_kg !== null ? Number(request.body.weight_kg) : null;
    const heightCm = request.body.height_cm !== undefined && request.body.height_cm !== null ? Number(request.body.height_cm) : null;
    const date = String(request.body.date ?? new Date().toISOString().split("T")[0]);
    
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("wellness_body_metrics")
      .upsert({ user_id: userId, log_date: date, weight_kg: weightKg, height_cm: heightCm }, { onConflict: "user_id,log_date" })
      .select("weight_kg,height_cm")
      .single();
      
    if (error) throw error;
    response.json({ weightKg: data.weight_kg, heightCm: data.height_cm });
  } catch (error) { next(error); }
});

// ─── Daily Wellness Snapshot ─────────────────────────────────

wellnessRoutes.get("/daily", async (request, response, next) => {
  try {
    const userId = request.authUser?.id;
    if (!userId) { response.status(401).json({ message: "Unauthorized." }); return; }

    const date = String(request.query.date ?? new Date().toISOString().split("T")[0]);
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("daily_wellness")
      .select("sleep_hours,mood_key,hydration_glasses,hydration_goal,steps,steps_goal")
      .eq("user_id", userId)
      .eq("log_date", date)
      .maybeSingle();

    if (error) throw error;
    response.json({
      sleepHours: Number(data?.sleep_hours ?? 0),
      moodKey: data?.mood_key ?? null,
      hydrationGlasses: data?.hydration_glasses ?? 0,
      hydrationGoal: data?.hydration_goal ?? 8,
      steps: data?.steps ?? 0,
      stepsGoal: data?.steps_goal ?? 10000,
    });
  } catch (error) { next(error); }
});

wellnessRoutes.post("/daily", async (request, response, next) => {
  try {
    const userId = request.authUser?.id;
    if (!userId) { response.status(401).json({ message: "Unauthorized." }); return; }

    const date = String(request.body.date ?? new Date().toISOString().split("T")[0]);
    const sleepHours = Math.max(0, Number(request.body.sleepHours) || 0);
    const moodKey = String(request.body.moodKey ?? "okay");
    const hydrationGlasses = Math.max(0, Number(request.body.hydrationGlasses) || 0);
    const hydrationGoal = Math.max(1, Number(request.body.hydrationGoal) || 8);
    const steps = Math.max(0, Number(request.body.steps) || 0);
    const stepsGoal = Math.max(1, Number(request.body.stepsGoal) || 10000);

    const supabase = getSupabaseAdminClient();
    const { error } = await supabase
      .from("daily_wellness")
      .upsert(
        {
          user_id: userId,
          log_date: date,
          sleep_hours: sleepHours,
          mood_key: moodKey,
          hydration_glasses: hydrationGlasses,
          hydration_goal: hydrationGoal,
          steps,
          steps_goal: stepsGoal,
        },
        { onConflict: "user_id,log_date" },
      );

    if (error) throw error;
    response.json({ success: true });
  } catch (error) { next(error); }
});

wellnessRoutes.get("/daily/log", async (request, response, next) => {
  try {
    const userId = request.authUser?.id;
    if (!userId) { response.status(401).json({ message: "Unauthorized." }); return; }

    const days = Math.min(30, Math.max(1, Number(request.query.days) || 7));
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("daily_wellness")
      .select("log_date,sleep_hours,mood_key,hydration_glasses,hydration_goal,steps,steps_goal")
      .eq("user_id", userId)
      .order("log_date", { ascending: false })
      .limit(days);

    if (error) throw error;
    response.json({
      log: (data ?? []).map((r) => ({
        date: r.log_date,
        sleepHours: Number(r.sleep_hours),
        moodKey: r.mood_key,
        hydrationGlasses: r.hydration_glasses,
        hydrationGoal: r.hydration_goal,
        steps: r.steps,
        stepsGoal: r.steps_goal,
      })),
    });
  } catch (error) { next(error); }
});
