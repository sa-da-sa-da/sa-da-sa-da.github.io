/* 无刷新站内导航（SPA 式）
 * - 拦截同源站内链接，fetch 目标页后只替换 #VPContent 与 #page-extras
 * - 顶栏 / 页脚 / 搜索弹窗 / 主题等全局 DOM 不动，因此没有任何白屏闪烁
 * - pushState 更新地址并支持前进/后退；View Transitions 可用时做淡入淡出
 * - 任一步骤失败都回退到原生跳转（渐进增强，禁用 JS 时完全不受影响）
 */
import { reinitPage } from './page.js';
import { goToPage } from './pagination.js';

const CACHE = new Map();
const MAX_CACHE = 12;
const STATIC_EXT = /\.(html?|php|pdf|zip|rar|mp4|mp3|wav|png|jpe?g|gif|svg|webp|avif|ico|json|xml|txt|css|js)$/i;

function fetchDoc(url) {
  if (CACHE.has(url)) return CACHE.get(url);
  const job = fetch(url, { headers: { 'X-Requested-With': 'fetch' } })
    .then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.text();
    })
    .then(function (html) {
      if (CACHE.size >= MAX_CACHE) CACHE.clear();
      CACHE.set(url, Promise.resolve(html));
      return html;
    })
    .catch(function (e) {
      CACHE.delete(url);
      throw e;
    });
  CACHE.set(url, job);
  return job;
}

function eligible(a, e) {
  if (!a || !a.getAttribute) return false;
  if (e && (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)) return false;
  if (a.target && a.target !== '_self') return false;
  if (a.hasAttribute('download') || a.dataset.noSpa !== undefined) return false;
  if (a.closest('.pagination-wrapper')) return false; // 分页由 pagination.js 处理

  const raw = a.getAttribute('href') || '';
  if (!raw || raw.charAt(0) === '#' || /^(mailto:|tel:|javascript:)/i.test(raw)) return false;

  let url;
  try { url = new URL(a.href, location.href); } catch (err) { return false; }
  if (url.origin !== location.origin) return false;
  if (STATIC_EXT.test(url.pathname)) return false;
  if (url.pathname === location.pathname && url.search === location.search) return false;
  return true;
}

function scrollToTarget(hash) {
  if (hash) {
    const el = document.getElementById(decodeURIComponent(hash.slice(1)));
    if (el) {
      el.scrollIntoView();
      return;
    }
  }
  window.scrollTo(0, 0);
}

export async function navigate(url, push) {
  const target = new URL(url, location.href);
  try {
    const html = await fetchDoc(target.href);
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const newMain = doc.getElementById('VPContent');
    if (!newMain) { location.href = target.href; return; }

    const runtimeClasses = ['simple-sidebar-collapsed'].filter(function (c) {
      return document.body.classList.contains(c);
    });

    const apply = function () {
      const oldMain = document.getElementById('VPContent');
      const fresh = document.importNode(newMain, true);
      fresh.dataset.fresh = '1'; // 标记：其中的内联 script 需要补跑
      oldMain.replaceWith(fresh);

      const newExtras = doc.getElementById('page-extras');
      const oldExtras = document.getElementById('page-extras');
      if (newExtras && oldExtras) oldExtras.replaceWith(document.importNode(newExtras, true));

      document.title = doc.title;
      document.body.className = doc.body.className;
      runtimeClasses.forEach(function (c) { document.body.classList.add(c); });
    };

    if (document.startViewTransition) {
      // 注意：View Transition 的回调是异步执行的，必须等 DOM 落定后再做页面级初始化
      await document.startViewTransition(apply).updateCallbackDone;
    } else {
      apply();
    }

    // 先落定地址栏再初始化页面：组件初始化可能依赖 URL 状态（如播放器 #t=、阅读器 ?id=）
    if (push !== false) history.pushState({ spa: true }, '', target.href);

    reinitPage();
    scrollToTarget(target.hash);
  } catch (err) {
    window.location.href = target.href;
  }
}

function onClick(e) {
  const a = e.target.closest('a[href]');
  if (!eligible(a, e)) return;
  e.preventDefault();
  navigate(a.href, true);
}

function prefetch(a) {
  if (!eligible(a, null)) return;
  const url = new URL(a.href, location.href).href;
  if (CACHE.has(url)) return;
  fetchDoc(url).catch(function () { /* 忽略预取失败 */ });
}

export function initNavigate() {
  document.addEventListener('click', onClick);
  document.addEventListener('mouseover', function (e) {
    const a = e.target.closest('a[href]');
    if (a) prefetch(a);
  });
  document.addEventListener('touchstart', function (e) {
    const a = e.target.closest('a[href]');
    if (a) prefetch(a);
  }, { passive: true });

  // 当前历史条目打标记，便于区分「分页」与「整页」两种返回
  history.replaceState({ spa: true }, '', location.href);

  window.addEventListener('popstate', function (e) {
    const st = e.state || history.state || {};
    // 目标是分页页且当前 DOM 上就有栅格 → 走轻量分页替换；
    // 否则（例如从文章页返回分页页）走整页 SPA 导航，避免退化成整页刷新
    if (st.paginated && document.getElementById('postGrid')) {
      goToPage(location.href, false);
    } else {
      navigate(location.href, false);
    }
  });
}
