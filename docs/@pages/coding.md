---
date: 2025-12-09 12:24:13
title: 编程
layout: page
permalink: /program
description: 编程页面，集成了e.sakaay.com网站的功能
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
      <a href="https://e.sakaay.com/" target="_blank" rel="noopener noreferrer" style="
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
  const loadingIndicator = document.getElementById('loading-indicator');
  const errorMessage = document.getElementById('error-message');
  
  // 清空容器并显示加载指示器
  container.innerHTML = '';
  loadingIndicator.style.display = 'flex';
  errorMessage.style.display = 'none';
  
  // 创建iframe元素
  const iframe = document.createElement('iframe');
  iframe.src = 'https://e.sakaay.com/';
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
  
  // 添加加载事件处理
  iframe.onload = () => {
    console.log('时间网站加载成功');
    // 隐藏加载指示器
    setTimeout(() => {
      loadingIndicator.style.display = 'none';
    }, 300);
    
    // 尝试动态调整iframe高度
    try {
      // 先设置一个较大的初始高度
      iframe.style.minHeight = '120vh';
      
      // 使用postMessage方法与iframe内容通信（如果支持）
      // 或者使用其他方式尝试获取内容高度
      setTimeout(() => {
        // 强制重新计算布局
        window.dispatchEvent(new Event('resize'));
      }, 500);
    } catch (error) {
      console.warn('无法动态调整iframe高度:', error);
    }
  };
  
  // 添加错误处理
  iframe.onerror = () => {
    console.error('加载时间网站失败');
    loadingIndicator.style.display = 'none';
    errorMessage.style.display = 'flex';
  };
  
  // 添加超时处理
  setTimeout(() => {
    if (loadingIndicator.style.display !== 'none') {
      console.warn('加载超时');
      errorMessage.style.display = 'flex';
      loadingIndicator.style.display = 'none';
    }
  }, 10000); // 10秒超时
  
  // 将iframe添加到容器
  container.appendChild(iframe);
}

// 重试按钮事件监听
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const retryBtn = document.getElementById('retry-btn');
    if (retryBtn) {
      retryBtn.addEventListener('click', loadTimeWebsite);
    }
  });
}
</script>
