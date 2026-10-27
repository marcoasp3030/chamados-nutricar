// Importa JSON exportado (scripts/exportar-dados-supabase.ts) para o Postgres da VPS.
// Uso: DATABASE_URL=postgres://... bun run scripts/importar-dados-supabase.ts

import { readFileSync, readdirSync, existsSync } from "fs";
import { resolve } from "path";
import postgres from "postgres";

const dir = resolve("data/export-supabase");
const url = process.env.DATABASE_URL?.replace("@postgres:", "@127.0.0.1:");

if (!url) {
  console.error("DATABASE_URL obrigatória.");
  process.exit(1);
}
if (!existsSync(dir)) {
  console.error(`Pasta ${dir} não encontrada. Rode exportar-dados-supabase.ts antes.`);
  process.exit(1);
}

const sql = postgres(url, { max: 1 });

function snakeToColumns(row: Record<string, unknown>): string[] {
  return Object.keys(row);
}

async function importarArquivo(arquivo: string) {
  const tabela = arquivo.replace(/\.json$/, "");
  const rows = JSON.parse(readFileSync(resolve(dir, arquivo), "utf8")) as Record<
    string,
    unknown
  >[];
  if (!rows.length) {
    console.log(`  ${tabela}: 0 (pulando)`);
    return;
  }
  const cols = snakeToColumns(rows[0]);
  const colList = cols.map((c) => `"${c}"`).join(", ");
  for (let i = 0; i < rows.length; i += 200) {
    const lote = rows.slice(i, i + 200);
    const placeholders: string[] = [];
    const valores: unknown[] = [];
    lote.forEach((row, ri) => {
      const ph = cols.map((_, ci) => `$${ri * cols.length + ci + 1}`).join(", ");
      placeholders.push(`(${ph})`);
      cols.forEach((c) => valores.push(row[c] ?? null));
    });
    await sql.unsafe(
      `INSERT INTO public.${tabela} (${colList}) VALUES ${placeholders.join(", ")}`,
      valores as never[],
    );
  }
  console.log(`  ${tabela}: ${rows.length} registros`);
}

async function main() {
  const arquivos = readdirSync(dir).filter((f) => f.endsWith(".json")).sort();
  console.log(`Importando ${arquivos.length} tabelas…`);

  // Limpa dados de app (preserva tabelas usuarios/sessoes do auth próprio)
  await sql.unsafe(`
    TRUNCATE TABLE
      public.chamado_whatsapp_notificacoes,
      public.chamado_ia_execucoes,
      public.chamado_requisicao_itens,
      public.chamado_historico,
      public.chamado_anexos,
      public.chamado_comentarios,
      public.chamados,
      public.checklist_historico,
      public.checklist_comentarios,
      public.checklist_respostas,
      public.checklists,
      public.checklist_template_itens,
      public.checklist_templates,
      public.tarefas,
      public.projetos,
      public.notificacoes,
      public.workspace_uazapi_logs,
      public.workspace_uazapi_config,
      public.workspace_vmpay_config,
      public.workspace_ia_config,
      public.workspace_membro_departamentos,
      public.departamentos,
      public.workspace_convites,
      public.workspace_membros,
      public.categorias_chamado,
      public.workspaces,
      public.perfis,
      public.app_config
    RESTART IDENTITY CASCADE
  `);

  for (const f of arquivos) {
    try {
      await importarArquivo(f);
    } catch (e) {
      console.error(`Erro em ${f}:`, e);
    }
  }
  await sql.end();
  console.log("Importação concluída. Rode: bun run scripts/migrar-usuarios.ts");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
