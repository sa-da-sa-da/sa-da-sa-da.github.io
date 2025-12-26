<script setup lang="ts" name="PostListAdInjector">
import { ref, onMounted, onUnmounted, nextTick, watch } from 'vue';
import AdSense from '../AdSense/index';

const props = defineProps({
  // 插入广告的间隔，默认每3篇文章插入一次
  interval: {
    type: Number,
    default: 3
  },
  // 文章项的选择器
  postItemSelector: {
    type: String,
    default: '.tk-post-item, .tk-post-item-card'
  },
  // 文章列表容器的选择器
  postListSelector: {
    type: String,
    default: '.tk-home-post-list, .tk-blog-post-list'
  }
});

// 保存已插入的广告元素引用，避免重复插入
const insertedAdElements = ref<Set<HTMLElement>>(new Set());
let mutationObserver: MutationObserver | null = null;

// 异步加载AdSense脚本
const loadAdSenseScript = () => {
  return new Promise<void>((resolve, reject) => {
    // 检查脚本是否已经加载
    const existingScript = document.getElementById('adsbygoogle-script');
    if (existingScript) {
      resolve();
      return;
    }

    // 创建并加载脚本
    const script = document.createElement('script');
    script.id = 'adsbygoogle-script';
    script.async = true;
    script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2897720906666216';
    script.crossOrigin = 'anonymous';
    
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load AdSense script'));
    
    document.head.appendChild(script);
  });
};

// 初始化广告
const initializeAds = async () => {
  try {
    // 延迟初始化广告，确保DOM已经渲染完成
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // 尝试初始化广告
    if (window.adsbygoogle && Array.isArray(window.adsbygoogle)) {
      window.adsbygoogle.push({});
    }
  } catch (error) {
    console.warn('AdSense initialization error:', error);
  }
};

// 插入广告的函数
const insertAds = async () => {
  if (typeof window === 'undefined') return;
  
  // 确保AdSense脚本已加载
  try {
    await loadAdSenseScript();
  } catch (error) {
    console.warn('Failed to load AdSense script:', error);
    return;
  }
  
  const postItems = document.querySelectorAll(props.postItemSelector);
  const postItemsArray = Array.from(postItems);
  
  // 清空已记录的广告元素
  insertedAdElements.value.forEach(el => {
    if (el.parentNode) {
      el.parentNode.removeChild(el);
    }
  });
  insertedAdElements.value.clear();
  
  // 遍历文章项，按间隔插入广告
  postItemsArray.forEach((item, index) => {
    // 在指定间隔位置插入广告（如第3、6、9...篇文章后）
    if ((index + 1) % props.interval === 0) {
      const nextSibling = item.nextElementSibling;
      const parent = item.parentElement;
      
      if (parent) {
        // 创建一个广告容器
        const adContainer = document.createElement('div');
        adContainer.className = 'post-list-ad-container';
        adContainer.dataset.adIndex = index.toString();
        
        // 添加ins广告标签
        const insElement = document.createElement('ins');
        insElement.className = 'adsbygoogle';
        insElement.style.display = 'block';
        insElement.style.textAlign = 'center';
        insElement.style.width = '100%';
        insElement.style.margin = '20px 0';
        insElement.setAttribute('data-ad-layout', 'in-article');
        insElement.setAttribute('data-ad-format', 'fluid');
        insElement.setAttribute('data-ad-client', 'ca-pub-2897720906666216');
        insElement.setAttribute('data-ad-slot', '3275724622');
        
        adContainer.appendChild(insElement);
        
        // 根据位置插入广告容器
        if (nextSibling) {
          parent.insertBefore(adContainer, nextSibling);
        } else {
          parent.appendChild(adContainer);
        }
        
        // 将容器添加到已插入列表
        insertedAdElements.value.add(adContainer);
      }
    }
  });
  
  // 初始化所有新添加的广告
  initializeAds();
};

// 观察DOM变化，处理动态加载的文章
const setupMutationObserver = () => {
  if (typeof window === 'undefined' || mutationObserver) return;
  
  const postLists = document.querySelectorAll(props.postListSelector);
  
  if (postLists.length === 0) {
    // 如果没有找到文章列表容器，尝试使用更通用的选择器
    const articleContainers = document.querySelectorAll('.tk-article-container, .tk-post-container');
    if (articleContainers.length > 0) {
      articleContainers.forEach(container => {
        if (container.querySelector(props.postItemSelector)) {
          postLists.push(container);
        }
      });
    }
  }
  
  mutationObserver = new MutationObserver(() => {
    // DOM变化后，重新尝试插入广告
    nextTick(() => {
      insertAds();
    });
  });
  
  // 观察文章列表容器的变化
  postLists.forEach(list => {
    mutationObserver!.observe(list, {
      childList: true,
      subtree: true
    });
  });
};

// 监听页面滚动，处理懒加载的情况
const handleScroll = () => {
  // 防抖处理
  if (window.scrollTimer) {
    clearTimeout(window.scrollTimer);
  }
  window.scrollTimer = setTimeout(() => {
    nextTick(() => {
      insertAds();
    });
  }, 300) as unknown as number;
};

onMounted(() => {
  // 延迟执行，确保文章列表已完全渲染
  setTimeout(() => {
    nextTick(() => {
      insertAds();
      setupMutationObserver();
      
      // 添加滚动事件监听
      if (typeof window !== 'undefined') {
        window.addEventListener('scroll', handleScroll);
      }
    });
  }, 500);
});

onUnmounted(() => {
  // 清理资源
  if (mutationObserver) {
    mutationObserver.disconnect();
    mutationObserver = null;
  }
  
  if (typeof window !== 'undefined') {
    window.removeEventListener('scroll', handleScroll);
    if (window.scrollTimer) {
      clearTimeout(window.scrollTimer);
      delete window.scrollTimer;
    }
  }
  
  // 清空已插入的广告元素引用
  insertedAdElements.value.forEach(el => {
    if (el.parentNode) {
      el.parentNode.removeChild(el);
    }
  });
  insertedAdElements.value.clear();
});

// 监听interval属性变化
watch(() => props.interval, () => {
  // 间隔变化时，重新插入广告
  nextTick(() => {
    insertAds();
  });
});
</script>

<template>
  <!-- 这个组件本身不需要渲染任何内容，它只负责DOM操作 -->
  <!---->
</template>

<style>
/* 全局样式，使广告容器有适当的间距和样式 */
.post-list-ad-container {
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  margin: 1.5rem 0;
  padding: 1rem;
  box-sizing: border-box;
  border-radius: 8px;
  background-color: var(--vp-c-bg-alt, #f8f8f8);
}

/* 响应式调整 */
@media (max-width: 768px) {
  .post-list-ad-container {
    margin: 1rem 0;
    padding: 0.5rem;
  }
}
</style>