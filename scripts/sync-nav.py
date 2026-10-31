# -*- coding: utf-8 -*-
"""把导航站（nav.sakaay.com）的 apps.json 同步到主站，供 /nav 页面渲染。

用法：python scripts/sync-nav.py
维护：导航站数据更新后跑一次即可；DROP 里的分组不会被搬到主站
      （校园 / 985 院校 / 211 院校 —— 主站定位是教学与创客资源，不需要院校清单）。
"""
import json
import sys

sys.stdout.reconfigure(encoding="utf-8")

SRC = r"d:\00同步文件\00程序\nav\data\apps.json"
DST = r"d:\00同步文件\00程序\docs-xx\data\apps.json"
DROP = {"校园", "985 院校", "211 院校"}

data = json.load(open(SRC, encoding="utf-8"))
out = []
for g in data:
    title = (g.get("title") or "").strip()
    if title in DROP:
        print("drop:", title, "(items=%d)" % len(g.get("items") or []))
        continue
    # 主站不实现解锁逻辑，lock 字段一律不带
    g.pop("lock", None)
    for it in g.get("items") or []:
        it.pop("confirm", None)
    out.append(g)

with open(DST, "w", encoding="utf-8", newline="\n") as f:
    json.dump(out, f, ensure_ascii=False, indent=2)
    f.write("\n")

print("groups:", len(out), "items:", sum(len(g["items"]) for g in out))
for g in out:
    print("  %-12s %d" % (g["title"], len(g["items"])))
