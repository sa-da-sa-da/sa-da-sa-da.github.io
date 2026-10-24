/**
 * SEO 体检：扫描产物目录下所有 html，统计每页的 h1 数量、title/meta description 长度与重复度
 * 用法：node scripts/seo-audit.mjs [产物目录，默认 public]
 */
import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

const root = process.argv[2] || 'public';
const useSitemap = process.argv[3] !== 'all';
const pages = [];

// 以 sitemap 为准：SEO 工具（和搜索引擎）只看 sitemap 里的 URL
let allowed = null;
if (useSitemap) {
  try {
    const sm = await readFile(join(root, 'sitemap.xml'), 'utf8');
    allowed = new Set(
      [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim().replace(/^https?:\/\/[^/]+/, ''))
    );
  } catch {
    allowed = null;
  }
}

async function walk(dir) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) await walk(p);
    else if (e.name.endsWith('.html')) pages.push(p);
  }
}
await walk(root);

const noH1 = [];
const multiH1 = [];
const shortTitle = [];
const noDesc = [];
const shortDesc = [];
const titles = new Map();
const descs = new Map();

for (const p of pages) {
  const html = await readFile(p, 'utf8');
  const rel = relative(root, p).replace(/\\/g, '/');
  if (allowed) {
    const url = '/' + rel.replace(/index\.html$/, '');
    if (!allowed.has(url)) continue;
  }

  const h1 = (html.match(/<h1[\s>]/gi) || []).length;
  if (h1 === 0) noH1.push(rel);
  else if (h1 > 1) multiH1.push([rel, h1]);

  const t = (html.match(/<title>([\s\S]*?)<\/title>/i) || [])[1] || '';
  // Hugo --minify 会去掉属性名引号（name=description）；值里含双引号时会改用单引号包裹，两种都要匹配
  const d = (html.match(/<meta name=?"?description"?\s+content=(?:"([^"]*)"|'([^']*)')/i) || []);
  const desc = d[1] ?? d[2] ?? '';

  if (t.length < 15) shortTitle.push([rel, t.length, t.trim()]);
  if (!desc) noDesc.push(rel);
  else if (desc.length < 50) shortDesc.push([rel, desc.length]);

  const tk = t.trim();
  if (!titles.has(tk)) titles.set(tk, []);
  titles.get(tk).push(rel);
  const dk = desc.trim();
  if (!descs.has(dk)) descs.set(dk, []);
  descs.get(dk).push(rel);
}

const dupTitles = [...titles.entries()].filter(([, v]) => v.length > 1);
const dupDescs = [...descs.entries()].filter(([, v]) => v.length > 1);

const out = {
  总页数: pages.length,
  缺h1: noH1,
  多个h1: multiH1,
  title过短数量: shortTitle.length,
  title过短样例: shortTitle.slice(0, 12),
  缺description: noDesc.length,
  description过短数量: shortDesc.length,
  重复title组数: dupTitles.length,
  重复title: dupTitles.slice(0, 10).map(([t, v]) => [t, v.length, v.slice(0, 3)]),
  重复description组数: dupDescs.length,
  重复description: dupDescs.slice(0, 10).map(([d, v]) => [d.slice(0, 40), v.length, v.slice(0, 3)]),
};
const report = JSON.stringify(out, null, 2);
if (process.argv[4]) {
  const { writeFile } = await import('node:fs/promises');
  await writeFile(process.argv[4], report, 'utf8');
  console.log('written: ' + process.argv[4]);
} else {
  console.log(report);
}
