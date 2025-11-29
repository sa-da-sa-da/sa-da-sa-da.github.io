<script setup lang="ts" name="PdfViewer">
import type { PdfViewerEmits, PdfViewerProps } from "./pdfViewer";
import { ref, computed, watch, onMounted } from "vue";
import type { CSSProperties } from "vue";
import { useNamespace } from "@teek/composables";
import VuePdfEmbed from "vue-pdf-embed";

// 直接在defineProps中指定类型
const props = withDefaults(defineProps<PdfViewerProps>(), {
  initialPage: 1,
  scale: 1,
  minScale: 0.2,
  maxScale: 3
});

const emit = defineEmits<PdfViewerEmits>();

const ns = useNamespace("pdf-viewer");

// 响应式数据
const loading = ref(true);
const error = ref<Error | null>(null);
const currentPage = ref(props.initialPage ?? 1);
const numPages = ref(0);
const scale = ref(props.scale ?? 1);  

// 计算属性
const source = computed(() => props.src);
const wrapperStyle = computed(() => ({
  transform: `scale(${scale.value})`
} as CSSProperties));

const isFirstPage = computed(() => currentPage.value <= 1);
const isLastPage = computed(() => currentPage.value >= numPages.value);
const canZoomIn = computed(() => scale.value < props.maxScale);
const canZoomOut = computed(() => scale.value > props.minScale);

// 方法
const handleLoaded = (numberOfPages: number) => {
  console.log('PDF loaded successfully, pages:', numberOfPages);
  loading.value = false;
  numPages.value = numberOfPages;
  error.value = null;
  emit('loaded', numberOfPages);
};

const handleError = (err: Error | any) => {
  console.error('PDF加载错误:', err);
  loading.value = false;
  error.value = err;
  emit('error', err);
};

const handleRendered = () => {
  console.log('PDF rendered successfully');
  emit('rendered');
};

const previousPage = () => {
  if (currentPage.value > 1) {
    currentPage.value--;
    emit('page-change', currentPage.value);
  }
};

const nextPage = () => {
  if (currentPage.value < numPages.value) {
    currentPage.value++;
    emit('page-change', currentPage.value);
  }
};

const zoomIn = () => {
  if (scale.value < props.maxScale) {
    scale.value += 0.1;
  }
};

const zoomOut = () => {
  if (scale.value > props.minScale) {
    scale.value -= 0.1;
  }
};

const resetZoom = () => {
  scale.value = props.scale;
};

// 监听props变化
watch(() => props.src, (newSrc) => {
  if (newSrc) {
    console.log('PDF source changed, reloading...');
    loading.value = true;
    error.value = null;
    currentPage.value = props.initialPage;
    numPages.value = 0;
  }
}, { immediate: true });

watch(() => props.initialPage, (newPage) => {
  if (newPage >= 1 && newPage <= numPages.value) {
    currentPage.value = newPage;
  }
});

// 初始化
onMounted(() => {
  console.log('PdfViewer mounted');
  if (props.src) {
    loading.value = true;
  }
});
</script>

<template>
  <div :class="ns.b()">
    <div v-if="loading" :class="[ns.b(), ns.e('loading')]">加载中...</div>
    <div v-else-if="error" :class="[ns.b(), ns.e('error')]">{{ error.message || '加载PDF失败' }}</div>
    <div v-else :class="[ns.b(), ns.e('content')]">
      <div :class="[ns.b(), ns.e('controls')]">
        <button 
          :class="[ns.b(), ns.e('btn'), ns.e('prev'), { [ns.m('disabled')]: isFirstPage }]" 
          @click="previousPage" 
          :disabled="isFirstPage"
        >
          上一页
        </button>
        <span :class="[ns.b(), ns.e('page-info')]">{{ currentPage }} / {{ numPages || 1 }}</span>
        <button 
          :class="[ns.b(), ns.e('btn'), ns.e('next'), { [ns.m('disabled')]: isLastPage }]" 
          @click="nextPage" 
          :disabled="isLastPage"
        >
          下一页
        </button>
        <button 
          :class="[ns.b(), ns.e('btn'), ns.e('zoom-in'), { [ns.m('disabled')]: !canZoomIn }]" 
          @click="zoomIn" 
          :disabled="!canZoomIn"
        >
          放大
        </button>
        <button 
          :class="[ns.b(), ns.e('btn'), ns.e('zoom-out'), { [ns.m('disabled')]: !canZoomOut }]" 
          @click="zoomOut" 
          :disabled="!canZoomOut"
        >
          缩小
        </button>
        <button :class="[ns.b(), ns.e('btn'), ns.e('reset')]" @click="resetZoom">
          重置
        </button>
      </div>
      <div :class="[ns.b(), ns.e('wrapper')]" :style="wrapperStyle">
        <VuePdfEmbed 
          :source="source" 
          :page="currentPage"
          @loaded="handleLoaded"
          @error="handleError"
          @rendered="handleRendered"
        />
      </div>
    </div>
  </div>
</template>
