<template>
  <div class="google-ad-container">
    <ins
      v-if="showAd && mounted"
      class="adsbygoogle"
      :style="adStyle"
      :data-ad-format="adFormat"
      :data-ad-layout-key="adLayoutKey"
      :data-ad-client="adClient"
      :data-ad-slot="adSlot"
    ></ins>
    <div v-else-if="debug" class="ad-placeholder">
      广告位占位: {{ adSlot }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, computed, nextTick } from 'vue';

// 广告配置属性
interface Props {
  adClient?: string;
  adSlot: string;
  adFormat?: string;
  adLayoutKey?: string;
  width?: string | number;
  height?: string | number;
  style?: Record<string, string>;
  debug?: boolean;
  display?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  adClient: 'ca-pub-2897720906666216', // 默认客户端ID
  adFormat: 'fluid',
  adLayoutKey: '-ii+7-14-2d+99',
  width: undefined,
  height: undefined,
  style: () => ({}),
  debug: false,
  display: true
});

// 响应式数据
const mounted = ref(false);
const showAd = ref(props.display);
// 添加重试计数相关变量
const retryCount = ref(0);
const MAX_RETRY_COUNT = 5; // 最大重试次数

// 计算广告样式
const adStyle = computed(() => {
  const baseStyle: Record<string, string> = {
    display: showAd.value ? 'block' : 'none'
  };
  
  // 添加尺寸属性
  if (props.width) {
    baseStyle.width = String(props.width);
  }
  if (props.height) {
    baseStyle.height = String(props.height);
  }
  
  // 合并自定义样式
  return { ...baseStyle, ...props.style };
});

// 加载Google AdSense脚本
const loadGoogleAdScript = () => {
  if (typeof window !== 'undefined') {
    // 检查脚本是否已经加载
    if (!window.adsbygoogle) {
      const script = document.createElement('script');
      script.async = true;
      script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${props.adClient}`;
      script.crossOrigin = 'anonymous';
      document.head.appendChild(script);
    }
  }
};

// 初始化广告单元
const initAds = () => {
  if (typeof window !== 'undefined' && window.adsbygoogle && showAd.value && mounted.value) {
    try {
      // 确保容器有实际宽度再初始化广告
      const container = document.querySelector(`ins[data-ad-slot="${props.adSlot}"]`);
      if (container) {
        // 检查容器宽度
        const containerWidth = container.clientWidth;
        
        if (containerWidth > 0) {
          // 创建一个新的广告实例
          (window.adsbygoogle = window.adsbygoogle || []).push({});
        } else {
          // 容器宽度为0，延迟重试
          if (props.debug) {
            console.log('广告容器宽度为0，延迟重试初始化');
          }
          
          // 避免无限重试，设置最大重试次数
          if (retryCount.value < MAX_RETRY_COUNT) {
            retryCount.value++;
            // 指数退避重试策略
            const delay = 300 * Math.pow(2, retryCount.value - 1);
            setTimeout(() => {
              initAds();
            }, delay);
          } else if (props.debug) {
            console.warn(`广告初始化已达到最大重试次数(${MAX_RETRY_COUNT})，放弃重试`);
          }
        }
      } else if (props.debug) {
        console.warn('找不到广告容器元素');
      }
    } catch (error) {
      if (props.debug) {
        console.warn('广告初始化失败:', error);
      }
      // 出错时也尝试重试
      if (retryCount.value < MAX_RETRY_COUNT) {
        retryCount.value++;
        setTimeout(() => {
          initAds();
        }, 500);
      }
    }
  }
};

// 监听display属性变化
watch(() => props.display, (newValue) => {
  showAd.value = newValue;
  // 如果开启了显示，重新初始化广告
  if (newValue && mounted.value) {
    nextTick(() => {
      loadGoogleAdScript();
      // 延迟一点时间确保DOM已更新
      setTimeout(() => {
        initAds();
      }, 100);
    });
  }
});

// 组件挂载时
onMounted(() => {
  if (typeof window !== 'undefined' && showAd.value) {
    // 只使用全局的广告脚本加载
    // loadGoogleAdScript(); // 移除组件内部的脚本加载，避免冲突
    // 标记为已挂载
    mounted.value = true;
    // 等待DOM更新后初始化广告
    nextTick(() => {
      setTimeout(() => {
        initAds();
      }, 500); // 增加延迟，确保页面完全渲染
    });
  }
});
</script>

<style scoped>
.google-ad-container {
  margin: 1.5rem 0;
  width: 100%;
  /* 确保容器始终有最小宽度，避免宽度为0的错误 */
  min-width: 100px;
  display: flex;
  justify-content: center;
  align-items: center;
  /* 添加背景色占位，避免闪烁 */
  background-color: rgba(240, 240, 240, 0.2);
  min-height: 60px;
}

.adsbygoogle {
  display: block !important;
  width: 100%;
  min-width: 100px !important;
  min-height: 60px !important;
}

/* 调试占位样式 */
.ad-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f5f5f5;
  border: 1px dashed #ccc;
  padding: 1rem;
  text-align: center;
  font-size: 0.9rem;
  color: #666;
  min-height: 80px;
  width: 100%;
}
</style>