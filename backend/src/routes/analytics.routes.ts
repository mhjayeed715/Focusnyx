import { Router } from "express";

export const analyticsRoutes = Router();

analyticsRoutes.get("/", (_request, response) => {
	response.json({ ok: true, module: "analytics" });
});
