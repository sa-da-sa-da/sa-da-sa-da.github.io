# -*- coding: utf-8 -*-
"""转换工具的配置常量。

集中存放源题库路径、站点输出目录、套次与日期映射等参数，
避免散落在各模块中。
"""

from pathlib import Path

# 站点仓库根目录（本文件位于 <root>/scripts/qconv/ 下）
REPO_ROOT = Path(__file__).resolve().parents[2]

# 源题库目录（桌面 2026-1 题库）
SOURCE_DIR = Path(r"C:\Users\sakaay\Desktop\20261\题目转换")

# 在线练习内容输出目录
OUTPUT_DIR = REPO_ROOT / "content" / "exammination" / "在线练习"

# 已有 22 套，新题从第 23 套开始编号
FIRST_SET_NO = 23

# 考试场次标注，写入正文标题
EXAM_LABEL = "2026-1"

# 源文件名（按套次顺序）
SOURCE_FILES = [
    "根目录_题目与解析.md",
    "文件夹1_题目与解析.md",
    "文件夹2_题目与解析.md",
    "文件夹3_题目与解析.md",
    "文件夹4_题目与解析.md",
]

# 每套对应的发布日期（2026 年 1 月）
SET_DATES = [
    "2026-01-05T16:00:00+08:00",
    "2026-01-06T16:00:00+08:00",
    "2026-01-07T16:00:00+08:00",
    "2026-01-08T16:00:00+08:00",
    "2026-01-09T16:00:00+08:00",
]

# 封面图（复用站内已有外链，避免新增失效链接）
COVER_IMAGES = [
    "https://cdn-hsyq-static.shanhutech.cn/bizhi/staticwp/202503/"
    "58027a08072962c94c5b3cc2a5a1e1af--1459684851.jpg",
    "https://cdn-hsyq-static.shanhutech.cn/bizhi/staticwp/202202/"
    "7f03e8ac2171ede188f7245896861d17--529634378.jpg",
    "http://cdn-hsyq-static.shanhutech.cn/bizhi/staticwp/202305/"
    "06e8a51ef12581befd70b168dd914d77--3968391448.jpg",
    "https://cdn-hsyq-static-bak.shanhutech.cn/a/201911/01/5dbbd5ade0727.jpg",
    "https://cdn-hsyq-static-bak.shanhutech.cn/bizhi/staticwp/201707/"
    "410b261ac8d01bfec2ff794fb5ac7d8e.jpg",
]
