/* 明暗主题切换（带涟漪扩散动画） */
const THEME_KEY = 'theme';

function currentDark() {
  return document.documentElement.classList.contains('dark-mode');
}

function syncIcons() {
  const dark = currentDark();
  document.querySelectorAll('#themeToggle').forEach(function (btn) {
    const sun = btn.querySelector('.icon-sun');
    const moon = btn.querySelector('.icon-moon');
    if (sun) sun.style.display = dark ? 'none' : '';
    if (moon) moon.style.display = dark ? '' : 'none';
  });
  document.querySelectorAll('[data-theme-toggle]').forEach(function (btn) {
    btn.setAttribute('aria-checked', dark ? 'true' : 'false');
  });
}

function applyTheme(dark) {
  document.documentElement.classList.toggle('dark-mode', dark);
  try { localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light'); } catch (e) {}
  syncIcons();
}

function toggleTheme(evt) {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const dark = !currentDark();
  if (reduce || !evt) { applyTheme(dark); return; }

  const x = evt.clientX || window.innerWidth / 2;
  const y = evt.clientY || window.innerHeight / 2;
  const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
  const overlay = document.createElement('div');
  overlay.className = 'theme-ripple-overlay';
  overlay.style.background = dark ? '#0f172a' : '#f9fafb';
  overlay.style.clipPath = 'circle(0px at ' + x + 'px ' + y + 'px)';
  overlay.style.transition = 'clip-path 400ms cubic-bezier(0.4, 0, 0.2, 1)';
  document.body.appendChild(overlay);

  requestAnimationFrame(function () {
    overlay.style.clipPath = 'circle(' + radius + 'px at ' + x + 'px ' + y + 'px)';
  });
  setTimeout(function () { applyTheme(dark); }, 200);
  setTimeout(function () { overlay.remove(); }, 620);
}

export function initTheme() {
  syncIcons();
  document.querySelectorAll('#themeToggle, [data-theme-toggle]').forEach(function (btn) {
    btn.addEventListener('click', toggleTheme);
  });
  if (!localStorage.getItem(THEME_KEY)) {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener && mq.addEventListener('change', function (e) { applyTheme(e.matches); });
  }
}
