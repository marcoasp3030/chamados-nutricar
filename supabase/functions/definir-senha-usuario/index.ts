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
  senha?: string | null; // se vazio, gera automática
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

    // Solicitante deve ser Proprietário/Administrador
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

    // Alvo deve pertencer ao workspace
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
    // Apenas Proprietário pode alterar senha de outro Proprietário
    if (alvo.papel === "Proprietario" && papelData.papel !== "Proprietario") {
      return new Response(JSON.stringify({ error: "Sem permissão para alterar a senha do proprietário." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const senha = body.senha && body.senha.length >= 8 ? body.senha : gerarSenha();

    const { error: updErr } = await admin.auth.admin.updateUserById(body.usuario_id, {
      password: senha,
    });
    if (updErr) throw updErr;

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
