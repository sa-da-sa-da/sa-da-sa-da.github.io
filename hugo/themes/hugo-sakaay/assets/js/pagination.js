/* 无刷新分页：拦截首页 / 列表页的分页链接，局部替换文章栅格，不再整页重载造成闪屏。
 * - 保留 Hugo 生成的分页 DOM，未启用 JS 时仍可正常跳转（渐进增强）
 * - 结果做内存缓存，来回翻页瞬间完成
 * - 切换前预热新页面封面图，避免出现空图框
 * - 浏览器支持 View Transitions 时使用，过渡更顺滑
 */

const cache = new Map();

function parse(html) {
  return new DOMParser().parseFromString(html, 'text/html');
}

/** 预热新一页的封面图（最多 limit 张，超时即放行） */
function preloadCovers(doc, limit) {
  const imgs = Array.prototype.slice.call(doc.querySelectorAll('#postGrid .card-cover img'), 0, limit || 9);
  if (!imgs.length) return Promise.resolve();
  const jobs = imgs.map(function (node) {
    return new Promise(function (resolve) {
      const img = new Image();
      img.onload = img.onerror = function () { resolve(); };
      img.src = node.getAttribute('src');
    });
  });
  return Promise.race([Promise.all(jobs), new Promise(function (r) { setTimeout(r, 700); })]);
}

function swap(container, doc) {
  const newGrid = doc.getElementById('postGrid');
  const newPager = doc.querySelector('.pagination-wrapper');
  if (!newGrid || !newPager) return false;

  const oldPager = document.querySelector('.pagination-wrapper');
  const apply = function () {
    container.innerHTML = newGrid.innerHTML;
    if (oldPager) oldPager.replaceWith(newPager);
    else container.after(newPager);
    document.title = doc.title;
  };

  if (document.startViewTransition) {
    document.startViewTransition(apply);
  } else {
    apply();
  }
  return true;
}

async function fetchPage(url) {
  if (cache.has(url)) return cache.get(url);
  const res = await fetch(url, { headers: { 'X-Requested-With': 'fetch' } });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const html = await res.text();
  if (cache.size > 12) cache.clear();
  cache.set(url, html);
  return html;
}

function scrollToGrid() {
  const anchor = document.querySelector('.posts-section') || document.getElementById('postGrid');
  if (!anchor) return;
  const top = anchor.getBoundingClientRect().top + window.scrollY - (window.innerWidth > 768 ? 84 : 68);
  window.scrollTo({ top: top, behavior: 'smooth' });
}

export async function goToPage(url, push) {
  const grid = document.getElementById('postGrid');
  if (!grid) { window.location.href = url; return; }

  const useTransition = push !== false;
  if (useTransition) grid.classList.add('is-loading');

  try {
    const html = await fetchPage(url);
    const doc = parse(html);
    if (!doc.getElementById('postGrid')) { window.location.href = url; return; }
    await preloadCovers(doc, 9);
    if (!swap(grid, doc)) { window.location.href = url; return; }
    if (useTransition) {
      history.pushState({ paginated: true }, '', url);
      scrollToGrid();
    }
  } catch (e) {
    // 网络异常时退回原生跳转
    window.location.href = url;
  } finally {
    grid.classList.remove('is-loading');
  }
}

/** 把 page 序号换算成 Hugo 的分页 URL（第 1 页在根路径） */
export function pageUrl(n) {
  const base = location.pathname.replace(/\/page\/\d+\/?$/, '/').replace(/\/$/, '');
  return n <= 1 ? base + '/' : base + '/page/' + n + '/';
}

function handleClick(e) {
  const link = e.target.closest('.pagination-wrapper a.page-link');
  if (!link) return;
  const href = link.getAttribute('href');
  if (!href || link.classList.contains('is-disabled')) return;
  // 仅接管同源链接，外链仍走原生行为
  if (link.origin && link.origin !== location.origin) return;
  e.preventDefault();
  goToPage(link.href, true);
}

function gotoByInput() {
  const btn = document.getElementById('gotoPageBtn');
  const input = document.getElementById('gotoPage');
  if (!btn || !input) return;
  const total = parseInt(btn.dataset.total || '1', 10);
  let n = parseInt(input.value, 10);
  if (!n || n < 1) n = 1;
  if (n > total) n = total;
  goToPage(pageUrl(n), true);
}

export function initPagination() {
  // 不在入口判断 #postGrid：SPA 导航后可能才出现分页栅格，事件委托始终有效
  // 全部使用事件委托：分页 DOM 会被整体替换，直连监听会在翻页后失效
  document.addEventListener('click', handleClick);
  document.addEventListener('click', function (e) {
    if (e.target.closest('#gotoPageBtn')) gotoByInput();
  });
  document.addEventListener('keydown', function (e) {
    const t = e.target;
    if (t && t.id === 'gotoPage' && e.key === 'Enter') gotoByInput();
  });
  // 注意：popstate 统一由 navigate.js 处理（会区分分页状态与整页导航）
}
