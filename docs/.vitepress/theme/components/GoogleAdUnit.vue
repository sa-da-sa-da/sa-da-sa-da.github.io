<script setup lang="ts">
import { ref, onMounted } from 'vue';

// 广告单元参数
const props = defineProps<{
  format?: string;
  slot?: string;
}>();

// 默认值
const format = props.format || 'fluid';
const slot = props.slot || '4340179531'; // 默认使用示例中的slot ID
const client = 'ca-pub-2897720906666216';
const layout = 'in-article'; // 文章内广告布局

// 广告容器引用
const adContainer = ref<HTMLElement | null>(null);

onMounted(() => {
  // 确保在浏览器环境中运行
  if (typeof window !== 'undefined' && adContainer.value) {
    // 创建广告单元
    const ins = document.createElement('ins');
    ins.className = 'adsbygoogle';
    ins.style.display = 'block';
    ins.style.textAlign = 'center';
    ins.setAttribute('data-ad-layout', layout);
    ins.setAttribute('data-ad-format', format);
    ins.setAttribute('data-ad-client', client);
    ins.setAttribute('data-ad-slot', slot);
    
    // 添加到容器
    adContainer.value.appendChild(ins);
    
    // 初始化广告
    if ('adsbygoogle' in window) {
      try {
        // 使用括号表示法避免TypeScript类型检查问题
        (window as any).adsbygoogle.push({});
      } catch (error) {
        console.warn('广告加载失败:', error);
      }
    }
  }
});
</script>

<template>
  <!-- 广告容器 -->
  <div ref="adContainer" class="google-ads-container">
    <!-- 广告会动态渲染到这里 -->
  </div>
</template>

<style scoped>
.google-ads-container {
  margin: 2rem auto;
  max-width: 100%;
}
</style>
