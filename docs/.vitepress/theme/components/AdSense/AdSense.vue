<script setup lang="ts" name="AdSense">
import { onMounted, ref } from 'vue';

const adContainer = ref<HTMLElement | null>(null);

// 提供一个全局方法，用于初始化AdSense广告
const initAdSense = () => {
  if (adContainer.value && typeof window !== 'undefined') {
    (window.adsbygoogle = window.adsbygoogle || []).push({});
  }
};

// 组件挂载后初始化广告
onMounted(() => {
  // 延迟初始化，确保DOM已经渲染完成
  setTimeout(() => {
    initAdSense();
  }, 100);
});

// 暴露方法供父组件调用
defineExpose({ initAdSense });
</script>

<template>
  <div class="adsense-container" v-if="typeof window !== 'undefined'">
    <ins 
      class="adsbygoogle"
      style="display:block; text-align:center;"
      data-ad-layout="in-article"
      data-ad-format="fluid"
      data-ad-client="ca-pub-2897720906666216"
      data-ad-slot="3275724622"
      ref="adContainer"
    ></ins>
  </div>
</template>

<style scoped>
.adsense-container {
  margin: 2rem 0;
  padding: 1rem;
  border-radius: 8px;
  background-color: #f8f9fa;
  display: flex;
  justify-content: center;
  align-items: center;
}
</style>