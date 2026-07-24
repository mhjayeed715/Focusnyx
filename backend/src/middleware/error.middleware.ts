import type { NextFunction, Request, Response } from "express";

import * as fs from "fs";

export function errorHandler(error: unknown, request: Request, response: Response, next: NextFunction) {
	if (response.headersSent) {
		next(error);
		return;
	}

	const statusCode = typeof (error as { statusCode?: number })?.statusCode === "number" ? (error as { statusCode: number }).statusCode : 500;
	const message = error instanceof Error ? error.message : "Internal server error.";

	console.error("[Backend Error]", error);
	try {
		fs.appendFileSync("error.log", new Date().toISOString() + " " + JSON.stringify(error, Object.getOwnPropertyNames(error)) + "\n");
	} catch (e) {}

	response.status(statusCode).json({ message });
}
