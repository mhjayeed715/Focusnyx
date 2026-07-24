import { randomUUID } from "node:crypto";
import { Router } from "express";
import { getSupabaseAdminClient } from "../lib/supabase.js";
import { requireAuth } from "../middleware/auth.middleware.js";

export const academicRoutes = Router();

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function toCourseId(value: unknown) {
  const id = typeof value === "string" ? value.trim() : "";
  return uuidPattern.test(id) ? id : randomUUID();
}

function normalizeCourseRow(course: Record<string, any>, index: number, userId: string) {
  const fallbackName = `Course ${index + 1}`;
  const name = String(course.name ?? "").trim() || fallbackName;
  const credits = Math.max(0, Math.round(Number(course.credits ?? 3) || 3));
  const grade = String(course.grade ?? "A").trim() || "A";
  const targetGrade = String(course.targetGrade ?? course.grade ?? "A").trim() || grade;
  const midMarks = Math.max(0, Math.min(40, Number(course.midMarks ?? 0) || 0));

  return {
    id: toCourseId(course.id),
    user_id: userId,
    name,
    credits,
    grade,
    target_grade: targetGrade,
    mid_marks: midMarks,
  };
}

academicRoutes.use(requireAuth);

academicRoutes.get("/exams", async (request, response, next) => {
  try {
    const userId = request.authUser?.id;
    if (!userId) { response.status(401).json({ message: "Unauthorized." }); return; }
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("academic_exams")
      .select("id,title,exam_date,created_at")
      .eq("user_id", userId)
      .order("exam_date", { ascending: true });
    if (error) throw error;
    response.json({ exams: (data ?? []).map((r) => ({ id: r.id, title: r.title, date: r.exam_date, createdAt: r.created_at })) });
  } catch (error) { next(error); }
});

academicRoutes.post("/exams", async (request, response, next) => {
  try {
    const userId = request.authUser?.id;
    if (!userId) { response.status(401).json({ message: "Unauthorized." }); return; }
    const title = String(request.body?.title ?? "").trim();
    const date = String(request.body?.date ?? "").trim();
    if (!title || !date) { response.status(400).json({ message: "title and date are required." }); return; }
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("academic_exams")
      .insert({ user_id: userId, title, exam_date: date })
      .select("id,title,exam_date,created_at")
      .single();
    if (error) throw error;
    response.status(201).json({ exam: { id: data.id, title: data.title, date: data.exam_date, createdAt: data.created_at } });
  } catch (error) { next(error); }
});

academicRoutes.delete("/exams/:examId", async (request, response, next) => {
  try {
    const userId = request.authUser?.id;
    const examId = request.params.examId;
    if (!userId) { response.status(401).json({ message: "Unauthorized." }); return; }
    const supabase = getSupabaseAdminClient();
    const { error } = await supabase.from("academic_exams").delete().eq("id", examId).eq("user_id", userId);
    if (error) throw error;
    response.json({ success: true });
  } catch (error) { next(error); }
});

academicRoutes.get("/courses", async (request, response, next) => {
  try {
    const userId = request.authUser?.id;

    if (!userId) {
      response.status(401).json({ message: "Unauthorized." });
      return;
    }

    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("academic_courses")
      .select("id,name,credits,grade,target_grade,mid_marks,created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: true });

    if (error) {
      throw error;
    }

    response.json({
      courses: (data ?? []).map((row) => ({
        id: row.id,
        name: row.name,
        credits: Number(row.credits ?? 0),
        grade: row.grade,
        targetGrade: row.target_grade,
        midMarks: Number(row.mid_marks ?? 0),
        createdAt: row.created_at,
      })),
    });
  } catch (error) {
    next(error);
  }
});

academicRoutes.get("/semesters", async (request, response, next) => {
  try {
    const userId = request.authUser?.id;

    if (!userId) {
      response.status(401).json({ message: "Unauthorized." });
      return;
    }

    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("academic_semester_cgpas")
      .select("id,semester_no,cgpa_value,created_at")
      .eq("user_id", userId)
      .order("semester_no", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true });

    if (error) {
      throw error;
    }

    response.json({
      semesters: (data ?? []).map((row) => ({
        id: row.id,
        semesterNo: row.semester_no,
        cgpa: Number(row.cgpa_value ?? 0),
        createdAt: row.created_at,
      })),
    });
  } catch (error) {
    next(error);
  }
});

academicRoutes.post("/semesters", async (request, response, next) => {
  try {
    const userId = request.authUser?.id;

    if (!userId) {
      response.status(401).json({ message: "Unauthorized." });
      return;
    }

    const cgpa = Number(request.body?.cgpa);
    const semesterNoRaw = Number(request.body?.semesterNo);

    if (!Number.isFinite(cgpa)) {
      response.status(400).json({ message: "A valid cgpa is required." });
      return;
    }

    const payload = {
      user_id: userId,
      cgpa_value: Math.max(0, Math.min(4, cgpa)),
      semester_no: Number.isFinite(semesterNoRaw) ? Math.max(1, Math.round(semesterNoRaw)) : null,
    };

    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("academic_semester_cgpas")
      .insert(payload)
      .select("id,semester_no,cgpa_value,created_at")
      .single();

    if (error) {
      throw error;
    }

    response.status(201).json({
      semester: {
        id: data.id,
        semesterNo: data.semester_no,
        cgpa: Number(data.cgpa_value ?? 0),
        createdAt: data.created_at,
      },
    });
  } catch (error) {
    next(error);
  }
});

academicRoutes.delete("/semesters/:semesterId", async (request, response, next) => {
  try {
    const userId = request.authUser?.id;
    const semesterId = request.params.semesterId;

    if (!userId) {
      response.status(401).json({ message: "Unauthorized." });
      return;
    }

    const supabase = getSupabaseAdminClient();
    const { error } = await supabase
      .from("academic_semester_cgpas")
      .delete()
      .eq("id", semesterId)
      .eq("user_id", userId);

    if (error) {
      throw error;
    }

    response.json({ success: true });
  } catch (error) {
    next(error);
  }
});

academicRoutes.put("/courses", async (request, response, next) => {
  try {
    const userId = request.authUser?.id;

    if (!userId) {
      response.status(401).json({ message: "Unauthorized." });
      return;
    }

    if (!Array.isArray(request.body?.courses)) {
      response.status(400).json({ message: "A courses array is required." });
      return;
    }

    const courses = request.body.courses.map((course: Record<string, any>, index: number) => normalizeCourseRow(course, index, userId));

    const supabase = getSupabaseAdminClient();
    const { data: existingRows, error: existingError } = await supabase
      .from("academic_courses")
      .select("id")
      .eq("user_id", userId);

    if (existingError) {
      throw existingError;
    }

    if (courses.length > 0) {
      const { data, error } = await supabase
        .from("academic_courses")
        .upsert(courses, { onConflict: "id" })
        .select("id,name,credits,grade,target_grade,mid_marks,created_at")
        .eq("user_id", userId);

      if (error) {
        throw error;
      }

      const nextIds = new Set(courses.map((course) => course.id));
      const staleIds = (existingRows ?? []).map((row) => row.id).filter((id) => !nextIds.has(id));

      if (staleIds.length > 0) {
        const { error: deleteError } = await supabase
          .from("academic_courses")
          .delete()
          .eq("user_id", userId)
          .in("id", staleIds);

        if (deleteError) {
          throw deleteError;
        }
      }

      response.json({
        progress: courses?.map((course: any) => ({
          subject: course.title,
          progress: Math.floor(Math.random() * 40) + 60,
        })) || [],
        courses: (data ?? []).map((row) => ({
          id: row.id,
          name: row.name,
          credits: Number(row.credits ?? 0),
          grade: row.grade,
          targetGrade: row.target_grade,
          midMarks: Number(row.mid_marks ?? 0),
          createdAt: row.created_at,
        })),
      });
      return;
    }

    const { error } = await supabase.from("academic_courses").delete().eq("user_id", userId);

    if (error) {
      throw error;
    }

    response.json({ courses: [] });
  } catch (error) {
    next(error);
  }
});
