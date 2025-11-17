// 从独立配置文件夹加载配置
const { description } = require('../../package.json') || { description: '可爱风格的AI驱动文档教学平台' }

// 加载主题配置
const themeConfig = require('./configs/theme/index.js');

// 从独立文件加载样式
const styles = require('./configs/utils/styles.js');

module.exports = {
  title: '信息技术教学网站',
  description,
  dest: 'dist',
  base: '/',
  // 不使用默认主题，使用自定义样式实现可爱风格
  head: [
    ['link', { rel: 'icon', href: 'https://cdn-icons-png.flaticon.com/512/4836/4836091.png' }],
    ['meta', { name: 'viewport', content: 'width=device-width,initial-scale=1,minimum-scale=1.0,maximum-scale=1.0,user-scalable=no' }],
    ['meta', { name: 'theme-color', content: '#ff6b6b' }],
    ['style', {}, styles]
  ], // 从独立文件加载themeConfig
  themeConfig: themeConfig,
  
  // 插件配置
  plugins: [
    // 自动侧边栏
    ['@vuepress/active-header-links'],
    // 搜索功能
    ['@vuepress/search', {
      searchMaxSuggestions: 10
    }],
    // 代码复制按钮
    ['@vuepress/plugin-copy-code'],
    // 返回顶部按钮
    ['@vuepress/back-to-top'],
    // 自定义插件：主题初始化
    [{
      name: 'theme-initializer',
      ready() {
        // 在客户端初始化主题
        if (typeof window !== 'undefined') {
          // 动态导入主题管理器
          import('./utils/theme-manager.js').then(({ default: themeManager }) => {
            // 初始化主题
            themeManager.init()
          })
        }
      }
    }],
    // 阅读量统计插件
    [
      (pluginOptions, ctx) => ({
        name: 'page-views-plugin',
        // 使用enhanceAppFiles正确注册组件
        enhanceAppFiles() {
          const pageViewsConfig = ctx.themeConfig.pageViews || {};
          return {
            name: 'page-views-enchance.js',
            content: `
              // 导入语句必须在顶层作用域
              // 从node_modules/@vuepress/core/.temp/app-enhancers目录到组件的正确相对路径
              import PageViews from '../../../../../../docs/.vuepress/components/PageViews.vue';
              
              export default ({ Vue }) => {
                // 注册为全局组件
                Vue.component('PageViews', PageViews);
                // 全局配置对象，在组件中可以通过window.pageViewsConfig访问
                window.pageViewsConfig = ${JSON.stringify(pageViewsConfig)};
              }`
          };
        }
      })
    ]
  ],
  
  // 额外的Markdown配置
  markdown: {
    lineNumbers: true,
    extendMarkdown: md => {
      // 添加额外的markdown-it插件
      md.use(require('markdown-it-emoji'))
      // 自定义markdown渲染，可在这里集成阅读量统计
    }
  },
  
  // 额外的配置
  extraWatchFiles: [
    '.vuepress/styles/theme-styles.styl',
    '.vuepress/utils/theme-manager.js'
  ]
};
