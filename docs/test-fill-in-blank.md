---
date: 2025-12-04 21:37:57
title: test-fill-in-blank
permalink: /pages/acc750
categories:
  - 
coverImg: >-
  https://cdn-hsyq-static.shanhutech.cn/bizhi/staticwp/202202/7f03e8ac2171ede188f7245896861d17--529634378.jpg
---
# 填空题组件测试

## 单个空格示例
<FillInTheBlank 
  title="Vue 3 的核心特性是{blank}和响应式系统。" 
  answer="组合式API"
  explanation="Vue 3引入了组合式API（Composition API），这是其核心特性之一。"
/>

## 多个空格示例
<FillInTheBlank 
  title="{blank}是JavaScript的包管理工具，{blank}是项目构建工具。" 
  :correctAnswers="['npm','vite']"
  explanation="npm（Node Package Manager）是JavaScript的默认包管理工具，而Vite是现代的前端构建工具。"
/>
