---
date: 2024-05-30 10:00:00
title: Google AdSense广告使用指南
permalink: /guide/google-adsense
categories:
  - 工具
coverImg: >-
  https://cdn-hsyq-static-bak.shanhutech.cn/bizhi/staticwp/201705/eaba18ed5075d2c80611fbac6ed1d34a.jpg
---

# Google AdSense广告使用指南

本站已集成Google AdSense广告功能，您可以通过以下方式在文章中轻松插入广告单元。

## 基本使用方法

在任意Markdown文档中，您可以使用全局注册的`<GoogleAdUnit>`组件来插入文章内广告：

```html
<GoogleAdUnit />
```

这样会插入一个默认的文章内广告，使用预设的广告位ID和格式。

## 自定义广告配置

您也可以自定义广告的参数：

```html
<!-- 自定义广告位 -->
<GoogleAdUnit slot="1234567890" />

<!-- 自定义广告格式 -->
<GoogleAdUnit format="fluid" />

<!-- 同时自定义广告位和格式 -->
<GoogleAdUnit slot="1234567890" format="fluid" />
```

## 参数说明

- `slot`: 广告单元的ID，默认为`4340179531`
- `format`: 广告格式，默认为`fluid`
- 广告客户端ID(`client`)固定为`ca-pub-2897720906666216`，无需自定义

## 注意事项

1. 广告脚本已通过`ConfigHyde/Head.ts`全局引入，无需重复添加脚本标签
2. 组件内部已经包含了`window`对象检查，确保在SSR环境下不会出错
3. 为获得最佳效果，建议将广告插入到文章的自然分段处
4. 请遵循Google AdSense政策，不要在同一页面过度使用广告

## 示例演示

下面是一个实际广告展示示例：

<GoogleAdUnit />

您可以在任意Markdown文件中使用此组件来展示Google AdSense广告。
