<script setup lang="ts" name="GoogleAd">
import { computed, onMounted } from 'vue';

// 组件属性定义，支持自定义id
const props = defineProps<{
  id?: string;
}>();

// 广告单元配置映射 - 根据ID返回不同的广告配置
const adConfig = computed(() => {
  // 广告配置映射表
  const configMap: Record<string, { slot: string; layout?: string; format: string; layoutKey?: string }> = {
    // 默认广告配置 (原有的in-article广告)
    'default': { 
      slot: '3275724622', 
      layout: 'in-article', 
      format: 'fluid'
    },
    // 信息流广告配置 (新提供的)
    'newsfeed': { 
      slot: '3199691592', 
      format: 'fluid',
      layoutKey: '-6j+cs-g-49+kk'
    },
    // 可以根据需要添加更多配置
    'a1': { slot: '3275724622', layout: 'in-article', format: 'fluid' },
    'a2': { slot: '3275724622', layout: 'in-article', format: 'fluid' }
  };
  
  // 根据ID返回对应的配置，如果没有匹配则返回默认配置
  return configMap[props.id || 'default'] || configMap['default'];
});

// 组件挂载后加载广告
onMounted(() => {
  // 检查全局是否已加载adsbygoogle
  if (!window.adsbygoogle) {
    // 动态创建并加载广告脚本 - 使用带client参数的URL
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2897720906666216';
    script.crossOrigin = 'anonymous';
    document.head.appendChild(script);
  }
  
  // 确保每个广告实例都有自己的初始化
  setTimeout(() => {
    // 为每个广告单元单独初始化
    const ads = (window as any).adsbygoogle || [];
    ads.push({});
  }, 0);
});
</script>

<template>
  <!-- Google AdSense 广告单元 -->
  <div :id="id" class="google-ad-container">
    <ins 
      class="adsbygoogle"
      style="display:block; text-align:center;"
      :data-ad-layout="adConfig.layout"
      :data-ad-layout-key="adConfig.layoutKey"
      :data-ad-format="adConfig.format"
      data-ad-client="ca-pub-2897720906666216"
      :data-ad-slot="adConfig.slot"
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