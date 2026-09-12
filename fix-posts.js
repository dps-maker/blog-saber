/**
 * fix-posts.js  (ES Module)
 * Corrige tags HTML quebradas da migração Blogger.
 *
 * Uso:
 *   node fix-posts.js --dry-run
 *   node fix-posts.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const POSTS_DIR = path.join(__dirname, 'src', 'data', 'post');
const BACKUP_DIR = path.join(
  __dirname,
  'backup-posts-' + new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
);
const DRY_RUN = process.argv.includes('--dry-run');

if (!fs.existsSync(POSTS_DIR)) {
  console.error('❌ Pasta não encontrada:', POSTS_DIR);
  process.exit(1);
}

function cleanBody(body) {
  let content = body;

  // 1. Corrigir tags quebradas do tipo:
  //    <pSegoe UI", Roboto, ...">  →  <p>
  //    <h2Segoe UI", ...">         →  <h2>
  //    <ulSegoe UI", ...">         →  <ul>
  //    <tableSegoe UI", ...">      →  <table>
  content = content.replace(
    /<(p|h[1-6]|ul|ol|li|div|table|thead|tbody|tr|th|td|span|strong|em|a|blockquote)([^>]*?)Segoe UI[^>]*>/gi,
    '<$1>'
  );

  // 2. Remover atributos style quebrados que sobraram em tags válidas
  //    Ex: <p style="font-family: Segoe UI..."> já está ok, não mexe
  //    Só remove o lixo que ficou solto

  // 3. Remover JSON-LD (o tema já gera o schema correto)
  content = content.replace(
    /<script\s+type=["']application\/ld\+json["'][\s\S]*?<\/script>/gi,
    ''
  );

  // 4. NÃO remover scripts do Kit
  // 5. NÃO remover div.separator (imagens)

  // 6. Remover </div> ou <div> soltos no início/fim que sobraram da migração
  content = content.replace(/^\s*<\/?div>\s*/i, '');
  content = content.replace(/\s*<\/?div>\s*$/i, '');

  // 7. Limpar muitas linhas em branco
  content = content.replace(/\n{3,}/g, '\n\n').trim();

  return content;
}

function processFile(filePath) {
  const original = fs.readFileSync(filePath, 'utf8');

  const match = original.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) {
    console.warn('⚠️  Sem frontmatter, pulando:', path.basename(filePath));
    return false;
  }

  const frontmatter = match[1];
  const body = match[2];
  const cleanedBody = cleanBody(body);

  if (cleanedBody === body.trim()) {
    return false;
  }

  const newContent = `---\n${frontmatter}\n---\n\n${cleanedBody}\n`;

  if (DRY_RUN) {
    console.log('🔍 Seria alterado:', path.basename(filePath));
    return true;
  }

  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
  fs.copyFileSync(filePath, path.join(BACKUP_DIR, path.basename(filePath)));

  fs.writeFileSync(filePath, newContent, 'utf8');
  console.log('✅ Corrigido:', path.basename(filePath));
  return true;
}

// === Execução ===
const files = fs.readdirSync(POSTS_DIR).filter((f) => f.endsWith('.md'));
console.log(`\n📁 Encontrados ${files.length} arquivos .md\n`);

let changed = 0;
for (const file of files) {
  const fullPath = path.join(POSTS_DIR, file);
  if (processFile(fullPath)) changed++;
}

console.log(
  `\n${DRY_RUN ? '🔍 Dry-run' : '✨'} Concluído: ${changed} arquivo(s) ${
    DRY_RUN ? 'seriam alterados' : 'corrigidos'
  }.`
);
if (!DRY_RUN && changed > 0) {
  console.log(`📦 Backup salvo em: ${BACKUP_DIR}`);
}
console.log('');