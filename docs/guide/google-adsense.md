---
date: 2025-12-26 21:30:10
title: google-adsense
categories:
  - guide
coverImg: >-
  https://cdn-hsyq-static-bak.shanhutech.cn/bizhi/staticwp/201711/9d614c7504ad8913e7a32dbfc2102aef.jpg
---
# Google AdSense 广告使用指南

本文档将详细介绍如何在 Markdown 文件中集成 Google AdSense 广告。

## 基本使用方法

要在 Markdown 文件中添加广告单元，只需使用已经注册的 `GoogleAd` 组件即可。最简单的使用方式如下：

```html
<GoogleAd ad-slot="1234567890" />
```

## 自定义广告配置

您可以根据需要自定义广告单元的各种参数：

```html
<GoogleAd 
  ad-slot="1234567890" 
  ad-format="fluid"
  width="300"
  height="250"
  ad-client="ca-pub-您的发布者ID" 
  debug="false"
/>
```

## 参数说明

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `ad-slot` | String | 必填 | 广告单元ID，在AdSense控制台中创建 |
| `ad-client` | String | ca-pub-2897720906666216 | 发布者ID，默认为测试ID |
| `ad-format` | String | fluid | 广告格式，如 'fluid', 'auto', 'rectangle', 'leaderboard' 等 |
| `ad-layout-key` | String | -ii+7-14-2d+99 | 广告布局键，可在AdSense获取 |
| `width` | String/Number | undefined | 广告宽度 |
| `height` | String/Number | undefined | 广告高度 |
| `style` | Object | {} | 额外的CSS样式 |
| `debug` | Boolean | false | 是否启用调试模式，启用后会显示占位符 |
| `display` | Boolean | true | 是否显示广告 |

## 注意事项

1. **广告脚本自动加载**：组件会自动处理 Google AdSense 脚本的加载，无需在页面其他位置手动引入。

2. **广告数量限制**：根据 Google AdSense 政策，每页最多可以展示 3 个广告单元，请合理控制广告数量。

3. **响应式设计**：推荐使用 `fluid` 格式的广告，这样广告会自动适应容器宽度。

4. **广告位布局**：建议在文章内容前后、分段之间添加广告，避免广告打断用户阅读体验。

5. **测试广告**：在开发环境中，可以使用默认的测试ID，确保广告位正确显示但不会产生实际广告内容。

## 示例演示

### 文章内广告

```html
<GoogleAd ad-slot="1234567890" ad-format="fluid" />
```

### 固定尺寸广告

```html
<GoogleAd ad-slot="1234567890" width="300" height="250" />
```

### 调试模式

```html
<GoogleAd ad-slot="1234567890" debug="true" />
```

## 最佳实践

1. 为不同类型的页面（文章页、列表页、首页）使用不同的广告单元，以便更好地跟踪广告效果。

2. 根据页面内容和用户行为，合理安排广告位置，提高广告点击率。

3. 定期检查 Google AdSense 控制台，优化广告单元设置，提高广告收入。

4. 遵循 Google AdSense 政策，不要使用任何可能违反政策的方式提高广告展示量或点击率。
