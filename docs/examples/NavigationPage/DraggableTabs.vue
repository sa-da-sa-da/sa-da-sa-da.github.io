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
  },
  {
    id: 'tab4',
    title: '资源',
    route: '/20.资源/05.案例/',
    content: '资源页面，包含案例展示和常用资源。'
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

// 导航到指定标签页对应的路由
const navigateToTab = (tab) => {
  if (typeof window !== 'undefined') {
    window.location.href = tab.route
  }
}

// 当前拖拽的标签页ID
const draggedTabId = ref(null)

// 拖拽开始时的索引
const dragStartIndex = ref(null)

// 拖拽悬停时的索引
const dragOverIndex = ref(null)

// 拖拽开始
const startDrag = (event, tabId, index) => {
  draggedTabId.value = tabId
  dragStartIndex.value = index
  event.dataTransfer.effectAllowed = 'move'
  event.target.classList.add('dragging')
  
  // 为拖拽的元素创建一个半透明的副本
  event.dataTransfer.setData('text/plain', tabId)
  setTimeout(() => {
    event.target.classList.add('opacity-50')
  }, 0)
}

// 拖拽经过
const dragOver = (event, tabId, index) => {
  event.preventDefault()
  event.dataTransfer.dropEffect = 'move'
  
  // 如果是同一个标签页，不进行任何操作
  if (tabId === draggedTabId.value) return
  
  dragOverIndex.value = index
  
  // 高亮显示放置位置
  event.target.classList.add('drag-over')
}

// 拖拽离开
const dragLeave = (event) => {
  event.target.classList.remove('drag-over')
}

// 放置
const handleDrop = (event, tabId, dropIndex) => {
  event.preventDefault()
  event.target.classList.remove('drag-over')
  
  // 如果是同一个标签页，不进行任何操作
  if (tabId === draggedTabId.value) return
  
  // 重新排列标签页
  const newTabs = [...tabs.value]
  const draggedItem = newTabs.splice(dragStartIndex.value, 1)[0]
  newTabs.splice(dropIndex, 0, draggedItem)
  
  tabs.value = newTabs
  
  // 重置拖拽状态
  resetDragState(event)
}

// 拖拽结束
const dragEnd = (event) => {
  resetDragState(event)
}

// 重置拖拽状态
const resetDragState = (event) => {
  event.target.classList.remove('dragging', 'opacity-50', 'drag-over')
  draggedTabId.value = null
  dragStartIndex.value = null
  dragOverIndex.value = null
}

// 处理移动端触摸事件
let touchStartX = 0
let touchStartTime = 0

const handleTouchStart = (event, tabId, index) => {
  // 记录触摸开始的位置和时间
  touchStartX = event.touches[0].clientX
  touchStartTime = Date.now()
  
  // 为了区分点击和滑动，设置一个延迟
  setTimeout(() => {
    if (draggedTabId.value === null) {
      // 如果不是拖拽，就导航到对应标签页
      const tab = tabs.value.find(t => t.id === tabId)
      if (tab) {
        navigateToTab(tab)
      }
    }
  }, 200)
}

const handleTouchMove = (event, tabId, index) => {
  // 计算滑动距离和时间
  const touchX = event.touches[0].clientX
  const touchTime = Date.now()
  const diffX = Math.abs(touchX - touchStartX)
  const diffTime = touchTime - touchStartTime
  
  // 如果滑动距离超过一定阈值并且时间较短，认为是拖拽操作
  if (diffX > 20 && diffTime < 300) {
    // 标记为拖拽操作
    draggedTabId.value = tabId
    dragStartIndex.value = index
    
    // 阻止页面滚动
    event.preventDefault()
  }
}

const handleTouchEnd = (event, tabId, index) => {
  // 如果是拖拽操作，处理排序
  if (draggedTabId.value === tabId) {
    // 简单的左右拖拽逻辑，实际应用中可能需要更复杂的计算
    const touchX = event.changedTouches[0].clientX
    const diffX = touchX - touchStartX
    
    // 如果向左滑动超过一定距离，与右侧标签页交换位置
    if (diffX < -50 && index < tabs.value.length - 1) {
      const newTabs = [...tabs.value]
      ;[newTabs[index], newTabs[index + 1]] = [newTabs[index + 1], newTabs[index]]
      tabs.value = newTabs
    }
    // 如果向右滑动超过一定距离，与左侧标签页交换位置
    else if (diffX > 50 && index > 0) {
      const newTabs = [...tabs.value]
      ;[newTabs[index], newTabs[index - 1]] = [newTabs[index - 1], newTabs[index]]
      tabs.value = newTabs
    }
  }
  
  // 重置触摸状态
  draggedTabId.value = null
  dragStartIndex.value = null
}
</script>

<template>
  <div class="draggable-tabs-container">
    <!-- 标签页导航栏 - 实际的页面导航 -->
    <div class="tabs-nav">
      <a
        v-for="(tab, index) in tabs"
        :key="tab.id"
        :href="tab.route"
        :class="['tab-button', { active: activeTab === tab.id }]"
        @click="navigateToTab(tab)"
        draggable="true"
        @dragstart="startDrag($event, tab.id, index)"
        @dragover="dragOver($event, tab.id, index)"
        @dragleave="dragLeave"
        @drop="handleDrop($event, tab.id, index)"
        @dragend="dragEnd($event)"
        @touchstart="handleTouchStart($event, tab.id, index)"
        @touchmove="handleTouchMove($event, tab.id, index)"
        @touchend="handleTouchEnd($event, tab.id, index)"
        title="点击导航至: {{ tab.title }}"
      >
        {{ tab.title }}
        <span class="nav-icon">↗</span>
        <span class="drag-handle">⋮⋮</span>
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
              <p>点击上方标签可以导航至对应的页面。这里展示的是当前页面内容的预览：</p>
            </div>
          </div>
          <div class="content-preview">
            <p>{{ activeTabContent }}</p>
            <div class="route-info">
              <p><strong>路由链接:</strong> {{ tabs.find(tab => tab.id === activeTab).route }}</p>
            </div>
            
            <div class="drag-instructions">
              <h4>拖拽排序功能</h4>
              <div class="instruction-steps">
                <div class="step">
                  <span class="step-number">1</span>
                  <p>点击并按住标签页，然后拖动</p>
                </div>
                <div class="step">
                  <span class="step-number">2</span>
                  <p>移动到想要的位置</p>
                </div>
                <div class="step">
                  <span class="step-number">3</span>
                  <p>释放鼠标完成排序</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.draggable-tabs-container {
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
  position: relative;
  flex: 1;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 50px;
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

.tab-button .drag-handle {
  font-size: 12px;
  opacity: 0;
  transition: opacity 0.3s ease;
  margin-left: 4px;
  cursor: grab;
  color: #999;
}

.tab-button:hover .drag-handle {
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

.tab-button.drag-over {
  border-top: 2px solid #1890ff;
}

.tab-button.dragging {
  opacity: 0.5;
  transform: rotate(2deg);
}

.drag-handle {
  margin-right: 8px;
  cursor: grab;
  font-size: 12px;
  color: #999;
  user-select: none;
}

.drag-handle:active {
  cursor: grabbing;
}

.drag-hint {
  padding: 12px 16px;
  background-color: #e6f7ff;
  border-bottom: 1px solid #91d5ff;
  color: #1890ff;
  font-size: 14px;
}

.drag-hint p {
  margin: 0;
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

.tab-order-info {
  margin-top: 24px;
  padding: 16px;
  background-color: #fafafa;
  border-radius: 4px;
  border: 1px solid #f0f0f0;
}

.tab-order-info p {
  margin-top: 0;
  font-weight: 500;
  color: #333;
}

.tab-order-list {
  margin: 8px 0 0 0;
  padding-left: 20px;
  color: #666;
}

.tab-order-list li {
  margin-bottom: 4px;
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
  
  .drag-handle {
    font-size: 10px;
    margin-right: 4px;
  }
}

@media (max-width: 480px) {
  .tab-button {
    flex-basis: 100%;
  }
}
</style>