import { Router } from "express";

export const notesRoutes = Router();

notesRoutes.get("/", (_request, response) => {
	response.json({ ok: true, module: "notes" });
});
