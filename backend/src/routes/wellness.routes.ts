import { Router } from "express";

export const wellnessRoutes = Router();

wellnessRoutes.get("/", (_request, response) => {
	response.json({ ok: true, module: "wellness" });
});
