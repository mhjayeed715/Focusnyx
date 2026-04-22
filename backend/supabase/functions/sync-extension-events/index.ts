// Supabase Edge Function scaffold: sync blocked site events from extension
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

Deno.serve(async (_request) => {
  return new Response(JSON.stringify({ status: "sync-extension-events-scaffold" }), {
    headers: { "Content-Type": "application/json" }
  });
});
