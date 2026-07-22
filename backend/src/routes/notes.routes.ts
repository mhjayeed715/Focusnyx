import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import { getSupabaseAdminClient } from "../lib/supabase.js";

export const notesRoutes = Router();

notesRoutes.get("/", (_request, response) => {
	response.json({ ok: true, module: "notes" });
});

notesRoutes.post("/", requireAuth, async (request, response, next) => {
	try {
		if (!request.authUser) {
			response.status(401).json({ message: "Unauthorized." });
			return;
		}

		const body = request.body as {
			subject?: string;
			content?: string;
			source?: string;
		};

		const subject = body.subject?.trim();
		const content = body.content?.trim();
		const source = body.source?.trim() || "typed";

		if (!subject || !content) {
			response.status(400).json({ message: "Subject and content are required." });
			return;
		}

		const supabase = getSupabaseAdminClient();

		const { error: profileError } = await supabase.from("profiles").upsert(
			{
				id: request.authUser.id,
				university_email: request.authUser.email,
				display_name: request.authUser.fullName,
			},
			{ onConflict: "id" },
		);

		if (profileError) {
			response.status(400).json({ message: profileError.message });
			return;
		}

		const { error } = await supabase.from("notes").insert({
			user_id: request.authUser.id,
			subject,
			content,
			source,
		});

		if (error) {
			response.status(400).json({ message: error.message });
			return;
		}

		response.json({ ok: true });
	} catch (error) {
		next(error);
	}
});
