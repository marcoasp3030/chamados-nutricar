// Migra arquivos do Supabase Storage para o disco local (STORAGE_DIR).
// Uso (na VPS, com .env carregado):
//   bun run scripts/migrar-storage.ts
//
// Requer: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, STORAGE_DIR.
// Lista cada bucket conhecido recursivamente e baixa todos os arquivos para
// <STORAGE_DIR>/<bucket>/<caminho-original>, preservando o caminho lógico
// (que é o mesmo gravado na coluna `caminho_storage` das tabelas).

import { createClient } from "@supabase/supabase-js";
import { promises as fs } from "node:fs";
import path from "node:path";
import { BUCKETS } from "@/storage/config";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const STORAGE_DIR = process.env.STORAGE_DIR;

if (!SUPABASE_URL || !SERVICE_KEY || !STORAGE_DIR) {
  console.error(
    "Defina SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY e STORAGE_DIR no .env",
  );
  process.exit(1);
}

const cliente = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

async function listarRecursivo(
  bucket: string,
  prefixo = "",
): Promise<string[]> {
  const acumulado: string[] = [];
  const { data, error } = await cliente.storage
    .from(bucket)
    .list(prefixo, { limit: 1000 });
  if (error) throw new Error(`list ${bucket}/${prefixo}: ${error.message}`);
  for (const item of data ?? []) {
    const cheio = prefixo ? `${prefixo}/${item.name}` : item.name;
    if (item.id === null) {
      // pasta — desce
      const filhos = await listarRecursivo(bucket, cheio);
      acumulado.push(...filhos);
    } else {
      acumulado.push(cheio);
    }
  }
  return acumulado;
}

async function baixarUm(bucket: string, caminho: string) {
  const destino = path.join(STORAGE_DIR!, bucket, caminho);
  await fs.mkdir(path.dirname(destino), { recursive: true });
  const { data, error } = await cliente.storage.from(bucket).download(caminho);
  if (error) throw new Error(`download ${bucket}/${caminho}: ${error.message}`);
  const buf = Buffer.from(await data.arrayBuffer());
  await fs.writeFile(destino, buf);
  return buf.byteLength;
}

async function main() {
  console.log(`Storage local: ${STORAGE_DIR}`);
  for (const bucket of Object.keys(BUCKETS)) {
    console.log(`\n=== Bucket: ${bucket} ===`);
    let arquivos: string[] = [];
    try {
      arquivos = await listarRecursivo(bucket);
    } catch (e: any) {
      console.warn(`  (pulando) ${e.message}`);
      continue;
    }
    console.log(`  ${arquivos.length} arquivo(s) a copiar`);
    let ok = 0;
    let fail = 0;
    for (const c of arquivos) {
      try {
        const tam = await baixarUm(bucket, c);
        ok++;
        if (ok % 50 === 0) console.log(`  copiados ${ok}/${arquivos.length}`);
        void tam;
      } catch (e: any) {
        fail++;
        console.error(`  ERRO ${c}: ${e.message}`);
      }
    }
    console.log(`  ✓ ${ok} ok / ✗ ${fail} falha(s)`);
  }
  console.log("\nMigração de storage concluída.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
