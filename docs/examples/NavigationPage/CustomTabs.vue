<script setup>
import { ref, computed } from 'vue'
import { useRoute } from 'vitepress'

// 标签页数据 - 添加路由链接
const tabs = [
  {
    id: 'tab1',
    title: '首页',
    route: '/',
    content: '这是首页的内容，展示了网站的主要功能和信息。'
  },
  {
    id: 'tab2',
    title: '指南',
    route: '/01.指南/01.简介/',
    content: '指南页面，包含使用文档和教程。'
  },
  {
    id: 'tab3',
    title: '配置',
    route: '/10.配置/01.主题配置/',
    content: '配置页面，包含主题设置和功能配置。'
  },
  {
    id: 'tab4',
    title: '资源',
    route: '/20.资源/05.案例/',
    content: '资源页面，包含案例展示和常用资源。'
  }
]

const route = useRoute()

// 当前激活的标签页 - 根据当前路由判断
const activeTab = computed(() => {
  // 查找当前路由匹配的标签页
  const active = tabs.find(tab => route.path.startsWith(tab.route))
  return active ? active.id : tabs[0].id
})

// 获取当前激活标签页的内容
const activeTabContent = computed(() => {
  const active = tabs.find(tab => tab.id === activeTab.value)
  return active ? active.content : ''
})

// 导航到指定标签页对应的路由
const navigateToTab = (tab) => {
  // 使用VitePress的页面跳转机制
  if (typeof window !== 'undefined') {
    window.location.href = tab.route
  }
}
</script>

<template>
  <div class="custom-tabs-container">
    <!-- 标签页导航栏 - 实际的页面导航 -->
    <div class="tabs-nav">
      <a
        v-for="tab in tabs"
        :key="tab.id"
        :href="tab.route"
        :class="['tab-button', { active: activeTab === tab.id }]"
        @click="navigateToTab(tab)"
        title="点击导航至: {{ tab.title }}"
      >
        {{ tab.title }}
        <span class="nav-icon">↗</span>
      </a>
    </div>
    
    <!-- 标签页内容区域 - 显示当前激活标签页的内容预览 -->
    <div class="tabs-content">
      <div class="tab-panel active">
        <div class="content-wrapper">
          <div class="navigation-info">
            <h3>{{ tabs.find(tab => tab.id === activeTab).title }}</h3>
            <p class="navigation-hint">当前页面: {{ route.path }}</p>
            <div class="navigation-actions">
              <p>点击上方标签可以导航至对应的页面。这里展示的是标签页内容的预览：</p>
            </div>
          </div>
          <div class="content-preview">
            <p>{{ activeTabContent }}</p>
            <div class="route-info">
              <p><strong>路由链接:</strong> {{ tabs.find(tab => tab.id === activeTab).route }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.custom-tabs-container {
  width: 100%;
  max-width: 800px;
  margin: 0 auto;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.tabs-nav {
  display: flex;
  background-color: #f5f5f5;
  border-bottom: 2px solid #e0e0e0;
}

.tab-button {
  padding: 12px 24px;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 16px;
  font-weight: 500;
  color: #666;
  transition: all 0.3s ease;
  border-bottom: 3px solid transparent;
  flex: 1;
  text-align: center;
  text-decoration: none;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.tab-button .nav-icon {
  font-size: 12px;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.tab-button:hover .nav-icon {
  opacity: 1;
}

.tab-button:hover {
  background-color: #e8e8e8;
  color: #333;
}

.tab-button.active {
  color: #1890ff;
  border-bottom-color: #1890ff;
  background-color: #fff;
}

.tabs-content {
  background-color: #fff;
  min-height: 200px;
}

.tab-panel {
  display: none;
  padding: 24px;
}

.tab-panel.active {
  display: block;
}

.content-wrapper h3 {
  margin-top: 0;
  color: #333;
  border-bottom: 1px solid #f0f0f0;
  padding-bottom: 12px;
  margin-bottom: 16px;
}

.content-wrapper p {
  color: #666;
  line-height: 1.6;
}

.navigation-info {
  background-color: #f6f8fa;
  padding: 16px;
  border-radius: 6px;
  margin-bottom: 20px;
  border-left: 4px solid #1890ff;
}

.navigation-hint {
  font-size: 14px;
  color: #999;
  margin-bottom: 8px;
}

.navigation-actions {
  background-color: #e6f7ff;
  padding: 12px;
  border-radius: 4px;
  font-size: 14px;
  color: #1890ff;
}

.content-preview {
  background-color: #fff;
  padding: 20px;
  border-radius: 6px;
  border: 1px solid #d9d9d9;
}

.route-info {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px dashed #e8e8e8;
  font-size: 14px;
  color: #1890ff;
  background-color: #f0f9ff;
  padding: 12px;
  border-radius: 4px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .tabs-nav {
    flex-wrap: wrap;
  }
  
  .tab-button {
    flex-basis: 50%;
    padding: 10px 16px;
    font-size: 14px;
  }
}

@media (max-width: 480px) {
  .tab-button {
    flex-basis: 100%;
  }
}
</style>