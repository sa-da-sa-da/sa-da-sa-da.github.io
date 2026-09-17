/* 导航：下拉菜单、移动端抽屉、导航栏时钟、标题变化、滚动阴影 */
function initMenu() {
  const groups = document.querySelectorAll('[data-menu-group]');
  function closeAll(except) {
    groups.forEach(function (g) { if (g !== except) g.classList.remove('is-open'); });
  }
  groups.forEach(function (g) {
    const btn = g.querySelector('.button');
    g.addEventListener('mouseenter', function () {
      g.classList.add('is-open');
      btn && btn.setAttribute('aria-expanded', 'true');
    });
    g.addEventListener('mouseleave', function () {
      g.classList.remove('is-open');
      btn && btn.setAttribute('aria-expanded', 'false');
    });
    btn && btn.addEventListener('click', function (e) {
      e.preventDefault();
      const open = g.classList.toggle('is-open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      closeAll(g);
    });
  });
  document.addEventListener('click', function (e) {
    if (!e.target.closest('[data-menu-group]')) closeAll(null);
  });
}

function initDrawer() {
  const toggle = document.getElementById('navDrawerToggle');
  const drawer = document.getElementById('navDrawer');
  if (!toggle || !drawer) return;
  toggle.addEventListener('click', function () {
    drawer.classList.toggle('is-open');
  });
  drawer.addEventListener('click', function (e) {
    if (e.target === drawer) drawer.classList.remove('is-open');
  });
  drawer.querySelectorAll('a').forEach(function (a) {
    a.addEventListener('click', function () { drawer.classList.remove('is-open'); });
  });
}

function initClock() {
  const el = document.getElementById('navClock');
  if (!el) return;
  function tick() {
    const d = new Date();
    const p = function (n) { return String(n).padStart(2, '0'); };
    el.textContent = p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds());
  }
  tick();
  setInterval(tick, 1000);
}

function initTitleChange() {
  let cfg = {};
  try { cfg = JSON.parse(document.getElementById('site-config').textContent).titleChange || {}; } catch (e) { return; }
  if (!cfg.enabled) return;
  const origin = document.title;
  document.addEventListener('visibilitychange', function () {
    document.title = document.hidden ? (cfg.hidden || origin) : origin;
    if (!document.hidden) {
      setTimeout(function () { document.title = origin; }, cfg.resetDelay || 2000);
    }
  });
}

function initNavScroll() {
  const nav = document.getElementById('VPNav');
  if (!nav) return;
  function onScroll() {
    nav.classList.toggle('is-scrolled', window.scrollY > 12);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

export function initNav() {
  initMenu();
  initDrawer();
  initClock();
  initTitleChange();
  initNavScroll();
}
