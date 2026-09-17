---
title: 编程
date: '2025-12-09T12:24:13+08:00'
description: 编程页面，集成了e.sakaay.com网站的功能
url: /program
comment: false
copyright: false
sidebar: false
articleTopTip: false
articleBottomTip: false
article: false
layout: iframe
iframeUrl: https://e.sakaay.com
---

<div class="time-iframe-wrapper" style="
  width: 100%; 
  min-height: 100vh;
  height: auto;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  position: relative;
  background: #ffffff;
  margin-top: 20px;
  transition: all 0.3s ease;
  border: 1px solid #eaeaea;
">
  <!-- 加载状态指示器 -->
  <div id="loading-indicator" style="
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    background: rgba(255, 255, 255, 0.9);
    z-index: 10;
  ">
    <div style="
      width: 40px;
      height: 40px;
      border: 4px solid #e3f2fd;
      border-top: 4px solid #1976d2;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    "></div>
    <p style="margin-top: 16px; color: #666; font-size: 16px;">正在加载编程工具...</p>
  </div>
  
  <!-- iframe容器 -->
  <div id="time-iframe-container" style="width: 100%; height: 100%;">
    <!-- iframe将在这里动态创建 -->
  </div>
  
  <!-- 错误提示容器 -->
  <div id="error-message" style="
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    background: #fff;
    z-index: 20;
    display: none;
  ">
    <div style="font-size: 48px; margin-bottom: 16px;">⚠️</div>
    <h3 style="color: #d32f2f; margin-bottom: 8px;">加载时间网站失败</h3>
    <p style="color: #666; text-align: center; max-width: 400px; margin-bottom: 24px;">
      可能是由于跨域限制、网络问题或原网站暂时不可用。
    </p>
    <div style="display: flex; gap: 12px; flex-wrap: wrap; justify-content: center;">
      <button id="retry-btn" style="
        padding: 8px 16px;
        background: #1976d2;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
        transition: background-color 0.2s ease;
      ">重试</button>
      <a href="https://ee.sakaay.com/" target="_blank" rel="noopener noreferrer" style="
        padding: 8px 16px;
        background: #f5f5f5;
        color: #333;
        border: 1px solid #ddd;
        border-radius: 4px;
        text-decoration: none;
        font-size: 14px;
        transition: all 0.2s ease;
        display: inline-block;
        text-align: center;
      ">直接访问原网站 <span style="font-size: 0.85em;">↗</span></a>
    </div>
  </div>
</div>

<style>
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

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

