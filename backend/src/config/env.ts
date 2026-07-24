import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(8080),
  JWT_SECRET: z.string().default("dev-secret"),
  SUPABASE_URL: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  FRONTEND_URL: z.string().url().optional(),
  GEMINI_API_KEY: z.string().optional(),
  GROQ_API_KEY: z.string().optional(),
  EXTENSION_SHARED_TOKEN_SECRET: z.string().default("ext-dev-secret")
});

export const env = envSchema.parse(process.env);
