// Python编程题目服务
// 从JSON文件加载Python题目数据

// 题目信息接口定义
export interface PythonProblem {
  id: string;
  title: string;
  description?: string;
  code: string;
  inputs?: string[];     // 默认输入参数列表
  expectedOutput?: string; // 预期输出结果
}

// 动态导入JSON数据
let pythonProblemsCache: Record<string, PythonProblem> | null = null;

// 异步加载Python题目数据
export async function loadPythonProblems(): Promise<Record<string, PythonProblem>> {
  if (!pythonProblemsCache) {
    try {
      // 动态导入JSON文件
      const module = await import('./PythonProblems.json');
      pythonProblemsCache = module.default || {};
    } catch (error) {
      console.error('加载Python题目数据失败:', error);
      pythonProblemsCache = {};
    }
  }
  return pythonProblemsCache;
}

/**
 * 通过ID获取Python题目信息
 * @param id 题目ID
 * @returns 题目信息对象，如果未找到则返回null
 */
export async function getProblemById(id: string): Promise<PythonProblem | null> {
  const problems = await loadPythonProblems();
  return problems[id] || null;
}

/**
 * 获取所有题目的ID和标题列表，用于显示题目选择
 * @returns 题目ID和标题的数组
 */
export async function getAllProblemTitles(): Promise<Array<{id: string, title: string}>> {
  const problems = await loadPythonProblems();
  return Object.values(problems).map(problem => ({
    id: problem.id,
    title: problem.title
  }));
}
