/** 给元素绑定只执行一次的监听（SPA 切换后元素会重建，避免重复绑定） */
export function bindOnce(el, type, handler, key) {
  if (!el) return;
  const flag = 'bind' + (key || type);
  if (el.dataset[flag]) return;
  el.dataset[flag] = '1';
  el.addEventListener(type, handler);
}

/** 让一段（可能是 innerHTML 注入的）DOM 里的 script 真正执行 */
export function runScripts(root) {
  if (!root) return;
  root.querySelectorAll('script').forEach(function (old) {
    // JSON 数据脚本不需要执行，保留原节点即可
    if (old.type && old.type !== 'text/javascript' && old.type !== 'module') return;
    if (old.dataset.executed) return;
    const s = document.createElement('script');
    Array.prototype.forEach.call(old.attributes, function (a) {
      s.setAttribute(a.name, a.value);
    });
    s.textContent = old.textContent;
    s.dataset.executed = '1';
    old.replaceWith(s);
  });
}

/** 模块级一次性执行 */
const done = new Set();
export function once(key, fn) {
  if (done.has(key)) return;
  done.add(key);
  fn();
}
