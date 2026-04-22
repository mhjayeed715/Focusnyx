// Supabase Edge Function scaffold: weekly report aggregation
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

Deno.serve(async (_request) => {
  return new Response(JSON.stringify({ status: "weekly-report-scaffold" }), {
    headers: { "Content-Type": "application/json" }
  });
});
