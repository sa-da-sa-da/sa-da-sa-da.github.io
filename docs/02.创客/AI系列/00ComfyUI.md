---
title: 喂饭级教程！ComfyUI本地部署
date: 2025-12-14 01:24:35
permalink: /steam/AI/ComfyUI
titleTag: 推荐
categories:
  - AI系列
tags:
  - AI系列
coverImg: >-
  https://cdn-hsyq-static-bak.shanhutech.cn/bizhi/staticwp/201712/9ad9bf725cf51cd9bd2ffaca147054b0.jpg
---

# 喂饭级教程！ComfyUI本地部署超详细指南

## 一、前言

WebUI以及ComfyUI不等于Stable Diffusion，可以简单粗暴一点的理解为方便运行某些大模型的工具。由于本人在接触过ComfyUI之后，就基本放弃WebUI了，本文开始，接下来会有一个系列的入门文章来介绍ComfyUI。不论是ComfyUI还是WebUI，基础工作原理都是需要理解清楚，才能更好地利用大模型以及一些插件，来生成我们想要的效果。

本文主要介绍ComfyUI的本地安装部署。

## 二、ComfyUI的硬件环境要求

### 1. 系统要求

- 推荐使用Windows 10或Windows 11系统

### 2. 内存要求

- 最低要求：8GB内存
- 推荐配置：16GB以上内存
- 如何查看：系统设置 > 系统 > 关于 > 设备规格/机带RAM

### 3. 显卡要求

- 推荐使用NVIDIA 40系列显卡、50系列显卡
- 最低显存要求：8GB
- 推荐显存：16GB（价格和性能的平衡点）
- 如何查看显卡型号：显示设置 > 高级显示设置 > 显示适配器属性
- 如何查看显存容量：任务管理器 > 性能 > GPU > 专用GPU内存

### 4. 硬盘要求

- 最低空间：1TB（小空间装不了几个模型）
- 推荐配置：越大越好
- 建议：考虑使用移动硬盘作为ComfyUI工作空间，避免占用系统盘空间，并提高灵活性

### 5. 其他硬件要求

- 电源：最低400~600瓦
- 主板：无特殊要求
- CPU：无特殊要求

## 三、ComfyUI的软件环境要求

### 1. Git安装

Git是获取远程代码的工具，我们通过它将GitHub或HuggingFace上的模型文件下载到本地。

#### 安装步骤：

1. 前往官网：[https://git-scm.com/](https://git-scm.com/)
2. 下载与操作系统位数匹配的安装包
   - 检查操作系统位数方法：右键「此电脑」> 属性 > 系统类型
3. 双击安装包进行安装，记住安装目录
4. 设置Git环境变量
   - 右键「此电脑」> 属性 > 高级系统设置 > 环境变量 > 系统变量 > PATH > 编辑 > 新建 > 添加Git安装路径下的bin目录
5. 验证安装：按Win+R输入cmd，输入`git -v`，若输出版本号表示安装成功

### 2. Python安装

Python是ComfyUI的运行环境，要求使用3.10及以上版本。

#### 安装步骤：

1. 前往官网：[https://www.python.org/downloads/](https://www.python.org/downloads/)
2. 下载Python 3.11.9版本安装包（选择与操作系统位数匹配的版本）
3. 双击安装包，选择自定义安装路径（建议不要放在C盘）
4. 设置Python环境变量
   - 添加Python安装目录和Scripts目录到系统PATH中
5. 验证安装：按Win+R输入cmd，输入`python -V`，若输出对应版本号表示安装成功

### 3. Visual Studio Setup

前往官网：[https://visualstudio.microsoft.com/zh-hans/](https://visualstudio.microsoft.com/zh-hans/)

### 4. 显卡驱动安装

#### 检查方法：

1. 按Win+X组合键，选择「设备管理器」
2. 展开「显示适配器」选项
3. 若显示具体显卡型号且无警告符号，表示驱动已安装

#### 安装方法：

前往NVIDIA官网：[https://www.nvidia.cn/geforce/drivers/](https://www.nvidia.cn/geforce/drivers/)，下载对应型号的最新驱动

### 5. CUDA安装

CUDA是NVIDIA推出的并行计算平台和编程模型，用于在GPU上进行通用计算。

#### 检查CUDA是否已安装：

- 打开命令提示符，输入`nvcc -V`，若显示版本信息表示已安装

#### 查看显卡支持的CUDA版本：

- 打开命令提示符，输入`nvidia-smi`
- 查看右上角显示的CUDA版本号（这是驱动支持的最高CUDA版本）

#### 安装CUDA：

1. 前往CUDA官网：[https://developer.nvidia.com/cuda-toolkit](https://developer.nvidia.com/cuda-toolkit)
2. 选择与显卡驱动兼容的CUDA版本（建议选择低于等于驱动支持版本的CUDA）
3. 推荐安装CUDA Toolkit 12.4.0版本

## 四、ComfyUI安装部署流程

### 1. 克隆ComfyUI仓库

```bash
git clone https://github.com/comfyanonymous/ComfyUI.git
```

### 2. 安装依赖

```bash
cd ComfyUI
pip install -r requirements.txt
```

### 3. 下载模型文件

前往HuggingFace或其他模型仓库下载所需的模型文件，放置到相应目录。

### 4. 启动ComfyUI

```bash
python main.py
```

## 建议

- 最好安装一个人工智能编程软件，比如trae国际版或者trae CN、或者阿里的Qoder等。国内访问和使用没有任何问题。还能解决你安装过程中的一些疑问。

## 五、总结

通过以上步骤，我们完成了ComfyUI的本地部署。在后续的文章中，我们将介绍如何使用ComfyUI进行图像生成、插件安装以及各种高级功能的使用方法。

如果在安装过程中遇到任何问题，欢迎在评论区留言讨论。
