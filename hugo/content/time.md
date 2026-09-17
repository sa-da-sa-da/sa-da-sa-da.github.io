---
title: 时间工具
date: '2025-12-09T12:24:13+08:00'
description: 时间工具页面，集成了time.sakaay.com网站的功能
url: /time
comment: false
copyright: false
sidebar: false
articleTopTip: false
articleBottomTip: false
article: false
layout: iframe
iframeUrl: https://time.sakaay.com/
---

<div class="time-iframe-wrapper" style="
  width: 100%; 
  min-height: 100vh;
  height: auto;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  background: #ffffff;
  margin-top: 20px;
  border: 1px solid #eaeaea;
">
  <!-- iframe容器 -->
  <div id="time-iframe-container" style="width: 100%; height: 100%;">
    <!-- iframe将在这里动态创建 -->
  </div>
</div>

<style>
/* 确保body有足够空间 */
body {
  margin: 0;
  padding: 0;
  min-height: 100vh;
}

/* 确保容器能完整展示内容 */
.time-iframe-wrapper {
  display: flex;
  flex-direction: column;
  min-height: calc(100vh - 40px); /* 减去一些边距 */
}

#time-iframe-container {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
}

#time-iframe-container iframe {
  flex-grow: 1;
}

/* 响应式调整 - 移动设备也保持自适应高度 */
@media (max-width: 768px) {
  .time-iframe-wrapper {
    min-height: calc(100vh - 20px);
    margin-top: 10px;
  }
}
</style>

