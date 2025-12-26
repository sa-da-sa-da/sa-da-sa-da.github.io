<script setup lang="ts" name="GoogleAd">
import { onMounted } from 'vue';

// 组件属性定义，支持自定义id
const props = defineProps<{
  id?: string;
}>();

// 组件挂载后加载广告
onMounted(() => {
  // 检查全局是否已加载adsbygoogle
  if (!window.adsbygoogle) {
    // 动态创建并加载广告脚本
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js';
    script.crossOrigin = 'anonymous';
    document.head.appendChild(script);
  }
  
  // 确保每个广告实例都有自己的初始化
  setTimeout(() => {
    // 获取特定ID的广告元素
    const adElement = props.id ? 
      document.querySelector(`#${props.id} .adsbygoogle`) : 
      document.querySelector(`.google-ad-container .adsbygoogle`);
    
    if (adElement) {
      // 为每个广告单元单独初始化
      const ads = (window as any).adsbygoogle || [];
      ads.push({});
    }
  }, 0);
});
</script>

<template>
  <!-- Google AdSense 广告单元 -->
  <div :id="id" class="google-ad-container">
    <ins 
      class="adsbygoogle"
      style="display:block; text-align:center;"
      data-ad-layout="in-article"
      data-ad-format="fluid"
      data-ad-client="ca-pub-2897720906666216"
      data-ad-slot="3275724622"
    ></ins>
  </div>
</template>

<style scoped>
.google-ad-container {
  margin: 1.5rem 0;
  width: 100%;
  display: flex;
  justify-content: center;
}
</style>