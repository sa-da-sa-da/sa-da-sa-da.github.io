import { initTheme } from './theme.js';
import { initNav } from './nav.js';
import { initUI } from './ui.js';
import { initWidgets } from './widgets.js';
import { initSearch } from './search.js';
import { initStyleSwitch } from './style-switch.js';
import { initPagination } from './pagination.js';
import { initNavigate } from './navigate.js';
import { reinitPage } from './page.js';

/** 单个模块初始化失败不应影响其它模块（历史上 initComponents 漏调导致题目/播放器全部空白） */
function safe(name, fn) {
  try {
    fn();
  } catch (e) {
    console.error('[boot] ' + name + ' 初始化失败：', e);
  }
}

function boot() {
  // 全局一次：这些 DOM 位于 baseof，SPA 导航不会重建
  safe('styleSwitch', initStyleSwitch);
  safe('theme', initTheme);
  safe('nav', initNav);
  safe('ui', initUI);
  safe('widgets', initWidgets);
  safe('search', initSearch);
  safe('pagination', initPagination);

  // 页面级：内容区组件、文章增强、目录树、挂件、评论
  safe('page', reinitPage);

  // 无刷新导航（失败自动回退原生跳转）
  safe('navigate', initNavigate);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
