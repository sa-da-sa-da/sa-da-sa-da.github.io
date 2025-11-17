<script setup>
import { ref, computed } from 'vue'
import { useRoute } from 'vitepress'

// 导航数据配置
const navItems = [
  {
    id: 'home',
    title: '首页',
    description: '返回网站首页，了解项目概览',
    route: '/',
    icon: '🏠',
    color: '#1890ff'
  },
  {
    id: 'guide',
    title: '指南',
    description: '查看使用文档和教程',
    route: '/01.指南/01.简介/',
    icon: '📚',
    color: '#52c41a'
  },
  {
    id: 'config',
    title: '配置',
    description: '主题设置和功能配置',
    route: '/10.配置/01.主题配置/',
    icon: '⚙️',
    color: '#faad14'
  },
  {
    id: 'resources',
    title: '资源',
    description: '案例展示和常用资源',
    route: '/20.资源/05.案例/',
    icon: '📦',
    color: '#722ed1'
  },
  {
    id: 'ecology',
    title: '生态',
    description: '组件库和工具集',
    route: '/30.生态/01.Components 组件/',
    icon: '🌐',
    color: '#13c2c2'
  },
  {
    id: 'teach',
    title: '教学',
    description: '教学资源和学习路径',
    route: '/06.教学/02AI助力编程学习/',
    icon: '🎓',
    color: '#f5222d'
  }
]

// 获取当前路由
const route = useRoute()

// 当前激活的导航项
const activeNavItem = computed(() => {
  const active = navItems.find(item => route.path.startsWith(item.route))
  return active ? active.id : navItems[0].id
})

// 导航到指定页面
const navigateTo = (item) => {
  if (typeof window !== 'undefined') {
    window.location.href = item.route
  }
}

// 过滤导航项（可用于搜索功能扩展）
const filterText = ref('')
const filteredNavItems = computed(() => {
  if (!filterText.value) return navItems
  
  const text = filterText.value.toLowerCase()
  return navItems.filter(item => 
    item.title.toLowerCase().includes(text) || 
    item.description.toLowerCase().includes(text)
  )
})
</script>

<template>
  <div class="custom-navigation-container">
    <!-- 导航标题区域 -->
    <div class="nav-header">
      <h2 class="nav-title">
        <span class="nav-icon-main">🧭</span>
        自定义导航中心
      </h2>
      <p class="nav-subtitle">快速访问网站的主要区域</p>
    </div>
    
    <!-- 搜索框（可选功能） -->
    <div class="nav-search">
      <input 
        v-model="filterText" 
        type="text" 
        placeholder="搜索导航项..."
        class="search-input"
      />
    </div>
    
    <!-- 导航卡片网格 -->
    <div class="nav-cards-grid">
      <a
        v-for="item in filteredNavItems"
        :key="item.id"
        :href="item.route"
        class="nav-card"
        :class="{ active: activeNavItem === item.id }"
        :style="{ borderColor: activeNavItem === item.id ? item.color : '' }"
        @click="navigateTo(item)"
        title="点击导航至: {{ item.title }}"
      >
        <div class="nav-card-content">
          <div class="nav-card-icon" :style="{ backgroundColor: item.color + '20', color: item.color }">
            {{ item.icon }}
          </div>
          <div class="nav-card-info">
            <h3 class="nav-card-title">{{ item.title }}</h3>
            <p class="nav-card-desc">{{ item.description }}</p>
          </div>
          <div class="nav-arrow">
            <span class="arrow-icon">→</span>
          </div>
        </div>
        <div class="nav-card-route">
          <code>{{ item.route }}</code>
        </div>
      </a>
    </div>
    
    <!-- 当前位置信息 -->
    <div class="current-location">
      <div class="location-info">
        <span class="location-label">当前位置:</span>
        <span class="location-path">
          {{ route.path }}
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.custom-navigation-container {
  width: 100%;
  max-width: 1000px;
  margin: 0 auto;
  padding: 20px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

/* 导航标题样式 */
.nav-header {
  text-align: center;
  margin-bottom: 30px;
  padding: 20px;
  background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.nav-title {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  font-size: 28px;
  font-weight: 700;
  color: #165dff;
  margin: 0 0 8px 0;
}

.nav-icon-main {
  font-size: 32px;
}

.nav-subtitle {
  font-size: 16px;
  color: #64748b;
  margin: 0;
}

/* 搜索框样式 */
.nav-search {
  margin-bottom: 30px;
}

.search-input {
  width: 100%;
  padding: 12px 16px;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  font-size: 16px;
  transition: all 0.3s ease;
  box-sizing: border-box;
}

.search-input:focus {
  outline: none;
  border-color: #165dff;
  box-shadow: 0 0 0 3px rgba(22, 93, 255, 0.1);
}

/* 导航卡片网格 */
.nav-cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

/* 导航卡片样式 */
.nav-card {
  display: block;
  background: white;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  padding: 20px;
  text-decoration: none;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.nav-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

.nav-card.active {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(22, 93, 255, 0.15);
}

.nav-card-content {
  display: flex;
  align-items: flex-start;
  gap: 16px;
}

.nav-card-icon {
  flex-shrink: 0;
  width: 50px;
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  border-radius: 10px;
}

.nav-card-info {
  flex: 1;
}

.nav-card-title {
  font-size: 18px;
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 6px 0;
}

.nav-card-desc {
  font-size: 14px;
  color: #64748b;
  margin: 0;
  line-height: 1.5;
}

.nav-arrow {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.nav-card:hover .nav-arrow {
  opacity: 1;
}

.arrow-icon {
  font-size: 18px;
  font-weight: bold;
  color: #165dff;
}

.nav-card-route {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #f1f5f9;
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.nav-card-route code {
  background: #f8fafc;
  padding: 2px 6px;
  border-radius: 4px;
  color: #64748b;
}

/* 当前位置信息 */
.current-location {
  background: #f8fafc;
  border-radius: 8px;
  padding: 16px;
  text-align: center;
  border: 1px solid #e2e8f0;
}

.location-info {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 14px;
}

.location-label {
  font-weight: 500;
  color: #64748b;
}

.location-path {
  color: #165dff;
  font-family: monospace;
  background: white;
  padding: 2px 8px;
  border-radius: 4px;
  border: 1px solid #e2e8f0;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .custom-navigation-container {
    padding: 16px;
  }
  
  .nav-cards-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }
  
  .nav-title {
    font-size: 24px;
  }
  
  .nav-icon-main {
    font-size: 28px;
  }
}
</style>