/**
 * 站点静态体检（不依赖服务器）
 *   node scripts/site-check.mjs [产物目录=public] [输出json]
 *
 * 检查项：
 *  1) sitemap 里每个 URL 是否都有对应产物
 *  2) 站内链接是否 404
 *  3) 站内图片是否 404
 *  4) canonical 是否等于自身 URL
 *  5) 每页 title / description 长度 + 全站重复度
 *  6) alias 重定向页是否带 noindex
 *  7) lang / h1 数量
 *
 * 注意：Hugo --minify 会去掉属性值引号，所有属性解析必须兼容「无引号」写法。
 */
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

const root = process.argv[2] || 'public';
const outFile = process.argv[3];

const fileSet = new Set();
const htmls = [];
async function walk(d) {
  for (const e of await readdir(d, { withFileTypes: true })) {
    const p = join(d, e.name);
    if (e.isDirectory()) await walk(p);
    else {
      const rel = relative(root, p).replace(/\\/g, '/');
      fileSet.add(rel);
      if (rel.endsWith('.html')) htmls.push(rel);
    }
  }
}
await walk(root);

const value = (tag, name) => {
  const m = tag.match(new RegExp(name + '\\s*=\\s*(?:"([^"]*)"|\'([^\']*)\'|([^\\s>]+))', 'i'));
  return m ? (m[1] ?? m[2] ?? m[3] ?? '') : '';
};

/** 按标签取出完整标签文本，忽略属性值里的 ">"（描述里可能含 <...> 文本） */
const tags = (html, name) => {
  const out = [];
  let i = 0;
  const open = '<' + name;
  while ((i = html.toLowerCase().indexOf(open, i)) !== -1) {
    let j = i + open.length;
    let q = null;
    while (j < html.length) {
      const c = html[j];
      if (q) {
        if (c === q) q = null;
      } else if (c === '"' || c === "'") q = c;
      else if (c === '>') break;
      j++;
    }
    out.push(html.slice(i, j + 1));
    i = j + 1;
  }
  return out;
};

const exists = (raw) => {
  let p = decodeURIComponent(raw.split('#')[0].split('?')[0]).replace(/^\//, '');
  if (p === '') return fileSet.has('index.html');
  if (p.endsWith('/')) return fileSet.has(p + 'index.html');
  return fileSet.has(p) || fileSet.has(p + '/index.html') || fileSet.has(p + '.html');
};

const sm = await readFile(join(root, 'sitemap.xml'), 'utf8');
const sitemapUrls = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
const smPaths = new Set(sitemapUrls.map((u) => u.replace(/^https?:\/\/[^/]+/, '') || '/'));

const report = {
  产物文件: fileSet.size,
  HTML页面: htmls.length,
  'sitemap URL': sitemapUrls.length,
  'sitemap 缺产物': [],
  站内死链: new Map(),
  图片404: new Map(),
  canonical不一致: [],
  alias页: 0,
  'alias 缺 noindex': [],
  缺lang: [],
  多h1: [],
  缺h1: [],
  标题过短: [],
  标题过长: [],
  描述过短: [],
  描述过长: [],
  重复标题: new Map(),
  重复描述: new Map(),
};

for (const u of sitemapUrls) {
  const p = u.replace(/^https?:\/\/[^/]+/, '') || '/';
  if (!exists(p)) report['sitemap 缺产物'].push(p);
}

for (const f of htmls) {
  const html = await readFile(join(root, f), 'utf8');
  const url = '/' + f.replace(/index\.html$/, '');
  const isAlias = /http-equiv\s*=\s*"?refresh/i.test(html);
  if (isAlias) {
    report.alias页++;
    if (!/<meta[^>]*name\s*=\s*"?robots"?[^>]*noindex/i.test(html)) report['alias 缺 noindex'].push(url);
    continue;
  }
  if (!smPaths.has(url)) continue; // 静态工具页（lab/poetry 等）不参与内容体检

  const head = html.slice(html.indexOf('<head>'), html.indexOf('</head>'));
  const title = (html.match(/<title>([\s\S]*?)<\/title>/i) || [])[1] || '';
  const dm = tags(head, 'meta').find((t) => /name\s*=\s*"?description"?/i.test(t));
  const desc = dm ? value(dm, 'content') : '';
  const canonTag = tags(head, 'link').find((t) => /rel\s*=\s*"?canonical"?/i.test(t));
  const canon = canonTag ? value(canonTag, 'href') : '';
  const lang = (html.match(/<html[^>]*lang\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i) || []);
  const h1 = (html.match(/<h1[\s>]/gi) || []).length;

  if (!(lang[1] ?? lang[2] ?? lang[3])) report.缺lang.push(url);
  if (h1 === 0) report.缺h1.push(url);
  if (h1 > 1) report.多h1.push([url, h1]);
  if (title.length < 15) report.标题过短.push([url, title.length]);
  if (title.length > 70) report.标题过长.push([url, title.length, title]);
  if (!desc || desc.length < 50) report.描述过短.push([url, desc.length]);
  if (desc.length > 170) report.描述过长.push([url, desc.length]);
  if (canon && canon.replace(/\/$/, '') !== ('https://www.sakaay.com' + url).replace(/\/$/, '')) {
    report.canonical不一致.push([url, canon]);
  }
  if (!report.重复标题.has(title)) report.重复标题.set(title, []);
  report.重复标题.get(title).push(url);
  if (!report.重复描述.has(desc)) report.重复描述.set(desc, []);
  report.重复描述.get(desc).push(url);

  for (const m of html.matchAll(/<a\b[^>]*>/gi)) {
    const href = value(m[0], 'href');
    if (!href || /^(https?:|mailto:|tel:|javascript:|#)/i.test(href)) continue;
    if (!exists(href)) {
      if (!report.站内死链.has(href)) report.站内死链.set(href, []);
      report.站内死链.get(href).push(url);
    }
  }
  for (const m of html.matchAll(/<img\b[^>]*>/gi)) {
    const src = value(m[0], 'src');
    if (!src || /^(https?:|data:)/i.test(src)) continue;
    if (!exists(src)) {
      if (!report.图片404.has(src)) report.图片404.set(src, []);
      report.图片404.get(src).push(url);
    }
  }
}

const dupTitles = [...report.重复标题.entries()].filter(([, v]) => v.length > 1);
const dupDescs = [...report.重复描述.entries()].filter(([, v]) => v.length > 1);
const summary = {
  产物文件: report.产物文件,
  HTML页面: report.HTML页面,
  'sitemap URL': report['sitemap URL'],
  'sitemap 缺产物': report['sitemap 缺产物'].length,
  'sitemap 缺产物样例': report['sitemap 缺产物'].slice(0, 5),
  站内死链: report.站内死链.size,
  死链明细: [...report.站内死链.entries()].slice(0, 20).map(([h, from]) => [h, from.length, from[0]]),
  图片404: report.图片404.size,
  图片404明细: [...report.图片404.entries()].slice(0, 10).map(([s, from]) => [s, from.length]),
  canonical不一致: report.canonical不一致.length,
  canonical样例: report.canonical不一致.slice(0, 5),
  alias页: report.alias页,
  'alias 缺 noindex': report['alias 缺 noindex'].length,
  缺lang: report.缺lang.length,
  缺h1: report.缺h1.length,
  多h1: report.多h1.length,
  多h1明细: report.多h1.slice(0, 8),
  标题过短: report.标题过短.length,
  标题过长: report.标题过长.length,
  标题过长明细: report.标题过长.slice(0, 8),
  描述过短: report.描述过短.length,
  描述过长: report.描述过长.length,
  重复标题组: dupTitles.length,
  重复标题明细: dupTitles.slice(0, 8).map(([t, v]) => [t, v.length, v.slice(0, 2)]),
  重复描述组: dupDescs.length,
  重复描述明细: dupDescs.slice(0, 5).map(([d, v]) => [d.slice(0, 40), v.length]),
};
const text = JSON.stringify(summary, null, 2);
if (outFile) {
  await writeFile(outFile, text, 'utf8');
  console.log('written: ' + outFile);
} else {
  console.log(text);
}
