<script setup lang="ts">
import { ref, computed, watch, onBeforeUnmount } from 'vue';

/**
 * 站内音乐播放器组件
 * 使用方式：<MusicPlayer />，或传自定义歌单：
 *   <MusicPlayer :playlist="[{title:'', artist:'', cover:'', src:'', lrc:''}]" />
 *
 * 如果不传 playlist，默认使用下方内置测试歌单；你可以把本地音乐放到
 * docs/public/music/ 目录，然后直接写 /music/xxx.mp3 作为 src。
 */

interface Track {
  title: string;
  artist: string;
  cover: string;
  src: string;
  lrc?: string; // 可选：歌词（简单 LRC 或纯文本）
}

// —— 内置歌单：先放本地资源，再放网络测试曲 ——
// 本地音乐放在 docs/public/music/ 下，访问路径为 /music/文件名。
// 注意：文件名含 #、《、》等特殊字符时需要 encodeURIComponent，否则浏览器会把 # 当 hash。
const defaultPlaylist: Track[] = [
  {
    title: '本地 · 静音(Silent)',
    artist: '本地音频',
    cover: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=minimalist%20audio%20waveform%20on%20dark%20blue%20purple%20gradient%2C%20album%20cover%2C%20simple%20clean%20design&image_size=square',
    src: '/music/slient.wav',
  },
  {
    title: 'Big Buck Bunny Theme',
    artist: 'Blender Foundation (BGM)',
    cover: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=cartoon%20giant%20bunny%20in%20green%20forest%20with%20musical%20notes%20floating%2C%20album%20cover%20art%2C%20vibrant%20pastel%20colors&image_size=square',
    // 测试音频：SoundHelix 公共示例音乐（CC BY-NC-SA）
    src: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
  },
  {
    title: 'Sintel Trailer Theme',
    artist: 'Jan Morgenstern (BGM)',
    cover: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=fantasy%20girl%20with%20baby%20dragon%20album%20cover%2C%20epic%20mountains%20sunset%2C%20cinematic%20purple%20orange%20gradient&image_size=square',
    src: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
  },
  {
    title: 'Spring Theme',
    artist: 'Blender Studio (BGM)',
    cover: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=spring%20forest%20cherry%20blossoms%20album%20cover%20art%2C%20soft%20pink%20pastel%2C%20dreamy%20cute%20illustration&image_size=square',
    src: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
  },
  {
    title: 'Think Python Reading',
    artist: 'Lo-fi Study Beats',
    cover: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=lofi%20study%20beats%20album%20cover%2C%20cozy%20desk%20with%20book%20and%20coffee%2C%20warm%20beige%20brown%20toned&image_size=square',
    src: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3',
  },
];

// 【AURA Fix-20250830】defineProps/withDefaults 在编译期会被 hoist 到 setup() 之外，
// 默认值对象不能引用 script setup 内部声明的局部变量（这里的 defaultPlaylist）。
// 解决方案：默认值改为空数组，组件内再通过 computed 回退到 defaultPlaylist。
const props = withDefaults(
  defineProps<{ playlist?: Track[] }>(),
  { playlist: () => [] },
);
// 最终使用的歌单：外部传入了就用外部的，否则用内置 defaultPlaylist
const finalPlaylist = computed<Track[]>(
  () => (props.playlist && props.playlist.length > 0 ? props.playlist : defaultPlaylist),
);

const audioRef = ref<HTMLAudioElement | null>(null);
const currentIndex = ref(0);
const isPlaying = ref(false);
const currentTime = ref(0);
const duration = ref(0);
const volume = ref(0.7);
const playMode = ref<'loop' | 'list' | 'single'>('list'); // 列表循环 / 顺序 / 单曲
const showPlaylist = ref(true);

const current = computed(() => finalPlaylist.value[currentIndex.value] || null);
const progress = computed(() =>
  duration.value ? (currentTime.value / duration.value) * 100 : 0,
);

const formatTime = (s: number) => {
  if (!isFinite(s) || s < 0) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60).toString().padStart(2, '0');
  return `${m}:${sec}`;
};

const play = () => audioRef.value?.play().catch(() => { isPlaying.value = false; });
const pause = () => audioRef.value?.pause();
const togglePlay = () => (isPlaying.value ? pause() : play());

const prev = () => {
  currentIndex.value =
    (currentIndex.value - 1 + finalPlaylist.value.length) % finalPlaylist.value.length;
};

const next = () => {
  const len = finalPlaylist.value.length;
  if (playMode.value === 'single') {
    audioRef.value!.currentTime = 0;
    play();
    return;
  }
  if (playMode.value === 'list' && currentIndex.value === len - 1) {
    // 顺序播放：最后一首就停
    currentIndex.value = len - 1;
    pause();
    return;
  }
  currentIndex.value = (currentIndex.value + 1) % len;
};

const selectTrack = (i: number) => {
  currentIndex.value = i;
  // 切歌后自动播放
  setTimeout(() => play(), 0);
};

const onTimeUpdate = () => {
  currentTime.value = audioRef.value?.currentTime || 0;
};
const onLoadedMeta = () => {
  duration.value = audioRef.value?.duration || 0;
};
const onEnded = () => {
  if (playMode.value === 'single') {
    audioRef.value!.currentTime = 0;
    play();
  } else {
    next();
  }
};
const onPlay = () => (isPlaying.value = true);
const onPause = () => (isPlaying.value = false);

const seek = (e: Event) => {
  const v = Number((e.target as HTMLInputElement).value);
  if (audioRef.value && duration.value) {
    audioRef.value.currentTime = (v / 100) * duration.value;
  }
};

const changeVolume = (e: Event) => {
  const v = Number((e.target as HTMLInputElement).value) / 100;
  volume.value = v;
  if (audioRef.value) audioRef.value.volume = v;
};

const toggleMode = () => {
  playMode.value = playMode.value === 'list' ? 'loop' : playMode.value === 'loop' ? 'single' : 'list';
};

const modeIcon = computed(() =>
  playMode.value === 'list' ? '🔁' : playMode.value === 'loop' ? '🔂' : '🔊',
);
const modeLabel = computed(() =>
  playMode.value === 'list' ? '顺序播放' : playMode.value === 'loop' ? '列表循环' : '单曲循环',
);

watch(volume, (v) => {
  if (audioRef.value) audioRef.value.volume = v;
});

onBeforeUnmount(() => {
  pause();
});
</script>

<template>
  <div class="music-player">
    <!-- 播放器主体 -->
    <div class="player-card">
      <!-- 封面 -->
      <div class="cover-wrap">
        <img
          v-if="current?.cover"
          :src="current.cover"
          :alt="current.title"
          class="cover"
          :class="{ spin: isPlaying }"
        />
        <div v-else class="cover placeholder-cover">
          <span>🎵</span>
        </div>
      </div>

      <!-- 信息 & 控制 -->
      <div class="info-wrap">
        <div class="track-meta">
          <h3 class="track-title">{{ current?.title || '暂无曲目' }}</h3>
          <p class="track-artist">{{ current?.artist || '-' }}</p>
        </div>

        <!-- 进度条 -->
        <div class="progress-wrap">
          <span class="time">{{ formatTime(currentTime) }}</span>
          <input
            class="progress"
            type="range"
            min="0"
            max="100"
            step="0.1"
            :value="progress"
            @input="seek"
          />
          <span class="time">{{ formatTime(duration) }}</span>
        </div>

        <!-- 控制按钮 -->
        <div class="controls">
          <button class="ctrl-btn" :title="modeLabel" @click="toggleMode">
            {{ modeIcon }}
          </button>
          <button class="ctrl-btn" title="上一首" @click="prev">⏮</button>
          <button class="ctrl-btn play-btn" :title="isPlaying ? '暂停' : '播放'" @click="togglePlay">
            {{ isPlaying ? '⏸' : '▶' }}
          </button>
          <button class="ctrl-btn" title="下一首" @click="next">⏭</button>
          <button class="ctrl-btn" :title="'音量：' + Math.round(volume * 100) + '%'">🔊</button>
        </div>

        <!-- 音量 -->
        <div class="volume-wrap">
          <input
            class="volume"
            type="range"
            min="0"
            max="100"
            :value="volume * 100"
            @input="changeVolume"
          />
        </div>
      </div>
    </div>

    <!-- 歌单 -->
    <div class="playlist-card">
      <div class="playlist-head">
        <span>📋 歌单（{{ finalPlaylist.length }}）</span>
        <button class="mini-btn" @click="showPlaylist = !showPlaylist">
          {{ showPlaylist ? '收起' : '展开' }}
        </button>
      </div>
      <transition name="slide">
        <ul v-if="showPlaylist" class="playlist">
          <li
            v-for="(t, i) in finalPlaylist"
            :key="t.src"
            class="playlist-item"
            :class="{ active: i === currentIndex }"
            @click="selectTrack(i)"
          >
            <span class="idx">{{ (i + 1).toString().padStart(2, '0') }}</span>
            <div class="p-info">
              <p class="p-title">{{ t.title }}</p>
              <p class="p-artist">{{ t.artist }}</p>
            </div>
            <span v-if="i === currentIndex && isPlaying" class="playing-tag">播放中</span>
          </li>
        </ul>
      </transition>
    </div>

    <!-- 原生 audio 元素 -->
    <audio
      ref="audioRef"
      :src="current?.src"
      :volume="volume"
      preload="metadata"
      @timeupdate="onTimeUpdate"
      @loadedmetadata="onLoadedMeta"
      @ended="onEnded"
      @play="onPlay"
      @pause="onPause"
    />
  </div>
</template>

<style scoped>
.music-player {
  max-width: 880px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.player-card {
  background: #fff;
  border-radius: 20px;
  padding: 28px;
  display: flex;
  gap: 28px;
  align-items: center;
  box-shadow: 0 10px 30px rgba(79, 70, 229, 0.08);
  border: 1px solid #eef2ff;
}

.cover-wrap {
  flex-shrink: 0;
  width: 180px;
  height: 180px;
}

.cover {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
}

.cover.spin {
  animation: spin 16s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.placeholder-cover {
  background: linear-gradient(135deg, #6366f1, #ec4899);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 60px;
}

.info-wrap {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.track-meta .track-title {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  color: #1f2937;
}
.track-meta .track-artist {
  margin: 4px 0 0;
  font-size: 13px;
  color: #6b7280;
}

.progress-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
}
.time {
  font-size: 12px;
  color: #6b7280;
  min-width: 42px;
  text-align: center;
}

.controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
}

.ctrl-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: none;
  background: #eef2ff;
  color: #4f46e5;
  font-size: 16px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}
.ctrl-btn:hover { background: #e0e7ff; transform: scale(1.05); }
.play-btn {
  width: 56px; height: 56px;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: #fff;
  font-size: 20px;
  box-shadow: 0 6px 18px rgba(99, 102, 241, 0.35);
}
.play-btn:hover { background: linear-gradient(135deg, #4f46e5, #7c3aed); }

.volume-wrap { display: flex; align-items: center; gap: 10px; }
.volume { width: 140px; }

/* 通用 range 样式 */
input[type="range"] {
  flex: 1;
  -webkit-appearance: none;
  appearance: none;
  background: transparent;
  cursor: pointer;
  height: 6px;
}
input[type="range"]::-webkit-slider-runnable-track {
  height: 6px;
  border-radius: 3px;
  background: #e5e7eb;
}
input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  height: 14px; width: 14px;
  border-radius: 50%;
  background: #6366f1;
  margin-top: -4px;
  box-shadow: 0 2px 6px rgba(99, 102, 241, 0.4);
  transition: transform 0.15s;
}
input[type="range"]::-webkit-slider-thumb:hover { transform: scale(1.2); }
input[type="range"]::-moz-range-track {
  height: 6px; border-radius: 3px; background: #e5e7eb;
}
input[type="range"]::-moz-range-thumb {
  height: 14px; width: 14px; border-radius: 50%;
  background: #6366f1; border: none;
  box-shadow: 0 2px 6px rgba(99, 102, 241, 0.4);
}

.playlist-card {
  background: #fff;
  border-radius: 20px;
  padding: 18px 24px;
  box-shadow: 0 10px 30px rgba(79, 70, 229, 0.08);
  border: 1px solid #eef2ff;
}
.playlist-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
  color: #1f2937;
}
.mini-btn {
  border: 1px solid #e0e7ff;
  background: #eef2ff;
  color: #4f46e5;
  border-radius: 999px;
  padding: 3px 12px;
  font-size: 12px;
  cursor: pointer;
}
.playlist { list-style: none; padding: 0; margin: 12px 0 0; display: flex; flex-direction: column; gap: 6px; }
.playlist-item {
  display: flex; align-items: center; gap: 12px;
  padding: 10px 12px; border-radius: 10px;
  cursor: pointer; transition: background 0.2s;
}
.playlist-item:hover { background: #f5f3ff; }
.playlist-item.active { background: linear-gradient(90deg, #eef2ff, #fdf4ff); font-weight: 500; }
.idx { color: #9ca3af; font-size: 13px; min-width: 28px; font-variant-numeric: tabular-nums; }
.playlist-item.active .idx { color: #4f46e5; font-weight: 600; }
.p-info { flex: 1; min-width: 0; }
.p-info p { margin: 0; line-height: 1.4; }
.p-title { font-size: 14px; color: #1f2937; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.p-artist { font-size: 12px; color: #6b7280; margin-top: 2px !important; }
.playing-tag { font-size: 11px; color: #ec4899; background: #fdf2f8; border-radius: 4px; padding: 2px 8px; }

.slide-enter-active, .slide-leave-active { transition: all 0.25s ease; max-height: 1000px; overflow: hidden; }
.slide-enter-from, .slide-leave-to { max-height: 0; opacity: 0; }

@media (max-width: 680px) {
  .player-card { flex-direction: column; padding: 20px; }
  .cover-wrap { width: 140px; height: 140px; }
  .info-wrap { width: 100%; }
  .playlist-card { padding: 14px 18px; }
}
</style>
