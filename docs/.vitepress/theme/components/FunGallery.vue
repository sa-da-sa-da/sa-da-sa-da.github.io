<script setup lang="ts">
import { ref, computed } from 'vue';
import AdPopup from './AdPopup.vue';

/**
 * 娱乐广场卡片数据配置（增删卡片只需修改下方 items 数组）
 *
 * 字段说明：
 * - id        唯一标识
 * - title     卡片标题
 * - subtitle  副标题
 * - category  分类：相册 / 音乐 / 电影 / 游戏 / 书城
 * - cover     封面图片地址（留空则显示占位图）
 * - desc      卡片简介
 * - tags      标签列表
 * - playUrl   点击「进入」打开的链接：外部链接 / 内部页面 / PDF 文件地址均可
 * - btnText   按钮文字（可选，默认「进入」）
 * - zipUrl    下载地址（可选，填写后显示「下载」按钮）
 */
interface CardItem {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  cover: string;
  desc: string;
  tags: string[];
  playUrl: string;
  btnText?: string;
  zipUrl?: string;
}

const categories = [
  { key: '全部', label: '全部' },
  { key: '相册', label: '相册' },
  { key: '音乐', label: '音乐' },
  { key: '电影', label: '电影' },
  { key: '游戏', label: '游戏' },
  { key: '书城', label: '书城' },
];

const categoryColors: Record<string, string> = {
  '相册': '#4f46e5',
  '音乐': '#db2777',
  '电影': '#dc2626',
  '游戏': '#16a34a',
  '书城': '#c2410c',
};

const items: CardItem[] = [
  // ==================== 相册 ====================
  {
    id: 'ug-cloud-album',
    title: '绿联云 · 家庭相册',
    subtitle: 'NAS · 在线相册',
    category: '相册',
    cover: 'https://cdn-hsyq-static-bak.shanhutech.cn/bizhi/staticwp/201803/ed9d19ea8fa2ccca012bb8ac333e7166.jpg',
    desc: '绿联私有云家庭相册，随时随地在线浏览，记录与回味生活中的美好瞬间。',
    tags: ['NAS', '家庭相册', '在线浏览'],
    playUrl: 'https://ug.link/dxp4800plus-zk-ud4v/photo/share/?id=2&pagetype=share&uuid=de42a38a-9964-43a5-bc3e-04aa49486e3c',
    btnText: '打开相册',
  },

  // ==================== 音乐（跳转到站内播放器页面） ====================
  {
    id: 'music-library',
    title: '我的音乐',
    subtitle: '音乐 · 站内播放器（含本地音频）',
    category: '音乐',
    cover: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=modern%20music%20streaming%20app%20concept%2C%20purple%20pink%20neon%20gradient%2C%20glowing%20headphones%20and%20floating%20music%20notes%2C%20dark%20background%2C%20digital%20art&image_size=landscape_16_9',
    desc: '站内音乐播放器：内置本地 Silent.wav + 4 首在线测试曲，支持歌单切换、进度/音量/三种播放模式，旋转封面动效。往 public/music/ 放 mp3/wav 就能扩展歌单。',
    tags: ['站内播放器', '本地文件', '播放控制'],
    playUrl: '/yule/music-player',
    btnText: '进入播放器',
  },

  // ==================== 电影（跳转到站内播放器，本地 mp4 走原生控件，B站走 iframe） ====================
  {
    id: 'movie-local-mv',
    title: '本地视频 · 演唱会/反乌托邦 MV',
    subtitle: '电影 · 站内播放器（本地视频）',
    category: '电影',
    cover: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=concert%20stage%20spotlight%20mixed%20with%20dystopian%20cyberpunk%20city%20scenes%2C%20cinematic%20split%20banner%2C%20vibrant%20neon%20lights&image_size=landscape_16_9',
    desc: '站内视频播放器：内置 2 个本地 mp4（演唱会转场 · 友谊 / 反乌托邦 Pt.2 MV），走原生控件（进度/前后10s/音量/全屏）；另外还有《大雄兔》《辛特尔》两部开源动画（B站 iframe 模式）。',
    tags: ['本地视频', '原生播放器', 'MV'],
    playUrl: '/yule/movie-player',
    btnText: '立即播放',
  },

  // ==================== 游戏（卡片直接打开对应游戏链接） ====================
  {
    id: 'game-2048',
    title: '2048',
    subtitle: '游戏 · 网页版',
    category: '游戏',
    cover: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=colorful%20number%20puzzle%20tiles%20floating%20in%20space%2C%20orange%20yellow%20gradient%2C%20mobile%20puzzle%20game%20art%2C%20glossy%203d%20blocks&image_size=landscape_16_9',
    desc: '经典数字合并小游戏：滑动方块让相同数字相加，挑战合成 2048，休闲又烧脑。',
    tags: ['休闲益智', '经典', '网页游戏'],
    playUrl: 'https://play2048.co/',
    btnText: '开始游戏',
  },

  // ==================== 书城（跳转到站内 PDF 阅读器，用 query 预选具体书籍） ====================
  {
    id: 'book-think-python',
    title: 'Think Python 2e',
    subtitle: '书城 · PDF 在线阅读',
    category: '书城',
    cover: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=open%20book%20with%20glowing%20code%20symbols%20floating%2C%20green%20blue%20gradient%2C%20modern%20tech%20illustration%2C%20reading%20concept&image_size=landscape_16_9',
    desc: '经典 Python 入门书《Think Python》第二版英文原版（CC 授权免费），在站内 PDF 阅读器中阅读，支持缩放、旋转、滚动/单页切换、跳页、下载。',
    tags: ['Python', '编程入门', '站内阅读器'],
    playUrl: '/yule/book-reader?id=book-think-python',
    btnText: '开始阅读',
  },
];

const activeCategory = ref('全部');

const filteredItems = computed(() => {
  if (activeCategory.value === '全部') return items;
  return items.filter(item => item.category === activeCategory.value);
});

const getCategoryColor = (cat: string) => categoryColors[cat] || '#4f46e5';
</script>

<template>
  <div class="fun-gallery">
    <!-- 分类标签栏 -->
    <div class="filter-bar">
      <button
        v-for="cat in categories"
        :key="cat.key"
        class="filter-btn"
        :class="{ active: activeCategory === cat.key }"
        @click="activeCategory = cat.key"
      >
        {{ cat.label }}
      </button>
    </div>

    <!-- 卡片网格 -->
    <div class="cards-grid">
      <div
        v-for="item in filteredItems"
        :key="item.id"
        class="card"
      >
        <!-- 封面区域 -->
        <div class="card-cover-wrap">
          <img
            v-if="item.cover"
            :src="item.cover"
            :alt="item.title"
            class="card-cover"
            loading="lazy"
          />
          <div v-else class="card-cover-placeholder">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M9.53 16.122a3 3 0 0 0-5.78 1.128 2.25 2.25 0 0 1-2.4 2.245 4.5 4.5 0 0 0 8.4-2.245c0-.399-.078-.78-.22-1.128Zm0 0a15.998 15.998 0 0 0 3.388-1.62m-5.048 4.025a3 3 0 0 1-4.293 0l1.414-1.415a.75.75 0 0 1 1.06 1.06l-1.414 1.415Zm5.048-4.025A15.998 15.998 0 0 1 16.122 9.53m-1.62 3.388a3 3 0 0 0 1.128-5.78 2.25 2.25 0 0 1 2.245-2.4 4.5 4.5 0 0 0-2.245 8.4c.399 0 .78-.078 1.128-.22Zm0 0a15.998 15.998 0 0 0-1.62-3.388m4.025 5.048a3 3 0 0 1 0 4.293l-1.415-1.414a.75.75 0 0 1-1.06-1.06l1.415 1.414Zm-4.025-5.048a15.998 15.998 0 0 1 3.388 1.62M6.75 15.75l-1.5-1.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
            <span>{{ item.title }}</span>
          </div>
          <!-- 分类标签 -->
          <span
            class="category-badge"
            :style="{ backgroundColor: getCategoryColor(item.category) }"
          >
            {{ item.category }}
          </span>
        </div>

        <!-- 内容区域 -->
        <div class="card-body">
          <h3 class="card-title">{{ item.title }}</h3>
          <p class="card-subtitle">{{ item.subtitle }}</p>
          <p class="card-desc">{{ item.desc }}</p>

          <!-- 标签 -->
          <div class="card-tags">
            <span v-for="tag in item.tags" :key="tag" class="tag">{{ tag }}</span>
          </div>

          <!-- 按钮 -->
          <div class="card-actions">
            <a :href="item.playUrl" target="_blank" class="btn btn-primary">
              <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                <path d="M8 5v14l11-7z" />
              </svg>
              {{ item.btnText || '进入' }}
            </a>
            <a
              v-if="item.zipUrl"
              :href="item.zipUrl"
              class="btn btn-secondary"
              download
            >
              下载
            </a>
          </div>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-if="filteredItems.length === 0" class="empty-state">
      该分类下暂无内容，敬请期待
    </div>

    <!-- 广告弹窗 -->
    <AdPopup />
  </div>
</template>

<style scoped>
.fun-gallery {
  --primary: #4f46e5;
  --primary-hover: #4338ca;
  --card-bg: #ffffff;
  --text: #1f2937;
  --text-secondary: #6b7280;
  --border: #e5e7eb;
  --tag-bg: #eef2ff;
  --tag-text: #4f46e5;
  --shadow: 0 1px 3px rgba(0, 0, 0, 0.08), 0 4px 12px rgba(0, 0, 0, 0.05);
  --shadow-hover: 0 4px 6px rgba(0, 0, 0, 0.05), 0 10px 24px rgba(0, 0, 0, 0.08);
  --radius: 16px;
  --radius-sm: 10px;
}

/* 分类筛选栏 */
.filter-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 24px;
  padding: 4px;
}

.filter-btn {
  padding: 6px 16px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: var(--card-bg);
  color: var(--text-secondary);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.filter-btn:hover {
  border-color: #c7c3f7;
  color: var(--primary);
  background: #fafaff;
}

.filter-btn.active {
  background: var(--primary);
  color: #fff;
  border-color: var(--primary);
  font-weight: 500;
}

/* 卡片网格 */
.cards-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}

@media (max-width: 1024px) {
  .cards-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 640px) {
  .cards-grid {
    grid-template-columns: 1fr;
  }
}

/* 卡片 */
.card {
  background: var(--card-bg);
  border-radius: var(--radius);
  overflow: hidden;
  box-shadow: var(--shadow);
  transition: transform 0.25s ease, box-shadow 0.25s ease;
  display: flex;
  flex-direction: column;
}

.card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-hover);
}

/* 封面 */
.card-cover-wrap {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 10;
  overflow: hidden;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
}

.card-cover {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.4s ease;
}

.card:hover .card-cover {
  transform: scale(1.05);
}

.card-cover-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: rgba(255, 255, 255, 0.7);
  background: linear-gradient(135deg, #312e81 0%, #4c1d95 100%);
}

.card-cover-placeholder svg {
  width: 48px;
  height: 48px;
  opacity: 0.6;
}

.card-cover-placeholder span {
  font-size: 14px;
  opacity: 0.8;
}

/* 分类标签 */
.category-badge {
  position: absolute;
  top: 12px;
  left: 12px;
  padding: 4px 10px;
  border-radius: 6px;
  color: #fff;
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.5px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
}

/* 卡片内容 */
.card-body {
  padding: 16px;
  display: flex;
  flex-direction: column;
  flex: 1;
  gap: 8px;
}

.card-title {
  font-size: 17px;
  font-weight: 600;
  color: var(--text);
  margin: 0;
  line-height: 1.4;
}

.card-subtitle {
  font-size: 12px;
  color: var(--text-secondary);
  margin: 0;
}

.card-desc {
  font-size: 13px;
  line-height: 1.7;
  color: #4b5563;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  flex: 1;
}

/* 标签 */
.card-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 4px;
}

.tag {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 999px;
  background: var(--tag-bg);
  color: var(--tag-text);
  font-size: 11px;
  font-weight: 500;
  border: 1px solid #e0e7ff;
}

/* 按钮 */
.card-actions {
  display: flex;
  gap: 10px;
  margin-top: 10px;
}

.btn {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 0;
  border-radius: var(--radius-sm);
  font-size: 13px;
  font-weight: 500;
  text-decoration: none;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
}

.btn-primary {
  background: var(--primary);
  color: #fff;
}

.btn-primary:hover {
  background: var(--primary-hover);
}

.btn-secondary {
  background: #fff;
  color: var(--text);
  border: 1px solid var(--border);
}

.btn-secondary:hover {
  background: #f9fafb;
  border-color: #d1d5db;
}

/* 空状态 */
.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: var(--text-secondary);
  font-size: 15px;
}
</style>
