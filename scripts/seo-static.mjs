/**
 * 静态单页的 SEO 补齐（幂等，每次构建前自动执行）
 *
 * static/ 下的手写页面（点名器、座位表、3D 实验室、诗词页…）不经过 Hugo 模板，
 * 只能直接改 HTML。这里按 scripts/seo-pages.json 的数据表：
 *   1) 缺 / 过短的 <meta name="description"> → 写入或替换成完整文案
 *   2) 过短的 <title> → 换成「页面名 · 功能短语 | 站点名」
 *   3) 没有 <h1> → 把已有可见主标题元素提升为 h1，或插入视觉隐藏的语义 h1
 *   4) 缺 ALT 的 <img> → 补 alt
 *
 * 用法：
 *   node scripts/seo-static.mjs          执行修改
 *   node scripts/seo-static.mjs --check  只报告，不为 0 表示仍有待改
 *
 * 新增手写页时，在 seo-pages.json 里补一条即可（desc / h1 / titles）。
 */
import { readFile, writeFile, stat, chmod } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const DATA = JSON.parse(await readFile(join(HERE, 'seo-pages.json'), 'utf8'));
const CHECK = process.argv.includes('--check');
// 与 hugo.toml 的 baseURL 保持一致
const SITE = (process.env.SITE_URL || 'https://www.sakaay.com').replace(/\/$/, '');

const DESC_RE = /<meta\s+name=["']description["']/i;
const DESC_CONTENT_RE = /<meta\s+name=["']description["']\s+content=["']([\s\S]*?)["']/i;
const TITLE_RE = /<title>[\s\S]*?<\/title>/i;
const BODY_RE = /<body[^>]*>/i;
const H1_RE = /<h1[\s>]/i;

const SR_STYLE =
  'position:absolute;width:1px;height:1px;padding:0;margin:-1px;' +
  'overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0';

const TAILS = {
  poetry: '配合 3D 场景与逐句讲解，适合课前导入与课后复习。',
  lab: '支持鼠标拖拽旋转与缩放，可直接投屏用于课堂演示，也适合学生自主探究与反复观察。',
  tool: '无需安装、打开网页即可使用，数据保存在浏览器本地。',
};

/** 描述不足 80 字符时按页面类型补尾句（Bing 的「元描述太短」阈值为 80 字符） */
function expandDesc(rel, desc) {
  if (!desc || desc.length >= 80) return desc;
  if (rel.startsWith('poetry/')) return desc + TAILS.poetry;
  if (rel.startsWith('lab/')) return desc + TAILS.lab;
  return desc + TAILS.tool;
}

async function readText(path) {
  const buf = await readFile(path);
  const bom = buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf;
  return { text: buf.toString('utf8').replace(/^\uFEFF/, ''), bom };
}

async function writeText(path, text, bom) {
  const st = await stat(path);
  const readonly = (st.mode & 0o200) === 0;
  if (readonly) await chmod(path, st.mode | 0o200);
  try {
    await writeFile(path, (bom ? '\uFEFF' : '') + text, 'utf8');
  } finally {
    if (readonly) await chmod(path, st.mode);
  }
}

const changed = [];
const problems = [];

for (const [rel, cfg] of Object.entries(DATA.pages)) {
  const path = join(ROOT, 'static', ...rel.split('/'));
  let html;
  let bom;
  try {
    ({ text: html, bom } = await readText(path));
  } catch {
    problems.push(`${rel}: 文件不存在`);
    continue;
  }
  const nl = html.includes('\r\n') ? '\r\n' : '\n';
  const orig = html;
  const notes = [];

  // 1) description
  const target = expandDesc(rel, cfg.desc);
  const cur = DESC_CONTENT_RE.exec(html);
  if (cur) {
    if (cfg.desc && cur[1].length < target.length) {
      html = html.slice(0, cur.index) + `<meta name="description" content="${target}"` + html.slice(cur.index + cur[0].length);
      notes.push('description 加长');
    }
  } else if (cfg.desc) {
    const meta = `<meta name="description" content="${target}">`;
    const t = TITLE_RE.exec(html);
    if (t) {
      html = html.slice(0, t.index + t[0].length) + nl + meta + html.slice(t.index + t[0].length);
      notes.push('+ description');
    } else {
      notes.push('找不到 </title>');
    }
  }

  // 2) title
  const want = DATA.titles[rel];
  if (want) {
    const t = TITLE_RE.exec(html);
    const tag = `<title>${want}</title>`;
    if (!t) problems.push(`${rel}: 找不到 <title>`);
    else if (!html.includes(tag)) {
      html = html.slice(0, t.index) + tag + html.slice(t.index + t[0].length);
      notes.push('title');
    }
  }

  // 3) h1
  if (cfg.h1 && !H1_RE.test(html)) {
    if (cfg.h1.type === 'promote') {
      if (html.includes(cfg.h1.old)) {
        html = html.replace(cfg.h1.old, cfg.h1.new);
        notes.push('h1 promote');
        for (const [a, b] of cfg.h1.css || []) {
          if (html.includes(a)) {
            html = html.replace(a, b);
            notes.push('css');
          }
        }
      } else {
        problems.push(`${rel}: promote 原文未匹配`);
      }
    } else if (cfg.h1.type === 'sr') {
      const m = BODY_RE.exec(html);
      if (m) {
        const tag = `<h1 style="${SR_STYLE}">${cfg.h1.text}</h1>`;
        html = html.slice(0, m.index + m[0].length) + nl + tag + html.slice(m.index + m[0].length);
        notes.push('h1 sr-only');
      } else {
        problems.push(`${rel}: 找不到 <body>`);
      }
    }
  }

  // 4) canonical（进入 sitemap 后需要自指，否则会被判重复内容）
  if (!/<link\s+rel=["']canonical["']/i.test(html)) {
    let u = '/' + rel;
    if (u.endsWith('/index.html')) u = u.slice(0, -'index.html'.length);
    const tag = `<link rel="canonical" href="${SITE}${u}">`;
    const t = TITLE_RE.exec(html);
    if (t) {
      html = html.slice(0, t.index + t[0].length) + nl + tag + html.slice(t.index + t[0].length);
      notes.push('+ canonical');
    }
  }

  // 5) img alt
  for (const [file, oldTag, newTag] of DATA.imageAlts) {
    if (file !== rel || html.includes(newTag)) continue;
    if (html.includes(oldTag)) {
      html = html.replace(oldTag, newTag);
      notes.push('img alt');
    } else {
      problems.push(`${rel}: img 原文未匹配`);
    }
  }

  if (html !== orig) {
    changed.push(rel);
    if (!CHECK) await writeText(path, html, bom);
    console.log(`[${CHECK ? 'check' : 'fix'}] ${rel} → ${notes.join(', ')}`);
  }
}

console.log(`\n[seo:static] ${CHECK ? '待改' : '已改'} ${changed.length} 个页面`);
if (problems.length) {
  console.error('[seo:static] 需要人工处理：');
  for (const p of problems) console.error('  - ' + p);
  process.exit(1);
}
