<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue';

interface Props {
  adClient?: string;
  adSlot?: string;
  delay?: number;      // 延迟弹出时间（毫秒），默认 3000
  frequency?: number;  // 显示频率：0=每次访问都显示，N=每天最多 N 次
  closeable?: boolean; // 是否可关闭
}

const props = withDefaults(defineProps<Props>(), {
  adClient: 'ca-pub-2897720906666216',
  adSlot: '4281684534',
  delay: 3000,
  frequency: 1,
  closeable: true,
});

const visible = ref(false);
const adScriptLoaded = ref(false);
let timer: ReturnType<typeof setTimeout> | null = null;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
let retryCount = 0;
const MAX_RETRY_COUNT = 5;

const STORAGE_KEY = 'tools-ad-popup-date';

// 判断今天是否已展示过
const hasShownToday = (): boolean => {
  if (props.frequency === 0) return false;
  try {
    const today = new Date().toDateString();
    return localStorage.getItem(STORAGE_KEY) === today;
  } catch {
    return false;
  }
};

const markShownToday = (): void => {
  if (props.frequency === 0) return;
  try {
    localStorage.setItem(STORAGE_KEY, new Date().toDateString());
  } catch {
    /* ignore */
  }
};

// 加载广告脚本（与 NavPage.vue 一致：脚本加载完成后再渲染广告单元）
const loadAdScript = () => {
  if (typeof window === 'undefined' || adScriptLoaded.value) return;
  if (window.adsbygoogle) {
    adScriptLoaded.value = true;
    return;
  }
  try {
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${props.adClient}`;
    script.crossOrigin = 'anonymous';
    script.onload = () => {
      adScriptLoaded.value = true;
      setTimeout(() => initAdsIfVisible(), 500);
    };
    document.head.appendChild(script);
  } catch (error) {
    console.error('Failed to load ad script:', error);
  }
};

// 初始化广告单元（检查容器宽度，带重试机制，与 NavPage.vue 一致）
const initAdsIfVisible = () => {
  if (typeof window === 'undefined' || !window.adsbygoogle || !visible.value) return;
  try {
    const container = document.querySelector(`ins[data-ad-slot="${props.adSlot}"]`);
    if (container && container.clientWidth > 0) {
      window.adsbygoogle = window.adsbygoogle || [];
      window.adsbygoogle.push({});
      retryCount = 0;
    } else if (retryCount < MAX_RETRY_COUNT) {
      retryCount++;
      const delay = 500 * Math.pow(2, retryCount - 1);
      retryTimer = setTimeout(initAdsIfVisible, delay);
    }
  } catch (error) {
    console.error('初始化广告时出错:', error);
    if (retryCount < MAX_RETRY_COUNT) {
      retryCount++;
      retryTimer = setTimeout(initAdsIfVisible, 1000);
    }
  }
};

const open = (): void => {
  visible.value = true;
  nextTick(() => {
    loadAdScript();
  });
};

const close = (): void => {
  visible.value = false;
  markShownToday();
};

onMounted(() => {
  if (typeof window === 'undefined') return;
  if (hasShownToday()) return;
  timer = setTimeout(open, props.delay);
});

onBeforeUnmount(() => {
  if (timer) clearTimeout(timer);
  if (retryTimer) clearTimeout(retryTimer);
});
</script>

<template>
  <Teleport to="body">
    <Transition name="pop">
      <div v-if="visible" class="ad-popup-mask" @click.self="close">
        <div class="ad-popup">
          <button
            v-if="closeable"
            class="ad-popup-close"
            aria-label="关闭广告"
            @click="close"
          >
            ✕
          </button>
          <div class="ad-popup-header">
            <span class="ad-popup-title">🎁 赞助商</span>
            <span class="ad-popup-tag">广告</span>
          </div>
          <div class="ad-popup-body">
            <!-- 广告脚本加载完成后再渲染广告单元 -->
            <ins
              v-if="adScriptLoaded"
              class="adsbygoogle"
              style="display: block"
              :data-ad-client="adClient"
              :data-ad-slot="adSlot"
              data-ad-format="auto"
              data-full-width-responsive="true"
            ></ins>
            <div v-else class="ad-popup-loading">
              <span class="loading-dot"></span>
              <span class="loading-dot"></span>
              <span class="loading-dot"></span>
            </div>
          </div>
          <div class="ad-popup-footer">
            <button class="ad-popup-btn" @click="close">知道了，去逛逛</button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.ad-popup-mask {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(3px);
}

.ad-popup {
  position: relative;
  width: min(520px, 92vw);
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.35);
  overflow: hidden;
}

.ad-popup-close {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.06);
  color: #666;
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  z-index: 2;
}

.ad-popup-close:hover {
  background: rgba(0, 0, 0, 0.15);
  color: #333;
}

.ad-popup-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 16px 0;
}

.ad-popup-title {
  font-size: 14px;
  font-weight: 600;
  color: #374151;
}

.ad-popup-tag {
  font-size: 10px;
  color: #9ca3af;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  padding: 1px 6px;
  letter-spacing: 1px;
}

.ad-popup-body {
  padding: 12px 16px;
  min-height: 150px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.ad-popup-body ins {
  display: block;
  width: 100%;
  min-width: 100px !important;
  min-height: 60px !important;
}

.ad-popup-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 60px;
}

.loading-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #4f46e5;
  animation: dot-bounce 1.2s infinite ease-in-out;
}

.loading-dot:nth-child(2) {
  animation-delay: 0.15s;
}

.loading-dot:nth-child(3) {
  animation-delay: 0.3s;
}

@keyframes dot-bounce {
  0%, 80%, 100% {
    transform: scale(0.6);
    opacity: 0.4;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}

.ad-popup-footer {
  padding: 0 16px 14px;
  text-align: center;
}

.ad-popup-btn {
  width: 100%;
  padding: 9px 0;
  border: none;
  border-radius: 10px;
  background: linear-gradient(135deg, #4f46e5, #7c3aed);
  color: #fff;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: opacity 0.2s ease;
}

.ad-popup-btn:hover {
  opacity: 0.9;
}

/* 过渡动画 */
.pop-enter-active,
.pop-leave-active {
  transition: opacity 0.3s ease;
}

.pop-enter-active .ad-popup,
.pop-leave-active .ad-popup {
  transition: transform 0.3s ease;
}

.pop-enter-from,
.pop-leave-to {
  opacity: 0;
}

.pop-enter-from .ad-popup,
.pop-leave-to .ad-popup {
  transform: translateY(30px) scale(0.95);
}
</style>
