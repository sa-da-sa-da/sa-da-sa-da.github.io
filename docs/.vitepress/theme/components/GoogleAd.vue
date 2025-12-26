<template>
  <div class="google-ad" :class="{ 'in-article': isInArticle }">
    <div v-if="isInArticle" :ref="adRefName" class="ad-container"></div>
    <ins v-else
      class="adsbygoogle"
      :style="{ display: 'block' }"
      :data-ad-client="adClient"
      :data-ad-slot="adSlot"
      :data-ad-format="adFormat"
      :data-full-width-responsive="fullWidthResponsive"
    ></ins>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';

// 定义组件属性
const props = defineProps<{
  adClient?: string;      // AdSense发布商ID
  adSlot?: string;        // 广告位ID
  adFormat?: string;      // 广告格式
  fullWidthResponsive?: boolean; // 是否全宽响应式
  isInArticle?: boolean;  // 是否为文章内广告
}>();

// 设置默认值
const adClient = props.adClient || 'ca-pub-2897720906666216'; // 默认ID
const adSlot = props.adSlot || '4340179531'; // 默认广告位ID
const adFormat = props.adFormat || 'auto';  // 默认广告格式
const fullWidthResponsive = props.fullWidthResponsive !== undefined ? props.fullWidthResponsive : true;
const isInArticle = props.isInArticle || false;

// 为文章内广告生成唯一引用名称
const adRefName = ref(`adContainer-${Math.floor(Math.random() * 10000)}`);

// 加载AdSense脚本
const loadAdSenseScript = () => {
  // 检查AdSense脚本是否已经加载
  if (window.adsbygoogle && window.adsbygoogle.push) {
    return;
  }
  
  // 创建并插入AdSense脚本
  const script = document.createElement('script');
  script.async = true;
  script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js';
  script.crossOrigin = 'anonymous';
  document.head.appendChild(script);
};

// 刷新广告
const refreshAds = () => {
  if (window.adsbygoogle && window.adsbygoogle.load) {
    window.adsbygoogle.load();
  }
};

// 创建文章内广告
const createInArticleAd = () => {
  if (!isInArticle || !window.adsbygoogle) return;
  
  const adContainer = document.querySelector(`[data-ref="${adRefName.value}"]`);
  if (!adContainer) return;
  
  // 创建ins标签
  const insElement = document.createElement('ins');
  insElement.className = 'adsbygoogle';
  insElement.style.display = 'block';
  insElement.dataset.adClient = adClient;
  insElement.dataset.adSlot = adSlot;
  insElement.dataset.adFormat = 'fluid';
  insElement.dataset.adLayout = 'in-article';
  
  // 清空容器并添加广告元素
  adContainer.innerHTML = '';
  adContainer.appendChild(insElement);
  
  // 加载广告
  refreshAds();
};

// 监听广告参数变化，重新加载广告
watch(
  [() => props.adClient, () => props.adSlot, () => props.adFormat],
  () => {
    refreshAds();
  }
);

// 组件挂载后加载脚本并初始化广告
onMounted(() => {
  // 确保在浏览器环境中运行
  if (typeof window !== 'undefined') {
    loadAdSenseScript();
    
    // 如果是文章内广告，创建并加载广告
    if (isInArticle) {
      setTimeout(() => {
        createInArticleAd();
      }, 100); // 延迟执行以确保DOM已完全渲染
    } else {
      // 标准广告，等待脚本加载完成后刷新广告
      setTimeout(() => {
        refreshAds();
      }, 500);
    }
  }
});
</script>

<style scoped>
.google-ad {
  margin: 20px 0;
  text-align: center;
}

.google-ad.in-article {
  margin: 30px auto;
  max-width: 100%;
}

.ad-container {
  width: 100%;
  height: auto;
}
</style>
