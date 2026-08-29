<script setup lang="ts">
import { ref, computed, onBeforeUnmount, onMounted, watch } from 'vue';

/**
 * 站内电影/视频播放器组件
 *
 * 两种播放方式：
 *  A. 直链模式（优先）：填 src 为 mp4 / webm 直链，使用原生 video 自定义控件
 *  B. 外链模式（B 站等）：填 embedUrl 为 B 站 iframe 地址，使用 iframe 内嵌播放器
 *
 * 使用方式：
 *   <MoviePlayer
 *     initial-id="movie-big-buck-bunny"
 *     :playlist="[
 *       { id:'xx', title:'xx', cover:'xx', desc:'xx', duration:'10:34', quality:'1080P',
 *         src:'https://xxx.mp4',  // 方式A：直链
 *         embedUrl:'https://www.bilibili.com/html/player.html?xxx'  // 方式B：iframe
 *       }
 *     ]"
 *   />
 *
 * 不传 playlist 就使用下方内置片单。
 */

interface MovieItem {
  id: string;
  title: string;
  cover: string;
  desc: string;
  duration?: string;
  quality?: string;
  tags?: string[];
  // 直链：原生 video 播放（支持自定义控件）
  src?: string;
  // 外链：iframe 内嵌播放（B 站 / 其他视频站 embedding）
  embedUrl?: string;
}

// —— 辅助：public/music/ 下文件名含 #、《、》、【】等特殊字符，务必 encode ——
const localFile = (name: string) => `/music/${encodeURIComponent(name)}`;

// —— 内置测试片单（本地直链优先，B 站外链其次） ——
// 直链模式：填 src，使用自定义原生 video 控件
// 外链模式：填 embedUrl（B 站 iframe 地址格式：https://player.bilibili.com/player.html?bvid=BVxxxx&page=1&autoplay=0）
const defaultPlaylist: MovieItem[] = [
  {
    id: 'movie-local-mv-1',
    title: '演唱会转场 · 友谊',
    cover: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=concert%20stage%20spotlight%20with%20cheering%20crowd%20silhouette%2C%20blue%20purple%20pink%20neon%20lights%2C%20cinematic%20wide%20shot%2C%20video%20thumbnail&image_size=landscape_16_9',
    desc: '本地视频：演唱会转场合集，友谊主题创意剪辑（原生播放器模式）。',
    quality: '本地高清',
    tags: ['本地视频', '演唱会', '剪辑'],
    src: localFile('video_#演唱会转场终于轮到我了##友谊..._0_1.mp4'),
  },
  {
    id: 'movie-local-mv-2',
    title: '反乌托邦 Pt.2 · 亚细亚旷世',
    cover: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=dystopian%20cyberpunk%20city%20at%20night%20with%20neon%20holographic%20sky%20and%20dramatic%20clouds%2C%20dramatic%20movie%20poster%2C%20magenta%20blue%20tones&image_size=landscape_16_9',
    desc: '本地视频：《反乌托邦 Pt.2》亚细亚旷世主题 MV（原生播放器模式）。',
    quality: '本地高清',
    tags: ['本地视频', 'MV', '反乌托邦'],
    src: localFile('video_《反乌托邦Pt.2》【亚细亚旷世..._0.mp4'),
  },
  {
    id: 'movie-big-buck-bunny',
    title: '大雄兔 Big Buck Bunny',
    cover: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=3d%20cartoon%20rabbit%20in%20sunny%20green%20forest%2C%20animated%20movie%20poster%2C%20blue%20sky%20fluffy%20clouds%2C%20vibrant%20colors%2C%20cinematic%20lighting&image_size=landscape_16_9',
    desc: 'Blender 基金会 2008 年开源动画：大耳兔反击三只调皮小兔子的爆笑复仇记，全片 10 分 34 秒（B 站嵌入模式）。',
    duration: '10:34',
    quality: '1080P',
    tags: ['动画短片', '开源电影', '喜剧'],
    embedUrl: 'https://player.bilibili.com/player.html?bvid=BV1Fb4111732&page=1&autoplay=0&danmaku=1&high_quality=1',
  },
  {
    id: 'movie-sintel',
    title: '辛特尔 Sintel',
    cover: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=brave%20young%20girl%20with%20small%20dragon%2C%20epic%20fantasy%20animated%20movie%20poster%2C%20snowy%20mountains%2C%20dramatic%20sunset%2C%20cinematic&image_size=landscape_16_9',
    desc: 'Blender 基金会第三部开源电影：少女孤身跋山涉水，只为寻回失散的小飞龙，画面质感媲美商业动画（B 站嵌入模式）。',
    duration: '14:48',
    quality: '高清',
    tags: ['奇幻', '开源电影', '冒险'],
    embedUrl: 'https://player.bilibili.com/player.html?bvid=BV1iW411j7bn&page=1&autoplay=0&danmaku=1&high_quality=1',
  },
];

// 【AURA Fix-20250830】defineProps/withDefaults 编译期 hoist 限制：
// 默认值不能引用 script setup 内部的局部 defaultPlaylist。改为空数组默认 + computed 回退。
const props = withDefaults(
  defineProps<{
    playlist?: MovieItem[];
    initialId?: string;
  }>(),
  { playlist: () => [], initialId: '' },
);
// 最终使用的片单
const finalPlaylist = computed<MovieItem[]>(
  () => (props.playlist && props.playlist.length > 0 ? props.playlist : defaultPlaylist),
);

// 当前播放索引（基于 finalPlaylist 查找 initialId，保证即使不传 props.playlist 也能定位到内置片单）
const currentIndex = ref(0);
// 使用 watch 首次同步 + 后续响应式（比 ref(()=>{}) 更明确，避免 factory 时机歧义）
const syncInitialIndex = () => {
  if (props.initialId) {
    const idx = finalPlaylist.value.findIndex((m) => m.id === props.initialId);
    if (idx !== -1) {
      currentIndex.value = idx;
      return;
    }
  }
  currentIndex.value = 0;
};
let didInit = false;
watch(
  () => [finalPlaylist.value, props.initialId] as const,
  () => {
    if (!didInit || !props.initialId) {
      syncInitialIndex();
      didInit = true;
    }
  },
  { immediate: true },
);

// 切片后重置播放器（如果用 iframe 则需要重新渲染以让浏览器重新加载 URL）
const iframeKey = ref(0);
watch(currentIndex, () => { iframeKey.value++; });

const current = computed(() => finalPlaylist.value[currentIndex.value] || null);
const isEmbed = computed(() => !!current.value?.embedUrl);

// —— 原生 video 控制 ——
const videoRef = ref<HTMLVideoElement | null>(null);
const isPlaying = ref(false);
const currentTime = ref(0);
const duration = ref(0);
const volume = ref(0.9);
const isMuted = ref(false);
const isFullscreen = ref(false);

const formatTime = (s: number) => {
  if (!isFinite(s) || s < 0) return '0:00';
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60).toString().padStart(2, '0');
  return h > 0 ? `${h}:${m.toString().padStart(2, '0')}:${sec}` : `${m}:${sec}`;
};

const progress = computed(() => duration.value ? (currentTime.value / duration.value) * 100 : 0);

const togglePlay = () => {
  const v = videoRef.value;
  if (!v) return;
  if (v.paused) v.play().catch(() => {});
  else v.pause();
};
const seek = (e: Event) => {
  const v = videoRef.value;
  if (!v || !duration.value) return;
  const p = Number((e.target as HTMLInputElement).value) / 100;
  v.currentTime = duration.value * p;
  currentTime.value = v.currentTime;
};
const changeVolume = (e: Event) => {
  const v = Number((e.target as HTMLInputElement).value) / 100;
  volume.value = v;
  if (videoRef.value) {
    videoRef.value.volume = v;
    videoRef.value.muted = v === 0;
  }
  isMuted.value = v === 0;
};
const toggleMute = () => {
  if (!videoRef.value) return;
  isMuted.value = !isMuted.value;
  videoRef.value.muted = isMuted.value;
  if (!isMuted.value && volume.value === 0) { volume.value = 0.6; videoRef.value.volume = 0.6; }
};
const toggleFullscreen = async () => {
  if (typeof document === 'undefined') return; // SSR 安全守卫
  const container = document.querySelector<HTMLElement>('.screen-wrap');
  if (!container) return;
  if (!document.fullscreenElement) {
    await container.requestFullscreen?.();
    isFullscreen.value = true;
  } else {
    await document.exitFullscreen?.();
    isFullscreen.value = false;
  }
};

// fullscreenchange 监听仅在客户端挂载时添加（SSR 环境没有 document）
let onFsChange: (() => void) | null = null;
onMounted(() => {
  onFsChange = () => { isFullscreen.value = !!document.fullscreenElement; };
  document.addEventListener('fullscreenchange', onFsChange);
});
onBeforeUnmount(() => {
  if (onFsChange && typeof document !== 'undefined') {
    document.removeEventListener('fullscreenchange', onFsChange);
    onFsChange = null;
  }
});

const skip = (delta: number) => {
  const v = videoRef.value;
  if (!v) return;
  v.currentTime = Math.min(Math.max(0, v.currentTime + delta), v.duration || 0);
};

const onTimeUpdate = () => { currentTime.value = videoRef.value?.currentTime || 0; };
const onLoadedMeta = () => { duration.value = videoRef.value?.duration || 0; videoRef.value!.volume = volume.value; };
const onPlay = () => (isPlaying.value = true);
const onPause = () => (isPlaying.value = false);

// 切歌
const selectMovie = (i: number) => {
  currentIndex.value = i;
  // 切片后，若使用原生 video 模式，暂停前一个状态（下一帧的新 video 元素重新渲染时从 meta 加载）
  isPlaying.value = false;
  currentTime.value = 0;
  duration.value = 0;
};
const prev = () => {
  currentIndex.value = Math.max(0, currentIndex.value - 1);
  selectMovie(currentIndex.value);
};
const next = () => {
  currentIndex.value = Math.min(finalPlaylist.value.length - 1, currentIndex.value + 1);
  selectMovie(currentIndex.value);
};

onBeforeUnmount(() => { videoRef.value?.pause(); });
</script>

<template>
  <div class="movie-player">
    <!-- 播放器屏幕 -->
    <div class="screen-wrap">
      <!-- 模式 A：直链原生 video -->
      <video
        v-if="isEmbed === false && current?.src"
        ref="videoRef"
        class="screen video-native"
        :src="current.src"
        :poster="current.cover"
        preload="metadata"
        playsinline
        @timeupdate="onTimeUpdate"
        @loadedmetadata="onLoadedMeta"
        @play="onPlay"
        @pause="onPause"
        @click="togglePlay"
      />

      <!-- 模式 B：iframe 外链（B 站等） -->
      <iframe
        v-else-if="isEmbed && current?.embedUrl"
        :key="iframeKey"
        class="screen video-iframe"
        :src="current.embedUrl"
        :title="current.title"
        frameborder="0"
        allowfullscreen="true"
        allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
        scrolling="no"
      />

      <!-- 兜底 -->
      <div v-else class="screen placeholder-screen">
        <div>🎬 暂无可播放资源</div>
        <p style="font-size:13px;opacity:0.7;margin-top:8px;">请在片单中配置 src 或 embedUrl</p>
      </div>

      <!-- 原生 video 的自定义控件条（仅直链模式显示） -->
      <div v-if="isEmbed === false" class="ctrl-bar">
        <div class="ctrl-top">
          <input
            class="progress" type="range" min="0" max="100" step="0.1"
            :value="progress" @input="seek"
          />
        </div>
        <div class="ctrl-row">
          <button class="c-btn" @click="prev" title="上一部">⏮</button>
          <button class="c-btn main" @click="togglePlay" :title="isPlaying ? '暂停' : '播放'">
            {{ isPlaying ? '⏸' : '▶' }}
          </button>
          <button class="c-btn" @click="next" title="下一部">⏭</button>
          <button class="c-btn" @click="skip(-10)" title="后退10秒">⏪</button>
          <button class="c-btn" @click="skip(10)" title="前进10秒">⏩</button>
          <span class="time-label">{{ formatTime(currentTime) }} / {{ formatTime(duration) }}</span>

          <div class="spacer"></div>

          <button class="c-btn" @click="toggleMute" :title="isMuted ? '取消静音' : '静音'">
            {{ isMuted ? '🔇' : '🔊' }}
          </button>
          <input
            class="volume" type="range" min="0" max="100"
            :value="(isMuted ? 0 : volume) * 100" @input="changeVolume"
          />
          <button class="c-btn" @click="toggleFullscreen" :title="isFullscreen ? '退出全屏' : '全屏'">
            {{ isFullscreen ? '🗗' : '⛶' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 当前影片信息 -->
    <div class="info-card">
      <div class="info-head">
        <h2>{{ current?.title }}</h2>
        <div class="badges">
          <span v-if="current?.quality" class="badge quality">{{ current.quality }}</span>
          <span v-if="current?.duration" class="badge dur">⏱ {{ current.duration }}</span>
          <span v-if="isEmbed" class="badge embed-type">B 站播放</span>
          <span v-else class="badge embed-type">直链播放</span>
        </div>
      </div>
      <p class="desc">{{ current?.desc }}</p>
      <div v-if="current?.tags?.length" class="tags">
        <span v-for="t in current.tags" :key="t" class="tag">{{ t }}</span>
      </div>
    </div>

    <!-- 片单 -->
    <div class="playlist-card">
      <h3 class="pl-title">🎬 片单（{{ finalPlaylist.length }}）</h3>
      <div class="pl-grid">
        <div
          v-for="(m, i) in finalPlaylist"
          :key="m.id"
          class="pl-item"
          :class="{ active: i === currentIndex }"
          @click="selectMovie(i)"
        >
          <div class="pl-cover">
            <img v-if="m.cover" :src="m.cover" :alt="m.title" />
            <div v-else class="no-cover">🎬</div>
            <div v-if="m.duration" class="pl-dur">{{ m.duration }}</div>
            <div v-if="i === currentIndex" class="pl-playing-overlay">
              {{ isPlaying ? '播放中' : '已选中' }}
            </div>
          </div>
          <div class="pl-meta">
            <h4>{{ m.title }}</h4>
            <p>{{ m.desc }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.movie-player {
  max-width: 1100px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.screen-wrap {
  position: relative;
  background: #000;
  border-radius: 16px;
  overflow: hidden;
  aspect-ratio: 16 / 9;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.25);
}
.screen {
  width: 100%; height: 100%;
  display: block;
  background: #000;
  border: none;
}
.placeholder-screen {
  display: flex; align-items: center; justify-content: center;
  flex-direction: column;
  color: rgba(255, 255, 255, 0.7);
  font-size: 20px;
}

/* 自定义控件条（仅原生 video 模式） */
.ctrl-bar {
  position: absolute; left: 0; right: 0; bottom: 0;
  padding: 10px 18px 14px;
  background: linear-gradient(180deg, transparent, rgba(0,0,0,0.75));
  display: flex; flex-direction: column; gap: 8px;
  opacity: 0; transition: opacity 0.25s;
  pointer-events: none;
}
.screen-wrap:hover .ctrl-bar,
.screen-wrap:focus-within .ctrl-bar {
  opacity: 1; pointer-events: auto;
}

.ctrl-row { display: flex; align-items: center; gap: 10px; color: #fff; }
.c-btn {
  width: 36px; height: 36px; border-radius: 50%;
  background: rgba(255, 255, 255, 0.15);
  border: none; color: #fff; cursor: pointer;
  display: inline-flex; align-items: center; justify-content: center;
  font-size: 14px; transition: all 0.2s;
  backdrop-filter: blur(4px);
}
.c-btn:hover { background: rgba(255, 255, 255, 0.3); transform: scale(1.08); }
.c-btn.main { width: 44px; height: 44px; font-size: 16px; background: rgba(99, 102, 241, 0.7); }
.c-btn.main:hover { background: rgba(124, 58, 237, 0.85); }

.time-label { font-size: 12px; font-variant-numeric: tabular-nums; color: rgba(255,255,255,0.85); min-width: 110px; }
.spacer { flex: 1; }

/* 进度条 & 音量 */
.progress { flex: 1; }
.volume { width: 90px; }
input[type="range"] {
  -webkit-appearance: none; appearance: none;
  background: transparent; cursor: pointer; height: 5px;
}
input[type="range"]::-webkit-slider-runnable-track {
  height: 5px; border-radius: 3px;
  background: rgba(255, 255, 255, 0.3);
}
input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 13px; height: 13px; border-radius: 50%;
  background: #fff; margin-top: -4px;
  box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.7);
}
input[type="range"]::-moz-range-track {
  height: 5px; border-radius: 3px; background: rgba(255,255,255,0.3);
}
input[type="range"]::-moz-range-thumb {
  width: 13px; height: 13px; border-radius: 50%;
  background: #fff; border: 2px solid #6366f1;
}

/* 信息卡 */
.info-card {
  background: #fff; border-radius: 16px; padding: 22px 26px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05);
  border: 1px solid #eef2ff;
}
.info-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 10px; flex-wrap: wrap; }
.info-head h2 { margin: 0; font-size: 22px; color: #111827; }
.badges { display: flex; gap: 8px; flex-wrap: wrap; }
.badge {
  font-size: 12px; padding: 3px 10px; border-radius: 999px;
  background: #eef2ff; color: #4f46e5; font-weight: 500;
}
.badge.quality { background: #fef3c7; color: #b45309; }
.badge.dur { background: #ecfdf5; color: #047857; }
.badge.embed-type { background: #faf5ff; color: #7c3aed; }

.desc { margin: 0; font-size: 14px; color: #4b5563; line-height: 1.8; }
.tags { margin-top: 12px; display: flex; gap: 6px; flex-wrap: wrap; }
.tag { font-size: 12px; padding: 2px 10px; border-radius: 4px; background: #f3f4f6; color: #374151; }

/* 片单 */
.playlist-card {
  background: #fff; border-radius: 16px; padding: 22px 26px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05);
  border: 1px solid #eef2ff;
}
.pl-title { margin: 0 0 16px; font-size: 16px; color: #111827; }
.pl-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 14px; }
.pl-item {
  display: flex; gap: 12px; padding: 10px; border-radius: 12px;
  cursor: pointer; border: 2px solid transparent;
  transition: all 0.2s;
}
.pl-item:hover { background: #f9fafb; border-color: #e5e7eb; }
.pl-item.active { background: #eef2ff; border-color: #c7d2fe; }
.pl-cover {
  position: relative; width: 120px; flex-shrink: 0;
  aspect-ratio: 16 / 9; border-radius: 8px; overflow: hidden;
  background: linear-gradient(135deg, #1e3a8a, #4c1d95);
}
.pl-cover img { width: 100%; height: 100%; object-fit: cover; }
.pl-cover .no-cover {
  width: 100%; height: 100%;
  display: flex; align-items: center; justify-content: center;
  color: rgba(255, 255, 255, 0.6); font-size: 28px;
}
.pl-dur {
  position: absolute; right: 6px; bottom: 6px;
  background: rgba(0,0,0,0.7); color: #fff;
  font-size: 10px; padding: 1px 6px; border-radius: 3px;
}
.pl-playing-overlay {
  position: absolute; inset: 0;
  background: rgba(79, 70, 229, 0.55); color: #fff;
  display: flex; align-items: center; justify-content: center;
  font-size: 12px; font-weight: 600;
}
.pl-meta { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
.pl-meta h4 { margin: 0; font-size: 14px; color: #111827; line-height: 1.3;
  overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.pl-meta p { margin: 0; font-size: 12px; color: #6b7280; line-height: 1.5;
  overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }

@media (max-width: 680px) {
  .info-card { padding: 16px 18px; }
  .playlist-card { padding: 16px 18px; }
  .pl-grid { grid-template-columns: 1fr; }
  .time-label { min-width: 80px; }
  .volume { display: none; }
}
</style>
