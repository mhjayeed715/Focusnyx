import type { NextFunction, Request, Response } from "express";

export function errorHandler(error: unknown, request: Request, response: Response, next: NextFunction) {
	if (response.headersSent) {
		next(error);
		return;
	}

	const statusCode = typeof (error as { statusCode?: number })?.statusCode === "number" ? (error as { statusCode: number }).statusCode : 500;
	const message = error instanceof Error ? error.message : "Internal server error.";

	response.status(statusCode).json({ message });
}
