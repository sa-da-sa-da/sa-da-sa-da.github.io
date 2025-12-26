<template>
  <div>
    <!-- 文章广告注入器组件 -->
    <PostListAdInjector :interval="1" />
  </div>
</template>

<script setup lang="ts">
// 这是一个自动注入组件，用于在每篇文章后添加广告
// 无需手动在每篇文章中添加组件，通过挂载到全局布局实现
</script>

<style scoped>
/* 广告组件样式 */
</style>
