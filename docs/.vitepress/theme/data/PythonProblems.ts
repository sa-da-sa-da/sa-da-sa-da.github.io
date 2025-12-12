// Python编程题目代码库
// 用于存储和管理不同编程题目的Python代码示例

// 题目信息接口定义
export interface PythonProblem {
  id: string;
  title: string;
  description?: string;
  code: string;
  inputs?: string[];     // 默认输入参数列表
  expectedOutput?: string; // 预期输出结果
}

// 题目代码库存储
export const pythonProblems: Record<string, PythonProblem> = {
  // 基础示例题目
  'hello-world': {
    id: 'hello-world',
    title: 'Hello World示例',
    description: '最简单的Python程序示例',
    code: `# 打印Hello World
print("Hello, World!")

# 打印当前Python版本
import sys
print(f"Python版本: {sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}")`,
  },

  // 基础数学计算题目
  'basic-calculation': {
    id: 'basic-calculation',
    title: '基础数学计算',
    description: '演示基本的数学运算和格式化输出',
    code: `# 基础数学计算示例

# 定义两个变量
a = 10
b = 3

# 执行各种数学运算
print(f"{a} + {b} = {a + b}")
print(f"{a} - {b} = {a - b}")
print(f"{a} * {b} = {a * b}")
print(f"{a} / {b} = {a / b}")  # 除法，结果为浮点数
print(f"{a} // {b} = {a // b}")  # 整除，结果为整数
print(f"{a} % {b} = {a % b}")  # 取模，求余数
print(f"{a} ** {b} = {a ** b}")  # 幂运算`,
  },

  // 条件判断题目
  'conditional-statements': {
    id: 'conditional-statements',
    title: '条件判断练习',
    description: '演示if-elif-else条件语句的使用',
    code: `# 条件判断练习

# 获取用户输入（将从预设输入中获取）
number = int(input("请输入一个整数: "))

# 使用条件语句判断数字的性质
if number > 0:
    print(f"{number} 是正数")
elif number < 0:
    print(f"{number} 是负数")
else:
    print(f"{number} 是零")

# 判断是否为偶数或奇数
if number % 2 == 0:
    print(f"{number} 是偶数")
else:
    print(f"{number} 是奇数")`,
    inputs: ['42'], // 默认输入为42
  },

  // 循环结构题目
  'loop-examples': {
    id: 'loop-examples',
    title: '循环结构练习',
    description: '演示for和while循环的使用以及列表操作',
    code: `# 循环结构练习

# 使用for循环遍历列表
fruits = ['苹果', '香蕉', '橙子', '葡萄']
print("水果列表:")
for i, fruit in enumerate(fruits, 1):
    print(f"{i}. {fruit}")

# 使用while循环计算1到10的和
sum_numbers = 0
count = 1
print("\n计算1到10的和:")
while count <= 10:
    sum_numbers += count
    print(f"当前加: {count}, 累计: {sum_numbers}")
    count += 1

print(f"\n1到10的总和是: {sum_numbers}")`,
  },

  // 函数定义与调用题目
  'function-example': {
    id: 'function-example',
    title: '函数定义与调用',
    description: '演示如何定义函数、传递参数和返回值',
    code: `# 函数定义与调用示例

# 定义一个计算阶乘的函数
def factorial(n):
    """
    计算并返回n的阶乘
    n! = n * (n-1) * (n-2) * ... * 1
    """
    if n <= 1:
        return 1
    else:
        return n * factorial(n-1)

# 定义一个计算斐波那契数列的函数
def fibonacci(n):
    """
    计算斐波那契数列的第n个数
    斐波那契数列: 1, 1, 2, 3, 5, 8, 13, ...
    """
    if n <= 0:
        return 0
    elif n == 1:
        return 1
    else:
        return fibonacci(n-1) + fibonacci(n-2)

# 调用函数并显示结果
num = int(input("请输入一个正整数: "))
print(f"{num}的阶乘是: {factorial(num)}")
print(f"斐波那契数列第{num}个数是: {fibonacci(num)}")`,
    inputs: ['6'], // 默认输入为6
  },

  // 列表操作题目
  'list-operations': {
    id: 'list-operations',
    title: '列表操作练习',
    description: '演示Python列表的常见操作和方法',
    code: `# 列表操作练习

# 创建一个列表
numbers = [3, 1, 4, 1, 5, 9, 2, 6, 5]
print(f"原始列表: {numbers}")

# 排序操作
sorted_numbers = sorted(numbers)
print(f"排序后的列表: {sorted_numbers}")

# 反转列表
numbers.reverse()
print(f"反转后的列表: {numbers}")

# 列表操作方法
numbers.append(3)
print(f"添加元素3后: {numbers}")

numbers.remove(1)  # 移除第一个出现的1
print(f"移除第一个1后: {numbers}")

# 列表推导式
squares = [x ** 2 for x in sorted_numbers]
print(f"平方数列表: {squares}")

# 筛选偶数
evens = [x for x in numbers if x % 2 == 0]
print(f"偶数列表: {evens}")`,
  },
};

/**
 * 通过ID获取Python题目信息
 * @param id 题目ID
 * @returns 题目信息对象，如果未找到则返回null
 */
export function getProblemById(id: string): PythonProblem | null {
  return pythonProblems[id] || null;
}

/**
 * 获取所有题目的ID和标题列表，用于显示题目选择
 * @returns 题目ID和标题的数组
 */
export function getAllProblemTitles(): Array<{id: string, title: string}> {
  return Object.values(pythonProblems).map(problem => ({
    id: problem.id,
    title: problem.title
  }));
}
