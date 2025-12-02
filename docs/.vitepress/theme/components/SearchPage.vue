<template>
  <div class="search-page" :style="{ backgroundImage: `url(${currentWallpaper})` }">
    <div class="search-container">
      <!-- 时间显示 -->
      <div class="time-display">
        <div class="time">{{ currentTime }}</div>
        <br>
        <div class="date">{{ currentDate }}</div>
        
        <!-- 壁纸切换按钮 -->
        <button class="change-bg-btn" @click="toggleWallpaperType" :title="`切换到${wallpaperType.value === 'bing' ? '随机壁纸' : 'Bing每日壁纸'}`">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <rect x="3" y="3" width="7" height="7"></rect>
            <rect x="14" y="3" width="7" height="7"></rect>
            <rect x="14" y="14" width="7" height="7"></rect>
            <rect x="3" y="14" width="7" height="7"></rect>
          </svg>
          <!-- 当前壁纸类型提示 -->
          <div class="wallpaper-type-indicator" v-if="!isWallpaperLoading">
            {{ wallpaperTypeText }}
          </div>
        </button>
      </div>

      <!-- 搜索框 -->
      <div class="search-box">
        <div class="search-input-wrapper">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="搜索点什么吧"
            @keyup.enter="performSearch"
            ref="searchInput"
          />
          <button class="search-btn" @click="performSearch">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.35-4.35"></path>
            </svg>
          </button>
        </div>
        
        <!-- 搜索引擎切换 -->
        <div class="search-engines">
          <button
            v-for="engine in searchEngines"
            :key="engine.name"
            :class="['engine-btn', { active: activeEngine === engine.name }]"
            @click="switchEngine(engine.name)"
          >
            {{ engine.name }}
          </button>
        </div>
      </div>

      <!-- 收藏夹 -->
      <div class="bookmarks">
        <h3>收藏夹</h3>
        <div class="bookmark-grid">
          <a
            v-for="bookmark in bookmarks"
            :key="bookmark.id"
            :href="bookmark.url"
            target="_blank"
            class="bookmark-item"
          >
            <div class="bookmark-icon">{{ bookmark.icon }}</div>
            <span class="bookmark-name">{{ bookmark.name }}</span>
          </a>
          <button class="add-bookmark" @click="showAddBookmark = true">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            <span>添加</span>
          </button>
        </div>
      </div>
    </div>

    <!-- 添加收藏夹对话框 -->
    <div v-if="showAddBookmark" class="modal-overlay" @click="showAddBookmark = false">
      <div class="modal-content" @click.stop>
        <h3>添加收藏</h3>
        <input v-model="newBookmark.name" type="text" placeholder="名称" />
        <input v-model="newBookmark.url" type="text" placeholder="网址" />
        <input v-model="newBookmark.icon" type="text" placeholder="图标 (emoji)" />
        <div class="modal-buttons">
          <button @click="showAddBookmark = false">取消</button>
          <button @click="addNewBookmark">保存</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick, computed } from 'vue';
import { Wallpaper } from '../../ConfigHyde/Wallaper';

// 搜索相关
const searchQuery = ref('');
const searchInput = ref<HTMLInputElement>();
const activeEngine = ref('百度');

// 背景图片
const currentWallpaper = ref('');
// 壁纸类型：'bing' 或 'random'
const wallpaperType = ref<'bing' | 'random'>('random');
// Bing每日壁纸URL
const BING_DAILY_WALLPAPER = 'https://api.dujin.org/bing/1920.php';
// 壁纸加载状态
const isWallpaperLoading = ref(false);
// 当前壁纸类型显示文本
const wallpaperTypeText = computed(() => {
  return wallpaperType.value === 'bing' ? 'Bing每日壁纸' : '随机壁纸';
});

// 计算随机壁纸
const randomWallpaper = computed(() => {
  const randomIndex = Math.floor(Math.random() * Wallpaper.length);
  return Wallpaper[randomIndex];
});

// 搜索引擎配置
const searchEngines = ref([
  { name: '百度', url: 'https://www.baidu.com/s?wd=' },
  { name: '谷歌', url: 'https://www.google.com/search?q=' },
  { name: '必应', url: 'https://www.bing.com/search?q=' },
  { name: '搜狗', url: 'https://www.sogou.com/web?query=' },
  { name: '头条', url: 'https://www.toutiao.com/search?keyword=' },
  { name: '抖音', url: 'https://www.douyin.com/search/' },
  { name: 'Pexels', url: 'https://www.pexels.com/zh-cn/search/' },
  { name: '知网', url: 'https://www.cnki.net/' },
]);

// 时间显示
const currentTime = ref('');
const currentDate = ref('');

// 收藏夹相关
const bookmarks = ref([
  { id: 1, name: 'GitHub', url: 'https://github.com/', icon: '🐙' },
  { id: 3, name: '掘金', url: 'https://juejin.cn/', icon: '💡' },
  { id: 4, name: 'CSDN', url: 'https://www.csdn.net/', icon: '📝' },
  { id: 6, name: '编程', url: 'https://e.sakaay.com', icon: '📚' },
  { id: 7, name: 'AI知识库', url: 'https://xa.sakaay.com/welcome', icon: '💬' },
  { id: 8, name: 'Zfile网盘', url: 'https://zf.sakaay.com/', icon: '📚' },
  { id: 9, name: 'AI生图体验', url: 'https://at.sakaay.com/', icon: '🔧' },
  { id: 10, name: '菜鸟编程', url: 'https://www.runoob.com/', icon: '📚' },
  { id: 11, name: '抖音', url: 'https://www.douyin.com/', icon: '📺' },
  { id: 12, name: '哔哩哔哩', url: 'https://www.bilibili.com/', icon: '📺' }, 
  { id: 13, name: 'DFROBOT', url: 'https://mc.dfrobot.com.cn/', icon: '🔧' },
  { id: 14, name: 'PROS', url: 'https://pros.cs.purdue.edu/', icon: '📚' },
  { id: 15, name: '世界机器人大赛', url: 'https://www.worldrobotconference.com/', icon: '🔧' },
  { id: 16, name: '航天创新', url: 'https://nysic.declare.htgjjl.com/index.aspx?', icon: '📚' },
]);
const showAddBookmark = ref(false);
const newBookmark = ref({ name: '', url: '', icon: '' });

// 搜索功能
const performSearch = () => {
  if (!searchQuery.value.trim()) return;
  
  const engine = searchEngines.value.find(e => e.name === activeEngine.value);
  if (engine) {
    window.open(engine.url + encodeURIComponent(searchQuery.value), '_blank');
  }
};

// 切换搜索引擎
const switchEngine = (engineName: string) => {
  activeEngine.value = engineName;
  localStorage.setItem('activeSearchEngine', engineName);
};

// 切换壁纸类型
const toggleWallpaperType = () => {
  wallpaperType.value = wallpaperType.value === 'random' ? 'bing' : 'random';
  localStorage.setItem('wallpaperType', wallpaperType.value);
  updateWallpaper();
};

// 预加载壁纸
const preloadWallpaper = (url: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(url);
    img.onerror = () => reject(new Error(`Failed to load wallpaper: ${url}`));
    img.src = url;
  });
};

// 更新壁纸
const updateWallpaper = async () => {
  isWallpaperLoading.value = true;
  try {
    let newWallpaperUrl;
    
    if (wallpaperType.value === 'bing') {
      // 为Bing壁纸添加时间戳避免缓存
      newWallpaperUrl = `${BING_DAILY_WALLPAPER}?t=${Date.now()}`;
    } else {
      newWallpaperUrl = randomWallpaper.value;
    }
    
    // 预加载壁纸
    await preloadWallpaper(newWallpaperUrl);
    currentWallpaper.value = newWallpaperUrl;
  } catch (error) {
    console.error('Error loading wallpaper:', error);
    // 加载失败时回退到随机壁纸
    currentWallpaper.value = randomWallpaper.value;
  } finally {
    isWallpaperLoading.value = false;
  }
};

// 更新时间
const updateTime = () => {
  const now = new Date();
  
  // 时间格式: HH:MM:SS
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  currentTime.value = `${hours}:${minutes}:${seconds}`;
  
  // 日期格式: YYYY年MM月DD日 星期X
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const weekDays = ['日', '一', '二', '三', '四', '五', '六'];
  const weekDay = weekDays[now.getDay()];
  currentDate.value = `${year}年${month}月${day}日 星期${weekDay}`;
};

// 添加新收藏
const addNewBookmark = () => {
  if (!newBookmark.value.name || !newBookmark.value.url) return;
  
  const newId = Math.max(...bookmarks.value.map(b => b.id), 0) + 1;
  bookmarks.value.push({
    id: newId,
    name: newBookmark.value.name,
    url: newBookmark.value.url.startsWith('http') 
      ? newBookmark.value.url 
      : `https://${newBookmark.value.url}`,
    icon: newBookmark.value.icon || '🌟'
  });
  
  // 重置表单
  newBookmark.value = { name: '', url: '', icon: '' };
  showAddBookmark.value = false;
  
  // 保存到本地存储
  saveBookmarks();
};

// 保存收藏夹到本地存储
const saveBookmarks = () => {
  localStorage.setItem('searchPageBookmarks', JSON.stringify(bookmarks.value));
};

// 从本地存储加载数据
const loadFromStorage = () => {
  // 加载活跃搜索引擎
  const savedEngine = localStorage.getItem('activeSearchEngine');
  if (savedEngine && searchEngines.value.some(e => e.name === savedEngine)) {
    activeEngine.value = savedEngine;
  }
  
  // 加载壁纸类型偏好
  const savedWallpaperType = localStorage.getItem('wallpaperType');
  if (savedWallpaperType === 'bing' || savedWallpaperType === 'random') {
    wallpaperType.value = savedWallpaperType;
  }
  
  // 加载收藏夹
  const savedBookmarks = localStorage.getItem('searchPageBookmarks');
  if (savedBookmarks) {
    try {
      const parsed = JSON.parse(savedBookmarks);
      if (Array.isArray(parsed)) {
        bookmarks.value = parsed;
      }
    } catch (e) {
      console.error('Failed to load bookmarks:', e);
    }
  }
};

// 生命周期
onMounted(() => {
  loadFromStorage();
  updateTime();
  const timer = setInterval(updateTime, 1000);
  
  // 设置壁纸
  updateWallpaper();
  
  // 自动聚焦搜索框
  nextTick(() => {
    searchInput.value?.focus();
  });
  
  onUnmounted(() => clearInterval(timer));
});
</script>

<style scoped>
.search-page {
  min-height: 100vh;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  color: #fff;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  position: relative;
}

.search-page::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(2px);
  z-index: 0;
}

.search-container {
  position: relative;
  z-index: 1;
}

.search-container {
  max-width: 800px;
  width: 100%;
  text-align: center;
}

/* 时间显示 */
.time-display {
  margin-bottom: 40px;
  position: relative;
}

.change-bg-btn {
  position: absolute;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  background: rgba(255, 255, 255, 0.2);
  border: none;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s;
  backdrop-filter: blur(10px);
}

.change-bg-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: translateY(-50%) scale(1.1);
}

.change-bg-btn::after {
  content: attr(title);
  position: absolute;
  right: 100%;
  top: 50%;
  transform: translateY(-50%);
  margin-right: 10px;
  padding: 5px 10px;
  background: rgba(0, 0, 0, 0.8);
  border-radius: 4px;
  font-size: 12px;
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.3s;
}

.change-bg-btn:hover::after {
  opacity: 1;
}

/* 壁纸类型指示器 */
.wallpaper-type-indicator {
  position: absolute;
  left: 50%;
  bottom: -30px;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  white-space: nowrap;
  backdrop-filter: blur(5px);
  animation: fadeInOut 2s ease-in-out;
}

@keyframes fadeInOut {
  0% { opacity: 0; transform: translateX(-50%) translateY(-10px); }
  20%, 80% { opacity: 1; transform: translateX(-50%) translateY(0); }
  100% { opacity: 0; transform: translateX(-50%) translateY(10px); }
}

/* 加载状态 */
.search-page.loading::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.3);
  z-index: 2;
}

/* 确保按钮在加载时依然可见 */
.search-container {
  position: relative;
  z-index: 1;
}

.time {
  font-size: 4rem;
  font-weight: 300;
  margin-bottom: 10px;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.date {
  font-size: 1.2rem;
  opacity: 0.9;
}

/* 搜索框 */
.search-box {
  margin-bottom: 50px;
}

.search-input-wrapper {
  position: relative;
  max-width: 600px;
  margin: 0 auto 20px;
}

.search-input-wrapper input {
  width: 100%;
  padding: 15px 60px 15px 20px;
  border-radius: 50px;
  border: none;
  font-size: 16px;
  outline: none;
  box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1);
  transition: box-shadow 0.3s;
}

.search-input-wrapper input:focus {
  box-shadow: 0 6px 40px rgba(0, 0, 0, 0.15);
}

.search-btn {
  position: absolute;
  right: 5px;
  top: 5px;
  bottom: 5px;
  width: 50px;
  background: #4285f4;
  border: none;
  border-radius: 50%;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.3s;
}

.search-btn:hover {
  background: #3367d6;
}

/* 搜索引擎切换 */
.search-engines {
  display: flex;
  justify-content: center;
  gap: 10px;
}

.engine-btn {
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.2);
  border: none;
  border-radius: 20px;
  color: white;
  cursor: pointer;
  transition: all 0.3s;
  backdrop-filter: blur(10px);
}

.engine-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: translateY(-2px);
}

.engine-btn.active {
  background: rgba(255, 255, 255, 0.4);
  font-weight: 500;
}

/* 收藏夹 */
.bookmarks h3 {
  margin-bottom: 20px;
  font-size: 1.5rem;
  font-weight: 400;
}

.bookmark-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 20px;
  max-width: 600px;
  margin: 0 auto;
}

.bookmark-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  text-decoration: none;
  color: white;
  transition: all 0.3s;
  backdrop-filter: blur(10px);
}

.bookmark-item:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: translateY(-3px);
}

.bookmark-icon {
  font-size: 2rem;
  margin-bottom: 10px;
}

.bookmark-name {
  font-size: 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  width: 100%;
}

.add-bookmark {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: rgba(255, 255, 255, 0.05);
  border: 2px dashed rgba(255, 255, 255, 0.3);
  border-radius: 12px;
  color: white;
  cursor: pointer;
  transition: all 0.3s;
}

.add-bookmark:hover {
  background: rgba(255, 255, 255, 0.15);
  border-color: rgba(255, 255, 255, 0.5);
}

/* 模态框 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  color: #333;
  padding: 30px;
  border-radius: 12px;
  width: 90%;
  max-width: 400px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
}

.modal-content h3 {
  margin-bottom: 20px;
  color: #333;
}

.modal-content input {
  width: 100%;
  padding: 10px;
  margin-bottom: 15px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 16px;
}

.modal-buttons {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  margin-top: 20px;
}

.modal-buttons button {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 16px;
  transition: background 0.3s;
}

.modal-buttons button:first-child {
  background: #f5f5f5;
  color: #333;
}

.modal-buttons button:first-child:hover {
  background: #e0e0e0;
}

.modal-buttons button:last-child {
  background: #4285f4;
  color: white;
}

.modal-buttons button:last-child:hover {
  background: #3367d6;
}

/* 响应式 */
@media (max-width: 600px) {
  .time {
    font-size: 3rem;
  }
  
  .bookmark-grid {
    grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  }
}
</style>