import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function POST(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

  const sb = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return req.cookies.getAll();
      },
      setAll() {
        // No response cookie refresh is needed for this write-only endpoint.
      },
    },
  });

  const { data: { user }, error: authErr } = await sb.auth.getUser();
  if (authErr || !user) return NextResponse.json({ error: "Invalid session" }, { status: 401 });

  // Ensure profile row exists (prevents FK violation for users created before trigger)
  await sb.from("profiles").upsert(
    { id: user.id, university_email: user.email ?? "", display_name: user.email?.split("@")[0] ?? "" },
    { onConflict: "id", ignoreDuplicates: true }
  );

  const body = await req.json() as { subject: string; content: string; source: string };

  const { error } = await sb.from("notes").insert({
    user_id: user.id,
    subject: body.subject,
    content: body.content,
    source: body.source,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
