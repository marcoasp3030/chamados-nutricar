// Define/redefine a senha de um membro do workspace.
// Apenas Proprietario / Administrador podem chamar.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface Payload {
  workspace_id: string;
  usuario_id: string;
  senha?: string | null;
}

function gerarSenha(): string {
  const maius = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const minus = "abcdefghjkmnpqrstuvwxyz";
  const nums = "23456789";
  const simb = "!@#$%&*?";
  const todos = maius + minus + nums + simb;
  const arr = new Uint8Array(20);
  crypto.getRandomValues(arr);
  let s = "";
  for (const n of arr) s += todos[n % todos.length];
  const r = new Uint8Array(4);
  crypto.getRandomValues(r);
  return (
    maius[r[0] % maius.length] +
    minus[r[1] % minus.length] +
    nums[r[2] % nums.length] +
    simb[r[3] % simb.length] +
    s
  );
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
    if (!body?.workspace_id || !body?.usuario_id) {
      return new Response(JSON.stringify({ error: "Dados incompletos." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (body.senha && body.senha.length < 8) {
      return new Response(JSON.stringify({ error: "Senha deve ter pelo menos 8 caracteres." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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

    const { data: alvo, error: alvoErr } = await admin
      .from("workspace_membros")
      .select("papel")
      .eq("workspace_id", body.workspace_id)
      .eq("usuario_id", body.usuario_id)
      .maybeSingle();
    if (alvoErr) throw alvoErr;
    if (!alvo) {
      return new Response(JSON.stringify({ error: "Usuário não pertence à empresa." }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (alvo.papel === "Proprietario" && papelData.papel !== "Proprietario") {
      return new Response(JSON.stringify({ error: "Sem permissão para alterar a senha do proprietário." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let senha = body.senha && body.senha.length >= 8 ? body.senha : gerarSenha();
    let tentativas = 0;
    let updErr: { message?: string; code?: string } | null = null;
    while (tentativas < 5) {
      const r = await admin.auth.admin.updateUserById(body.usuario_id, { password: senha });
      updErr = r.error as { message?: string; code?: string } | null;
      if (!updErr) break;
      if (!body.senha && (updErr as { code?: string }).code === "weak_password") {
        senha = gerarSenha();
        tentativas++;
        continue;
      }
      break;
    }
    if (updErr) {
      const msg = (updErr as { code?: string }).code === "weak_password"
        ? "Senha rejeitada por ser comum/conhecida em vazamentos. Use outra mais forte."
        : (updErr as { message?: string }).message ?? "Falha ao atualizar senha.";
      return new Response(JSON.stringify({ error: msg }), {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ ok: true, senha }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("definir-senha-usuario erro", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
