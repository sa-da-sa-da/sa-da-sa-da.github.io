<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { getProblemById, type PythonProblem } from '../data/PythonProblemsService';

// 组件属性 - 题目ID
const props = defineProps<{
  problemId?: string;
}>();

// 代码编辑器内容
const code = ref(``);

// 用户输入参数
const userInput = ref('');

// 执行结果
const result = ref('');

// 加载状态
const loading = ref(false);
const pyodide = ref(null);
const isPyodideReady = ref(false);
const error = ref('');

// 代码执行状态
const isRunning = ref(false);

// 定义全局类型，防止TypeScript报错
declare global {
  interface Window {
    loadPyodide: any;
  }
}

// 根据题目ID加载代码
const loadProblemByID = async (problemId: string | undefined) => {
  if (!problemId) return;
  
  try {
    const problem = await getProblemById(problemId);
    if (problem) {
      code.value = problem.code || '';
      
      // 如果题目有默认输入，也设置到userInput中
      if (problem.inputs && problem.inputs.length > 0) {
        userInput.value = problem.inputs.join('\n');
      }
      
      result.value = `已加载题目：${problem.title}`;
    } else {
      error.value = `未找到ID为"${problemId}"的题目`;
      console.warn(`未找到题目: ${problemId}`);
    }
  } catch (err) {
    error.value = `加载题目失败: ${err instanceof Error ? err.message : '未知错误'}`;
    console.error('加载题目失败:', err);
  }
};

// 监听problemId变化
watch(() => props.problemId, async (newId) => {
  await loadProblemByID(newId);
}, { immediate: true });

// 加载Pyodide（使用WebAssembly在浏览器中运行Python）
onMounted(async () => {
  try {
    loading.value = true;
    result.value = '正在加载Python环境...这可能需要一些时间，请稍候';
    
    // 动态加载Pyodide
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/pyodide/v0.23.4/full/pyodide.js';
    script.type = 'text/javascript';
    document.head.appendChild(script);
    
    // 等待Pyodide脚本加载完成
    await new Promise((resolve, reject) => {
      script.onload = resolve;
      script.onerror = () => reject(new Error('Pyodide脚本加载失败'));
    });
    
    // 初始化Pyodide环境
    result.value = '正在初始化Python解释器...';
    pyodide.value = await window.loadPyodide({
      indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.23.4/full/'
    });
    
    isPyodideReady.value = true;
    result.value = 'Python环境已就绪，可以开始编写代码了！';
    
  } catch (err) {
    error.value = `Python环境加载失败: ${err instanceof Error ? err.message : '未知错误'}`;
    console.error('Pyodide加载失败:', err);
    result.value = '';
  } finally {
    loading.value = false;
  }
});

// 执行Python代码
const runCode = async () => {
  if (!isPyodideReady.value || isRunning.value || !pyodide.value) return;
  
  try {
    isRunning.value = true;
    result.value = '代码执行中...';
    error.value = '';
    
    // 构建包含用户代码的执行环境
    // 使用StringIO捕获标准输出
    // 处理用户输入（如果有）
    const inputs = userInput.value.split('\n').filter(line => line !== '');
    
    const fullCode = `
import sys
from io import StringIO

# 重定向标准输出到缓冲区
old_stdout = sys.stdout
sys.stdout = mystdout = StringIO()

# 创建自定义input函数，使用预定义的输入
_inputs = ${JSON.stringify(inputs)}
_input_index = 0

def custom_input(prompt=''):
    global _input_index
    if _input_index < len(_inputs):
        value = _inputs[_input_index]
        _input_index += 1
        return value
    return ''

# 替换内置的input函数
input = custom_input

try:
${code.value.split('\n').map(line => '    ' + line).join('\n')}
except Exception as e:
    sys.stdout = old_stdout
    print(f"执行错误: {type(e).__name__}: {e}")
else:
    sys.stdout = old_stdout

# 返回捕获的输出
mystdout.getvalue()
`;
    
    // 使用Pyodide执行Python代码
    const stdout = await pyodide.value.runPythonAsync(fullCode);
    
    // 显示执行结果，如果没有输出则提示
    result.value = stdout || '执行完成，但没有输出结果';
    
  } catch (err) {
    error.value = `执行过程中发生错误: ${err instanceof Error ? err.message : '未知错误'}`;
    result.value = '';
    console.error('执行错误:', err);
  } finally {
    isRunning.value = false;
  }
};

// 重置代码到默认示例
const resetCode = () => {
  if (loading.value || isRunning.value) return;
  code.value = `# 欢迎使用Python在线编辑器\n# 在这里编写和执行Python代码\n\n# 简单测试示例\nprint("Hello, Python!")\nprint("这是一个简单的测试")\n\n# 进行基本计算\na = 10\nb = 20\nprint(f"{a} + {b} = {a + b}")\nprint(f"{a} * {b} = {a * b}")\n\n# 列表操作\nnumbers = [1, 2, 3, 4, 5]\nprint(f"列表: {numbers}")\nprint(f"总和: {sum(numbers)}")\nprint(f"最大值: {max(numbers)}")\n`;
  result.value = '代码已重置';
  error.value = '';
};

// 打开Python文件
const openFile = () => {
  if (loading.value || isRunning.value) return;
  
  // 创建一个隐藏的文件输入元素
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = '.py,.txt';
  
  // 监听文件选择事件
  fileInput.onchange = (event) => {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        if (content) {
          code.value = content;
          result.value = `已打开文件: ${file.name}`;
        }
      };
      reader.onerror = () => {
        error.value = '读取文件失败，请重试';
      };
      reader.readAsText(file);
    }
  };
  
  // 触发文件选择对话框
  fileInput.click();
};

// 保存Python文件
const saveFile = () => {
  if (loading.value || isRunning.value) return;
  
  // 创建一个Blob对象，包含当前的代码内容
  const blob = new Blob([code.value], { type: 'text/python' });
  
  // 创建下载链接
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'python_code.py'; // 默认文件名
  
  // 触发下载
  document.body.appendChild(a);
  a.click();
  
  // 清理
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
  
  result.value = '文件已保存';
};
</script>

<template>
  <div class="python-editor-container">
    <h3 class="editor-title">Python在线编辑器</h3>
    
    <!-- 编辑器工具栏 -->
    <div class="editor-toolbar">
      <button 
        @click="openFile" 
        class="file-button" 
        :disabled="loading || isRunning"
      >
        打开文件
      </button>
      <button 
        @click="saveFile" 
        class="file-button" 
        :disabled="loading || isRunning"
      >
        保存文件
      </button>
      <button 
        @click="runCode" 
        class="run-button" 
        :disabled="loading || !isPyodideReady || isRunning"
      >
        <span v-if="loading">加载中...</span>
        <span v-else-if="isRunning">执行中...</span>
        <span v-else>运行代码</span>
      </button>
      <button @click="resetCode" class="reset-button" :disabled="loading || isRunning">
        重置代码
      </button>
      <div class="status-indicator">
        <span 
          class="status-dot" 
          :class="{
            'status-ready': isPyodideReady,
            'status-loading': loading,
            'status-error': error
          }"
        ></span>
        <span class="status-text">
          <span v-if="loading">Python环境加载中...</span>
          <span v-else-if="isPyodideReady">Python环境已就绪</span>
          <span v-else-if="error">加载失败</span>
        </span>
      </div>
    </div>
    
    <!-- 代码编辑区域 -->
    <div class="code-editor-wrapper">
      <textarea 
        v-model="code" 
        class="code-editor" 
        placeholder="在这里编写Python代码..."
        :disabled="loading || isRunning"
        spellcheck="false"
        rows="15"
      ></textarea>
    </div>
    
    <!-- 输入区域 -->
    <div class="input-container">
      <div class="input-header">输入参数：每行对应一个 input() 调用的返回值</div>
      <textarea 
        v-model="userInput" 
        class="input-textarea" 
        placeholder="在这里输入代码运行所需的参数，每行一个..."
        :disabled="loading || isRunning"
        spellcheck="false"
        rows="3"
      ></textarea>
    </div>
    
    <!-- 错误提示 -->
    <div v-if="error" class="error-message">
      {{ error }}
    </div>
    
    <!-- 结果显示区域 -->
    <div class="result-container">
      <div class="result-header">执行结果：</div>
      <pre class="result-output" v-if="result">{{ result }}</pre>
    </div>
  </div>
</template>

<style scoped lang="scss">
.python-editor-container {
  width: 100%;
  max-width: 100%;
  background: var(--vp-c-bg);
  border-radius: 8px;
  box-shadow: 0 2px 8px var(--vp-c-border);
  overflow: hidden;
  margin: 1rem 0;
}

.editor-title {
  margin: 0;
  padding: 1rem;
  background: var(--vp-c-bg-alt);
  color: var(--vp-c-text);
  font-size: 1.2rem;
  border-bottom: 1px solid var(--vp-c-border);
}

.editor-toolbar {
  display: flex;
  align-items: center;
  padding: 0.75rem 1rem;
  background: var(--vp-c-bg-alt);
  border-bottom: 1px solid var(--vp-c-border);
  gap: 0.75rem;
  flex-wrap: wrap;
}

.run-button, .reset-button {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
  transition: all 0.2s ease;
}

.run-button {
  background: var(--vp-c-brand);
  color: white;
  
  &:hover:not(:disabled) {
    background: var(--vp-c-brand-light);
  }
}

.reset-button {
  background: var(--vp-c-bg);
  color: var(--vp-c-text);
  border: 1px solid var(--vp-c-border);
  
  &:hover:not(:disabled) {
    background: var(--vp-c-hover);
  }
}

.file-button {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
  background: var(--vp-c-bg);
  color: var(--vp-c-text);
  border: 1px solid var(--vp-c-border);
  transition: all 0.2s ease;
  
  &:hover:not(:disabled) {
    background: var(--vp-c-hover);
  }
}

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.status-indicator {
  display: flex;
  align-items: center;
  margin-left: auto;
  gap: 0.5rem;
  font-size: 0.9rem;
  color: var(--vp-c-text-secondary);
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--vp-c-border);
}

.status-dot.status-ready {
  background-color: #4CAF50;
}
.status-dot.status-loading {
  background-color: #2196F3;
  animation: pulse 1.5s infinite;
}
.status-dot.status-error {
  background-color: #f44336;
}
@keyframes pulse {
  0% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
  100% {
    opacity: 1;
  }
}

.code-editor-wrapper {
  position: relative;
  width: 100%;
}

.code-editor {
  width: 100%;
  padding: 1rem;
  font-family: 'Fira Code', 'Courier New', Courier, monospace;
  font-size: 0.9rem;
  line-height: 1.5;
  background: var(--vp-c-bg);
  color: var(--vp-c-text);
  border: none;
  resize: vertical;
  outline: none;
  white-space: pre-wrap;
  word-wrap: break-word;
  tab-size: 4;
  
  &::placeholder {
    color: var(--vp-c-text-2);
  }
  
  &:disabled {
    background: var(--vp-c-bg-alt);
    color: var(--vp-c-text-2);
    cursor: not-allowed;
  }
}

.error-message {
  padding: 0.75rem 1rem;
  background: rgba(255, 73, 73, 0.1);
  color: #ff4949;
  border-left: 4px solid #ff4949;
  font-size: 0.9rem;
}

.result-container {
  width: 100%;
  background: var(--vp-c-bg-alt);
  border-top: 1px solid var(--vp-c-border);
}

.result-header {
  padding: 0.75rem 1rem;
  font-weight: 500;
  color: var(--vp-c-text);
  border-bottom: 1px solid var(--vp-c-border);
  font-size: 0.9rem;
}

.result-output {
  margin: 0;
  padding: 1rem;
  font-family: 'Fira Code', 'Courier New', Courier, monospace;
  font-size: 0.9rem;
  line-height: 1.5;
  background: var(--vp-c-bg);
  color: var(--vp-c-text);
  white-space: pre-wrap;
  word-wrap: break-word;
  max-height: 300px;
  overflow-y: auto;
}

/* 输入区域样式 */
.input-container {
  width: 100%;
  border-top: 1px solid var(--vp-c-border);
  background: var(--vp-c-bg);
}

.input-header {
  padding: 0.5rem 1rem;
  font-weight: 500;
  color: var(--vp-c-text);
  font-size: 0.9rem;
  background: var(--vp-c-bg-alt);
}

.input-textarea {
  width: 100%;
  padding: 0.75rem 1rem;
  font-family: 'Fira Code', 'Courier New', Courier, monospace;
  font-size: 0.9rem;
  line-height: 1.5;
  background: var(--vp-c-bg);
  color: var(--vp-c-text);
  border: none;
  resize: vertical;
  outline: none;
  white-space: pre-wrap;
  word-wrap: break-word;
  tab-size: 4;
  box-sizing: border-box;
  
  &::placeholder {
    color: var(--vp-c-text-2);
  }
  
  &:disabled {
    background: var(--vp-c-bg-alt);
    color: var(--vp-c-text-2);
    cursor: not-allowed;
  }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .editor-toolbar {
    flex-direction: column;
    align-items: stretch;
  }
  
  .status-indicator {
    margin-left: 0;
    margin-top: 0.5rem;
    justify-content: center;
  }
  
  .run-button, .reset-button {
    width: 100%;
  }
}
</style>