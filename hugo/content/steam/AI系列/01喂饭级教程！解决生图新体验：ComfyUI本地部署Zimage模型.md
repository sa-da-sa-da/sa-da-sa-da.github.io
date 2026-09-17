---
title: 喂饭级教程！解决生图新体验：ComfyUI本地部署Zimage模型
date: '2025-12-14T01:24:35+08:00'
url: /steam/AI/ComfyUI-Zimage
categories:
  - 创客
tags:
  - AI系列
  - ComfyUI
  - Zimage模型
coverImg: https://cdn-hsyq-static-bak.shanhutech.cn/bizhi/staticwp/201708/b956d70b738cf476edeb81619991b764.jpg
weight: 1
srcDir: steam/AI系列
---

<div class="ad-block">
<ins class="adsbygoogle" style="display:block" data-ad-client="ca-pub-2897720906666216" data-ad-slot="2668661755" data-ad-format="auto" data-full-width-responsive="true"></ins>
</div>


# 喂饭级教程！解决生图新体验：ComfyUI本地部署Zimage模型

## 一、前言

本文记录了在Windows系统上从零开始部署ComfyUI并运行Zimage Turbo轻量化图像生成模型的完整过程。特别适合低显存设备（如6GB显存的RTX 3060）使用，因为Zimage Turbo模型是专为低资源消耗场景优化的。所有操作均经过实测验证，适合初次接触本地AI绘图的新手参考。

### 为什么是Z-image Turbo模型？

Z-Image 是一个强大且高效的图像生成模型，拥有 **60 亿**参数。目前提供三种变体：

- 🚀 **Z-Image-Turbo** – Z-Image 的蒸馏版，仅用 **8 次函数评估（NFEs）**即可媲美或超越业界领先模型。在 H800 企业级 GPU 上实现 **⚡️次秒级推理延迟⚡️**，并可在 **16 GB 显存的消费级设备**上流畅运行。擅长逼真图像生成、中英双语文字渲染及强指令遵循。

- 🧱 **Z-Image-Base** – 未蒸馏的基础模型。发布该检查点旨在释放社区微调与二次开发的全部潜力。

- ✍️ **Z-Image-Edit** – 专为图像编辑任务微调的版本。支持基于自然语言提示的创意图生图，指令跟随能力出色，可实现精准编辑。

### 使用Z-Image Turbo模型

下方提供了一些快速访问和使用的方法

[![官方网站](https://img.shields.io/badge/Official%20Site-333399.svg?logo=homepage)](https://tongyi-mai.github.io/Z-Image-blog/)&#160;
[![Hugging Face](https://img.shields.io/badge/%F0%9F%A4%97%20Checkpoint-Z--Image--Turbo-yellow)](https://huggingface.co/Tongyi-MAI/Z-Image-Turbo)&#160;
[![Hugging Face](https://img.shields.io/badge/%F0%9F%A4%97%20Online_Demo-Z--Image--Turbo-blue)](https://huggingface.co/spaces/Tongyi-MAI/Z-Image-Turbo)&#160;
[![ModelScope 模型](https://img.shields.io/badge/🤖%20Checkpoint-Z--Image--Turbo-624aff)](https://www.modelscope.cn/models/Tongyi-MAI/Z-Image-Turbo)&#160;
[![ModelScope 空间](https://img.shields.io/badge/🤖%20Online_Demo-Z--Image--Turbo-17c7a7)](https://www.modelscope.cn/aigc/imageGeneration?tab=advanced&versionId=469191&modelType=Checkpoint&sdVersion=Z_IMAGE_TURBO&modelUrl=modelscope%253A%252F%252FTongyi-MAI%252FZ-Image-Turbo%253Frevision%253Dmaster%7D%7BOnline)&#160;
[![艺术画廊 PDF](https://img.shields.io/badge/%F0%9F%96%BC%20Art_Gallery-PDF-ff69b4)](assets/Z-Image-Gallery.pdf)&#160;
[![网页艺术画廊](https://img.shields.io/badge/%F0%9F%8C%90%20Web_Art_Gallery-online-00bfff)](https://modelscope.cn/studios/Tongyi-MAI/Z-Image-Gallery/summary)&#160;
<a href="https://arxiv.org/abs/2511.22699" target="_blank"><img src="https://img.shields.io/badge/Report-b5212f.svg?logo=arxiv" height="21px"></a>

## 二、硬件与环境要求

### 1. 系统要求

- 推荐使用Windows 10或Windows 11系统（64位）

### 2. GPU要求

- NVIDIA显卡（支持CUDA，如RTX 20/30/40系列）
- 最低显存要求：6GB（使用量化模型）
- 推荐显存：8GB或以上

### 3. 内存要求

- 最低要求：8GB内存
- 推荐配置：16GB以上内存

### 4. 存储空间

- 至少20GB可用空间（用于ComfyUI、模型文件和依赖）

### 5. Python环境

- 推荐使用Python 3.10版本
- 建议通过Anaconda管理Python环境

## 三、基础环境搭建

### 1. 安装CUDA Toolkit

CUDA是NVIDIA提供的并行计算平台，ComfyUI需要它来利用GPU进行图像生成。

#### 检查CUDA支持情况

1. 按Win+R，输入`cmd`打开命令提示符
2. 输入`nvidia-smi`命令
3. 在输出信息的右上角可以看到驱动支持的最高CUDA版本

#### 安装步骤

1. 访问NVIDIA官方CUDA下载页面：[https://developer.nvidia.com/cuda-toolkit](https://developer.nvidia.com/cuda-toolkit)
2. 下载与显卡驱动兼容的CUDA版本（建议选择低于等于驱动支持版本的CUDA）
3. 运行安装程序，选择默认安装选项

### 2. 安装Python环境（推荐Anaconda）

#### Anaconda安装

1. 访问Anaconda官网：[https://www.anaconda.com/download/](https://www.anaconda.com/download/)
2. 下载Windows版本的Anaconda安装包
3. 运行安装程序，按照提示完成安装

#### 创建虚拟环境

```bash
conda create -n comfyui_env python=3.10
conda activate comfyui_env
```

## 四、安装ComfyUI

### 1. 克隆ComfyUI仓库

```bash
git clone https://github.com/comfyanonymous/ComfyUI.git D:\ComfyUI
cd D:\ComfyUI
```

> 注意：路径可以自定义，但请确保路径不含中文或空格

### 2. 安装依赖

```bash
pip install -r requirements.txt
```

### 3. 解决PyTorch与CUDA兼容性问题

如果遇到"torch not compiled with CUDA enabled"错误，需要安装与CUDA版本匹配的PyTorch：

```bash
pip uninstall torch torchvision torchaudio -y

# 例如，如果安装了CUDA 12.1，使用以下命令
pip3 install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121
```

### 4. 验证CUDA是否可用

```bash
python -c "import torch; print(torch.cuda.is_available())"
```

如果输出`True`，说明CUDA配置成功。

## 五、下载并配置Zimage模型

### 1. 模型文件介绍

Zimage Turbo模型由三个主要组件构成：

| 文件名称 | 作用 | 存放目录 |
|---------|------|--------|
| qwen_3_4b.safetensors | 文本编码器(CLIP) | models/text_encoders/ |
| ae.safetensors | VAE解码器 | models/vae/ |
| zImageTurboQuantized_fp8ScaledE4m3fnKJ.safetensors | 主模型(Checkpoint) | models/checkpoints/ |

### 2. 下载模型文件

- 可以从HuggingFace下载qwen_3_4b.safetensors和ae.safetensors
- 从CivitAI下载zImageTurboQuantized_fp8ScaledE4m3fnKJ.safetensors主模型

### 3. 放置模型文件

按照以下目录结构放置下载的模型文件：

```
ComfyUI/
├── models/
│   ├── checkpoints/          ← 放置zImageTurboQuantized_xxx.safetensors
│   ├── text_encoders/        ← 放置qwen_3_4b.safetensors
│   └── vae/                  ← 放置ae.safetensors
```

## 六、启动ComfyUI并使用Zimage模型

### 1. 启动ComfyUI

```bash
cd D:\ComfyUI
python main.py
```

启动成功后，会自动在浏览器中打开ComfyUI界面，地址为：http://127.0.0.1:8188

### 2. 加载Zimage工作流

#### 创建工作流文件

将以下JSON内容保存为`zimage_turbo_workflow.json`文件：

```json
{
  "2": {
    "inputs": {
      "text": "a beautiful landscape, high quality, 8k",
      "clip": ["16", 0]
    },
    "class_type": "CLIPTextEncode",
    "_meta": { "title": "正向提示词" }
  },
  "4": {
    "inputs": {
      "seed": 1065951732236213,
      "steps": 8,
      "cfg": 1,
      "sampler_name": "euler",
      "scheduler": "simple",
      "denoise": 1,
      "model": ["15", 0],
      "positive": ["2", 0],
      "negative": ["9", 0],
      "latent_image": ["5", 0]
    },
    "class_type": "KSampler",
    "_meta": { "title": "K采样器" }
  },
  "5": {
    "inputs": { "width": 768, "height": 768, "batch_size": 1 },
    "class_type": "EmptyLatentImage",
    "_meta": { "title": "空Latent图像" }
  },
  "6": {
    "inputs": { "vae_name": "ae.safetensors" },
    "class_type": "VAELoader",
    "_meta": { "title": "加载VAE" }
  },
  "7": {
    "inputs": { "samples": ["4", 0], "vae": ["6", 0] },
    "class_type": "VAEDecode",
    "_meta": { "title": "VAE解码" }
  },
  "8": {
    "inputs": { "filename_prefix": "ComfyUI", "images": ["7", 0] },
    "class_type": "SaveImage",
    "_meta": { "title": "保存图像" }
  },
  "9": {
    "inputs": {
      "text": "blurry, ugly, bad, lowres, jpeg artifacts, watermark",
      "clip": ["16", 0]
    },
    "class_type": "CLIPTextEncode",
    "_meta": { "title": "反向提示词" }
  },
  "15": {
    "inputs": { "ckpt_name": "zImageTurboQuantized_fp8ScaledE4m3fnKJ.safetensors" },
    "class_type": "CheckpointLoaderSimple",
    "_meta": { "title": "加载模型" }
  },
  "16": {
    "inputs": { "text_encoder_name": "qwen_3_4b.safetensors" },
    "class_type": "TextEncoderLoader",
    "_meta": { "title": "加载文本编码器" }
  }
}
```

#### 导入工作流
1. 打开ComfyUI网页界面
2. 将`zimage_turbo_workflow.json`文件拖入ComfyUI界面
3. 系统会自动加载工作流中的所有节点

### 3. 生成图像

1. 在"正向提示词"节点中输入想要生成的图像描述
2. 在"反向提示词"节点中输入不希望出现在图像中的元素
3. 点击工作流右上角的"Queue Prompt"按钮
4. 等待图像生成完成
5. 生成的图像会显示在界面右侧，可以右键保存

## 七、优化与排错

### 1. 低显存设备优化

- 使用FP8或INT8量化模型版本（如ZimageTurboQuantized）
- 降低生成图像的分辨率（如从768×768降至512×512）
- 减少采样步数（可尝试6-8步）

### 2. 常见问题及解决方案

#### CUDA内存不足错误

```
CUDA out of memory
```
- 解决方法：降低图像分辨率或切换到更小的模型

#### 模型加载失败

```
Error loading model: File not found
```
- 解决方法：确认模型文件路径正确，文件名与工作流中的设置一致

#### PyTorch错误

```
torch not compiled with CUDA enabled
```
- 解决方法：重新安装与CUDA版本匹配的PyTorch

## 八、总结

通过本教程，我们成功地在本地部署了ComfyUI并配置了Zimage Turbo模型。这个轻量级的图像生成解决方案特别适合显存有限的设备，让更多用户能够体验AI生图的乐趣。

在后续的使用过程中，你可以尝试不同的提示词、调整参数设置，探索Zimage模型的各种可能性。如有任何问题，欢迎在评论区讨论交流！

---

> 本文参考了博客园文章：[在 Windows 上本地部署 ComfyUI + zImage Turbo 模型（低显存友好）](https://www.cnblogs.com/zwj/p/19304453/ai_lcoal_zimage_ai)


