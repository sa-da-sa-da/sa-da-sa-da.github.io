# -*- coding: utf-8 -*-
"""源题库 -> 站点在线练习页 转换脚本。

用法::

    python scripts/convert_online_questions.py            # 生成第 23~27 套
    python scripts/convert_online_questions.py --dry-run   # 只检查不写文件

源题库为桌面 2026-1 题库目录下 5 个 "题目与解析.md"，
输出到 content/exammination/在线练习/ 下的 "第NN套在线题目.md"。
"""

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from qconv import checker, config, parser, render  # noqa: E402


def check_questions(questions, label):
    """检查题目结构是否完整，输出告警。

    入参 questions: 题目列表；label: 套次名称。
    返回值: 告警条数。
    """
    warnings = 0
    for item in questions:
        tag = "%s 第%s题" % (label, item.number)
        if len(item.options) != 4:
            print("[选项数异常] %s：%d 个选项" % (tag, len(item.options)))
            warnings += 1
        if len(item.answer) != 1 or item.answer not in "ABCD":
            print("[答案异常] %s：答案为 %r" % (tag, item.answer))
            warnings += 1
        missing = [k for k, _v in item.options if k not in item.analyses]
        if missing:
            print("[缺解析] %s：%s" % (tag, ",".join(missing)))
            warnings += 1
        if item.extra:
            print("[多余正文] %s：%s" % (tag, " / ".join(item.extra[:3])))
            warnings += 1
        if not item.code and item.title.startswith("阅读程序"):
            print("[缺代码] %s：标题为读程序题但没有代码块" % tag)
            warnings += 1
    return warnings


def convert_set(index, dry_run):
    """转换单套题目并写文件。

    入参 index: 套次序号（0 起）；dry_run: 是否只检查。
    返回值: 题目数量。
    """
    src = config.SOURCE_DIR / config.SOURCE_FILES[index]
    no = config.FIRST_SET_NO + index
    label = "第%d套(%s)" % (no, src.name)
    text = src.read_text(encoding="utf-8")
    questions = parser.parse_source(text)
    check_questions(questions, label)
    page = render.render_page(
        questions,
        no,
        config.SET_DATES[index],
        config.COVER_IMAGES[index],
    )
    out = config.OUTPUT_DIR / ("第%02d套在线题目.md" % no)
    problems = checker.verify_page(page, questions)
    for problem in problems:
        print("[校验失败] %s：%s" % (label, problem))
    print("%s：%d 题 -> %s%s"
          % (label, len(questions), out.name,
             "（校验通过）" if not problems else "（存在问题）"))
    if not dry_run:
        out.write_text(page, encoding="utf-8", newline="\n")
    return len(questions)


def main():
    """命令行入口。

    返回值: 进程退出码。
    """
    parser = argparse.ArgumentParser(
        description="把 2026-1 源题库转换为站点在线练习页")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="只解析并检查，不写出文件",
    )
    args = parser.parse_args()
    total = 0
    for index in range(len(config.SOURCE_FILES)):
        total += convert_set(index, args.dry_run)
    print("合计 %d 题" % total)
    return 0


if __name__ == "__main__":
    sys.exit(main())
