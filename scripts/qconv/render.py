# -*- coding: utf-8 -*-
"""站点在线练习页渲染器。

把解析出的题目对象渲染为 Hugo 页面文本：frontmatter + 题干 +
sk-question 卡片（JSON 内嵌在 script 标签中）。
"""

import json
import re

BLANK_RE = re.compile(r"（[　\s]*）")
BOLD_RE = re.compile(r"\*\*(.+?)\*\*")
SPACE_RE = re.compile(r"[ \t]{2,}")

FRONT_MATTER = """---
title: 第 {no} 套在线题目
date: '{date}'
url: /exammination/online-practice/{no}-practice
weight: {no}
categories:
  - 考试
tags:
  - 在线练习
coverImg: {cover}
srcDir: exammination/在线练习
---
"""


def normalize(text):
    """规范化题干预设文本。

    入参 text: 原始文本。
    返回值: 全角空括号转半角、去掉加粗标记后的文本。
    """
    text = BOLD_RE.sub(r"\1", text)
    text = SPACE_RE.sub(" ", text)
    text = BLANK_RE.sub("(    )", text)
    return text.strip()


def build_explanation(question):
    """由逐项解析拼出统一的解析文本。

    入参 question: Question 对象。
    返回值: 解析文本字符串。
    """
    if not question.analyses:
        return "本题正确答案是%s。" % question.answer
    parts = []
    for letter, _text in question.options:
        item = question.analyses.get(letter)
        if not item:
            continue
        _mark, text = item
        text = normalize(text).rstrip("。")
        parts.append("选项%s：%s" % (letter, text))
    body = "；".join(parts)
    return "%s。" % body


def build_payload(question):
    """构造卡片 JSON 对象。

    入参 question: Question 对象。
    返回值: 可序列化的字典。
    """
    options = [normalize(text) for _letter, text in question.options]
    letters = [letter for letter, _text in question.options]
    correct = []
    if question.answer in letters:
        correct = [letters.index(question.answer)]
    return {
        "type": "mcq",
        "title": normalize(question.title),
        "options": options,
        "correct": correct,
        "explanation": build_explanation(question),
        "images": [],
    }


def dump_json(payload):
    """序列化为单行 JSON，并做 HTML 敏感字符转义。

    入参 payload: 字典。
    返回值: JSON 字符串。
    """
    text = json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
    return (text.replace("&", "\\u0026")
                .replace("<", "\\u003c")
                .replace(">", "\\u003e"))


def render_card(payload):
    """渲染一张题目卡片。

    入参 payload: 卡片 JSON 字典。
    返回值: 卡片 HTML 文本。
    """
    return "\n".join([
        '<div class="sk-question" data-type="mcq">',
        '<script type="application/json">%s</script>' % dump_json(payload),
        "</div>",
    ])


def render_code(question):
    """渲染题干中的代码块。

    入参 question: Question 对象。
    返回值: Markdown 代码块文本，无代码时返回空串。
    """
    if not question.code:
        return ""
    return "\n".join([
        "```" + question.code_lang,
        question.code,
        "```",
    ])


def render_page(questions, no, date, cover):
    """渲染整页内容。

    入参 questions/no/date/cover。
    返回值: 完整页面文本。
    """
    head = FRONT_MATTER.format(no=no, date=date, cover=cover)
    lines = [head, ""]
    lines.append("# 高中信息技术考试第 %d 套在线题目（2026-1）" % no)
    lines.append("")
    lines.append("> 本套共 %d 题，均为单项选择题。" % len(questions))
    lines.append("")
    lines.append("## 选择题")
    lines.append("")
    for question in questions:
        code = render_code(question)
        if code:
            lines.append(code)
            lines.append("")
        lines.append(render_card(build_payload(question)))
        lines.append("")
    return "\n".join(lines).rstrip() + "\n"
