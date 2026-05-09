import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const testarVMPay = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { workspaceId: string }) => input)
  .handler(async ({ data, context }) => {
    const { supabase } = context;

    const { data: cfg, error } = await supabase
      .from("workspace_vmpay_config")
      .select("api_key, ativo")
      .eq("workspace_id", data.workspaceId)
      .maybeSingle();

    if (error) return { ok: false, erro: error.message, clientes: [] as Array<{ id: number; name: string }> };
    if (!cfg?.api_key) return { ok: false, erro: "Nenhuma chave VMPay cadastrada.", clientes: [] };

    try {
      const url = `https://vmpay.vertitecnologia.com.br/api/v1/clients?access_token=${encodeURIComponent(cfg.api_key)}`;
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        return { ok: false, erro: `VMPay respondeu ${res.status}: ${body.slice(0, 200)}`, clientes: [] };
      }
      const json = (await res.json()) as Array<{ id: number; name: string }>;
      return {
        ok: true,
        erro: null,
        clientes: (json ?? []).map((c) => ({ id: c.id, name: c.name })),
      };
    } catch (e) {
      return { ok: false, erro: e instanceof Error ? e.message : "Falha ao chamar VMPay.", clientes: [] };
    }
  });
