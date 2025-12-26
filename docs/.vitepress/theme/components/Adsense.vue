<template>
  <div class="adsense-container">
    <ins class="adsbygoogle"
         :style="adStyle"
         :data-ad-layout="adLayout"
         :data-ad-format="adFormat"
         :data-ad-client="adClient"
         :data-ad-slot="adSlot"></ins>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';

// 广告配置
const props = withDefaults(defineProps<{
  adLayout?: string;
  adFormat?: string;
  adSlot?: string;
  style?: string;
}>(), {
  adLayout: 'in-article',
  adFormat: 'fluid',
  adSlot: '4340179531', // 默认广告槽位
  style: 'display:block; text-align:center; margin: 2rem 0;'
});

// 广告客户端ID（固定）
const adClient = 'ca-pub-2897720906666216';

// 计算广告样式
const adStyle = computed(() => {
  return props.style;
});

// 当组件挂载时，加载广告
onMounted(() => {
  if (typeof window !== 'undefined') {
    (window.adsbygoogle = window.adsbygoogle || []).push({});
  }
});
</script>

<style scoped>
.adsense-container {
  width: 100%;
  display: flex;
  justify-content: center;
  margin: 2rem 0;
}
</style>