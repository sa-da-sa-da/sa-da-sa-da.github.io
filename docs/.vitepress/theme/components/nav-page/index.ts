import { defineComponent } from 'vue';
import NavPage from './NavPage.vue';

// 导出NavPage组件供布局使用
export { NavPage };

// 作为VitePress页面的扩展
export default {
  enhanceApp({ app }) {
    // 注册全局组件
    app.component('NavPage', NavPage);
  }
};
