import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-notification-admin-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return Response.json({ error: "Method not allowed" }, { status: 405, headers: corsHeaders });

  const adminSecret = Deno.env.get("NOTIFICATION_ADMIN_SECRET");
  const suppliedSecret = request.headers.get("x-notification-admin-secret");
  if (!adminSecret || !suppliedSecret || suppliedSecret !== adminSecret) {
    return Response.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders });
  }

  const payload = await request.json().catch(() => null) as
    | { title?: string; body?: string; category?: string; data?: Record<string, unknown> }
    | null;
  const title = payload?.title?.trim();
  const body = payload?.body?.trim();
  const category = payload?.category;
  if (!title || !body || title.length > 100 || body.length > 500 ||
      !["new_music", "artist_releases", "app_announcements"].includes(category ?? "")) {
    return Response.json({ error: "Provide title, body and a valid category." }, { status: 400, headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return Response.json({ error: "Server notification secrets are not configured." }, { status: 500, headers: corsHeaders });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const preferenceColumn = category as "new_music" | "artist_releases" | "app_announcements";
  const { data: devices, error } = await supabase
    .from("device_push_tokens")
    .select("expo_push_token")
    .eq(preferenceColumn, true);

  if (error) return Response.json({ error: error.message }, { status: 500, headers: corsHeaders });

  const messages = (devices ?? []).map((device) => ({
    to: device.expo_push_token,
    sound: "default",
    title,
    body,
    channelId: "lumamusic-updates",
    data: payload?.data ?? {}
  }));

  let accepted = 0;
  const errors: unknown[] = [];
  for (let index = 0; index < messages.length; index += 100) {
    const batch = messages.slice(index, index + 100);
    const result = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(batch)
    });
    const resultBody = await result.json().catch(() => ({}));
    if (!result.ok) errors.push({ status: result.status, response: resultBody });
    else accepted += batch.length;
  }

  return Response.json({ targeted: messages.length, accepted, errors }, { headers: corsHeaders });
});
