<template>
  <div>
    <!-- 使用默认布局并在其内容区域放置NavPage组件 -->
    <div class="nav-page-wrapper">
      <NavPage />
    </div>
  </div>
</template>

<script setup lang="ts">
import NavPage from '../components/nav-page/NavPage.vue';
</script>

<style scoped>
/* 隐藏侧边栏相关元素，但保留顶部导航栏 */
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

/* 调整主内容区域的宽度和边距 */
:deep(.VPContent) {
  padding-top: 0 !important;
  margin-left: 0 !important;
}

:deep(.VPContent .container) {
  max-width: 100% !important;
  padding: 0 !important;
}

/* 调整文档内容区域 */
:deep(.VPDoc) {
  max-width: 100% !important;
  padding: 0 !important;
}

/* 隐藏面包屑导航 */
:deep(.VPBreadcrumbs) {
  display: none !important;
}

/* 确保页面布局正确 */
:deep(.VPContent.has-aside) {
  grid-template-columns: 1fr !important;
}

/* 导航页包装器 */
.nav-page-wrapper {
  width: 100%;
  justify-content: center;
}
</style>