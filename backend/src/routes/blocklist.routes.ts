import { Router } from "express";

export const blocklistRoutes = Router();

blocklistRoutes.get("/", (_request, response) => {
	response.json({ ok: true, module: "blocklist" });
});
