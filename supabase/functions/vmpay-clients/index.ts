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
    if (!authHeader) return json({ ok: false, erro: "Não autenticado." }, 200);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { workspaceId } = (await req.json().catch(() => ({}))) as { workspaceId?: string };
    if (!workspaceId) return json({ ok: false, erro: "workspaceId obrigatório." }, 200);

    const { data: cfg, error } = await supabase
      .from("workspace_vmpay_config")
      .select("api_key")
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    if (error) return json({ ok: false, erro: error.message, clientes: [] }, 200);
    if (!cfg?.api_key)
      return json({ ok: false, erro: "Nenhuma chave VMPay cadastrada.", clientes: [] }, 200);

    const perPage = 200;
    const todos: Array<{ id: number; name: string }> = [];
    let page = 1;
    const maxPages = 50;
    while (page <= maxPages) {
      const url = `https://vmpay.vertitecnologia.com.br/api/v1/clients?access_token=${encodeURIComponent(cfg.api_key)}&page=${page}&per_page=${perPage}`;

      let res: Response | null = null;
      let ultimoErro = "";
      const tentativas = 3;
      for (let i = 0; i < tentativas; i++) {
        try {
          const ctrl = new AbortController();
          const t = setTimeout(() => ctrl.abort(), 15000);
          res = await fetch(url, {
            headers: { Accept: "application/json" },
            signal: ctrl.signal,
          });
          clearTimeout(t);
          if (res.ok) break;
          if (![502, 503, 504, 408, 429].includes(res.status)) break;
          ultimoErro = `HTTP ${res.status}`;
        } catch (e: any) {
          ultimoErro = e?.message ?? "fetch falhou";
          res = null;
        }
        if (i < tentativas - 1) await new Promise((r) => setTimeout(r, 600 * (i + 1)));
      }

      if (!res || !res.ok) {
        const status = res?.status ?? 0;
        const erroAmigavel =
          status === 502 || status === 503 || status === 504
            ? "O serviço VMPay está temporariamente indisponível. Tente novamente em alguns instantes."
            : status === 401 || status === 403
              ? "Chave VMPay inválida ou sem permissão."
              : `Não foi possível consultar a VMPay (${ultimoErro || `HTTP ${status}`}).`;
        return json({ ok: false, erro: erroAmigavel, fallback: true, clientes: todos }, 200);
      }
      const arr = (await res.json()) as Array<{ id: number; name: string }>;
      if (!Array.isArray(arr) || arr.length === 0) break;
      for (const c of arr) todos.push({ id: c.id, name: c.name });
      if (arr.length < perPage) break;
      page += 1;
    }
    return json({ ok: true, clientes: todos }, 200);
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
