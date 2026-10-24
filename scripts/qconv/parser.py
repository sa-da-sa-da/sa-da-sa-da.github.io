# -*- coding: utf-8 -*-
"""源题库 Markdown 解析器。

源题库格式::

    ### 【1】题干（　　）
    A. 选项一
    B. 选项二
    C. 选项三
    D. 选项四

    **正确答案：C**

    **逐项解析：**
    - **A（✗）**：解析文本
    - **B（✗）**：解析文本
    - **C（✓）**：解析文本
    - **D（✗）**：解析文本

解析结果为 :class:`Question` 列表。
"""

import re
from dataclasses import dataclass, field

HEAD_RE = re.compile(r"^###\s*【(\d+)】\s*(.*)$")
OPTION_RE = re.compile(r"^([A-D])\.\s*(.*)$")
ANSWER_RE = re.compile(r"^\*\*\s*正确答案[：:]\s*([A-D]+)\s*\*\*\s*$")
ITEM_RE = re.compile(r"^-\s*\*\*([A-D])（([✓✗])）\**\s*[：:]\s*(.*)$")
FENCE_RE = re.compile(r"^```(\w*)\s*$")
SECTION_RE = re.compile(r"^\*\*逐项解析")


@dataclass
class Question:
    """一道题目的解析结果。

    number: 题号（源文件中的【N】）。
    title: 题干。
    options: 选项列表，形如 [("A", "文本"), ...]。
    answer: 正确选项字母。
    analyses: 逐项解析，形如 {"A": ("✓", "文本")}。
    code: 题干中的程序代码（可为空）。
    code_lang: 代码块语言。
    extra: 其它需要保留的正文行。
    """

    number: int = 0
    title: str = ""
    options: list = field(default_factory=list)
    answer: str = ""
    analyses: dict = field(default_factory=dict)
    code: str = ""
    code_lang: str = "python"
    extra: list = field(default_factory=list)


def parse_source(text):
    """解析整份题库文本。

    入参 text: 题库 Markdown 全文。
    返回值: Question 列表。
    """
    return [parse_block(block) for block in split_blocks(text)]


def split_blocks(text):
    """按 "### 【N】" 标题把全文切分成题目块。

    入参 text: 题库 Markdown 全文。
    返回值: 二维列表，每项为一个题目块的行列表。
    """
    blocks = []
    current = None
    for line in text.splitlines():
        if HEAD_RE.match(line):
            if current is not None:
                blocks.append(current)
            current = [line]
        elif current is not None:
            current.append(line)
    if current is not None:
        blocks.append(current)
    return blocks


def parse_block(lines):
    """解析单个题目块。

    入参 lines: 题目块的行列表。
    返回值: Question 对象。
    """
    head = HEAD_RE.match(lines[0])
    question = Question(number=int(head.group(1)))
    question.title = head.group(2).strip()
    code_lines = []
    in_code = False
    for raw in lines[1:]:
        line = raw.rstrip()
        fence = FENCE_RE.match(line)
        if fence:
            in_code = toggle_code(question, code_lines, in_code, fence)
            continue
        if in_code:
            code_lines.append(raw)
            continue
        matched = match_line(question, line)
        if not matched and line.strip():
            question.extra.append(line.strip())
    return question


def toggle_code(question, code_lines, in_code, fence):
    """处理代码围栏的开合。

    入参: question/code_lines/in_code/fence。
    返回值: 新的 in_code 状态。
    """
    if in_code:
        question.code = "\n".join(code_lines)
        code_lines.clear()
        question.code_lang = question.code_lang or "python"
        return False
    question.code_lang = fence.group(1) or "python"
    return True


def match_line(question, line):
    """把一行文本归入选项、答案或逐项解析。

    入参 question/line。
    返回值: 命中返回 True，否则返回 False。
    """
    option = OPTION_RE.match(line)
    if option:
        question.options.append((option.group(1), option.group(2).strip()))
        return True
    answer = ANSWER_RE.match(line)
    if answer:
        question.answer = answer.group(1)
        return True
    item = ITEM_RE.match(line)
    if item:
        question.analyses[item.group(1)] = (
            item.group(2),
            item.group(3).strip(),
        )
        return True
    return SECTION_RE.match(line) is not None
