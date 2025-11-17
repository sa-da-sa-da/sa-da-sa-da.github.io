<script setup>
import { ref, computed } from 'vue'
import { useRoute } from 'vitepress'

// 标签页数据 - 添加路由功能
const tabs = ref([
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
  }
])

const route = useRoute()

// 当前激活的标签页 - 根据当前路由自动匹配
const activeTab = computed(() => {
  const active = tabs.value.find(tab => route.path.startsWith(tab.route))
  return active ? active.id : tabs.value[0].id
})

// 获取当前激活标签页的内容
const activeTabContent = computed(() => {
  const active = tabs.value.find(tab => tab.id === activeTab.value)
  return active ? active.content : ''
})

// 新标签页标题
const newTabTitle = ref('')

// 生成新标签页的路由
const generateNewRoute = () => {
  // 为新标签页生成临时路由，实际应用中可以根据需要调整
  const randomId = Math.floor(Math.random() * 1000)
  return `/examples/custom-route-${randomId}`
}

// 导航到指定标签页对应的路由
const navigateToTab = (tab) => {
  if (typeof window !== 'undefined') {
    window.location.href = tab.route
  }
}

// 添加新标签页
const addTab = () => {
  if (newTabTitle.value.trim() === '') {
    alert('请输入标签页标题')
    return
  }
  
  const newId = `tab${Date.now()}`
  const newRoute = generateNewRoute()
  
  tabs.value.push({
    id: newId,
    title: newTabTitle.value,
    route: newRoute,
    content: `这是 ${newTabTitle.value} 的内容。`
  })
  
  // 清空输入框
  newTabTitle.value = ''
}

// 删除标签页
const removeTab = (tabId, event) => {
  // 阻止冒泡，避免触发切换标签页事件
  event.stopPropagation()
  
  if (tabs.value.length <= 1) {
    alert('至少保留一个标签页')
    return
  }
  
  // 找出要删除的标签页的索引
  const index = tabs.value.findIndex(tab => tab.id === tabId)
  if (index === -1) return
  
  // 删除标签页
  tabs.value.splice(index, 1)
}
</script>

<template>
  <div class="dynamic-tabs-container">
    <!-- 标签页导航栏 -->
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
        <span 
          class="close-button"
          @click.stop="removeTab(tab.id, $event)"
          title="删除标签页"
        >
          ×
        </span>
      </a>
      <div class="add-tab-container">
        <input
          v-model="newTabTitle"
          @keyup.enter="addTab"
          placeholder="标签页标题"
          class="new-tab-input"
        />
        <button @click="addTab" class="add-tab-button">添加</button>
      </div>
    </div>
    
    <!-- 标签页内容区域 -->
    <div class="tabs-content">
      <div class="tab-panel active">
        <div class="content-wrapper">
          <div class="navigation-info">
            <h3>{{ tabs.find(tab => tab.id === activeTab).title }}</h3>
            <p class="navigation-hint">当前页面: {{ route.path }}</p>
            <div class="navigation-actions">
              <p>点击上方标签可以导航至对应的页面。这里展示的是当前页面内容的预览：</p>
            </div>
          </div>
          <div class="content-preview">
            <p>{{ activeTabContent }}</p>
            <div class="route-info">
              <p><strong>路由链接:</strong> {{ tabs.find(tab => tab.id === activeTab).route }}</p>
            </div>
            
            <div class="dynamic-tabs-controls">
              <h4>动态标签功能</h4>
              <p>可以通过上方的输入框添加新的导航标签，也可以通过点击标签右侧的 × 删除标签。</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dynamic-tabs-container {
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
  display: flex;
  align-items: center;
  padding: 12px 16px;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 16px;
  font-weight: 500;
  color: #666;
  transition: all 0.3s ease;
  border-bottom: 3px solid transparent;
  position: relative;
  text-decoration: none;
  gap: 6px;
}

.tab-button .nav-icon {
  font-size: 12px;
  opacity: 0;
  transition: opacity 0.3s ease;
  margin-right: 4px;
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

.close-button {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 20px;
  color: #999;
  cursor: pointer;
  padding: 0 4px;
  line-height: 1;
}

.close-button:hover {
  color: #ff4d4f;
}

.add-tab-container {
  display: flex;
  align-items: center;
  padding: 8px;
  border: 1px dashed #d9d9d9;
  border-radius: 4px;
  margin-left: 8px;
  background-color: #fff;
}

.new-tab-input {
  padding: 4px 8px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  margin-right: 8px;
  outline: none;
  min-width: 100px;
}

.add-tab-button {
  padding: 4px 12px;
  background-color: #1890ff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.add-tab-button:hover {
  background-color: #40a9ff;
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

.dynamic-tabs-controls {
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid #e8e8e8;
}

.dynamic-tabs-controls h4 {
  color: #333;
  margin-bottom: 8px;
}

.dynamic-tabs-controls p {
  color: #666;
  font-size: 14px;
  background-color: #fafafa;
  padding: 12px;
  border-radius: 4px;
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

.content-wrapper .hint {
  color: #999;
  font-style: italic;
  font-size: 14px;
  margin-top: 20px;
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