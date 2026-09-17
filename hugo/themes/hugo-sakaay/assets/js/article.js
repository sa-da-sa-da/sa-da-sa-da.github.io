/* 文章页增强：代码复制、代码折叠、目录高亮、广告刷新 */
import { showNotice } from './ui.js';

function initCodeBlocks() {
  const pres = document.querySelectorAll('.vp-doc pre, .tk-doc-content pre');
  const collapseHeight = 700;
  pres.forEach(function (pre) {
    const wrapper = document.createElement('div');
    wrapper.className = 'vp-code';
    pre.parentNode.insertBefore(wrapper, pre);
    wrapper.appendChild(pre);

    const code = pre.querySelector('code');
    const lang = (code && (code.className.match(/language-([\w-]+)/) || [])) || [];
    if (lang[1]) {
      const tag = document.createElement('span');
      tag.className = 'code-lang';
      tag.textContent = lang[1];
      wrapper.appendChild(tag);
    }

    const btn = document.createElement('button');
    btn.className = 'copy-code-btn';
    btn.type = 'button';
    btn.textContent = '复制';
    btn.addEventListener('click', function () {
      const text = (code && code.innerText) || pre.innerText;
      navigator.clipboard.writeText(text).then(function () {
        btn.textContent = '已复制';
        showNotice('复制成功！');
        setTimeout(function () { btn.textContent = '复制'; }, 1800);
      });
    });
    wrapper.appendChild(btn);

    if (pre.scrollHeight > collapseHeight) {
      wrapper.classList.add('is-collapsed');
      const expand = document.createElement('button');
      expand.className = 'code-expand-btn';
      expand.type = 'button';
      expand.textContent = '展开完整代码 ▼';
      expand.addEventListener('click', function () {
        const collapsed = wrapper.classList.toggle('is-collapsed');
        expand.textContent = collapsed ? '展开完整代码 ▼' : '收起代码 ▲';
        if (!collapsed) wrapper.scrollIntoView({ block: 'start' });
      });
      wrapper.parentNode.insertBefore(expand, wrapper.nextSibling);
    }
  });
}

/* 目录高亮：滚动跟随（IntersectionObserver 的窄带判定在长文里常常一个都不命中） */
let tocItems = [];
let tocTicking = false;

function updateTocActive() {
  tocTicking = false;
  if (!tocItems.length) return;
  const offset = 110;
  let current = null;
  for (let i = 0; i < tocItems.length; i++) {
    if (tocItems[i].el.getBoundingClientRect().top <= offset) current = tocItems[i];
    else break;
  }
  if (!current) current = tocItems[0];
  tocItems.forEach(function (it) {
    it.a.classList.toggle('is-active', it === current);
  });
}

function initTocActive() {
  const links = Array.prototype.slice.call(document.querySelectorAll('.outline-link'));
  tocItems = [];
  if (!links.length) return;

  links.forEach(function (a) {
    const id = decodeURIComponent((a.getAttribute('href') || '').replace('#', ''));
    const el = id && document.getElementById(id);
    if (el) tocItems.push({ a: a, el: el });
  });
  updateTocActive();
}

function initAds() {
  let cfg = {};
  try { cfg = JSON.parse(document.getElementById('site-config').textContent).ads || {}; } catch (e) { return; }

  if (cfg.enabled && typeof adsbygoogle !== 'undefined') {
    document.querySelectorAll('.adsbygoogle').forEach(function () {
      try { (adsbygoogle = window.adsbygoogle || []).push({}); } catch (e) { /* ignore */ }
    });
  }

  // 广告未填充（脚本被拦截 / 无库存）时收起占位，避免大片空白
  setTimeout(function () {
    document.querySelectorAll('.ad-block').forEach(function (wrap) {
      const ins = wrap.querySelector('ins');
      const filled = ins && (ins.getAttribute('data-ad-status') === 'filled' || ins.querySelector('iframe'));
      if (!filled) wrap.style.display = 'none';
    });
  }, 3000);
}

export function initArticle() {
  initCodeBlocks();
  initTocActive();
  initAds();
}

// 滚动监听只注册一次，读取的始终是最新一页的目录项
window.addEventListener('scroll', function () {
  if (tocTicking) return;
  tocTicking = true;
  requestAnimationFrame(updateTocActive);
}, { passive: true });
