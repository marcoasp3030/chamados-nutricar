import { createClient } from '@supabase/supabase-js';
import { mkdirSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
const s = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const BUCKET = 'chamado-anexos';
const OUT = '/mnt/documents/migracao-vps/storage/chamado-anexos';
async function listAll(prefix='') {
  const acc = [];
  let offset = 0;
  while (true) {
    const { data, error } = await s.storage.from(BUCKET).list(prefix, { limit: 1000, offset });
    if (error) throw error;
    if (!data?.length) break;
    for (const it of data) {
      const p = prefix ? `${prefix}/${it.name}` : it.name;
      if (it.id === null || it.metadata === null) acc.push(...await listAll(p));
      else acc.push(p);
    }
    if (data.length < 1000) break;
    offset += 1000;
  }
  return acc;
}
const arquivos = await listAll('');
console.log('Total arquivos:', arquivos.length);
let ok = 0, fail = 0;
for (const path of arquivos) {
  const { data, error } = await s.storage.from(BUCKET).download(path);
  if (error) { fail++; console.error('FAIL', path, error.message); continue; }
  const buf = Buffer.from(await data.arrayBuffer());
  const dest = join(OUT, path);
  mkdirSync(dirname(dest), { recursive: true });
  writeFileSync(dest, buf);
  ok++;
}
console.log('OK:', ok, 'FAIL:', fail);
