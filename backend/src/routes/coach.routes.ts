import { Router } from "express";

export const coachRoutes = Router();

coachRoutes.get("/", (_request, response) => {
	response.json({ ok: true, module: "coach" });
});
