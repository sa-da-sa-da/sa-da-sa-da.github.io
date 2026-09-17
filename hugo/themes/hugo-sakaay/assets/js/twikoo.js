/* Twikoo 按需加载：避免把 <script> 写进会被 innerHTML 替换的内容区（那样不会执行） */
let pending = null;

export function loadTwikoo(version) {
  if (window.twikoo) return Promise.resolve(window.twikoo);
  if (pending) return pending;

  const v = version || '1.6.41';
  pending = new Promise(function (resolve, reject) {
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/twikoo@' + v + '/dist/twikoo.all.min.js';
    s.async = true;
    s.onload = function () { resolve(window.twikoo); };
    s.onerror = function () { pending = null; reject(new Error('twikoo load failed')); };
    document.head.appendChild(s);
  });
  return pending;
}

export function version() {
  const el = document.querySelector('[data-twikoo-version]');
  return el ? el.getAttribute('data-twikoo-version') : '1.6.41';
}
