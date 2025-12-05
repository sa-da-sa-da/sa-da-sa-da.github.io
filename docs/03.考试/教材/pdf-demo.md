---
title: PDF 组件示例
date: 2025-11-18 08:00:00
permalink: /exammination/books/pdf-demo
categories:
  - 信息技术教材系列
tags:
  - 信息技术
---

# PDF 组件示例

这个页面演示了我们刚刚集成的 PDF 查看器组件的使用方法。

## 基本使用

下面是一个基本的 PDF 查看器示例，使用了一个公开可用的 PDF 文件：


  <iframe src="https://osscdn.sakaay.com/osssakaa/2022%E7%BA%A7%E4%BF%A1%E6%81%AF%E4%BC%9A%E8%80%83.pdf" style="width: 100%; height: 600px;"></iframe>



## 使用说明

1. **上一页/下一页**：用于浏览 PDF 文档的不同页面
2. **放大/缩小**：调整 PDF 文档的显示大小
3. **重置**：将缩放比例恢复为 100%

## 注意事项

- 组件支持在线 PDF 文件的查看
- 本地 PDF 文件需要放在 public 目录下或通过静态资源服务提供
- 确保 PDF 文件的 URL 可以被正确访问（注意跨域问题）

## 组件特性

- 页面导航
- 缩放控制
- 加载状态显示
- 错误处理
- 响应式设计

这个 PDF 组件已经全局注册，可以在任何 Markdown 页面中直接使用。