<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useData, useRouter } from 'vitepress'
import DefaultTheme from 'vitepress/theme'

const { Layout } = DefaultTheme
const { page, isHome } = useData()
const router = useRouter()

// 判断是否为导航页
const isNavPage = computed(() => {
  return page.value.path?.startsWith('/nav') || page.value.path?.includes('/nav-page') || page.value.path?.startsWith('/culture')
})


// 导航到导航页面
const navigateToNav = () => {
  router.push('/nav')
}

// --- 时钟逻辑 ---
const timeStr = ref('')
const dateStr = ref('')
let timer = null

const updateTime = () => {
  const now = new Date()
  timeStr.value = now.toLocaleTimeString('zh-CN', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
  dateStr.value = now.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  })
}

onMounted(() => {
  updateTime()
  timer = setInterval(updateTime, 1000)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>

<template>
  <div class="vp-app teek-layout">
    <!-- 顶部导航栏 -->
    <header class="vp-header" v-if="!isNavPage">
      <div class="container">
        <!-- Logo -->
        <div class="logo">
          <RouterLink to="/" class="logo-link">
            <img src="/logo.png" alt="logo" class="logo-img" />
          </RouterLink>
        </div>

        <!-- 导航菜单 -->
        <nav class="nav-bar">
          <NavMenu />
        </nav>

        <!-- 右侧工具栏 -->
        <div class="tools-bar">
          <!-- 搜索按钮 -->
          <button class="search-btn" @click="navigateToSearch">
            <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor">
              <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"></path>
            </svg>
          </button>
          <!-- 导航页按钮 -->
          <button class="nav-btn" @click="navigateToNav">
            <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor">
              <path d="M0 2a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-2v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2H2a2 2 0 0 1-2-2V2zm3 1h2v2H3V3zm2 6h2v2H5v-2zm2-6h2v2H7V3zm2 6h2v2H9v-2zm2-6h2v2h-2V3zm2 6h2v2h-2v-2z"></path>
            </svg>
          </button>
        </div>
      </div>
    </header>

    <!-- 主内容区域 -->
    <main class="vp-main">
      <!-- 对于导航页面，隐藏侧边栏 -->
      <template v-if="!isNavPage">
        <aside v-if="!isHome && $frontmatter?.aside !== false" class="vp-sidebar">
          <div class="sidebar-container">
            <SidebarItems :items="sidebarItems" :collapse="true" />
          </div>
        </aside>

        <!-- 内容区域 -->
        <div class="vp-content">
          <Content />
        </div>
      </template>
      
      <!-- 对于导航页面，显示导航组件 -->
      <template v-else>
        <div class="vp-content" style="margin-left: 0 !important;">
          <div class="min-h-screen w-full bg-cover bg-center bg-fixed custom-bg">
            <div class="min-h-screen w-full bg-gradient-to-b from-slate-900/90 via-slate-900/50 to-slate-900/20 pt-16 flex flex-col items-center">
              
              <div class="w-full max-w-6xl px-6 mb-12 flex flex-col md:flex-row items-center justify-between gap-6 animate-fade-in select-none">
                
                <div class="text-center md:text-left">
                  <h1 class="site-title text-4xl md:text-5xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-teal-200 to-blue-300 drop-shadow-lg">
                    十三の导航页
                  </h1>
                  <p class="text-sm text-gray-400 mt-2 tracking-[0.2em] uppercase opacity-80 hidden md:block">
                    Personal Dashboard
                  </p>
                </div>

                <div class="flex flex-col items-center md:items-end">
                  <div class="clock-time text-5xl md:text-6xl font-bold text-white tracking-wide drop-shadow-xl leading-none">
                    {{ timeStr || '00:00:00' }}
                  </div>
                  
                  <div class="mt-2 px-3 py-1 rounded-md bg-white/5 border border-white/10 backdrop-blur-sm">
                    <p class="text-sm md:text-base text-gray-300 font-medium tracking-widest">
                      {{ dateStr }}
                    </p>
                  </div>
                </div>

              </div>

              <div class="w-full max-w-7xl px-6 mb-8">
                <div class="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
              </div>

              <div class="w-full max-w-7xl px-4 pb-20">
                <NavPage />
              </div>
              
            </div>
          </div>
        </div>
      </template>
    </main>

    <!-- 页脚 -->
    <footer class="vp-footer" v-if="!isNavPage">
      <div class="container">
        <p>&copy; {{ new Date().getFullYear() }} Teek Docs</p>
      </div>
    </footer>
  </div>
</template>

<style>
/* 引入字体 */
@import url('https://fonts.googleapis.com/css2?family=Rubik:wght@500;700&display=swap');

.custom-bg {
  /* 背景图 */
  background-image: url('https://img.sakaay.com/d/img/sakaay/bg-05.mp4');
}

.site-title {
  font-family: "PingFang SC", "Microsoft YaHei", sans-serif;
  -webkit-font-smoothing: antialiased; 
}

.clock-time {
  font-family: 'Rubik', sans-serif;
  font-variant-numeric: tabular-nums; /* 数字等宽，防止抖动 */
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}
.animate-fade-in {
  animation: fadeIn 0.8s ease-out;
}

.VPNav, .VPFooter, .VPLocalNav { display: none !important; }
.VPContent { padding: 0 !important; }
</style>