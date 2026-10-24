/* 首页 Banner：打字机文案 + 背景轮播 + 平滑滚动 */
let bgTimer = null;

function initTypewriter() {
  const box = document.getElementById('heroSubtitle');
  const text = document.getElementById('heroSubtitleText');
  if (!box || !text) return;
  if (box.dataset.typed) return; // 避免 SPA 返回首页时重复打字
  box.dataset.typed = '1';

  const items = (box.dataset.items || '').split('||').map(function (s) { return s.trim(); }).filter(Boolean);
  if (!items.length) { text.textContent = ''; return; }

  const typeSpeed = parseInt(box.dataset.typeSpeed || '90', 10);
  const deleteSpeed = parseInt(box.dataset.deleteSpeed || '45', 10);
  const hold = parseInt(box.dataset.hold || '1800', 10);
  const nextDelay = parseInt(box.dataset.nextDelay || '600', 10);

  let i = 0, j = 0, deleting = false;

  function tick() {
    const current = items[i];
    if (!deleting) {
      j++;
      text.textContent = current.slice(0, j);
      if (j >= current.length) {
        deleting = true;
        return setTimeout(tick, hold);
      }
      return setTimeout(tick, typeSpeed);
    }
    j--;
    text.textContent = current.slice(0, j);
    if (j <= 0) {
      deleting = false;
      i = (i + 1) % items.length;
      return setTimeout(tick, nextDelay);
    }
    return setTimeout(tick, deleteSpeed);
  }
  setTimeout(tick, 400);
}

function initHeroBg() {
  const bg = document.getElementById('heroBg');
  if (!bg) return;
  const list = window.heroBgImages || [];
  if (list.length < 2) {
    if (list.length === 1) bg.style.backgroundImage = "url('" + list[0] + "')";
    return;
  }
  let idx = 0;
  bg.style.backgroundImage = "url('" + list[0] + "')";
  if (bgTimer) clearInterval(bgTimer);
  bgTimer = setInterval(function () {
    idx = (idx + 1) % list.length;
    bg.classList.remove('is-active');
    setTimeout(function () {
      bg.style.backgroundImage = "url('" + list[idx] + "')";
      bg.classList.add('is-active');
    }, 600);
  }, 8000);
}

function initHeroScroll() {
  const arrow = document.querySelector('.hero-scroll-indicator');
  if (!arrow) return;
  arrow.addEventListener('click', function (e) {
    e.preventDefault();
    const target = document.getElementById('content');
    if (target) window.scrollTo({ top: target.offsetTop - 60, behavior: 'smooth' });
  });
}

export function initHero() {
  initTypewriter();
  initHeroBg();
  initHeroScroll();
}
