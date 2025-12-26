---
date: 2025-12-26 18:09:41
title: ad-test
permalink: /pages/650f3e
categories:
  - 
coverImg: >-
  https://cdn-hsyq-static-bak.shanhutech.cn/bizhi/staticwp/201803/ed9d19ea8fa2ccca012bb8ac333e7166.jpg
---
# 广告组件测试页面

这是一个测试页面，用于验证Google AdSense广告组件在文章列表中的显示效果。

## 测试说明

- PostListAdInjector组件将在文章列表中按照指定间隔插入广告
- 广告容器会应用适当的样式和间距
- 组件会自动处理动态加载的文章和滚动事件

<ArticleListTest />

## 测试步骤

1. 确保广告组件已正确注册
2. 访问首页或文章列表页面
3. 检查广告是否按预期间隔插入
4. 测试滚动加载更多文章时的广告显示

## 故障排除

如果广告未显示，请检查：

- AdSense脚本是否成功加载
- 文章列表选择器是否正确
- 浏览器控制台是否有错误信息

```typescript
// 示例代码：如何在页面中使用广告组件
import { defineClientComponent } from 'vitepress';

export default defineClientComponent(() => {
  import PostListAdInjector from './components/PostListAdInjector.vue';
  
  return {
    template: `<PostListAdInjector :interval="3" />`
  };
});
```