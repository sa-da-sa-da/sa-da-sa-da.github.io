<script setup lang="ts">
import {
  computed, defineAsyncComponent, onBeforeUnmount, onMounted, ref, watch,
} from 'vue';

/**
 * 站内 PDF 阅读器组件（SSR 安全版）
 *
 * SSR 注意：
 *  - vue-pdf-embed 依赖 pdfjs（内部访问 window/worker），**不能**在 SSR 阶段直接 import，
 *    否则会触发 ReferenceError / Worker 报错。
 *  - 这里使用 defineAsyncComponent 仅客户端挂载，且用 <ClientOnly> 风格的 v-if 包裹。
 *  - 所有访问 window/document 的函数都放在 onMounted 或 click 事件回调中（点击时客户端必然已就绪）。
 *
 * 使用方式：
 *   1) 默认模式：在内置书库中根据 props.bookId 选一本
 *   2) 直接传 src：<PdfReader src="https://xxx/xxx.pdf" />
 *   3) URL query 传参：/yule/book-reader?id=book-think-python
 */

// SSR 安全：仅客户端异步加载 vue-pdf-embed 组件
let PdfEmbedComp: ReturnType<typeof defineAsyncComponent> | null = null;
const getPdfComp = () => {
  if (!PdfEmbedComp) {
    PdfEmbedComp = defineAsyncComponent(async () => {
      // 【AURA Fix-20250830】vue-pdf-embed v2 的 package exports 不再暴露 ./dist/style.css，
      // 强行导入会触发 vite:import-analysis "Missing specifier" 错误。
      // 本组件下方 scoped style 已通过 :deep 为 .vue-pdf-embed__page 写了间距/圆角/阴影，
      // 无需依赖官方样式文件；若需要文字层/注释层样式可再按需导入 styles/textLayer.css。
      // await import('vue-pdf-embed/dist/style.css');  ← 已移除
      const mod = await import('vue-pdf-embed');
      // vue-pdf-embed 包中导出名：VuePdf
      return (mod.VuePdf || mod.default) as any;
    });
  }
  return PdfEmbedComp!;
};

interface BookItem {
  id: string;
  title: string;
  author: string;
  cover: string;
  desc: string;
  src: string;
  tags?: string[];
  year?: string;
}

// —— 内置书库（测试书籍均为 CC / 公有领域可公开免费分发） ——
const defaultBooks: BookItem[] = [
  {
    id: 'book-think-python',
    title: 'Think Python 2e',
    author: 'Allen B. Downey',
    cover: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=open%20book%20with%20glowing%20python%20code%20symbols%20floating%2C%20green%20blue%20gradient%2C%20modern%20tech%20illustration%2C%20programming%20reading%20concept&image_size=portrait_4_3',
    desc: '经典 Python 入门书《像计算机科学家一样思考 Python》第二版英文原版（CC BY-NC 3.0 免费授权），从变量、函数、迭代到面向对象、算法分析，循序渐进。',
    src: 'https://greenteapress.com/thinkpython2/thinkpython2.pdf',
    tags: ['Python', '编程入门', '英文原版'],
    year: '2015 / 2nd ed.',
  },
  {
    id: 'book-github-ossu-cs',
    title: 'OSSU Computer Science Guide',
    author: 'Open Source Society University',
    cover: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=vintage%20computer%20science%20textbook%20cover%2C%20warm%20paper%20texture%2C%20matrix%20and%20binary%20code%20art%2C%20blue%20ivory%20colors&image_size=portrait_4_3',
    desc: '开源社会大学（OSSU）的计算机科学自学路径白皮书，整合全球顶尖公开课与学习资源，推荐给想系统自学 CS 的同学。',
    // 注意：该 URL 返回的是 Markdown 原始文本，不是 PDF。这里保留作占位，真实使用请换成 .pdf 链接或放本地 /books/xxx.pdf
    src: 'https://raw.githubusercontent.com/ossu/computer-science/main/README.md',
    tags: ['计算机科学', '自学路径', '开源'],
    year: '持续更新',
  },
];

const props = withDefaults(
  defineProps<{
    src?: string;        // 直接传 pdf 地址
    bookId?: string;     // 或在内置书库中按 ID 选一本
  }>(),
  { src: '', bookId: '' },
);

// —— 客户端就绪标识 ——
// Vite 环境下 SSR 时 import.meta.env.SSR 为 true；客户端 mount 后再设 true
const clientReady = ref(false);

// 书库 & 当前书籍
const books = ref<BookItem[]>(defaultBooks);
const currentBook = computed<BookItem | null>(() => {
  if (props.src) {
    return {
      id: 'custom',
      title: '自定义文档',
      author: '—',
      cover: '',
      desc: '',
      src: props.src,
    };
  }
  if (props.bookId) {
    return books.value.find((b) => b.id === props.bookId) || books.value[0] || null;
  }
  return books.value[0] || null;
});

// —— 阅读状态 ——
const loading = ref(true);
const error = ref<string>('');
const scale = ref(1.15);   // 缩放
const page = ref(1);      // 当前页
const totalPages = ref(0);
const rotation = ref(0);  // 旋转
const scrollMode = ref(true); // true = 滚动全量页，false = 单页

const source = computed(() => currentBook.value?.src || '');

// 客户端 ready 后再初始化（SSR 期间不能访问 window）
onMounted(() => {
  clientReady.value = true;
  try {
    const u = new URL(window.location.href);
    const qId = u.searchParams.get('id');
    if (qId) {
      const m = books.value.find((b) => b.id === qId);
      if (m) {
        books.value = [m, ...books.value.filter((b) => b.id !== qId)];
      }
    }
  } catch { /* noop */ }
});

// 事件回调
const onLoaded = (payload: { numPages: number }) => {
  totalPages.value = payload.numPages;
  loading.value = false;
  error.value = '';
  page.value = 1;
};
const onRenderFail = (e: any) => {
  loading.value = false;
  console.error('PDF 渲染失败：', e);
  error.value = 'PDF 渲染失败，可能是跨域、文件损坏或不是有效的 PDF 文件。详情：' + (e?.message || String(e));
};
const onOpenFail = (e: any) => {
  loading.value = false;
  console.error('PDF 打开失败：', e);
  error.value = '无法打开此 PDF（跨域/链接失效/文件不存在）。请使用浏览器直接打开链接验证可用性。';
};

// 切换书籍或缩放/单页滚动模式变化时重置加载态
watch(source, () => {
  loading.value = true;
  error.value = '';
  page.value = 1;
  totalPages.value = 0;
});

// 缩放
const setScale = (v: number) => { scale.value = Math.min(Math.max(0.5, v), 2.5); };
const zoomIn = () => setScale(scale.value + 0.1);
const zoomOut = () => setScale(scale.value - 0.1);
const resetView = () => { scale.value = 1.15; rotation.value = 0; page.value = 1; };

// 旋转
const rotate = (d: number) => { rotation.value = (rotation.value + d) % 360; };

// 跳页（仅单页模式）
const goTo = (n: number) => {
  page.value = Math.min(Math.max(1, n), totalPages.value || 1);
};

// 下载（一定是用户点击触发，所以 document 一定存在）
const download = () => {
  if (!currentBook.value?.src) return;
  try {
    const a = document.createElement('a');
    a.href = currentBook.value.src;
    a.download = (currentBook.value.title || 'book') + '.pdf';
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } catch (e) {
    window.open(currentBook.value.src, '_blank');
  }
};

// 选书
const selectBook = (b: BookItem) => {
  books.value = [b, ...books.value.filter((x) => x.id !== b.id)];
  page.value = 1;
  loading.value = true;
  error.value = '';
};

// 组件卸载时释放对 AsyncComponent 的持有（避免 HMR/热更新泄漏）
onBeforeUnmount(() => {
  PdfEmbedComp = null;
});
</script>

<template>
  <div class="pdf-reader">
    <!-- 顶部工具栏 -->
    <div class="toolbar">
      <div class="tb-left">
        <span class="book-label">📖</span>
        <div class="book-title-info">
          <strong>{{ currentBook?.title || '未选择书籍' }}</strong>
          <span v-if="currentBook?.author" class="author">· {{ currentBook.author }}</span>
          <span v-if="currentBook?.year" class="year">({{ currentBook.year }})</span>
        </div>
      </div>

      <div class="tb-right">
        <div class="tb-group">
          <button class="tbtn" @click="zoomOut" title="缩小">🔍－</button>
          <span class="scale-label">{{ Math.round(scale * 100) }}%</span>
          <button class="tbtn" @click="zoomIn" title="放大">🔍＋</button>
        </div>

        <div class="tb-group">
          <button class="tbtn" @click="rotate(-90)" title="逆时针旋转">⟲</button>
          <button class="tbtn" @click="rotate(90)" title="顺时针旋转">⟳</button>
        </div>

        <div class="tb-group">
          <button class="tbtn" @click="scrollMode = !scrollMode"
            :title="scrollMode ? '切到单页模式' : '切到滚动模式'">
            {{ scrollMode ? '📜 滚动' : '📄 单页' }}
          </button>
        </div>

        <div v-if="!scrollMode && totalPages" class="tb-group">
          <button class="tbtn" @click="goTo(page - 1)" :disabled="page <= 1">上一页</button>
          <input
            class="page-input" type="number" min="1" :max="totalPages || 1"
            :value="page" @change="(e: any) => goTo(Number(e.target.value))"
          />
          <span class="page-label">/ {{ totalPages }}</span>
          <button class="tbtn" @click="goTo(page + 1)" :disabled="page >= totalPages">下一页</button>
        </div>

        <div class="tb-group">
          <button class="tbtn" @click="resetView" title="重置视图">↺ 重置</button>
          <button class="tbtn primary" @click="download" title="下载 PDF">⬇ 下载</button>
        </div>
      </div>
    </div>

    <div class="reader-body">
      <!-- 左侧书库 -->
      <aside class="sidebar">
        <h4 class="sb-title">📚 书库（{{ books.length }}）</h4>
        <ul class="book-list">
          <li
            v-for="b in books"
            :key="b.id"
            class="book-item"
            :class="{ active: b.id === currentBook?.id }"
            @click="selectBook(b)"
          >
            <div class="bk-cover">
              <img v-if="b.cover" :src="b.cover" :alt="b.title" />
              <div v-else class="no-cover">📕</div>
            </div>
            <div class="bk-meta">
              <p class="bk-title">{{ b.title }}</p>
              <p class="bk-author">{{ b.author }}</p>
            </div>
          </li>
        </ul>
      </aside>

      <!-- 主阅读区 -->
      <main class="canvas-wrap">
        <!-- SSR 期间 / 客户端未初始化前：显示占位 loading -->
        <div v-if="!clientReady" class="state-box">
          <div class="spinner"></div>
          <p>正在初始化阅读器…</p>
        </div>

        <!-- 加载中 -->
        <div v-else-if="loading && !error" class="state-box">
          <div class="spinner"></div>
          <p>正在加载 PDF…</p>
        </div>

        <!-- 错误提示 -->
        <div v-else-if="error" class="state-box error">
          <div style="font-size:32px;">⚠️</div>
          <p class="err-title">加载失败</p>
          <p class="err-msg">{{ error }}</p>
          <p v-if="currentBook?.src" class="err-msg small">
            原始链接：<a :href="currentBook.src" target="_blank" rel="noreferrer">{{ currentBook.src }}</a>
          </p>
          <button class="tbtn primary" @click="download">在新标签中直接打开</button>
        </div>

        <!-- 滚动模式：一次渲染全部 -->
        <component
          v-else-if="scrollMode"
          :is="getPdfComp()"
          class="scroll-pages"
          :style="{ transform: `scale(${scale}) rotate(${rotation}deg)` }"
          :source="source"
          @loaded="onLoaded"
          @open-fail="onOpenFail"
          @render-fail="onRenderFail"
        />

        <!-- 单页模式：只渲染当前页 -->
        <component
          v-else
          :is="getPdfComp()"
          class="single-page"
          :style="{ transform: `scale(${scale}) rotate(${rotation}deg)` }"
          :source="source"
          :page="page"
          @loaded="onLoaded"
          @open-fail="onOpenFail"
          @render-fail="onRenderFail"
        />
      </main>
    </div>

    <!-- 书籍简介 -->
    <div v-if="currentBook" class="book-info-card">
      <div class="bi-head">
        <h3>{{ currentBook.title }}</h3>
        <span v-if="currentBook.year" class="year-chip">{{ currentBook.year }}</span>
      </div>
      <p class="bi-desc">{{ currentBook.desc || '暂无简介' }}</p>
      <div v-if="currentBook.tags?.length" class="tags">
        <span v-for="t in currentBook.tags" :key="t" class="tag">{{ t }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pdf-reader {
  max-width: 1280px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* 工具栏 */
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  background: #fff;
  padding: 12px 18px;
  border-radius: 14px;
  border: 1px solid #eef2ff;
  box-shadow: 0 4px 16px rgba(79, 70, 229, 0.06);
  flex-wrap: wrap;
}
.tb-left { display: flex; align-items: center; gap: 10px; min-width: 0; }
.book-label { font-size: 20px; }
.book-title-info strong {
  font-size: 15px; color: #111827; max-width: 360px;
  display: inline-block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  vertical-align: middle;
}
.author, .year { font-size: 12px; color: #6b7280; margin-left: 4px; }

.tb-right { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
.tb-group {
  display: inline-flex; align-items: center; gap: 4px;
  background: #f3f4f6; border-radius: 10px; padding: 4px;
}
.tbtn {
  min-width: 36px; height: 30px; padding: 0 10px;
  border-radius: 7px; border: none;
  background: transparent; color: #374151;
  font-size: 12px; cursor: pointer;
  transition: all 0.2s;
}
.tbtn:hover:not(:disabled) { background: #fff; color: #4f46e5; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
.tbtn:disabled { opacity: 0.4; cursor: not-allowed; }
.tbtn.primary {
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: #fff; font-weight: 500;
}
.tbtn.primary:hover { background: linear-gradient(135deg, #4f46e5, #7c3aed); color: #fff; }

.scale-label { font-size: 12px; color: #374151; min-width: 46px; text-align: center; font-variant-numeric: tabular-nums; }
.page-input {
  width: 54px; height: 30px;
  border: 1px solid #d1d5db; border-radius: 6px;
  padding: 0 6px; font-size: 12px; text-align: center;
  background: #fff;
}
.page-label { font-size: 12px; color: #6b7280; font-variant-numeric: tabular-nums; }

/* 主体 */
.reader-body {
  display: grid;
  grid-template-columns: 260px 1fr;
  gap: 16px;
}

.sidebar {
  background: #fff;
  border: 1px solid #eef2ff;
  border-radius: 14px;
  padding: 14px;
  box-shadow: 0 4px 16px rgba(79, 70, 229, 0.06);
  max-height: 80vh;
  overflow-y: auto;
  position: sticky; top: 16px;
}
.sb-title { margin: 0 0 12px; font-size: 14px; color: #111827; }
.book-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 10px; }
.book-item {
  display: flex; gap: 10px; padding: 8px;
  border-radius: 10px; cursor: pointer;
  transition: all 0.2s;
  border: 2px solid transparent;
}
.book-item:hover { background: #f9fafb; border-color: #e5e7eb; }
.book-item.active { background: #eef2ff; border-color: #c7d2fe; }
.bk-cover {
  width: 52px; height: 70px; flex-shrink: 0;
  border-radius: 4px; overflow: hidden;
  background: linear-gradient(135deg, #1e3a8a, #4c1d95);
}
.bk-cover img { width: 100%; height: 100%; object-fit: cover; }
.bk-cover .no-cover {
  width: 100%; height: 100%;
  display: flex; align-items: center; justify-content: center;
  color: rgba(255,255,255,0.6); font-size: 22px;
}
.bk-meta { flex: 1; min-width: 0; display: flex; flex-direction: column; justify-content: center; }
.bk-title {
  margin: 0 0 3px; font-size: 13px; font-weight: 600; color: #111827;
  overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
}
.bk-author { margin: 0; font-size: 11px; color: #6b7280; }

.canvas-wrap {
  position: relative;
  background: #e5e7eb;
  background-image:
    linear-gradient(45deg, #d1d5db 25%, transparent 25%),
    linear-gradient(-45deg, #d1d5db 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #d1d5db 75%),
    linear-gradient(-45deg, transparent 75%, #d1d5db 75%);
  background-size: 20px 20px;
  background-position: 0 0, 0 10px, 10px -10px, 10px 0px;
  border-radius: 14px;
  padding: 20px;
  min-height: 70vh;
  overflow: auto;
  box-shadow: inset 0 0 30px rgba(0,0,0,0.05);
}
.scroll-pages { transform-origin: top center; transition: transform 0.2s; display: block; }
.scroll-pages :deep(.vue-pdf-embed__page) {
  margin: 12px auto !important;
  box-shadow: 0 4px 20px rgba(0,0,0,0.18) !important;
  border-radius: 2px;
  overflow: hidden;
}
.single-page { transform-origin: top center; transition: transform 0.2s; display: block; }
.single-page :deep(.vue-pdf-embed__page) {
  margin: 0 auto !important;
  box-shadow: 0 4px 20px rgba(0,0,0,0.18) !important;
  border-radius: 2px;
  overflow: hidden;
}

.state-box {
  min-height: 60vh;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  gap: 12px; color: #6b7280;
  background: #fff; border-radius: 12px; margin: 0 auto; max-width: 520px; padding: 40px 20px;
}
.state-box.error { border: 1px solid #fee2e2; }
.state-box.error .err-title { margin: 0; font-size: 16px; color: #b91c1c; font-weight: 600; }
.state-box.error .err-msg { margin: 0; font-size: 13px; color: #7f1d1d; text-align: center; line-height: 1.6; }
.state-box.error .err-msg.small { font-size: 11px; color: #9ca3af; word-break: break-all; }
.state-box.error .err-msg a { color: #4f46e5; }
.spinner {
  width: 40px; height: 40px;
  border: 4px solid #e5e7eb; border-top-color: #6366f1;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* 书籍简介 */
.book-info-card {
  background: #fff;
  border: 1px solid #eef2ff;
  border-radius: 14px;
  padding: 18px 22px;
  box-shadow: 0 4px 16px rgba(79, 70, 229, 0.06);
}
.bi-head { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
.bi-head h3 { margin: 0; font-size: 16px; color: #111827; }
.year-chip { font-size: 11px; padding: 2px 8px; border-radius: 999px; background: #f3f4f6; color: #6b7280; }
.bi-desc { margin: 0; font-size: 13px; color: #4b5563; line-height: 1.8; }
.tags { margin-top: 10px; display: flex; gap: 6px; flex-wrap: wrap; }
.tag { font-size: 11px; padding: 2px 10px; border-radius: 4px; background: #eef2ff; color: #4f46e5; }

/* 响应式 */
@media (max-width: 880px) {
  .reader-body { grid-template-columns: 1fr; }
  .sidebar { position: static; max-height: 260px; }
  .book-title-info strong { max-width: 200px; }
}
</style>
