// Supabase Edge Function scaffold: monthly review generation
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

Deno.serve(async (_request) => {
  return new Response(JSON.stringify({ status: "monthly-review-scaffold" }), {
    headers: { "Content-Type": "application/json" }
  });
});
