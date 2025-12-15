<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useData } from 'vitepress'
import NavGrid from './NavGrid.vue'

// --- 配置读取 ---
const { theme } = useData()
const pageConfig = computed(() => {
  const config = theme.value.startPage || {}
  return {
    title: config.title || '',
    bgImage: 'https://img.sakaay.com/d/img/sakaay/bg-01.mp4' // 直接使用视频背景URL
  }
})

// 计算背景样式
const wrapperStyle = computed(() => {
  const bgImage = pageConfig.value.bgImage
  if (bgImage && bgImage.endsWith('.mp4')) {
    // 如果是视频，需要特殊处理，这里我们会在模板中使用video标签
    return {}
  }
  return bgImage ? { backgroundImage: `url(${bgImage})` } : {}
})

// --- 状态定义 ---
const timeStr = ref('00:00:00')
const dateStr = ref('')
const searchText = ref('')
const currentEngineKey = ref('bing') 
const isMenuOpen = ref(false)

// --- 搜索引擎配置 ---
const engines = {
  baidu: { 
    name: '百度', 
    url: 'https://www.baidu.com/s?wd=', 
    placeholder: '百度一下...'
  },
  google: { 
    name: 'Google', 
    url: 'https://www.google.com/search?q=', 
    placeholder: 'Google Search...'
  },
  bing: { 
    name: 'Bing', 
    url: 'https://www.bing.com/search?q=', 
    placeholder: '微软 Bing 搜索...'
  }, 
}

const currentEngine = computed(() => engines[currentEngineKey.value])

// --- 逻辑函数 ---
const toggleMenu = () => isMenuOpen.value = !isMenuOpen.value
const selectEngine = (key) => {
  currentEngineKey.value = key
  isMenuOpen.value = false
}
const closeMenu = (e) => {
  if (!e.target.closest('.engine-selector')) isMenuOpen.value = false
}
const handleSearch = () => {
  if (!searchText.value.trim()) return
  const target = currentEngine.value.url + encodeURIComponent(searchText.value)
  window.open(target, '_blank')
}

// 更新时间
let timer = null
const updateTime = () => {
  const now = new Date()
  timeStr.value = now.toLocaleTimeString('en-GB', { hour12: false })
  const month = now.getMonth() + 1
  const day = now.getDate()
  const weeks = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
  dateStr.value = `${month}月${day}日 ${weeks[now.getDay()]}`
}

onMounted(() => {
  updateTime()
  timer = setInterval(updateTime, 1000)
  document.addEventListener('click', closeMenu)
})
onUnmounted(() => {
  if (timer) clearInterval(timer)
  document.removeEventListener('click', closeMenu)
})
</script>

<template>
  <div class="start-page-wrapper">
    <!-- 视频背景 --->
    <video v-if="pageConfig.bgImage && pageConfig.bgImage.endsWith('.mp4')" class="bg-video"
      :src="pageConfig.bgImage"
      autoplay
      muted
      loop
      playsinline
    />
    <div class="scroll-container">
      <div class="content-box">
        <div class="info-header">
          <h1 class="main-title">{{ pageConfig.title }}</h1>
          <div class="time-group">
            <div class="clock">{{ timeStr }}</div>
            <div class="date-row">{{ dateStr }}</div>
          </div>
        </div>

        <div class="search-container">
          <div class="search-bar">
            <div class="engine-selector">
              <div class="current-engine-icon" @click.stop="toggleMenu" :title="currentEngine.name">
                <span class="engine-name">{{ currentEngine.name }}</span>
                <span class="arrow-down" :class="{ rotate: isMenuOpen }">▼</span>
              </div>
              <div class="engine-dropdown" v-if="isMenuOpen">
                <div v-for="(eng, key) in engines" :key="key" class="dropdown-item"
                     :class="{ active: key === currentEngineKey }" @click.stop="selectEngine(key)">
                  {{ eng.name }}
                </div>
              </div>
            </div>
            <input type="text" class="search-input" v-model="searchText" @keyup.enter="handleSearch"
                   :placeholder="currentEngine.placeholder" />
            <button class="search-btn" @click="handleSearch">搜索</button>
          </div>
        </div>

        <div class="nav-grid-wrapper">
          <NavGrid />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 字体定义 */
@font-face {
  font-family: "TsukuARdGothicStd";
  src: url('/img/TsukuARdGothicStd-Regular.woff2') format('woff2');
  font-weight: normal;
  font-style: normal;
}

/* 背景容器 - 改为相对定位，不再全屏覆盖 */
.start-page-wrapper {
  width: 100%;
  min-height: calc(100vh - 60px); /* 减去顶部导航栏的高度 */
  background-position: center;
  background-size: cover;
  background-repeat: no-repeat;
  background-color: #0f172a;
  position: relative;
}

/* 视频背景样式 */
.bg-video {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  z-index: 0;
  opacity: 0.8;
}

.start-page-wrapper::before {
  content: '';
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.3);
  z-index: 1;
  pointer-events: none;
}

/* 内容容器 */
.scroll-container {
  position: relative;
  z-index: 10;
  width: 100%;
  min-height: 100%;
  display: flex;
  justify-content: center;
  padding-bottom: 40px;
}

.content-box {
  width: 100%; max-width: 900px;
  padding: 40px 20px 20px 20px;
  display: flex; flex-direction: column; gap: 40px;
  color: #fff;
}

/* 头部信息 */
.info-header {
  text-align: center;
  text-shadow: 0 2px 10px rgba(0,0,0,0.5);
}

.main-title {
  font-size: 2.5rem;
  font-weight: 800;
  margin: 0;
  line-height: 1;
}

.time-group {
  margin-top: 20px;
}

.clock {
  font-size: 2.5rem;
  font-weight: 700;
  line-height: 1.1;
}

.date-row {
  font-size: 1rem;
  opacity: 0.95;
  margin-top: 5px;
}

/* 搜索框 */
.search-container {
  width: 100%; max-width: 700px;
  margin: 0 auto;
}

.search-bar {
  position: relative;
  display: flex;
  align-items: center;
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255,255,255,0.25);
  border-radius: 16px;
  padding: 8px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

.engine-selector {
  position: relative;
  margin-right: 8px;
}

.current-engine-icon {
  display: flex;
  align-items: center;
  width: 70px;
  height: 40px;
  padding: 0 10px;
  cursor: pointer;
  border-radius: 10px;
  color: rgba(255,255,255,0.9);
}

.engine-name {
  font-size: 0.9rem;
  margin-right: 5px;
}

.arrow-down {
  font-size: 8px;
  opacity: 0.7;
  transition: transform 0.3s;
}

.arrow-down.rotate {
  transform: rotate(180deg);
}

.engine-dropdown {
  position: absolute;
  top: 120%;
  left: 0;
  width: 140px;
  background: rgba(30, 41, 59, 0.95);
  border: 1px solid rgba(255,255,255,0.1);
  backdrop-filter: blur(12px);
  border-radius: 12px;
  padding: 6px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.5);
  z-index: 50;
}

.dropdown-item {
  padding: 10px 12px;
  border-radius: 8px;
  cursor: pointer;
  color: #cbd5e1;
  font-size: 14px;
  transition: all 0.2s;
}

.dropdown-item:hover {
  background: rgba(255,255,255,0.1);
  color: #fff;
}

.dropdown-item.active {
  background: #3b82f6;
  color: #fff;
}

.search-input {
  flex: 1;
  background: transparent;
  border: none;
  color: #fff;
  font-size: 1.1rem;
  padding: 0 10px;
  outline: none;
}

.search-input::placeholder {
  color: rgba(255,255,255,0.5);
}

.search-btn {
  width: 60px;
  height: 42px;
  border: none;
  background: transparent;
  color: #fff;
  border-radius: 12px;
  cursor: pointer;
}

.search-btn:hover {
  background: rgba(255,255,255,0.2);
}

/* 导航网格 */
.nav-grid-wrapper {
  flex: 1;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .main-title {
    font-size: 2rem;
  }
  
  .clock {
    font-size: 2rem;
  }
  
  .search-container {
    width: 95%;
  }
}
</style>