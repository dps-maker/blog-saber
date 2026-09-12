/**
 * fix-posts.js  (ES Module)
 * Limpa HTML quebrado / lixo de migração Blogger nos posts do Astro.
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

function unescapeHtml(html) {
  return html
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');
}

function cleanBody(body) {
  let content = body;

  // 1. Desescapar se estiver com entidades
  if (content.includes('&lt;') && content.includes('&gt;')) {
    content = unescapeHtml(content);
  }

  // 2. Remover scripts JSON-LD (schema.org) — o tema já gera o correto
  content = content.replace(
    /<script\s+type=["']application\/ld\+json["'][\s\S]*?<\/script>/gi,
    ''
  );

  // 3. NÃO remover scripts do Kit (formulário de e-mail)
  // (bloco removido de propósito)

  // 4. Remover <div class="separator"> ... </div> (imagens do Blogger)
  //    Se quiser MANTER as imagens, comente este bloco
  content = content.replace(
    /<div\s+class=["']separator["'][\s\S]*?<\/div>/gi,
    ''
  );

  // 5. Remover divs vazios
  content = content.replace(/<div>\s*<\/div>/gi, '');
  content = content.replace(/<div>\s*<div>\s*<\/div>\s*<\/div>/gi, '');

  // 6. Limpar espaços em excesso
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