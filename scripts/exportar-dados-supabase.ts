// Exporta dados públicos do Supabase Cloud via REST (service_role) para JSON local.
// Uso: SUPABASE_SERVICE_ROLE_KEY=... bun run scripts/exportar-dados-supabase.ts
// Depois: bun run scripts/importar-dados-supabase.ts

import { createClient } from "@supabase/supabase-js";
import { writeFileSync, mkdirSync } from "fs";
import { resolve } from "path";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const TABELAS = [
  "app_config",
  "perfis",
  "workspaces",
  "workspace_membros",
  "workspace_convites",
  "departamentos",
  "workspace_membro_departamentos",
  "categorias_chamado",
  "chamados",
  "chamado_comentarios",
  "chamado_anexos",
  "chamado_historico",
  "chamado_requisicao_itens",
  "chamado_ia_execucoes",
  "chamado_whatsapp_notificacoes",
  "checklist_templates",
  "checklist_template_itens",
  "checklists",
  "checklist_respostas",
  "checklist_comentarios",
  "checklist_historico",
  "projetos",
  "tarefas",
  "notificacoes",
  "workspace_ia_config",
  "workspace_vmpay_config",
  "workspace_uazapi_config",
  "workspace_uazapi_logs",
] as const;

async function exportarTabela(
  supa: ReturnType<typeof createClient>,
  tabela: string,
  dir: string,
) {
  const rows: unknown[] = [];
  const pageSize = 1000;
  let from = 0;
  for (;;) {
    const { data, error } = await supa
      .from(tabela)
      .select("*")
      .range(from, from + pageSize - 1);
    if (error) throw new Error(`${tabela}: ${error.message}`);
    if (!data?.length) break;
    rows.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  writeFileSync(resolve(dir, `${tabela}.json`), JSON.stringify(rows, null, 0));
  console.log(`  ${tabela}: ${rows.length} registros`);
  return rows.length;
}

async function main() {
  if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error(
      "Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY (painel Supabase → Settings → API).",
    );
    process.exit(1);
  }
  const supa = createClient(SUPABASE_URL, SERVICE_KEY);
  const dir = resolve("data/export-supabase");
  mkdirSync(dir, { recursive: true });
  console.log("Exportando tabelas do Supabase Cloud…");
  let total = 0;
  for (const t of TABELAS) {
    total += await exportarTabela(supa, t, dir);
  }
  console.log(`Total: ${total} registros em ${dir}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
