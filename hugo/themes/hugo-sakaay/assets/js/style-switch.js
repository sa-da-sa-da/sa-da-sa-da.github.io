/* 配置切换：6 套首页展示风格预设（对应原博客的 ConfigSwitch）
 * - 选择结果写入 localStorage['tk:configStyle']
 * - 通过 html[data-home-style] 驱动 CSS（见 assets/css/_home-styles.scss）
 * - Copy 按钮复制该预设的配置 JSON
 *
 * 另含一组「相互独立」的面板配置（分别持久化，切换互不影响）：
 * - 页面最大宽度       localStorage['tk:pageWidth']   → --tk-page-max-width
 * - 文档内容最大宽度   localStorage['tk:docWidth']    → --tk-doc-max-width
 * - 主题色             localStorage['tk:themeColor']  → --primary-color / --secondary-color
 * - 霓虹灯 / 光效模式  localStorage['tk:neon'] / ['tk:neonMode'] → html[data-neon]
 */
import { showNotice } from './ui.js';

export const STYLE_KEY = 'tk:configStyle';
export const STYLE_DEFAULT = 'blog-card';

const PAGE_WIDTH_KEY = 'tk:pageWidth';
const DOC_WIDTH_KEY = 'tk:docWidth';
const COLOR_KEY = 'tk:themeColor';
const NEON_KEY = 'tk:neon';
const NEON_MODE_KEY = 'tk:neonMode';

export const PRESETS = {
  doc: {
    label: '文档预设',
    title: '文档默认风格',
    config: { homeStyle: 'doc', wallpaper: false, hero: { enabled: false }, postGrid: { columns: 2, cover: false, excerpt: true } },
  },
  blog: {
    label: '博客预设',
    title: '首页默认风格',
    config: { homeStyle: 'blog', wallpaper: true, hero: { enabled: true, height: '62vh' }, postGrid: { columns: 2, cover: true } },
  },
  'blog-part': {
    label: '博客小图',
    title: '首页 Banner 小图',
    config: { homeStyle: 'blog-part', wallpaper: true, hero: { enabled: true, height: '46vh' }, postGrid: { columns: 3, cover: true } },
  },
  'blog-full': {
    label: '博客大图',
    title: '首页 Banner 大图 + 评论',
    config: { homeStyle: 'blog-full', wallpaper: true, hero: { enabled: true, height: '100vh' }, comment: { enabled: true } },
  },
  'blog-body': {
    label: '博客全图',
    title: '全站背景图 + 碎片化文章页',
    config: { homeStyle: 'blog-body', bodyBgImage: true, glass: true, postGrid: { columns: 3, cover: true } },
  },
  'blog-card': {
    label: '博客卡片',
    title: '首页卡片文章列表 + 左侧卡片栏',
    config: { homeStyle: 'blog-card', wallpaper: true, hero: { enabled: true, height: '100vh' }, homeSidebar: { position: 'left', width: 300 } },
  },
};

export function getStyle() {
  try {
    const v = localStorage.getItem(STYLE_KEY);
    return v && PRESETS[v] ? v : STYLE_DEFAULT;
  } catch (e) {
    return STYLE_DEFAULT;
  }
}

// ================================================================
//  独立面板配置：与布局预设互不影响，各自持久化
// ================================================================

export const THEME_COLORS = {
  'vp-blue': { label: 'VitePress 蓝', primary: '#646cff', secondary: '#8a95ff' },
  'vp-green': { label: 'VitePress 绿', primary: '#10b981', secondary: '#34d399' },
  'vp-brown': { label: 'VitePress 棕', primary: '#b45309', secondary: '#d97706' },
  'vp-red': { label: 'VitePress 红', primary: '#ef4444', secondary: '#f87171' },
  'ep-blue': { label: 'ElementPlus 蓝', primary: '#409EFF', secondary: '#66b2ff' },
  'ep-green': { label: 'ElementPlus 绿', primary: '#67C23A', secondary: '#85cf60' },
  'ep-yellow': { label: 'ElementPlus 黄', primary: '#E6A23C', secondary: '#ecb86a' },
  'ep-red': { label: 'ElementPlus 红', primary: '#F56C6C', secondary: '#f89292' },
};

function saved(key) {
  try { return localStorage.getItem(key); } catch (e) { return null; }
}
function save(key, val) {
  try { if (val == null) localStorage.removeItem(key); else localStorage.setItem(key, val); } catch (e) { /* ignore */ }
}

/** 页面最大宽度（px），作用于 .VPDoc / .VPNavBar */
export function applyPageWidth(px, persist) {
  px = parseInt(px, 10);
  if (!px || px < 900) px = 1660;
  document.documentElement.style.setProperty('--tk-page-max-width', px + 'px');
  const range = document.getElementById('pageWidthRange');
  const val = document.getElementById('pageWidthVal');
  if (range) range.value = String(px);
  if (val) val.textContent = px + 'px';
  if (persist !== false) save(PAGE_WIDTH_KEY, String(px));
}

/** 文档内容最大宽度（%），作用于 .content-container */
export function applyDocWidth(pct, persist) {
  pct = parseInt(pct, 10);
  if (!pct || pct < 30) pct = 100;
  pct = Math.min(100, pct);
  document.documentElement.style.setProperty('--tk-doc-max-width', pct + '%');
  const range = document.getElementById('docWidthRange');
  const val = document.getElementById('docWidthVal');
  if (range) range.value = String(pct);
  if (val) val.textContent = pct + '%';
  if (persist !== false) save(DOC_WIDTH_KEY, String(pct));
}

/** 主题色：id 为空表示恢复默认（站点青色） */
export function applyThemeColor(id, persist) {
  const el = document.documentElement;
  const c = THEME_COLORS[id];
  document.querySelectorAll('.style-colors .swatch').forEach(function (sw) {
    sw.classList.toggle('is-active', !!c && sw.dataset.color === id);
  });
  if (!c) {
    el.style.removeProperty('--primary-color');
    el.style.removeProperty('--secondary-color');
    if (persist !== false) save(COLOR_KEY, null);
    return;
  }
  el.style.setProperty('--primary-color', c.primary);
  el.style.setProperty('--secondary-color', c.secondary);
  if (persist !== false) save(COLOR_KEY, id);
}

function neonState() {
  return {
    on: saved(NEON_KEY) === 'on',
    mode: saved(NEON_MODE_KEY) === 'stroke' ? 'stroke' : 'glow',
  };
}

function renderNeon(state, persist) {
  const el = document.documentElement;
  el.setAttribute('data-neon', state.on ? 'on' : 'off');
  el.setAttribute('data-neon-mode', state.mode);
  document.querySelectorAll('#neonSeg [data-neon]').forEach(function (b) {
    b.classList.toggle('is-active', (b.dataset.neon === 'on') === state.on);
  });
  document.querySelectorAll('#neonModeSeg [data-mode]').forEach(function (b) {
    b.classList.toggle('is-active', b.dataset.mode === state.mode);
  });
  const row = document.getElementById('neonModeRow');
  if (row) row.classList.toggle('style-row--hidden', !state.on);
  if (persist !== false) {
    save(NEON_KEY, state.on ? 'on' : 'off');
    save(NEON_MODE_KEY, state.mode);
  }
}

export function setNeon(on, persist) {
  renderNeon({ on: !!on, mode: neonState().mode }, persist);
}

export function setNeonMode(mode, persist) {
  renderNeon({ on: neonState().on, mode: mode === 'stroke' ? 'stroke' : 'glow' }, persist);
}

export function applyStyle(style, persist) {
  const target = PRESETS[style] ? style : STYLE_DEFAULT;
  document.documentElement.setAttribute('data-home-style', target);
  if (persist !== false) {
    try { localStorage.setItem(STYLE_KEY, target); } catch (e) { /* ignore */ }
  }
  document.querySelectorAll('#styleSegmented [data-style]').forEach(function (btn) {
    btn.classList.toggle('is-active', btn.dataset.style === target);
  });
}

function closePopover() {
  const pop = document.getElementById('stylePopover');
  const btn = document.getElementById('styleSwitchBtn');
  if (pop) pop.classList.remove('is-open');
  if (btn) btn.setAttribute('aria-expanded', 'false');
}

function copyPreset(style) {
  const preset = PRESETS[style] || PRESETS[STYLE_DEFAULT];
  const text = JSON.stringify(preset.config, null, 2);
  const done = function () { showNotice('配置已复制：' + preset.label); };
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(done).catch(function () { showNotice('复制失败，请手动复制'); });
  } else {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); done(); } catch (e) { showNotice('复制失败'); }
    ta.remove();
  }
}

export function initStyleSwitch() {
  applyStyle(getStyle(), false);

  const trigger = document.getElementById('styleSwitchBtn');
  const pop = document.getElementById('stylePopover');
  if (trigger && pop) {
    trigger.addEventListener('click', function (e) {
      e.stopPropagation();
      const open = !pop.classList.contains('is-open');
      pop.classList.toggle('is-open', open);
      trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    pop.addEventListener('click', function (e) { e.stopPropagation(); });
    document.addEventListener('click', closePopover);
  }

  document.querySelectorAll('#styleSegmented [data-style]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      applyStyle(btn.dataset.style);
      const preset = PRESETS[btn.dataset.style];
      showNotice('已切换到：' + (preset ? preset.label : btn.dataset.style));
      closePopover();
    });
  });

  const copyBtn = document.getElementById('styleCopyBtn');
  if (copyBtn) {
    copyBtn.addEventListener('click', function () {
      copyPreset(document.documentElement.getAttribute('data-home-style') || STYLE_DEFAULT);
    });
  }

  // —— 独立配置初始化与绑定（互不影响） ——
  applyPageWidth(saved(PAGE_WIDTH_KEY), false);
  applyDocWidth(saved(DOC_WIDTH_KEY), false);
  applyThemeColor(saved(COLOR_KEY), false);
  renderNeon(neonState(), false);

  const pwRange = document.getElementById('pageWidthRange');
  if (pwRange) {
    pwRange.addEventListener('input', function () { applyPageWidth(pwRange.value); });
  }
  const dwRange = document.getElementById('docWidthRange');
  if (dwRange) {
    dwRange.addEventListener('input', function () { applyDocWidth(dwRange.value); });
  }

  document.querySelectorAll('.style-colors .swatch').forEach(function (sw) {
    sw.addEventListener('click', function () {
      applyThemeColor(sw.dataset.color);
      showNotice('主题色：' + THEME_COLORS[sw.dataset.color].label);
    });
  });
  const colorReset = document.getElementById('themeColorReset');
  if (colorReset) {
    colorReset.addEventListener('click', function () {
      applyThemeColor(null);
      showNotice('主题色已恢复默认');
    });
  }

  document.querySelectorAll('#neonSeg [data-neon]').forEach(function (btn) {
    btn.addEventListener('click', function () { setNeon(btn.dataset.neon === 'on'); });
  });
  document.querySelectorAll('#neonModeSeg [data-mode]').forEach(function (btn) {
    btn.addEventListener('click', function () { setNeonMode(btn.dataset.mode); });
  });
}
