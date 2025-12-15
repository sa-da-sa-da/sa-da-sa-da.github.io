---
date: 2025-12-09 12:24:13
title: 时间工具
layout: page
permalink: /time
description: 时间工具页面，集成了time.sakaay.com网站的功能
sidebar: false
article: false
comment: false
articleTopTip: false
articleBottomTip: false
copyright: false
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

<script setup>
import { onMounted, onUnmounted } from 'vue';

// 确保在DOM挂载后执行
onMounted(() => {
  loadTimeWebsite();
});

// 组件卸载时清理资源
onUnmounted(() => {
  const container = document.getElementById('time-iframe-container');
  if (container) {
    container.innerHTML = ''; // 清空iframe以释放资源
  }
});

// 使用JavaScript动态创建iframe来加载time.sakaay.com
function loadTimeWebsite() {
  const container = document.getElementById('time-iframe-container');
  
  // 清空容器
  container.innerHTML = '';
  
  // 创建iframe元素
  const iframe = document.createElement('iframe');
  iframe.src = 'https://time.sakaay.com/';
  iframe.style.width = '100%';
  iframe.style.minHeight = '100vh';
  iframe.style.height = 'auto';
  iframe.style.border = 'none';
  iframe.style.display = 'block';
  // 添加额外的样式以确保iframe能正确显示和适应
  iframe.style.position = 'relative';
  iframe.style.flexGrow = '1';
  
  // 设置更宽松的安全属性，确保嵌入网站内的按钮和功能正常工作
  iframe.sandbox = 'allow-scripts allow-same-origin allow-forms allow-pointer-lock allow-popups allow-top-navigation-by-user-activation';
  
  // 添加引用策略以增强安全性
  iframe.referrerPolicy = 'strict-origin-when-cross-origin';
  
  // 将iframe添加到容器
  container.appendChild(iframe);
}
</script>
