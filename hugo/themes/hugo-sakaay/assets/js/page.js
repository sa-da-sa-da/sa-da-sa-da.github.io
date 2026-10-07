/* 页面级初始化：首次加载与每次 SPA 导航后都要执行 */
import { initComponents } from './components.js';
import { initArticle } from './article.js';
import { initPageUI } from './ui.js';
import { initPageWidgets, initComments } from './widgets.js';
import { initHero } from './hero.js';
import { runScripts } from './util.js';
import { syncThemeButtons } from './theme.js';

export function reinitPage() {
  const root = document.getElementById('VPContent');

  // 仅对「刚由 SPA 注入、其内联 script 尚未执行」的内容补跑脚本
  if (root && root.dataset.fresh) {
    delete root.dataset.fresh;
    runScripts(root);
  }

  initComponents();
  initArticle();
  initPageUI();
  initPageWidgets();
  initComments();
  initHero();

  // 移动端底部工具条随 #page-extras 被重建，补一次主题按钮状态同步
  syncThemeButtons();

  if (typeof window.__updateScrollProgress === 'function') window.__updateScrollProgress();
}
