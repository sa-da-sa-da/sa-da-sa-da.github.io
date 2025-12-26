<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import AdSense from './AdSense/index';

// 配置参数
const paragraphSelector = 'article p'; // 文章段落选择器
const headingSelector = 'article h1, article h2, article h3, article h4'; // 标题选择器
const adInterval = 3; // 每隔几个段落插入一个广告
const minParagraphs = 5; // 最少需要多少个段落才插入广告

// 防抖函数
function debounce<T extends (...args: any[]) => void>(func: T, wait: number): (...args: Parameters<T>) => void {
  let timeout: number | null = null;
  return (...args: Parameters<T>) => {
    if (timeout !== null) clearTimeout(timeout);
    timeout = window.setTimeout(() => func(...args), wait);
  };
}

// 在段落间插入广告
function insertAdsInContent() {
  // 获取文章中的所有段落
  const paragraphs = Array.from(document.querySelectorAll(paragraphSelector));
  
  // 如果段落太少，不插入广告
  if (paragraphs.length < minParagraphs) {
    return;
  }
  
  // 查找所有现有的广告容器并移除它们（防止重复插入）
  document.querySelectorAll('.article-content-ad-container').forEach(container => {
    container.remove();
  });
  
  // 按间隔插入广告
  let adCount = 0;
  const maxAds = Math.floor(paragraphs.length / adInterval);
  
  // 使用克隆数组进行遍历，避免DOM修改影响遍历
  const paragraphsCopy = [...paragraphs];
  
  paragraphsCopy.forEach((paragraph, index) => {
    // 每隔adInterval个段落插入一个广告
    if ((index + 1) % adInterval === 0 && adCount < maxAds && index < paragraphsCopy.length - 2) {
      // 创建广告容器
      const adContainer = document.createElement('div');
      adContainer.className = 'article-content-ad-container';
      adContainer.setAttribute('data-ad-inserted', 'true');
      
      // 创建临时ID以便Vue能够挂载组件
      const tempId = `ad-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      adContainer.id = tempId;
      
      // 将广告容器插入到段落后面
      paragraph.parentNode?.insertBefore(adContainer, paragraph.nextSibling);
      
      // 等待DOM更新后初始化广告
      setTimeout(() => {
        initializeAdInContainer(tempId);
      }, 100);
      
      adCount++;
    }
  });
}

// 在指定容器中初始化广告
function initializeAdInContainer(containerId: string) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  // 创建广告标签
  const adElement = document.createElement('ins');
  adElement.className = 'adsbygoogle';
  adElement.setAttribute('style', 'display:block; text-align:center; margin:20px 0;');
  adElement.setAttribute('data-ad-layout', 'in-article');
  adElement.setAttribute('data-ad-format', 'fluid');
  adElement.setAttribute('data-ad-client', 'ca-pub-2897720906666216');
  adElement.setAttribute('data-ad-slot', '7288899595');
  
  container.appendChild(adElement);
  
  // 加载广告脚本（如果还未加载）
  loadAdSenseScript(() => {
    // 初始化广告
    if (window.adsbygoogle && Array.isArray(window.adsbygoogle) && typeof window.adsbygoogle.push === 'function') {
      window.adsbygoogle.push({});
    }
  });
}

// 加载AdSense脚本
function loadAdSenseScript(callback: () => void) {
  // 检查脚本是否已经加载
  if (document.querySelector('script[src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"]')) {
    callback();
    return;
  }
  
  const script = document.createElement('script');
  script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js';
  script.async = true;
  script.crossOrigin = 'anonymous';
  
  script.onload = callback;
  script.onerror = () => {
    console.error('Failed to load AdSense script');
  };
  
  document.head.appendChild(script);
}

// 监听DOM变化
let observer: MutationObserver | null = null;

// 防抖处理的广告插入函数
const debouncedInsertAds = debounce(insertAdsInContent, 500);

// 页面加载完成后执行
onMounted(() => {
  // 等待内容完全加载后插入广告
  setTimeout(() => {
    insertAdsInContent();
  }, 1000);
  
  // 监听DOM变化，以便在内容动态加载时重新插入广告
  observer = new MutationObserver((mutations) => {
    // 检查是否有新的文章内容被添加
    const hasNewContent = mutations.some(mutation => {
      return Array.from(mutation.addedNodes).some(node => {
        return node.nodeType === Node.ELEMENT_NODE && 
               ((node as Element).matches(paragraphSelector) || 
                (node as Element).querySelector(paragraphSelector));
      });
    });
    
    if (hasNewContent) {
      debouncedInsertAds();
    }
  });
  
  // 开始观察body的变化
  const articleElement = document.querySelector('article');
  if (articleElement) {
    observer.observe(articleElement, {
      childList: true,
      subtree: true
    });
  }
  
  // 监听滚动事件，处理动态加载的内容
  window.addEventListener('scroll', debouncedInsertAds);
});

// 清理资源
onUnmounted(() => {
  if (observer) {
    observer.disconnect();
    observer = null;
  }
  
  window.removeEventListener('scroll', debouncedInsertAds);
  
  // 移除插入的广告容器
  document.querySelectorAll('.article-content-ad-container').forEach(container => {
    container.remove();
  });
});
</script>

<template>
  <!-- 组件本身不渲染任何内容，通过JS动态插入广告 -->
</template>

<style scoped>
/* 组件样式 */
:deep(.article-content-ad-container) {
  margin: 20px 0;
  padding: 10px;
  background-color: rgba(240, 240, 240, 0.3);
  border-radius: 8px;
  text-align: center;
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  :deep(.article-content-ad-container) {
    margin: 15px 0;
    padding: 8px;
  }
}
</style>
