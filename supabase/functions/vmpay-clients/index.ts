// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ ok: false, erro: "Não autenticado." }, 200);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { workspaceId } = (await req.json().catch(() => ({}))) as {
      workspaceId?: string;
    };
    if (!workspaceId) return json({ ok: false, erro: "workspaceId obrigatório." }, 200);

    const { data: cfg, error } = await supabase
      .from("workspace_vmpay_config")
      .select("api_key")
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    if (error) return json({ ok: false, erro: error.message, clientes: [] }, 200);
    if (!cfg?.api_key)
      return json({ ok: false, erro: "Nenhuma chave VMPay cadastrada.", clientes: [] }, 200);

    const url = `https://vmpay.vertitecnologia.com.br/api/v1/clients?access_token=${encodeURIComponent(cfg.api_key)}`;
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      return json(
        { ok: false, erro: `VMPay respondeu ${res.status}: ${txt.slice(0, 200)}`, clientes: [] },
        200,
      );
    }
    const arr = (await res.json()) as Array<{ id: number; name: string }>;
    return json({
      ok: true,
      clientes: (arr ?? []).map((c) => ({ id: c.id, name: c.name })),
    }, 200);
  } catch (e: any) {
    return json({ ok: false, erro: e?.message ?? "Falha inesperada.", clientes: [] }, 200);
  }
});

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
