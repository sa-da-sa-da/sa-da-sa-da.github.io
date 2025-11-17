// 页面配置文件
export default {
  enhanceApp({ app }) {
    // 引入全局样式
    import('./styles.css')
    
    // 注册组件
    import('./setup.js').then(({ default: components }) => {
      // 注册所有组件
      Object.entries(components.components).forEach(([name, component]) => {
        app.component(name, component)
      })
    })
  }
}