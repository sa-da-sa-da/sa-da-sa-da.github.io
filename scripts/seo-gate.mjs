/**
 * 构建门槛：全量扫描产物，检查 SEO 硬指标
 *
 * 与 site-check.mjs 的分工：
 *   - site-check.mjs：深检（死链 / 图片 404 / canonical / sitemap），手动跑，比较慢
 *   - seo-gate.mjs  ：每次构建后自动跑，只查元数据，快，能挡住「带病上线」
 *
 * 覆盖范围：产物里所有 HTML（含 static/ 手写页），跳过 alias 重定向页。
 *
 * 硬错误（退出码 1）：
 *   缺 <h1> / 多个 <h1> / 缺 title / 缺 description / title 重复 / description 重复
 * 警告（默认不失败，--strict 时失败）：
 *   title 少于 30 或超过 80 字符、description 少于 80 或超过 200 字符、<img> 缺 alt
 *
 * 用法：node scripts/seo-gate.mjs [产物目录，默认 public] [--strict]
 */
import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

const args = process.argv.slice(2);
const strict = args.includes('--strict');
const root = args.find((a) => !a.startsWith('--')) || 'public';

const TITLE_RE = /<title>([\s\S]*?)<\/title>/i;
const DESC_RE = /<meta\s+name=["']?description["']?\s+content=(?:"([^"]*)"|'([^']*)')/i;

const hard = {
  缺h1: [],
  多h1: [],
  缺title: [],
  缺description: [],
};
const soft = {
  title过短: [],
  title过长: [],
  description过短: [],
  description过长: [],
  img缺alt: [],
};
const titles = new Map();
const descs = new Map();
const dupTitle = [];
const dupDesc = [];
let pages = 0;

async function walk(dir, out = []) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) await walk(p, out);
    else if (e.name.endsWith('.html')) out.push(p);
  }
  return out;
}

let files;
try {
  files = await walk(root);
} catch {
  console.error(`[seo:gate] 找不到产物目录：${root}（请先执行构建）`);
  process.exit(1);
}

for (const p of files) {
  const html = await readFile(p, 'utf8');
  const rel = relative(root, p).replace(/\\/g, '/');
  // alias 跳转页（meta refresh）不是可索引内容
  if (/http-equiv\s*=\s*["']?refresh/i.test(html)) continue;
  pages++;

  // <script>/<style> 里的字符串不算真实标签（laoban.html 导出 Word 的模板里含 <h1>）
  const body = html.replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ');
  const h1n = (body.match(/<h1[\s>]/gi) || []).length;
  if (h1n === 0) hard.缺h1.push(rel);
  else if (h1n > 1) hard.多h1.push(`${rel}(${h1n})`);

  const t = (TITLE_RE.exec(html) || [])[1] || '';
  const title = t.trim();
  if (!title) hard.缺title.push(rel);
  else {
    if (title.length < 30) soft.title过短.push(`${rel}(${title.length})`);
    if (title.length > 80) soft.title过长.push(`${rel}(${title.length})`);
    if (!titles.has(title)) titles.set(title, []);
    titles.get(title).push(rel);
  }

  const dm = DESC_RE.exec(html);
  const desc = ((dm && (dm[1] ?? dm[2])) || '').trim();
  if (!desc) hard.缺description.push(rel);
  else {
    if (desc.length < 80) soft.description过短.push(`${rel}(${desc.length})`);
    if (desc.length > 200) soft.description过长.push(`${rel}(${desc.length})`);
    if (!descs.has(desc)) descs.set(desc, []);
    descs.get(desc).push(rel);
  }

  for (const tag of body.match(/<img\b[^>]*>/gi) || []) {
    if (!/\balt\s*=/i.test(tag)) {
      soft.img缺alt.push(rel);
      break;
    }
  }
}

for (const [k, v] of titles) if (v.length > 1) dupTitle.push([k.slice(0, 50), v.length, v.slice(0, 3)]);
for (const [k, v] of descs) if (v.length > 1) dupDesc.push([k.slice(0, 50), v.length, v.slice(0, 3)]);

const line = (o) =>
  `h1 缺${o.缺h1.length}/多${o.多h1.length} · title 缺${o.缺title.length} · desc 缺${o.缺description.length}`;
console.log(`[seo:gate] ${pages} 页 | ${line(hard)} | title重复 ${dupTitle.length} 组 | desc重复 ${dupDesc.length} 组`);
console.log(
  `[seo:gate] 长度提示 | title <30: ${soft.title过短.length} · >80: ${soft.title过长.length}` +
    ` | desc <80: ${soft.description过短.length} · >200: ${soft.description过长.length}` +
    ` | img 缺alt: ${soft.img缺alt.length} 页`
);

const show = (list, label) => {
  if (!list.length) return;
  console.log(`  ${label}: ${list.slice(0, 8).join(', ')}${list.length > 8 ? ` …共 ${list.length}` : ''}`);
};

const hardCount =
  hard.缺h1.length + hard.多h1.length + hard.缺title.length + hard.缺description.length + dupTitle.length + dupDesc.length;

if (hardCount) {
  console.error('\n[seo:gate] ✗ 硬错误（必须修复后才能部署）：');
  show(hard.缺h1, '缺 h1');
  show(hard.多h1, '多个 h1');
  show(hard.缺title, '缺 title');
  show(hard.缺description, '缺 description');
  for (const [k, n, v] of dupTitle.slice(0, 5)) console.error(`  重复 title(${n}): ${k} → ${v.join(', ')}`);
  for (const [k, n, v] of dupDesc.slice(0, 5)) console.error(`  重复 desc(${n}): ${k} → ${v.join(', ')}`);
}

const softCount =
  soft.title过短.length + soft.title过长.length + soft.description过短.length + soft.description过长.length + soft.img缺alt.length;
if (softCount) {
  console.log('\n[seo:gate] ⚠ 长度 / ALT 提醒（不影响构建）：');
  show(soft.title过短, 'title 过短');
  show(soft.title过长, 'title 过长');
  show(soft.description过短, 'desc 过短');
  show(soft.description过长, 'desc 过长');
  show(soft.img缺alt, 'img 缺 alt');
}

if (hardCount || (strict && softCount)) process.exit(1);
