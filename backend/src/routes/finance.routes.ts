import { Router } from "express";

export const financeRoutes = Router();

financeRoutes.get("/", (_request, response) => {
	response.json({ ok: true, module: "finance" });
});
