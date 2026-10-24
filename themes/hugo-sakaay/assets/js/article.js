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

/** 广告：滚动到附近才请求（首屏不加载），未填充则收起容器，避免打断阅读和留白 */
const AD_LAZY_MARGIN = '320px';
const AD_FILL_TIMEOUT = 6000;

/** 读取站点广告配置，失败时返回空对象（视作未开启） */
function readAdsConfig() {
  try {
    return JSON.parse(document.getElementById('site-config').textContent).ads || {};
  } catch (e) {
    return {};
  }
}

/** 广告容器不可见即整块收起，不留空白 */
function hideAdBlock(block) {
  block.style.display = 'none';
}

/**
 * 等 AdSense 给出填充结果：
 * filled 保持展示；unfilled 或超时仍无有效 iframe 则收起。
 */
function watchAdFill(block) {
  const ins = block.querySelector('ins.adsbygoogle');
  if (!ins) { hideAdBlock(block); return; }

  const settled = function () {
    const status = ins.getAttribute('data-ad-status');
    if (status === 'unfilled') { hideAdBlock(block); return true; }
    return status === 'filled';
  };
  if (settled()) return;

  const observer = new MutationObserver(function () {
    if (settled()) observer.disconnect();
  });
  observer.observe(ins, { attributes: true, attributeFilter: ['data-ad-status'] });

  setTimeout(function () {
    observer.disconnect();
    if (settled()) return;
    const frame = ins.querySelector('iframe');
    if (!frame || frame.offsetHeight < 30) hideAdBlock(block);
  }, AD_FILL_TIMEOUT);
}

/** 每个 ins 只 push 一次；SPA 导航后重复初始化也不会触发 AdSense 报错 */
function pushAdBlock(block) {
  const ins = block.querySelector('ins.adsbygoogle');
  if (!ins || ins.dataset.adPushed === '1') return;
  ins.dataset.adPushed = '1';
  try {
    (window.adsbygoogle = window.adsbygoogle || []).push({});
  } catch (e) { /* 脚本被拦截 / 重复 push：静默降级 */ }
  watchAdFill(block);
}

/**
 * AdSense 是 async 脚本，首次进页面时可能尚未就绪，轮询等待约 8 秒。
 * 超时（脚本被广告拦截器挡掉）时走 onFail，避免页面留下空占位。
 */
function whenAdsenseReady(callback, onFail) {
  if (typeof window.adsbygoogle !== 'undefined') { callback(); return; }
  let tries = 0;
  const timer = setInterval(function () {
    if (typeof window.adsbygoogle !== 'undefined') {
      clearInterval(timer);
      callback();
    } else if (++tries > 40) {
      clearInterval(timer);
      if (onFail) onFail();
    }
  }, 200);
}

/** 懒加载：广告进入视口前 320px 才 push */
function lazyPushAdBlocks(blocks) {
  if (!('IntersectionObserver' in window)) {
    blocks.forEach(pushAdBlock);
    return;
  }
  const io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      io.unobserve(entry.target);
      pushAdBlock(entry.target);
    });
  }, { rootMargin: AD_LAZY_MARGIN });
  blocks.forEach(function (block) { io.observe(block); });
}

function initAds() {
  const cfg = readAdsConfig();
  const blocks = Array.prototype.slice.call(document.querySelectorAll('.ad-block'));

  // 关闭广告时立即收起占位（旧逻辑只在开启时收起，会留下 60px 空白）
  if (!cfg.enabled) {
    blocks.forEach(hideAdBlock);
    return;
  }
  if (!blocks.length) return;

  whenAdsenseReady(function () {
    const lazyBlocks = [];
    blocks.forEach(function (block) {
      if (cfg.lazyLoad === false || block.dataset.adLazy === '0') pushAdBlock(block);
      else lazyBlocks.push(block);
    });
    lazyPushAdBlocks(lazyBlocks);
  }, function () {
    // 脚本被拦截：整块收起，不留边框空盒子
    blocks.forEach(hideAdBlock);
  });
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
