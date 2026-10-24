/**
 * SEO 内容修复（一次性，幂等）
 *
 * 修���内容层的问题：
 *  1) 各分区的「目录.md」与所属分区页重名（13 组重复 title）→ 统一改成「XX 目录」
 *  2) 若干页面前过短或语义不准的 title（归档 / 文章清单 / 朋友圈 / 读书 …）
 *  3) 缺 title 的页面
 *  4) 正文中出现第二个一级标题（导致一页两个 h1）→ 降级为 h2
 *  5) 原始 HTML <img> 缺 alt
 *
 * 用法：node scripts/seo-fix-content.mjs [--dry]
 */
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, dirname, basename } from 'node:path';

const ROOT = 'content';
const DRY = process.argv.includes('--dry');
const changes = [];

async function walk(dir, out = []) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) await walk(p, out);
    else if (e.name.endsWith('.md')) out.push(p);
  }
  return out;
}

/** 只在 frontmatter 区块内做替换，避免误改正文 */
function inFrontmatter(text, fn) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return null;
  const fm = m[1];
  const next = fn(fm);
  if (next === null || next === fm) return null;
  return { before: fm, after: next, whole: text.slice(0, m[0].length) };
}

function setTitle(fm, title) {
  if (/^title\s*:/m.test(fm)) return fm.replace(/^title\s*:.*$/m, `title: ${title}`);
  return `title: ${title}\n${fm}`;
}

const files = await walk(ROOT);

// ---------- 1) 「目录.md」统一改名 ----------
const indexTitles = new Map(); // 目录 -> 同级 _index.md 的 title
for (const f of files) {
  if (basename(f) !== '_index.md') continue;
  const t = await readFile(f, 'utf8');
  const m = t.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  const title = m && (m[1].match(/^title\s*:\s*(.+)$/m) || [])[1];
  if (title) indexTitles.set(dirname(f), title.trim().replace(/^["']|["']$/g, ''));
}

for (const f of files) {
  if (basename(f) !== '目录.md') continue;
  const dir = dirname(f);
  const secTitle = indexTitles.get(dir) || basename(dir);
  const newTitle = `${secTitle}目录`;
  const text = await readFile(f, 'utf8');
  const cur = (text.match(/^title\s*:\s*(.+)$/m) || [])[1]?.trim().replace(/^["']|["']$/g, '');
  if (cur === newTitle) continue;
  const res = inFrontmatter(text, (fm) => setTitle(fm, newTitle));
  if (res) {
    changes.push([f, `title: ${cur} → ${newTitle}`]);
    if (!DRY) await writeFile(f, res.whole.replace(res.before, res.after), 'utf8');
  }
}

// ---------- 2) 指定页面的 title 修正 ----------
const RENAME = [
  ['about/朋友圈.md', '朋友圈'],
  ['life/生活.md', '生活记录'],
  ['love/精神小屋.md', '精神小屋 · 记录'],
  ['life/读书.md', '生活随笔：读书'],
  ['xingqu/读书.md', '兴趣清单：读书'],
  ['archives.md', '全站文章归档'],
  ['articleOverview.md', '全站文章清单'],
  ['login.md', '站点登录入口'],
  ['nav.md', '网站导航页'],
  ['risk-link.md', '风险链接提示'],
  ['program.md', '编程工具箱'],
  ['time.md', '时间工具页'],

  ['about/思考.md', '思考与随笔'],
  ['about/友链.md', '友情链接'],
  ['about/搜索导航.md', '站内搜索导航'],
  ['about/网站导航.md', '全站页面导航'],
  ['about/留言区.md', '留言区 · 给我留言'],
  ['about/情侣相册.md', '情侣相册 · 我们的日常'],
  // 顶层「目录」页标题过短，补两个字
  ['exammination/目录.md', '考试分类目录'],
  ['steam/目录.md', '创客分类目录'],
  ['teach/目录.md', '学习分类目录'],
  ['tools/目录.md', '工具分类目录'],
  // 其余过短标题
  ['life/生活.md', '生活记录与随笔'],
  ['about/关于我.md', '关于 sakaay'],
  ['about/关于本站.md', '关于本站与作者'],
  ['yule/娱乐广场.md', '娱乐工具广场'],
  // 分区标题过短或纯英文缩写，利于 SEO 与导航可读性
  ['exammination/excel/_index.md', 'Excel 操作'],
  ['exammination/python/_index.md', 'Python 会考'],
  ['network/base/_index.md', '网络基础'],
  ['network/http/_index.md', 'HTTP 协议'],
  ['network/ip/_index.md', 'IP 协议'],
  ['network/learn/_index.md', '网络学习方法'],
  ['network/tcp/_index.md', 'TCP 协议'],
  ['steam/vex系列/_index.md', 'VEX 机器人'],
  ['teach/其他/_index.md', '其他专题'],
  ['teach/python/基础教程/_index.md', 'Python 基础教程'],
];

for (const [rel, newTitle] of RENAME) {
  const f = join(ROOT, rel);
  let text;
  try {
    text = await readFile(f, 'utf8');
  } catch {
    changes.push([rel, '⚠ 文件不存在，跳过']);
    continue;
  }
  const cur = (text.match(/^title\s*:\s*(.+)$/m) || [])[1]?.trim().replace(/^["']|["']$/g, '');
  if (cur === newTitle) continue;
  const res = inFrontmatter(text, (fm) => setTitle(fm, newTitle));
  if (res) {
    changes.push([f, `title: ${cur} → ${newTitle}`]);
    if (!DRY) await writeFile(f, res.whole.replace(res.before, res.after), 'utf8');
  }
}

// ---------- 2.6) 显式指定 description 的页面 ----------
const DESCR = [
  ['_index.md', '✨高中信息技术教师的多元工作记录站 | 学生编程 / 机器人学习的技术支持平台 | 教学工具、题库、图解网络与创客实践'],
];

for (const [rel, desc] of DESCR) {
  const f = join(ROOT, rel);
  const text = await readFile(f, 'utf8');
  const res = inFrontmatter(text, (fm) =>
    /^description\s*:/m.test(fm)
      ? fm.replace(/^description\s*:.*$/m, `description: "${desc}"`)
      : `description: "${desc}"\n${fm}`
  );
  if (res) {
    changes.push([f, '更新 description']);
    if (!DRY) await writeFile(f, res.whole.replace(res.before, res.after), 'utf8');
  }
}

// ---------- 2.5) 缺 title 的页面：用文件名兜底 ----------
for (const f of files) {
  const text = await readFile(f, 'utf8');
  const fm = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!fm) continue;
  if (/^title\s*:/m.test(fm[1])) continue;
  const base = basename(f, '.md');
  const newTitle = /[a-zA-Z]/.test(base) ? `${base}详解` : base;
  const res = inFrontmatter(text, (fmb) => setTitle(fmb, newTitle));
  if (res) {
    changes.push([f, `补 title: ${newTitle}`]);
    if (!DRY) await writeFile(f, res.whole.replace(res.before, res.after), 'utf8');
  }
}

// ---------- 3) 正文第二个一级标题降级为 h2 ----------
const DEMOTE = [
  ['tools/课堂点名工具.md', 1],
  ['exammination/01鼠标操作.md', 1],
];

for (const [rel, keep] of DEMOTE) {
  const f = join(ROOT, rel);
  const text = await readFile(f, 'utf8');
  const lines = text.split(/\r?\n/);
  let seen = 0;
  let done = false;
  const out = lines.map((ln) => {
    if (done) return ln;
    if (/^#\s+/.test(ln)) {
      seen += 1;
      if (seen > keep) {
        done = true;
        return ln.replace(/^#\s+/, '## ');
      }
    }
    return ln;
  });
  if (done) {
    changes.push([f, '第 2 个 h1 降级为 h2']);
    if (!DRY) await writeFile(f, out.join('\n'), 'utf8');
  }
}

// ---------- 4) 原始 HTML <img> 补 alt ----------
for (const f of files) {
  const text = await readFile(f, 'utf8');
  if (!/<img\s/i.test(text)) continue;
  const fixed = text.replace(/<img\s+((?:(?![a-zA-Z-]+\s*=)[^>])*?)>/gi, (m, attrs) => {
    if (/\balt\s*=/i.test(attrs)) return m;
    return `<img ${attrs} alt="">`;
  });
  if (fixed !== text) {
    changes.push([f, '补 <img> 的 alt 属性']);
    if (!DRY) await writeFile(f, fixed, 'utf8');
  }
}

console.log(changes.map(([f, c]) => `${f}  →  ${c}`).join('\n'));
console.log(`\n共 ${changes.length} 处修改${DRY ? '（dry-run，未写入）' : '（已写入）'}`);
