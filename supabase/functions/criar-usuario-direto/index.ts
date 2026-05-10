// Cria um usuário ativo diretamente, sem fluxo de convite.
// Apenas Proprietario / Administrador do workspace podem chamar.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface Payload {
  workspace_id: string;
  nome: string;
  email: string;
  telefone?: string | null;
  papel: string;
  cargo: string;
  departamento_ids?: string[];
}

function gerarSenha(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let s = "";
  const arr = new Uint8Array(14);
  crypto.getRandomValues(arr);
  for (const n of arr) s += chars[n % chars.length];
  return s + "@9";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const auth = req.headers.get("Authorization") ?? "";
    if (!auth.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Sem autenticação." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = auth.slice("Bearer ".length);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: userData, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Sessão inválida." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const solicitanteId = userData.user.id;

    const body = (await req.json()) as Payload;
    if (!body?.workspace_id || !body?.email || !body?.nome) {
      return new Response(JSON.stringify({ error: "Dados incompletos." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Verifica se solicitante é Proprietário/Administrador do workspace
    const { data: papelData, error: papelErr } = await admin
      .from("workspace_membros")
      .select("papel")
      .eq("workspace_id", body.workspace_id)
      .eq("usuario_id", solicitanteId)
      .eq("ativo", true)
      .maybeSingle();
    if (papelErr) throw papelErr;
    if (!papelData || !["Proprietario", "Administrador"].includes(papelData.papel)) {
      return new Response(JSON.stringify({ error: "Sem permissão." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const email = body.email.toLowerCase().trim();
    const senha = gerarSenha();

    // 1) Cria ou recupera usuário no auth
    let userId: string | null = null;
    const { data: criado, error: criarErr } = await admin.auth.admin.createUser({
      email,
      password: senha,
      email_confirm: true,
      user_metadata: { nome: body.nome },
    });

    if (criarErr) {
      // Pode já existir; tentar localizar via listagem
      const msg = (criarErr.message ?? "").toLowerCase();
      if (msg.includes("already") || msg.includes("registered") || msg.includes("exists")) {
        const { data: lista, error: listaErr } = await admin.auth.admin.listUsers({
          page: 1,
          perPage: 200,
        });
        if (listaErr) throw listaErr;
        const found = lista.users.find((u) => (u.email ?? "").toLowerCase() === email);
        if (!found) throw criarErr;
        userId = found.id;
      } else {
        throw criarErr;
      }
    } else {
      userId = criado.user?.id ?? null;
    }

    if (!userId) throw new Error("Falha ao obter usuário.");

    // 2) Garante perfil atualizado
    await admin.from("perfis").upsert(
      {
        id: userId,
        nome: body.nome,
        email,
        telefone: body.telefone || null,
      },
      { onConflict: "id" },
    );

    // 3) Cria/ativa membership
    const { data: existente } = await admin
      .from("workspace_membros")
      .select("id, ativo")
      .eq("workspace_id", body.workspace_id)
      .eq("usuario_id", userId)
      .maybeSingle();

    let membroId: string;
    const deptos = body.departamento_ids ?? [];

    if (existente) {
      const { error: upErr } = await admin
        .from("workspace_membros")
        .update({
          ativo: true,
          papel: body.papel,
          cargo: body.cargo,
          departamento_id: deptos[0] ?? null,
          aceito_em: new Date().toISOString(),
        })
        .eq("id", existente.id);
      if (upErr) throw upErr;
      membroId = existente.id;
    } else {
      const { data: novo, error: insErr } = await admin
        .from("workspace_membros")
        .insert({
          workspace_id: body.workspace_id,
          usuario_id: userId,
          papel: body.papel,
          cargo: body.cargo,
          departamento_id: deptos[0] ?? null,
          ativo: true,
          aceito_em: new Date().toISOString(),
          convidado_por: solicitanteId,
        })
        .select("id")
        .single();
      if (insErr) throw insErr;
      membroId = novo.id;
    }

    // 4) Sincroniza vínculos N:N de departamentos
    await admin
      .from("workspace_membro_departamentos")
      .delete()
      .eq("membro_id", membroId);

    if (deptos.length > 0) {
      const { error: dErr } = await admin
        .from("workspace_membro_departamentos")
        .insert(
          deptos.map((d) => ({
            membro_id: membroId,
            departamento_id: d,
            workspace_id: body.workspace_id,
          })),
        );
      if (dErr) throw dErr;
    }

    return new Response(
      JSON.stringify({ ok: true, email, senha_temporaria: senha, usuario_id: userId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("criar-usuario-direto erro", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
