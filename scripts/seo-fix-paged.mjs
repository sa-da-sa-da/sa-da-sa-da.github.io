/**
 * 分页页元描述去重
 *
 * 背景：Hugo 渲染 /page/2/ 起的列表分页时，页面上下文仍指向列表首页
 *       （.Permalink / .RelPermalink 都是列表页本身的地址，没有任何字段表示「第几页」），
 *       所以这些分页页会与第一页共享同一份 <meta name="description">，
 *       Bing 会判为「太多页面里的元描述完全一样」。
 *
 * 处理：给产物中 page/N/index.html（N ≥ 2）的 description 尾部补「（第 N 页）」。
 *       分页页的 canonical 已由 Hugo 指回列表首页，重复内容问题由 canonical 兜住，
 *       这里只保证元数据字面值唯一。幂等，可重复执行。
 *
 * 用法：node scripts/seo-fix-paged.mjs [产物目录，默认 public]
 *       已在 package.json 的 build / build:deploy 中串到 hugo 之后。
 */
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

const root = process.argv[2] || 'public';
// 兼容 hugo --minify（name=description 不带引号）与普通构建（带引号）
const META_RE = /(<meta\s+name=["']?description["']?\s+content=")([^"]*)(")/i;
const TITLE_RE = /<title>([^<]*)<\/title>/i;
const PAGED_RE = /[\\/]page[\\/](\d+)[\\/]index\.html$/;

async function walk(dir, out = []) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) await walk(p, out);
    else out.push(p);
  }
  return out;
}

let files;
try {
  files = await walk(root);
} catch {
  console.error(`[seo] 找不到产物目录：${root}（请先执行构建）`);
  process.exit(1);
}

let changed = 0;
let missing = 0;
for (const file of files) {
  const m = PAGED_RE.exec(file);
  if (!m) continue;
  const no = Number(m[1]);
  if (no < 2) continue;

  const html = await readFile(file, 'utf8');
  const suffix = `（第 ${no} 页）`;
  if (html.includes(suffix)) continue; // 已处理过

  let out = html;
  if (META_RE.test(out)) {
    out = out.replace(META_RE, (_all, head, value, tail) => head + value + suffix + tail);
  } else {
    missing++;
  }
  // 标题同样补页码，避免分页页与列表首页的 <title> 完全相同
  out = out.replace(TITLE_RE, (_all, t) => `<title>${t}${suffix}</title>`);

  if (out !== html) {
    await writeFile(file, out, 'utf8');
    changed++;
  }
}

console.log(`[seo] 分页页去重（描述 + 标题）：改写 ${changed} 个页面${missing ? `，跳过 ${missing} 个无 description 的页面` : ''}`);
