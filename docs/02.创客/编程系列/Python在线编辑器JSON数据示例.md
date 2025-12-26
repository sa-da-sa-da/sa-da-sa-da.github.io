---
title: Python在线编辑器JSON数据示例
date: 2025-07-16 10:00:00
permalink: /steam/python-editor-json-example
categories:
  - 创客
  - 编程系列
tags:
  - Python
  - 在线编辑器
coverImg: >-
  https://cdn-hsyq-static-bak.shanhutech.cn/bizhi/staticwp/201711/f5d336a399accb02f8d5dcd081638f67.jpg
---

<GoogleAd ad-slot="2668661755"/>



# Python在线编辑器JSON数据示例

本示例展示如何使用基于JSON数据格式的Python在线编辑器组件。

## 基本使用方法

以下是使用`problemId`属性加载预定义Python代码的示例：

<ClientOnly>
<PythonEditor problemId="hello-world" />
</ClientOnly>

## 可用的题目ID列表

| 题目ID | 标题 | 功能描述 |
|--------|------|----------|
| hello-world | Hello World示例 | 最简单的Python程序，打印Hello World和Python版本 |
| basic-calculation | 基础数学计算 | 演示基本的数学运算和格式化输出 |
| conditional-statements | 条件判断练习 | 演示if-elif-else条件语句的使用，带输入功能 |
| loop-examples | 循环结构练习 | 演示for和while循环的使用以及列表操作 |
| function-example | 函数定义与调用 | 演示函数定义、传递参数和返回值，带输入功能 |
| list-operations | 列表操作练习 | 演示Python列表的常见操作和方法 |

## 高级示例：条件判断

<ClientOnly>
<PythonEditor problemId="conditional-statements" />
</ClientOnly>

## 高级示例：函数示例

<ClientOnly>
<PythonEditor problemId="function-example" />
</ClientOnly>

## 技术说明

本编辑器的数据存储已经从TypeScript文件迁移到JSON格式，具有以下优势：

1. **格式统一**：使用标准JSON格式存储数据，便于跨平台和工具访问
2. **易于维护**：数据与代码完全分离，非开发人员也可以编辑题目内容
3. **异步加载**：采用异步方式加载数据，优化页面性能
4. **错误处理**：增强了错误处理机制，提供更友好的用户反馈

JSON数据文件位于：`docs/.vitepress/theme/data/PythonProblems.json`
