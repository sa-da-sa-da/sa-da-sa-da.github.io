<template>
  <div>
    <SearchPage />
  </div>
</template>

<script setup lang="ts">
import SearchPage from '../components/SearchPage.vue';
</script>

<style scoped>
/* 重置默认样式，确保搜索页面全屏显示 */
:deep(.VPApp) {
  background: transparent !important;
  overflow-x: hidden;
}

/* 隐藏导航栏和所有侧边栏相关元素 */
:deep(.VPNavBar) {
  display: none !important;
}

:deep(.VPAside) {
  display: none !important;
}

:deep(.VPDocAside) {
  display: none !important;
}

:deep(.VPLayoutAside) {
  display: none !important;
}

:deep(.VPDocAsideOutline) {
  display: none !important;
}

/* 确保主内容区域占据整个宽度 */
:deep(.VPContent) {
  padding-top: 0 !important;
  padding-bottom: 0 !important;
  margin-left: 0 !important;
}

:deep(.VPContent .container) {
  max-width: 100% !important;
  padding: 0 !important;
  margin: 0 !important;
}

/* 确保文档内容区域最大化 */
:deep(.VPDoc) {
  max-width: 100% !important;
  padding: 0 !important;
  margin: 0 !important;
}

:deep(.VPContent .container .VPDoc) {
  margin: 0 !important;
}

/* 隐藏页脚 */
:deep(.VPFooter) {
  display: none !important;
}

/* 隐藏面包屑导航 */
:deep(.VPBreadcrumbs) {
  display: none !important;
}

/* 防止页面出现滚动条 */
:deep(.VPContent.has-aside) {
  grid-template-columns: 1fr !important;
}
</style>