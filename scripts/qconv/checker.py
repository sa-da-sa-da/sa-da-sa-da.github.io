# -*- coding: utf-8 -*-
"""生成结果校验器。

把已写出的页面文件重新解析一遍，与源题目逐题比对，
确保题干、选项、正确答案在往返转换后没有走样。
"""

import json
import re

from . import render

PAYLOAD_RE = re.compile(
    r'<script type="application/json">(.*?)</script>', re.S)


def read_payloads(text):
    """从页面文本中提取全部题目 JSON。

    入参 text: 页面文本。
    返回值: 字典列表。
    """
    payloads = []
    for raw in PAYLOAD_RE.findall(text):
        payloads.append(json.loads(raw))
    return payloads


def verify_page(text, questions):
    """校验页面与源题目的对应关系。

    入参 text: 页面文本；questions: 源题目列表。
    返回值: 问题描述列表，无问题返回空列表。
    """
    problems = []
    payloads = read_payloads(text)
    if len(payloads) != len(questions):
        problems.append("题目数量不一致：页面 %d / 源 %d"
                        % (len(payloads), len(questions)))
        return problems
    for payload, item in zip(payloads, questions):
        tag = "第%d题" % item.number
        letters = [letter for letter, _text in item.options]
        want_title = render.normalize(item.title)
        if payload.get("title") != want_title:
            problems.append("%s 题干不一致" % tag)
        want_options = [render.normalize(t) for _l, t in item.options]
        if payload.get("options") != want_options:
            problems.append("%s 选项不一致" % tag)
        expect = letters.index(item.answer) if item.answer in letters else -1
        if payload.get("correct") != [expect]:
            problems.append("%s 答案索引错误：%s，应为 %d"
                            % (tag, payload.get("correct"), expect))
        if not payload.get("explanation"):
            problems.append("%s 缺少解析" % tag)
    return problems
