/* 通用 UI
 * 分为两类：
 *  - initUI()     全局一次（滚动进度、回到顶部、复制提示）——这些 DOM 在 baseof 里，SPA 切换不重建
 *  - initPageUI() 每次导航都要跑（侧栏折叠/目录树/抽屉/图片查看器/赞赏）
 */
import { bindOnce, once } from './util.js';

function initScrollProgress() {
  const bar = document.getElementById('scrollProgress');
  if (!bar) return;
  function update() {
    const h = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.width = (h > 0 ? (window.scrollY / h) * 100 : 0) + '%';
  }
  window.addEventListener('scroll', update, { passive: true });
  window.__updateScrollProgress = update;
  update();
}

function initBackTop() {
  const top = document.getElementById('backToTop');
  const bottom = document.getElementById('scrollToBottom');
  const comment = document.getElementById('scrollToComment');
  const smooth = function (y) { window.scrollTo({ top: y, behavior: 'smooth' }); };
  bindOnce(top, 'click', function () { smooth(0); });
  bindOnce(bottom, 'click', function () { smooth(document.body.scrollHeight); });
  bindOnce(comment, 'click', function () {
    const el = document.getElementById('twikoo') || document.getElementById('tcomment');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  });
}

let copyTimer = null;
export function showNotice(text) {
  const el = document.getElementById('copyNotice');
  if (!el) return;
  el.textContent = text;
  el.classList.add('is-show');
  clearTimeout(copyTimer);
  copyTimer = setTimeout(function () { el.classList.remove('is-show'); }, 2600);
}

function initCopyEvent() {
  document.addEventListener('copy', function () {
    const sel = (window.getSelection() || '').toString();
    if (sel && sel.length > 30) {
      showNotice('✨ 你拷贝了哦！~被我发现呢，一定要标注本文来源哦！');
    }
  });
}

// ---------------- 以下为每次导航都要重新绑定 ----------------

function initSidebarCollapse() {
  const btn = document.getElementById('sidebarCollapse');
  if (!btn) return;
  const KEY = 'simple-sidebar-collapsed';
  const collapsed = localStorage.getItem(KEY) === '1';
  document.body.classList.toggle('simple-sidebar-collapsed', collapsed);
  btn.setAttribute('aria-expanded', collapsed ? 'false' : 'true');

  bindOnce(btn, 'click', function () {
    const next = !document.body.classList.contains('simple-sidebar-collapsed');
    document.body.classList.toggle('simple-sidebar-collapsed', next);
    btn.setAttribute('aria-expanded', next ? 'false' : 'true');
    localStorage.setItem(KEY, next ? '1' : '0');
  });
}

function bindDrawer(drawerId, openIds, closeIds) {
  const drawer = document.getElementById(drawerId);
  if (!drawer) return;
  openIds.forEach(function (id) {
    bindOnce(document.getElementById(id), 'click', function () { drawer.classList.add('is-open'); });
  });
  closeIds.forEach(function (id) {
    bindOnce(document.getElementById(id), 'click', function () { drawer.classList.remove('is-open'); });
  });
  bindOnce(drawer, 'click', function (e) {
    if (e.target === drawer) drawer.classList.remove('is-open');
  }, 'clickSelf');
}

function initDrawers() {
  bindDrawer('sideDrawer', ['mobileSidebarBtn', 'sidebarCollapseMobile'], ['sideDrawerClose']);
  bindDrawer('tocDrawer', ['mobileTocBtn'], ['tocDrawerClose']);
}

// ---------- 目录树：文件夹展开/收起 + 激活项滚动可见 ----------
function initSidebarTree() {
  document.querySelectorAll('.sidebar-tree-toggle').forEach(function (btn) {
    bindOnce(btn, 'click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      const group = btn.closest('.sidebar-tree-group');
      if (!group) return;
      const collapsed = group.classList.toggle('is-collapsed');
      btn.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
    });
  });

  document.querySelectorAll('#VPSidebar, #sideDrawer').forEach(function (root) {
    const active = root.querySelector('.sidebar-tree-link.is-active');
    if (active && root.scrollHeight > root.clientHeight) {
      active.scrollIntoView({ block: 'center' });
    }
  });
}

function initImageViewer() {
  const containers = document.querySelectorAll('.vp-doc, .tk-doc-content');
  containers.forEach(function (c) {
    c.querySelectorAll('img').forEach(function (img) {
      if (img.dataset.viewerBound) return;
      img.dataset.viewerBound = '1';
      img.style.cursor = 'zoom-in';
      img.addEventListener('click', function () {
        const mask = document.createElement('div');
        mask.className = 'image-viewer';
        const big = document.createElement('img');
        big.src = img.currentSrc || img.src;
        mask.appendChild(big);
        mask.addEventListener('click', function () { mask.remove(); });
        document.body.appendChild(mask);
      });
    });
  });
}

function initAppreciation() {
  const btn = document.getElementById('appreciationToggle');
  const box = document.getElementById('appreciationContent');
  const text = document.getElementById('appreciationToggleText');
  if (!btn || !box) return;
  bindOnce(btn, 'click', function () {
    const open = box.classList.toggle('is-open');
    if (text) text.textContent = open ? '下次一定' : '打赏支持';
  });
}

function initCategoryMore() {
  document.querySelectorAll('[data-toggle="categories"]').forEach(function (btn) {
    bindOnce(btn, 'click', function () {
      document.querySelectorAll('.tk-category-hidden').forEach(function (el) {
        const hidden = el.style.display === 'none' || getComputedStyle(el).display === 'none';
        el.style.display = hidden ? 'flex' : 'none';
      });
      btn.textContent = btn.textContent.indexOf('更多') > -1 ? '收起 …' : '更多 …';
    });
  });
}

export function initUI() {
  once('scrollProgress', initScrollProgress);
  initBackTop();
  once('copyEvent', initCopyEvent);
}

export function initPageUI() {
  initSidebarCollapse();
  initDrawers();
  initSidebarTree();
  initImageViewer();
  initAppreciation();
  initCategoryMore();
}
