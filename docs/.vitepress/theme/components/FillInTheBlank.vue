<template>
  <div class="fill-in-the-blank">
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
        <div class="question-text" v-html="renderQuestionText()"></div>
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
      
      <!-- 输入框区域 -->
      <div class="blanks-container" v-if="!showResult">
        <div 
          v-for="(blank, index) in blanks" 
          :key="index" 
          class="blank-item"
        >
          <label class="blank-label">第{{ index + 1 }}空：</label>
          <input 
            v-model="userAnswers[index]" 
            type="text" 
            class="blank-input"
            :class="{
              'error': showResult && userAnswers[index] !== correctAnswers[index]
            }"
            :placeholder="props.placeholder || `请输入第${index + 1}空的答案`"
            :disabled="showResult"
          >
          <!-- 显示正确答案（当用户答错时） -->
          <span 
            v-if="showResult && (props.caseSensitive ? userAnswers[index].trim() !== correctAnswers[index] : userAnswers[index].trim().toLowerCase() !== correctAnswers[index].toLowerCase())" 
            class="correct-answer-tooltip"
          >
            正确答案: {{ correctAnswers[index] }}
          </span>
        </div>
      </div>
      
      <!-- 提交按钮 -->
      <button 
        v-if="!showResult" 
        class="submit-button" 
        @click="submitAnswer"
        :disabled="!canSubmit"
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
      <div class="result-message" :class="isAllCorrect ? 'correct-message' : 'incorrect-message'">
        {{ isAllCorrect ? '全部回答正确！🎉' : '部分或全部回答错误！💔' }}
      </div>
      
      <!-- 答题统计 -->
      <div class="answer-stats" v-if="!isAllCorrect">
        <strong>答题情况：</strong>
        <span>{{ correctCount }}/{{ blanks.length }} 正确</span>
      </div>
      
      <!-- 正确答案 -->
      <div class="correct-answer" v-if="!isAllCorrect">
        <strong>正确答案：</strong>
        <ul class="correct-answer-list">
          <li 
            v-for="(answer, index) in correctAnswers" 
            :key="index"
            :class="{ 'correct': props.caseSensitive ? userAnswers[index].trim() === answer : userAnswers[index].trim().toLowerCase() === answer.toLowerCase() }"
          >
            第{{ index + 1 }}空：{{ answer }}
          </li>
        </ul>
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
  correctAnswers?: string[]; // 正确答案数组
  answer?: string;         // 单个正确答案（兼容旧版本）
  explanation: string;     // 解析
  images?: string[];       // 题目图片（可选）
  index?: number | string | null; // 自定义题目序号
  showIndex?: ShowIndexType; // 序号显示方式：true(默认，带冒号)、'withDot'(带点)、'withColon'(带冒号)、false(不显示)
  placeholder?: string;    // 输入框占位符（可选）
  caseSensitive?: boolean; // 是否大小写敏感（可选，默认false）
}>(), {
  showIndex: true,
  images: () => [],
  caseSensitive: false
});

// 计算属性：获取正确答案数组（同时支持单个answer和correctAnswers数组）
const correctAnswers = computed(() => {
  if (props.correctAnswers && props.correctAnswers.length > 0) {
    return props.correctAnswers;
  } else if (props.answer) {
    return [props.answer];
  }
  return [''];
});

// 响应式数据
const userAnswers = ref<string[]>([]); // 用户填写的答案
const showResult = ref(false);        // 是否显示结果
const questionIndex = ref(props.index !== undefined ? props.index : null); // 题目序号
const blanks = ref<number[]>([]);     // 存储空格数量的数组

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
      
      // 页面加载时重置当前页面的计数器为0，确保每次刷新都从1开始
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
  
  // 根据正确答案数组初始化空格数量和用户答案数组
  blanks.value = Array.from({ length: correctAnswers.value.length }, (_, i) => i);
  userAnswers.value = Array(correctAnswers.value.length).fill('');
});
  
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

// 计算属性：是否可以提交答案
const canSubmit = computed(() => {
  // 检查是否所有输入框都有内容
  return userAnswers.value.every(answer => answer.trim() !== '');
});

// 计算属性：判断所有答案是否正确
const isAllCorrect = computed(() => {
  return userAnswers.value.every((answer, index) => {
    const userAns = answer.trim();
    const correctAns = correctAnswers.value[index];
    
    if (props.caseSensitive) {
      return userAns === correctAns;
    } else {
      return userAns.toLowerCase() === correctAns.toLowerCase();
    }
  });
});

// 计算属性：正确答案数量
const correctCount = computed(() => {
  return userAnswers.value.filter((answer, index) => {
    const userAns = answer.trim();
    const correctAns = correctAnswers.value[index];
    
    if (props.caseSensitive) {
      return userAns === correctAns;
    } else {
      return userAns.toLowerCase() === correctAns.toLowerCase();
    }
  }).length;
});

// 渲染题目文本，在指定位置插入空格标记
const renderQuestionText = () => {
  // 如果题目文本中包含占位符，使用它们；否则，在末尾添加空格提示
  if (props.title.includes('{blank}')) {
    let count = 0;
    return props.title.replace(/\{blank\}/g, () => {
      count++;
      return `<span class="blank-placeholder">[<u>      第${count}空       </u>]</span>`;
    });
  } else {
    // 如果没有占位符，在末尾添加空格提示
    return props.title + ' ' + blanks.value.map((_, index) => {
      return `<span class="blank-placeholder">[<u>    第${index + 1}空    </u>]</span>`;
    }).join(' ');
  }
};

// 提交答案
const submitAnswer = () => {
  if (!canSubmit.value) return;
  showResult.value = true;
};

// 重置题目
const resetQuestion = () => {
  userAnswers.value = Array(correctAnswers.value.length).fill('');
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

.fill-in-the-blank {
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

/* 空格占位符样式 */
.blank-placeholder {
  font-weight: 600;
  color: var(--c-brand);
  background-color: var(--c-brand-light);
  padding: 2px 6px;
  border-radius: 4px;
  margin: 0 2px;
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

/* 空格输入区域 */
.blanks-container {
  margin-bottom: 20px;
}

.blank-item {
  margin-bottom: 15px;
  position: relative;
}

.blank-label {
  display: inline-block;
  margin-right: 10px;
  font-weight: 500;
  color: var(--c-text);
  min-width: 60px;
}

.blank-input {
  padding: 10px 12px;
  border: 1px solid var(--c-border);
  border-radius: 6px;
  font-size: 14px;
  background-color: var(--c-bg);
  color: var(--c-text);
  transition: all 0.2s ease;
  width: calc(100% - 70px);
  box-sizing: border-box;
}

.blank-input:focus {
  outline: none;
  border-color: var(--c-brand);
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
}

.blank-input.error {
  border-color: var(--c-danger);
  background-color: var(--c-danger-light);
}

/* 正确答案提示 */
.correct-answer-tooltip {
  display: block;
  margin-top: 5px;
  padding: 5px 10px;
  font-size: 12px;
  background-color: var(--c-danger-light);
  color: var(--c-danger);
  border-radius: 4px;
  border: 1px solid var(--c-danger);
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

/* 答题统计 */
.answer-stats {
  margin-bottom: 12px;
  padding: 8px 0;
  color: var(--c-text);
}

/* 正确答案列表 */
.correct-answer {
  margin-bottom: 12px;
  color: var(--c-text);
}

.correct-answer-list {
  list-style: none;
  padding-left: 0;
  margin-top: 8px;
}

.correct-answer-list li {
  padding: 6px 10px;
  margin-bottom: 5px;
  border-radius: 4px;
  background-color: var(--c-danger-light);
  color: var(--c-danger);
  border: 1px solid var(--c-danger);
}

.correct-answer-list li.correct {
  background-color: var(--c-success-light);
  color: var(--c-success);
  border-color: var(--c-success);
}

/* 解析 */
.explanation {
  line-height: 1.6;
  color: var(--c-text);
}

.explanation > div {
  margin-top: 5px;
}

.correct-answer strong,
.explanation strong,
.answer-stats strong {
  color: var(--c-text);
  font-weight: 600;
}

/* 暗黑模式兼容 */
:global(.dark) .blank-input.error {
  background-color: rgba(239, 68, 68, 0.2);
}

:global(.dark) .correct-answer-tooltip {
  background-color: rgba(239, 68, 68, 0.2);
}

:global(.dark) .correct-answer-list li {
  background-color: rgba(239, 68, 68, 0.2);
}

:global(.dark) .correct-answer-list li.correct {
  background-color: rgba(16, 185, 129, 0.2);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .fill-in-the-blank {
    padding: 15px;
  }
  
  .question-text {
    font-size: 15px;
  }
  
  .blank-label {
    display: block;
    margin-bottom: 8px;
  }
  
  .blank-input {
    width: 100%;
  }
}
</style>
