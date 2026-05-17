import type { NextFunction, Request, Response } from "express";
import { getSupabaseAdminClient } from "../lib/supabase.js";

export type AuthenticatedUser = {
  id: string;
  email: string;
  fullName: string;
  accessToken: string;
};

declare module "express-serve-static-core" {
  interface Request {
    authUser?: AuthenticatedUser;
  }
}

function getBearerToken(request: Request) {
  const header = request.headers.authorization;

  if (!header?.startsWith("Bearer ")) {
    return null;
  }

  return header.slice(7).trim() || null;
}

export async function requireAuth(request: Request, response: Response, next: NextFunction) {
  const token = getBearerToken(request);

  if (!token) {
    response.status(401).json({ message: "Missing access token." });
    return;
  }

  try {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      response.status(401).json({ message: "Invalid or expired session." });
      return;
    }

    request.authUser = {
      id: data.user.id,
      email: data.user.email ?? "student@example.com",
      fullName:
        (data.user.user_metadata?.full_name as string | undefined) ??
        (data.user.user_metadata?.name as string | undefined) ??
        data.user.email?.split("@")[0] ??
        "Student",
      accessToken: token,
    };

    next();
  } catch (error) {
    next(error);
  }
}