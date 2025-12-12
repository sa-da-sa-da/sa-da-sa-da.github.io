<template>
  <div class="multiple-choice-question">
    <!-- 题目容器 -->
    <div class="question-container">
      <!-- 题目文本 -->
      <div class="question-header">
        <!-- 显示序号（如果启用） -->
        <div v-if="props.showIndex" class="question-index">
          <span v-if="typeof props.index !== 'undefined'">
            <!-- 使用自定义序号 -->
            {{ props.index }}
          </span>
          <span v-else>
            <!-- 使用自动序号 -->
            第{{ questionIndex }}题
          </span>
          <!-- 序号分隔符 -->
          <span v-if="props.showIndex === 'withDot'">、</span>
          <span v-else-if="props.showIndex === 'withColon' || props.showIndex === true">：</span>
        </div>
        <div class="question-text" v-html="title"></div>
      </div>
      
      <!-- 题目图片（支持多张） -->
      <div class="question-images" v-if="images && images.length > 0">
        <img 
          v-for="(image, index) in images" 
          :key="index" 
          :src="image" 
          :alt="`题目图片 ${index + 1}`" 
          class="question-image"
        >
      </div>
      
      <!-- 选项列表 -->
      <div class="options-list" :class="optionsLayoutClass">
        <div 
          v-for="(option, index) in options" 
          :key="index" 
          class="option-item"
          :class="{
            'selected': selectedOptions.includes(index),
            'correct': showResult && correctOptions.includes(index),
            'incorrect': showResult && selectedOptions.includes(index) && !correctOptions.includes(index)
          }"
          @click="toggleOption(index)"
        >
          <span class="option-label">{{ getOptionLabel(index) }}</span>
          <span class="option-content" v-html="option"></span>
        </div>
      </div>
      
      <!-- 提交按钮 -->
      <button 
        v-if="!showResult" 
        class="submit-button" 
        @click="submitAnswer"
        :disabled="selectedOptions.length === 0"
      >
        提交答案
      </button>
      
      <!-- 重新答题按钮 -->
      <button 
        v-if="showResult" 
        class="reset-button" 
        @click="resetQuestion"
      >
        重新答题
      </button>
    </div>
    
    <!-- 结果和解析区域 -->
    <div class="result-container" v-if="showResult">
      <!-- 结果提示 -->
      <div class="result-message" :class="isCorrect ? 'correct-message' : 'incorrect-message'">
        {{ isCorrect ? '回答正确！🎉' : '回答错误！💔' }}
      </div>
      
      <!-- 正确答案 -->
      <div class="correct-answer">
        <strong>正确答案：</strong>
        <span>{{ getCorrectAnswerLabels() }}</span>
      </div>
      
      <!-- 解析 -->
      <div class="explanation" v-if="explanation">
        <strong>解析：</strong>
        <div v-html="explanation"></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';

// 扩展Window接口，声明pageCounterMap属性
declare global {
  interface Window {
    pageCounterMap?: Map<string, number>;
  }
}

// 定义组件的属性
type ShowIndexType = boolean | 'withDot' | 'withColon'

const props = withDefaults(defineProps<{
  title: string;           // 题目文本
  options: string[];       // 选项列表
  correctOptions: number[]; // 正确选项的索引数组
  explanation: string;     // 解析
  images?: string[];       // 题目图片（可选）
  index?: number | string | null; // 自定义题目序号
  showIndex?: ShowIndexType; // 序号显示方式：true(默认，带冒号)、'withDot'(带点)、'withColon'(带冒号)、false(不显示)
}>(), {
  showIndex: true,
  images: () => []
});

// 响应式数据
const selectedOptions = ref<number[]>([]); // 用户选择的选项索引
const showResult = ref(false);             // 是否显示结果
const questionIndex = ref(props.index !== undefined ? props.index : null); // 题目序号

// 初始化页面计数器和题目序号
  onMounted(() => {
    // 只有当没有提供自定义序号且需要显示序号时，才使用自动序号
    if (props.index === undefined && props.showIndex !== false) {
      // 使用页面URL作为文件唯一标识
      const pageKey = window.location.pathname;
      
      // 使用window对象作为临时存储，确保页面级别计数，页面切换后重置
      // 确保全局计数器对象存在
      if (!window.pageCounterMap) {
        window.pageCounterMap = new Map<string, number>();
      }
      
      // 页面加载时重置当前页面的计数器为1，确保每次刷新都从1开始
      // 然后在组件挂载时递增计数
      if (!window.pageCounterMap.has(pageKey) || window.pageCounterMap.get(pageKey) === undefined) {
        window.pageCounterMap.set(pageKey, 0);
      }
      
      // 递增计数器
      const currentCount = window.pageCounterMap.get(pageKey)!;
      window.pageCounterMap.set(pageKey, currentCount + 1);
      
      // 设置题目序号
      questionIndex.value = window.pageCounterMap.get(pageKey);
    }
  })
  
  // 监听页面卸载事件，清除当前页面的计数器，确保下次访问重新计数
  onUnmounted(() => {
    if (props.index === undefined && props.showIndex !== false) {
      const pageKey = window.location.pathname;
      // 移除当前页面的计数器，确保下次访问时重新开始计数
      if (window.pageCounterMap && window.pageCounterMap.has(pageKey)) {
        window.pageCounterMap.delete(pageKey);
      }
    }
  })

// 计算属性：判断答案是否正确
const isCorrect = computed(() => {
  if (selectedOptions.value.length !== props.correctOptions.length) return false;
  return selectedOptions.value.every(index => props.correctOptions.includes(index)) &&
         props.correctOptions.every(index => selectedOptions.value.includes(index));
});

// 计算属性：根据选项内容长度决定布局方式
const optionsLayoutClass = computed(() => {
  // 计算所有选项内容的总长度
  const totalLength = props.options.reduce((sum, option) => {
    // 去除HTML标签，只计算纯文本长度
    const text = option.replace(/<[^>]+>/g, '');
    return sum + text.length;
  }, 0);
  
  // 计算平均选项长度
  const averageLength = totalLength / props.options.length;
  
  // 根据平均长度决定布局
  if (averageLength > 50) {
    // 长内容：竖排（每个选项占一行）
    return 'vertical-layout';
  } else if (averageLength > 20) {
    // 中等长度：两行布局
    return 'two-row-layout';
  } else {
    // 短内容：智能网格布局（根据容器宽度自动调整）
    return 'grid-layout';
  }
});

// 获取选项标签（A, B, C, D...）
const getOptionLabel = (index: number): string => {
  return String.fromCharCode(65 + index);
};

// 获取正确答案的标签字符串
const getCorrectAnswerLabels = (): string => {
  return props.correctOptions.map(index => getOptionLabel(index)).join(', ');
};

// 切换选项选中状态
const toggleOption = (index: number) => {
  if (showResult.value) return; // 显示结果后不允许再选择
  
  const optionIndex = selectedOptions.value.indexOf(index);
  if (optionIndex > -1) {
    selectedOptions.value.splice(optionIndex, 1);
  } else {
    selectedOptions.value.push(index);
  }
};

// 提交答案
const submitAnswer = () => {
  if (selectedOptions.value.length === 0) return;
  showResult.value = true;
};

// 重置题目
const resetQuestion = () => {
  selectedOptions.value = [];
  showResult.value = false;
};
</script>

<style scoped>
/* CSS变量回退，确保主题切换兼容性 */
:root {
  --c-border: var(--c-border, #e5e7eb);
  --c-border-hover: var(--c-border-hover, #d1d5db);
  --c-bg: var(--c-bg, #ffffff);
  --c-bg-hover: var(--c-bg-hover, #f9fafb);
  --c-text: var(--c-text, #4b5563);
  --c-text-light: var(--c-text-light, #ffffff);
  --c-text-secondary: var(--c-text-secondary, #6b7280);
  --c-brand: var(--c-brand, #3b82f6);
  --c-brand-hover: var(--c-brand-hover, #2563eb);
  --c-brand-light: var(--c-brand-light, #eff6ff);
  --c-success: var(--c-success, #10b981);
  --c-success-light: var(--c-success-light, #d1fae5);
  --c-danger: var(--c-danger, #ef4444);
  --c-danger-light: var(--c-danger-light, #fee2e2);
}

.multiple-choice-question {
  border: 1px solid var(--c-border);
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
  background-color: var(--c-bg);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  color: var(--c-text);
}

/* 题目容器 */
.question-container {
  margin-bottom: 20px;
}

/* 题目标题容器 */
.question-header {
  display: flex;
  align-items: flex-start;
  margin-bottom: 15px;
  line-height: 1.6;
}

.question-index {
  font-weight: 600;
  margin-right: 8px;
  color: var(--c-brand);
  flex-shrink: 0;
  white-space: nowrap;
  font-size: 16px;
}

/* 不同序号显示方式的样式调整 */
.question-index span {
  display: inline;
}

/* 确保自定义序号和自动序号样式一致 */
.question-index span:first-child {
  font-weight: 600;
  color: var(--c-brand);
}

/* 题目文本 */
.question-text {
  font-size: 16px;
  font-weight: 500;
  line-height: 1.6;
  color: var(--c-text);
  flex: 1;
}

/* 题目图片 */
.question-images {
  margin-bottom: 15px;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.question-image {
  max-width: 100%;
  height: auto;
  border-radius: 4px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

/* 选项列表基础样式 */
.options-list {
  margin-bottom: 20px;
  gap: 12px;
}

/* 智能网格布局 - 短内容时使用 */
.options-list.grid-layout {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(200px, 100%), 1fr));
}

/* 两行布局 - 中等长度内容时使用 */
.options-list.two-row-layout {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
}

/* 竖排布局 - 长内容时使用 */
.options-list.vertical-layout {
  display: flex;
  flex-direction: column;
}

.option-item {
  display: flex;
  align-items: flex-start;
  padding: 12px 15px;
  border: 1px solid var(--c-border);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  background-color: var(--c-bg);
  /* 允许选项内容自然换行 */
  word-break: break-word;
  hyphens: auto;
}

.option-item:hover {
  background-color: rgba(59, 130, 246, 0.05);
  border-color: rgba(59, 130, 246, 0.2);
}

/* 增强选中状态的对比度 */
.option-item.selected {
  border-color: #3b82f6;
  background-color: #eff6ff;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
  /* 暗黑模式兼容 */
  color: #1f2937; /* 确保文字在浅色背景上清晰可见 */
}

/* 增强正确状态的对比度 */
.option-item.correct {
  border-color: #10b981;
  background-color: #d1fae5;
  box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.2);
  /* 暗黑模式兼容 */
  color: #065f46; /* 确保文字在浅色背景上清晰可见 */
}

/* 增强错误状态的对比度 */
.option-item.incorrect {
  border-color: #ef4444;
  background-color: #fee2e2;
  box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.2);
  /* 暗黑模式兼容 */
  color: #991b1b; /* 确保文字在浅色背景上清晰可见 */
}

/* 暗黑模式下的样式增强 */
:global(.dark) .option-item.selected,
:global(.dark) .option-item.correct,
:global(.dark) .option-item.incorrect {
  /* 在暗黑模式下保持高对比度 */
  border-width: 2px; /* 增加边框宽度以提高可见性 */
}

:global(.dark) .option-item.selected {
  background-color: rgba(59, 130, 246, 0.2);
  border-color: #3b82f6;
  color: #ffffff; /* 确保文字在深色背景上清晰可见 */
}

:global(.dark) .option-item.correct {
  background-color: rgba(16, 185, 129, 0.2);
  border-color: #10b981;
  color: #ffffff; /* 确保文字在深色背景上清晰可见 */
}

:global(.dark) .option-item.incorrect {
  background-color: rgba(239, 68, 68, 0.2);
  border-color: #ef4444;
  color: #ffffff; /* 确保文字在深色背景上清晰可见 */
}

.option-label {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  margin-right: 10px;
  font-weight: 600;
  border-radius: 50%;
  background-color: var(--c-border);
  color: var(--c-text);
  flex-shrink: 0;
  border: 2px solid transparent;
}

/* 增强选中状态标签的对比度 */
.option-item.selected .option-label {
  background-color: #3b82f6;
  color: white;
  border-color: #2563eb;
}

/* 增强正确状态标签的对比度 */
.option-item.correct .option-label {
  background-color: #10b981;
  color: white;
  border-color: #059669;
}

/* 增强错误状态标签的对比度 */
.option-item.incorrect .option-label {
  background-color: #ef4444;
  color: white;
  border-color: #dc2626;
}

.option-content {
  flex: 1;
  line-height: 1.5;
  color: var(--c-text);
}

/* 按钮样式 */
.submit-button,
.reset-button {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.submit-button {
  background-color: #4caf50; /* 明亮的绿色 */
  color: white;
}

.submit-button:hover:not(:disabled) {
  background-color: #45a049;
}

.submit-button:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
  opacity: 0.6;
}

.reset-button {
  background-color: var(--c-text-secondary);
  color: var(--c-text-light);
}

.reset-button:hover {
  background-color: var(--c-text);
}

/* 结果容器 */
.result-container {
  padding: 15px;
  border-radius: 6px;
  background-color: var(--c-bg-hover);
  border: 1px solid var(--c-border);
}

/* 结果消息 */
.result-message {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 10px;
  padding: 8px 12px;
  border-radius: 4px;
}

.correct-message {
  background-color: #d1fae5;
  color: #065f46;
  border: 1px solid #10b981;
  box-shadow: 0 1px 2px rgba(16, 185, 129, 0.1);
}

.incorrect-message {
  background-color: #fee2e2;
  color: #991b1b;
  border: 1px solid #ef4444;
  box-shadow: 0 1px 2px rgba(239, 68, 68, 0.1);
}

/* 正确答案 */
.correct-answer {
  margin-bottom: 12px;
  padding: 8px 0;
  color: var(--c-text);
}

.correct-answer strong,
.explanation strong {
  color: var(--c-text);
  font-weight: 600;
}

/* 解析 */
.explanation {
  line-height: 1.6;
  color: var(--c-text);
}

.explanation > div {
  margin-top: 5px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .multiple-choice-question {
    padding: 15px;
  }
  
  .question-text {
    font-size: 15px;
  }
  
  .option-item {
    padding: 10px 12px;
  }
}
</style>

