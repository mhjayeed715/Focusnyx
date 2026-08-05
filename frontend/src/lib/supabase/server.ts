import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export function createServerSupabaseClient() {
  const cookieStore = cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error("Missing Supabase environment variables for server client.");
  }

  return createServerClient(url, key, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: Record<string, unknown>) {
        cookieStore.set({ name, value, ...options, maxAge: 31536000, path: "/", sameSite: "lax", secure: process.env.NODE_ENV === 'production' });
      },
      remove(name: string, options: Record<string, unknown>) {
        cookieStore.set({ name, value: "", ...options, maxAge: 0, path: "/", sameSite: "lax", secure: process.env.NODE_ENV === 'production' });
      }
    },
    cookieOptions: {
      maxAge: 31536000,
      path: "/",
      sameSite: "lax",
    },
  });
}
