#!/usr/bin/env node
/**
 * 内容迁移脚本：VitePress(vitepress-theme-teek)  docs/  →  Hugo  content/
 *
 * 处理内容：
 *  1. frontmatter：permalink→url、author 对象拍平、Teek 专用字段映射
 *  2. VitePress 容器语法 ::: tip/warning/danger/info/details/navCard/center
 *  3. Vue 组件 → 语义化 HTML 块 + JSON 数据（由 static/js/components.js 渲染）
 *  4. <ClientOnly> 包裹标签剥离
 *  5. 目录名/文件名去数字前缀，数字前缀转为 weight 保持侧边栏排序
 *
 * 用法： node scripts/migrate-content.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { load as yamlLoad, dump as yamlDump } from 'js-yaml';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const HUGO_ROOT = path.resolve(__dirname, '..');
const SRC = path.resolve(HUGO_ROOT, '..', 'docs');
const DEST = path.join(HUGO_ROOT, 'content');

const SKIP_DIRS = new Set(['.vitepress', 'public', 'dist', 'node_modules', '.cache', 'examples']);


/** 源目录 → Hugo section */
const SECTION_MAP = {
  '01.学习': 'teach',
  '02.创客': 'steam',
  '03.考试': 'exammination',
  '30图说网络': 'network',
  '35.工具': 'tools',
  '40.生活': 'life',
  '45.精神小屋': 'love',
  '50.娱乐': 'yule',
  '55.兴趣': 'xingqu',
  '60.关于': 'about',
  culture: 'culture',
  guide: 'guide',
};

const SECTION_TITLES = {
  teach: '学习',
  steam: '创客',
  exammination: '考试',
  network: '图说网络',
  tools: '工具',
  life: '生活',
  love: '精神小屋',
  yule: '娱乐',
  xingqu: '兴趣',
  about: '关于',
  culture: '校园文创',
  guide: '指南',
};

/** @pages 下指定页面 → 目标文件 + 布局 */
const PAGE_SPECIALS = {
  'archivesPage.md': { dest: 'archives.md', layout: 'archives' },
  'articleOverviewPage.md': { dest: 'articleOverview.md', layout: 'article-overview' },
  'loginPage.md': { dest: 'login.md', layout: 'login' },
  'riskLinkPage.md': { dest: 'risk-link.md', layout: 'risk-link', url: '/risk-link' },
  'nav.md': { dest: 'nav.md', layout: 'nav' },
  'time.md': { dest: 'time.md', layout: 'iframe', iframeUrl: 'https://time.sakaay.com/' },
  'coding.md': { dest: 'program.md', layout: 'iframe', iframeUrl: 'https://e.sakaay.com' },
  'categoriesPage.md': null, // 由 Hugo taxonomy 接管
  'tagsPage.md': null,
  'product/[id].md': { dest: 'products/detail.md', layout: 'product-detail' },
};

const stats = { converted: 0, skipped: [], components: {}, containers: {}, files: [] };

// ---------------------------------------------------------------- utils

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name) || entry.name.startsWith('.')) continue;
      walk(path.join(dir, entry.name), out);
    } else if (entry.name.endsWith('.md') && !entry.name.startsWith('.')) {
      out.push(path.join(dir, entry.name));
    }
  }
  return out;
}

const pad2 = (n) => String(n).padStart(2, '0');

/** js-yaml 会把 "2024-12-21 10:50:31" 解析为 UTC Date，这里还原成原始字面量字符串 */
function fmtDate(v) {
  if (v instanceof Date) {
    return (
      v.getUTCFullYear() + '-' + pad2(v.getUTCMonth() + 1) + '-' + pad2(v.getUTCDate()) +
      'T' + pad2(v.getUTCHours()) + ':' + pad2(v.getUTCMinutes()) + ':' + pad2(v.getUTCSeconds()) +
      '+08:00'
    );
  }
  const s = String(v).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}$/.test(s)) return s.replace(' ', 'T') + '+08:00';
  return s;
}

function splitFrontmatter(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!m) return { fm: {}, body: text };
  let fm = {};
  try {
    fm = yamlLoad(m[1]) || {};
  } catch (e) {
    stats.skipped.push(`frontmatter 解析失败：${e.message}`);
  }
  return { fm, body: text.slice(m[0].length) };
}

/** 去掉 "01." 前缀，返回 { name, num } */
function stripPrefix(seg) {
  const m = seg.match(/^(\d+)[.\-_\s]+(.*)$/);
  if (m) return { name: m[2].trim(), num: parseInt(m[1], 10) };
  return { name: seg, num: null };
}

function toArray(v) {
  if (v == null) return [];
  return Array.isArray(v) ? v : [v];
}

/** 站点自有封面图池（用于替换已失效的外部 AI 生图地址） */
const LOCAL_COVERS = [
  'https://img.sakaay.com/d/img/bz/06e8a51ef12581befd70b168dd914d77--3968391448.avif',
  'https://img.sakaay.com/d/img/bz/10ada35bb4c54f127960eefb66849e56.avif',
  'https://img.sakaay.com/d/img/bz/20251214_181402_1481.avif',
  'https://img.sakaay.com/d/img/bz/20251214_181726_7812.avif',
  'https://img.sakaay.com/d/img/bz/20251214_182048_3384.avif',
  'https://img.sakaay.com/d/img/bz/20251214_182429_5973.avif',
  'https://img.sakaay.com/d/img/bz/20251214_182652_8031.avif',
  'https://img.sakaay.com/d/img/bz/1555298b8bcf9421b5fb2cd96a9fc4d5.avif',
];

/** 外部 AI 生图接口已失效（页面上会显示 The image is generating...），替换为站内封面 */
function fixCoverUrl(url, seed) {
  if (!url) return url;
  if (!/mchost\.guru|trae-api-cn/.test(url)) return url;
  let hash = 0;
  for (const ch of seed || url) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return LOCAL_COVERS[hash % LOCAL_COVERS.length];
}

/** 过滤 YAML 里的空值 / 字符串 "null"（原站 @pages 存在 categories: [null]） */
function isMeaningfulName(v) {
  const s = String(v == null ? '' : v).trim();
  return s !== '' && s.toLowerCase() !== 'null' && s !== 'undefined';
}

/** 把 VitePress 源路径（如 03.考试/在线练习）映射为 Hugo content 相对目录 */
function mapSourcePath(srcPath) {
  const segs = srcPath.split('/').filter(Boolean);
  if (!segs.length) return '';
  const section = SECTION_MAP[segs[0]] || slugifyPath(stripPrefix(segs[0]).name);
  const rest = segs.slice(1).map((s) => slugifyPath(stripPrefix(s).name));
  return [section, ...rest].join('/');
}

function slugifyPath(seg) {
  return seg
    .replace(/[\\/:*?"<>|]/g, '')
    .replace(/\s+/g, '-');
}

function jsonScript(obj) {
  return JSON.stringify(obj).replace(/</g, '\\u003c').replace(/>/g, '\\u003e');
}

/** 解析 JS 字面量（Vue 绑定值），失败则按字符串处理 */
function parseJs(value) {
  if (value == null) return undefined;
  const s = String(value).trim();
  if (!s) return '';
  if (/^[[{]/.test(s)) {
    try {
      return Function('"use strict";return (' + s + ')')();
    } catch (e) {
      return s.replace(/^['"]|['"]$/g, '');
    }
  }
  if (/^-?\d+(\.\d+)?$/.test(s)) return Number(s);
  if (s === 'true') return true;
  if (s === 'false') return false;
  return s.replace(/^['"]|['"]$/g, '');
}

// ---------------------------------------------------------------- 容器

const CONTAINER_TITLES = {
  tip: '提示',
  warning: '警告',
  danger: '危险',
  info: '信息',
  note: '注意',
  important: '重要',
  caution: '警告',
  details: '详细信息',
  center: '居中',
};

function renderContainer(rawType, title, inner) {
  const type = String(rawType).toLowerCase();
  if (type === 'center') {
    return `<div class="text-center">\n\n${inner.trim()}\n\n</div>\n`;
  }
  if (type === 'navcard') {
    return renderNavCard(inner);
  }
  const cls = CONTAINER_TITLES[type] ? type : 'info';
  const label = title || CONTAINER_TITLES[cls] || '';
  return `<div class="custom-block ${cls}">
<div class="custom-block-title">${label}</div>

${inner.trim()}

</div>
`;
}

function renderNavCard(inner) {
  const m = inner.match(/```ya?ml\s*\n([\s\S]*?)```/);
  if (!m) return `<div class="nav-grid"></div>\n`;
  let list = [];
  try {
    list = yamlLoad(m[1]) || [];
  } catch (e) {
    stats.skipped.push(`navCard YAML 解析失败：${e.message}`);
    return `<div class="nav-grid"></div>\n`;
  }
  const cards = list
    .map(
      (it) => `  <a class="nav-card-item" href="${it.link || '#'}" target="_blank" rel="noopener">
    <img src="${it.img || '/img/logo.png'}" alt="${it.name || ''}" loading="lazy">
    <span>
      <span class="nav-card-name">${it.name || ''}</span>
      <span class="nav-card-desc">${it.desc || ''}</span>
    </span>
  </a>`
    )
    .join('\n');
  return `<div class="nav-grid">
${cards}
</div>
`;
}

/** 围栏式提示块 ```{Note} ... ``` → 自定义容器 */
function convertFenceCallouts(text) {
  return text.replace(
    /^```\{\.?([\w-]+)\}[^\n]*\n([\s\S]*?)^```[ \t]*$/gm,
    (full, type, inner) => {
      const t = String(type).toLowerCase();
      const known = ['note', 'tip', 'warning', 'danger', 'info', 'important', 'caution', 'details'];
      if (!known.includes(t)) return full;
      stats.containers[t] = (stats.containers[t] || 0) + 1;
      return renderContainer(t, '', inner.replace(/\s+$/, ''));
    }
  );
}

/** 解析 ::: 容器（支持嵌套，靠冒号数量区分层级） */
function convertContainers(text) {
  const lines = text.split(/\r?\n/);
  const out = [];
  const stack = []; // { colons, type, title, buf: [] }

  const openRe = /^(:{3,})\s*([A-Za-z][\w-]*)\s*(.*)$/;
  const closeRe = /^(:{3,})\s*$/;
  let inFence = false;
  let fenceMarker = '';

  const pushLine = (line) => {
    if (stack.length) stack[stack.length - 1].buf.push(line);
    else out.push(line);
  };

  for (const line of lines) {
    // 代码围栏内不做任何容器解析
    const fence = line.match(/^\s*(`{3,}|~{3,})/);
    if (fence) {
      if (!inFence) {
        inFence = true;
        fenceMarker = fence[1][0];
      } else if (fence[1][0] === fenceMarker) {
        inFence = false;
        fenceMarker = '';
      }
      pushLine(line);
      continue;
    }
    if (inFence) {
      pushLine(line);
      continue;
    }

    const close = line.match(closeRe);
    if (close && stack.length && close[1].length >= stack[stack.length - 1].colons) {
      const node = stack.pop();
      const html = renderContainer(node.type, node.title, node.buf.join('\n'));
      stats.containers[node.type] = (stats.containers[node.type] || 0) + 1;
      pushLine(html);
      continue;
    }
    const open = line.match(openRe);
    if (open && !close) {
      stack.push({ colons: open[1].length, type: open[2], title: (open[3] || '').trim(), buf: [] });
      continue;
    }
    pushLine(line);
  }
  // 未闭合的容器：原样输出
  while (stack.length) {
    const node = stack.pop();
    stats.skipped.push(`容器 ${node.type} 未闭合，已原样保留`);
    const raw = `::: ${node.type} ${node.title}\n${node.buf.join('\n')}\n:::`;
    if (stack.length) stack[stack.length - 1].buf.push(raw);
    else out.push(raw);
  }
  return out.join('\n');
}

// ---------------------------------------------------------------- Vue 组件

/** 仅对代码围栏之外的片段应用转换，避免误改示例代码 */
function mapOutsideFences(text, fn) {
  const lines = text.split(/\r?\n/);
  const chunks = [];
  let buf = [];
  let inFence = false;
  let marker = '';

  for (const line of lines) {
    const m = line.match(/^\s*(`{3,}|~{3,})/);
    if (!inFence && m) {
      chunks.push({ text: buf.join('\n'), convert: true });
      buf = [line];
      inFence = true;
      marker = m[1][0];
      continue;
    }
    if (inFence) {
      buf.push(line);
      if (m && m[1][0] === marker && line.trim().length >= 3) {
        chunks.push({ text: buf.join('\n'), convert: false });
        buf = [];
        inFence = false;
        marker = '';
      }
      continue;
    }
    buf.push(line);
  }
  chunks.push({ text: buf.join('\n'), convert: true });
  return chunks.map((c) => (c.convert ? fn(c.text) : c.text)).join('\n');
}

const COMPONENT_MAP = {
  MultipleChoiceQuestion: 'mcq',
  TrueOrFalseQuestion: 'tf',
  FillInTheBlank: 'fib',
  FillInTheBlankQuestion: 'fib',
  FillBlankQuestion: 'fib',
};

/** 单例组件 → 语义化容器（由 static/js/components.js 渲染） */
const BLOCK_MAP = {
  ToolsGallery: 'sk-tools-gallery',
  FunGallery: 'sk-fun-gallery',
  MusicPlayer: 'sk-music-player',
  MoviePlayer: 'sk-movie-player',
  PdfReader: 'sk-pdf-reader',
  About: 'sk-about',
  ThoughtCards: 'sk-thought-cards',
  CoupleAlbum: 'sk-couple-album',
  Timeline: 'sk-timeline',
  Moments: 'sk-moments',
  EmojiShiroki: 'sk-emoji',
  'emoji-Shiroki': 'sk-emoji',
  ProductDetail: 'sk-product-detail',
};

function renderQuestionBlock(type, attrs) {
  const data = {
    type,
    title: attrs.title || '',
    options: attrs.options || (type === 'tf' ? ['正确', '错误'] : []),
    correct: attrs.correctOptions || attrs.correctAnswers || [],
    explanation: attrs.explanation || '',
    images: attrs.images || [],
  };
  if (type === 'fib') {
    delete data.options;
  }
  return `<div class="sk-question" data-type="${type}">
<script type="application/json">${jsonScript(data)}</script>
</div>
`;
}

function renderComponent(name, attrString) {
  const attrs = {};
  const re = /(:?[\w@.-]+)\s*=\s*("([^"]*)"|'([^']*)')/g;
  let m;
  while ((m = re.exec(attrString))) {
    const key = m[1].replace(/^:/, '');
    const val = m[3] !== undefined ? m[3] : m[4];
    attrs[key] = m[3] !== undefined ? parseJs(val) : val;
  }

  stats.components[name] = (stats.components[name] || 0) + 1;

  if (COMPONENT_MAP[name]) return renderQuestionBlock(COMPONENT_MAP[name], attrs);

  if (name === 'PythonEditor') {
    return `<div class="sk-python" data-problem-id="${attrs.problemId || ''}">
<script type="application/json">${jsonScript({ problemId: attrs.problemId || '' })}</script>
</div>
`;
  }

  if (name === 'ProductGrid') {
    return `<div class="sk-products" data-category="${attrs.category || ''}"></div>\n`;
  }

  if (BLOCK_MAP[name]) {
    return `<div class="${BLOCK_MAP[name]}" data-props="${jsonScript(attrs).replace(/"/g, '&quot;')}"></div>\n`;
  }

  if (name === 'ThreeDModelViewer') {
    return `<div class="sk-3d" data-props="${jsonScript(attrs).replace(/"/g, '&quot;')}"></div>\n`;
  }

  if (name === 'Twikoo') {
    return '<div id="tcomment"></div>\n';
  }

  if (name === 'GoogleAd') {
    const ads = { client: 'ca-pub-2897720906666216', slot: attrs['ad-slot'] || '2668661755' };
    return `<div class="ad-block">
<ins class="adsbygoogle" style="display:block" data-ad-client="${ads.client}" data-ad-slot="${ads.slot}" data-ad-format="auto" data-full-width-responsive="true"></ins>
</div>
`;
  }

  stats.skipped.push(`未映射组件 ${name}（已原样保留）`);
  return null;
}

function convertComponents(text) {
  // 自闭合组件（属性值可能含 > < =，需要容忍引号内内容）
  text = text.replace(/<([A-Z][A-Za-z0-9]*)((?:"[^"]*"|'[^']*'|[^>"'])*?)\/>/g, (full, name, attrString) => {
    if (name === 'ClientOnly') return '';
    const html = renderComponent(name, attrString || '');
    return html == null ? full : html;
  });
  // 成对组件（内容保留）
  text = text.replace(/<ClientOnly>\s*/g, '').replace(/\s*<\/ClientOnly>/g, '');
  return text;
}

/** 清理 VitePress/Vue 残留：script setup 块、无对应实现的组件标签 */
function cleanupLeftovers(text) {
  // 1) <script setup>...</script>（Vue 专属，浏览器执行会报语法错误）
  text = text.replace(/<script\s+setup[^>]*>[\s\S]*?<\/script>\s*/gi, '');

  // 2) 无对应实现的组件（渲染出来是不可见未知标签）
  text = text.replace(/<\s*(confetti|TkIcon|HomeFeature|TkMessage)\b[^>]*\/?>/gi, '');

  // 3) 其它未转换的 PascalCase 自闭合标签：转成行内代码，避免文档示例变成空白
  text = text.replace(/<([A-Z][A-Za-z0-9]*)((?:"[^"]*"|'[^']*'|[^>"'])*?)\/>/g, (full) => '`' + full + '`');

  return text;
}

// ---------------------------------------------------------------- frontmatter

function transformFm(fm, ctx) {
  const out = {};
  if (fm.title) out.title = String(fm.title).trim();
  if (fm.date) out.date = fmtDate(fm.date);
  if (fm.lastUpdated) out.lastmod = fmtDate(fm.lastUpdated);
  if (fm.description) out.description = String(fm.description).trim();

  const urlPath = fm.permalink || ctx.defaultUrl;
  if (urlPath) out.url = String(urlPath);

  // 分类收敛：原站把整段目录路径写进了 categories（如 [学习, 30图说网络, 1_base]），
  // 会让分类卡片出现几十个碎片分类。这里统一归为该内容所属的顶层分区。
  const sectionTitle = ctx.sectionTitle || (ctx.section ? SECTION_TITLES[ctx.section] : null);
  if (sectionTitle) {
    out.categories = [sectionTitle];
  } else {
    const cats = toArray(fm.categories).map((c) => String(c)).filter(isMeaningfulName);
    if (cats.length) out.categories = cats;
  }
  const tags = toArray(fm.tags).map((t) => String(t)).filter(isMeaningfulName);
  if (tags.length) out.tags = tags;

  if (fm.coverImg) {
    out.coverImg = fixCoverUrl(String(fm.coverImg).trim(), ctx.defaultUrl || '');
  }
  if (fm.author) out.author = typeof fm.author === 'string' ? fm.author : fm.author.name || '';
  if (fm.weight != null) out.weight = fm.weight;
  if (ctx.weight != null && out.weight == null) out.weight = ctx.weight;
  // 隐藏页面：draft 透传（Hugo 默认不渲染 draft 页，也不再出现在侧栏/搜索/归档）
  if (fm.draft === true) out.draft = true;

  for (const key of ['comment', 'copyright', 'sidebar', 'articleTopTip', 'articleBottomTip', 'featured', 'sticky']) {
    if (fm[key] === false) out[key] = false;
    if (fm[key] === true) out[key] = true;
  }
  if (fm.article === false) out.article = false;
  if (ctx.srcDir) out.srcDir = ctx.srcDir;

  // Teek 目录页（catalogue）→ 保留可供模板聚合的分组路径
  if (fm.catalogue === true && fm.path) {
    out.catalogue = true;
    out.cataloguePath = mapSourcePath(String(fm.path));
  }

  // 布局映射（注意：Hugo 中 page.html 是单页默认模板名，居中页一律用 simple-page）
  const layoutMap = { 'friend-link': 'friend-links', NavLayout: 'nav', page: 'simple-page', home: 'simple-page' };
  if (fm.layout === false || fm.layout === 'false') out.layout = 'simple-page';
  else if (typeof fm.layout === 'string' && layoutMap[fm.layout]) out.layout = layoutMap[fm.layout];
  else if (ctx.layout) out.layout = ctx.layout;

  if (ctx.layout === 'iframe') {
    out.layout = 'iframe';
    out.iframeUrl = ctx.iframeUrl;
    out.sidebar = false;
    out.comment = false;
  }
  if (ctx.layout === 'friend-links' && fm.links) out.links = fm.links;
  if (ctx.layout === 'product-detail') out.products = true;

  return out;
}

function stringifyFrontmatter(obj) {
  const clean = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === '') continue;
    clean[k] = v;
  }
  const body = yamlDump(clean, { lineWidth: 120, noRefs: true, quotingType: '"', forceQuotes: false });
  return `---\n${body}---\n`;
}

// ---------------------------------------------------------------- 主流程

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

const MANIFEST = path.join(DEST, '.migrate-manifest.json');

/** 统一写文件入口：记录到清单，便于下次清理陈旧文件（不使用递归删除） */
function writeContent(absPath, text) {
  ensureDir(path.dirname(absPath));
  fs.writeFileSync(absPath, text, 'utf8');
  stats.files.push(path.relative(DEST, absPath).replace(/\\/g, '/'));
}

/** 该文件是否由本脚本生成过（生成物允许覆盖，手写文件保留）。
 *  除清单外，再做一次内容特征识别，兼容清单机制加入之前生成的历史文件。 */
function isGenerated(previous, absPath) {
  if (previous.indexOf(path.relative(DEST, absPath).replace(/\\/g, '/')) > -1) return true;
  try {
    const t = fs.readFileSync(absPath, 'utf8');
    return t.indexOf('render: never') > -1 || t.indexOf('sectionIndex:') > -1;
  } catch (e) {
    return false;
  }
}

/** 依据上次清单清理本次未生成的文件（逐文件 unlink，避免递归删除） */
function pruneStale(previous, current) {
  const keep = new Set(current);
  let removed = 0;
  for (const rel of previous) {
    if (keep.has(rel)) continue;
    try {
      fs.unlinkSync(path.join(DEST, rel));
      removed++;
    } catch (e) {
      /* 忽略 */
    }
  }
  return removed;
}

/** 源文件相对 docs/ 的顶层目录名 */
function rel0(srcFile) {
  return path.relative(SRC, srcFile).split(path.sep)[0];
}

function targetRelPath(srcFile) {
  const rel = path.relative(SRC, srcFile).split(path.sep);
  const top = rel[0];
  const section = SECTION_MAP[top];
  if (!section) return null;
  const rest = rel.slice(1).map((seg) => stripPrefix(seg).name).map(slugifyPath);
  return path.join(section, ...rest);
}

function convertFile(srcFile, destFile, ctx = {}) {
  let raw = fs.readFileSync(srcFile, 'utf8');
  const { fm, body } = splitFrontmatter(raw);

  let content = body;
  content = convertFenceCallouts(content);
  content = convertContainers(content);
  content = mapOutsideFences(content, convertComponents);
  content = mapOutsideFences(content, cleanupLeftovers);

  const newFm = transformFm(fm, ctx);
  if (ctx.extraFm) Object.assign(newFm, ctx.extraFm);

  writeContent(destFile, stringifyFrontmatter(newFm) + '\n' + content.trimStart());
  stats.converted++;
}

function readManifest() {
  try {
    return JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
  } catch (e) {
    return [];
  }
}

function main() {
  const previous = readManifest();
  ensureDir(DEST);

  // 1) 普通内容
  const sources = walk(SRC);
  const sectionIndexFiles = new Map();

  for (const src of sources) {
    const base = path.basename(src);
    if (base === 'README.md' || base === 'index.md') {
      const rel = path.relative(SRC, src).split(path.sep);
      const section = SECTION_MAP[rel[0]];
      if (section) {
        sectionIndexFiles.set(section, src);
        continue;
      }
    }
    const destRel = targetRelPath(src);
    if (!destRel) {
      stats.skipped.push(`未映射路径，跳过：${path.relative(SRC, src)}`);
      continue;
    }
    const numMatch = base.match(/^(\d+)/);
    const dirRel = path.dirname(destRel).replace(/\\/g, '/');
    convertFile(src, path.join(DEST, destRel), {
      weight: numMatch ? parseInt(numMatch[1], 10) : null,
      defaultUrl: '/' + destRel.replace(/\\/g, '/').replace(/\.md$/, ''),
      srcDir: dirRel === '.' ? '' : dirRel,
      section: SECTION_MAP[rel0(src)],
      sectionTitle: SECTION_TITLES[SECTION_MAP[rel0(src)]],
    });
  }

  // 2) 分区首页（README.md / index.md）
  for (const [section, src] of sectionIndexFiles) {
    const destFile = path.join(DEST, section, '_index.md');
    convertFile(src, destFile, {
      defaultUrl: `/${section}/`,
      section,
      sectionTitle: SECTION_TITLES[section],
      extraFm: {},
    });
    // 覆盖 title（README 之类的占位标题不好看）
    let txt = fs.readFileSync(destFile, 'utf8');
    const { fm, body } = splitFrontmatter(txt);
    fm.title = SECTION_TITLES[section] || section;
    writeContent(destFile, stringifyFrontmatter(fm) + body);
  }

  // 3) 每个 section 生成 _index.md（若不存在）
  for (const [srcDir, section] of Object.entries(SECTION_MAP)) {
    if (sectionIndexFiles.has(section)) continue;
    const file = path.join(DEST, section, '_index.md');
    if (fs.existsSync(file) && !isGenerated(previous, file)) continue;
    writeContent(
      file,
      stringifyFrontmatter({
        title: SECTION_TITLES[section],
        url: `/${section}/`,
        weight: 99,
      })
    );
  }

  // 4) 子目录排序用 _index.md
  for (const src of walk(SRC)) {
    const rel = path.relative(SRC, src).split(path.sep);
    const section = SECTION_MAP[rel[0]];
    if (!section || rel.length < 3) continue;
    const subSegs = rel.slice(1, -1);
    const stripped = subSegs.map((s) => stripPrefix(s).name).map(slugifyPath);
    const lastNum = subSegs.map((s) => stripPrefix(s).num).filter((n) => n != null).pop();
    const dir = path.join(DEST, section, ...stripped);
    const idx = path.join(dir, '_index.md');
    if (fs.existsSync(idx) && !isGenerated(previous, idx)) continue;
    writeContent(
      idx,
      stringifyFrontmatter({
        title: subSegs[subSegs.length - 1] ? stripPrefix(subSegs[subSegs.length - 1]).name : stripped[stripped.length - 1],
        weight: lastNum || undefined,
        sectionIndex: true,
      })
    );
  }

  // 5) @pages 特殊页
  const pagesDir = path.join(SRC, '@pages');
  if (fs.existsSync(pagesDir)) {
    for (const entry of fs.readdirSync(pagesDir, { withFileTypes: true })) {
      if (entry.isDirectory()) continue;
      const spec = PAGE_SPECIALS[entry.name];
      if (!spec) continue;
      const src = path.join(pagesDir, entry.name);
      convertFile(src, path.join(DEST, spec.dest), {
        layout: spec.layout,
        iframeUrl: spec.iframeUrl,
        defaultUrl: spec.url,
        extraFm: spec.url ? { url: spec.url } : {},
      });
    }
  }

  // 6) taxonomy 首页中文标题
  const taxonomies = [
    { dir: 'categories', title: '分类', desc: '按内容分类浏览全部文章' },
    { dir: 'tags', title: '标签', desc: '按标签快速定位文章' },
  ];
  for (const t of taxonomies) {
    const file = path.join(DEST, t.dir, '_index.md');
    writeContent(file, stringifyFrontmatter({ title: t.title, description: t.desc }) + '\n');
  }

  // 7) 隐私政策
  const privacy = path.join(SRC, 'privacy.md');
  if (fs.existsSync(privacy)) {
    convertFile(privacy, path.join(DEST, 'pages', 'privacy.md'), {
      layout: 'page',
      defaultUrl: '/pages/5e2700',
      extraFm: { url: '/pages/5e2700', sidebar: false, comment: false },
    });
  }

  // 清理陈旧文件 + 写入清单
  const current = [...new Set(stats.files)];
  const removed = pruneStale(previous, current);
  fs.writeFileSync(MANIFEST, JSON.stringify(current, null, 1), 'utf8');

  // 汇总
  if (removed > 0) console.log('已清理陈旧文件 ' + removed + ' 个');
  console.log('迁移完成，共转换 ' + stats.converted + ' 个文件');
  console.log('组件转换统计：', stats.components);
  console.log('容器转换统计：', stats.containers);
  if (stats.skipped.length) {
    console.log('\n注意 / 跳过：');
    [...new Set(stats.skipped)].forEach((s) => console.log('  - ' + s));
  }
}

main();
