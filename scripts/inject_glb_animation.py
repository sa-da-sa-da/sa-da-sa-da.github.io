#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""为 GLB 注入循环「微风摆动 + 呼吸」动画，供 Google <model-viewer autoplay> 播放。

设计要点：
- 纯标准库实现（环境无 numpy / trimesh），直接读写 GLB 容器。
- 不修改模型原有变换：新建一个空的 SwayRoot 父节点包住原场景根节点，
  只对该父节点写入 rotation / scale 关键帧，避免覆盖模型自身的 TRS。
- glTF 规范细节：动画 input 访问器必须提供 min/max；动画数据的 bufferView
  不得设置 target；所有 byteOffset 需按分量大小对齐（这里统一 4 字节对齐）。

用法：
    python scripts/inject_glb_animation.py [INPUT.glb] [OUTPUT.glb]
"""
import json
import math
import os
import struct
import sys

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL_DIR = os.path.join(REPO, "hugo", "static", "models")

DEFAULT_IN = os.path.join(MODEL_DIR, "sakaay-avatar.src.glb")
DEFAULT_OUT = os.path.join(MODEL_DIR, "sakaay-avatar.glb")

FLOAT = 5126
SCALAR, VEC3, VEC4 = "SCALAR", "VEC3", "VEC4"

# ---- 动画参数（可按需微调）----
PERIOD = 6.0        # 一个完整循环，单位秒
SAMPLES = 60        # 采样点数（含首尾），越多越平滑
SWAY_DEG = 2.2      # 左右摆动最大角度（度），过大会显得突兀
BREATHE = 0.012     # 呼吸缩放幅度（比例）


def read_glb(path):
    raw = open(path, "rb").read()
    magic, _ver, _len = struct.unpack_from("<III", raw, 0)
    if magic != 0x46546C67:
        raise SystemExit("ERROR: %s 不是 GLB 文件" % path)
    off = 12
    gltf = bin_data = None
    while off < len(raw):
        clen, ctype = struct.unpack_from("<II", raw, off)
        body = raw[off + 8:off + 8 + clen]
        tag = struct.pack("<I", ctype).decode("latin1").rstrip("\x00")
        if tag == "JSON":
            gltf = json.loads(body.decode("utf-8"))
        elif tag == "BIN":
            bin_data = body
        off += 8 + clen
    return gltf, bin_data


def pad4(n):
    return (4 - (n & 3)) & 3


def build_keyframes():
    """生成时间、四元数（绕 Z 轴摆动）、缩放（呼吸）三组数据，首尾相接可无缝循环。"""
    times = []
    rots = []
    scales = []
    for i in range(SAMPLES + 1):
        phase = float(i) / SAMPLES            # 0~1
        t = phase * PERIOD
        angle_deg = SWAY_DEG * math.sin(2 * math.pi * phase)
        half = math.radians(angle_deg) / 2.0
        # 绕 Z 轴的四元数 (x, y, z, w)
        rots.append((0.0, 0.0, math.sin(half), math.cos(half)))
        # 呼吸：0 -> 1 -> 0 的余弦曲线
        k = 0.5 - 0.5 * math.cos(2 * math.pi * phase)
        s = 1.0 + BREATHE * k
        scales.append((s, s, s))
        times.append(t)
    return times, rots, scales


def main():
    src = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_IN
    dst = sys.argv[2] if len(sys.argv) > 2 else DEFAULT_OUT
    gltf, bin_data = read_glb(src)
    bviews = gltf["bufferViews"]

    # 保留原有数据
    blobs = {}
    for i, bv in enumerate(bviews):
        s = bv.get("byteOffset", 0)
        blobs[i] = bin_data[s:s + bv["byteLength"]]

    # ---- 新建 SwayRoot 父节点，避免覆盖模型原变换 ----
    scene_idx = gltf.get("scene", 0)
    scene = gltf["scenes"][scene_idx]
    old_roots = list(scene.get("nodes") or [0])
    gltf.setdefault("nodes", []).append({"name": "SwayRoot", "children": old_roots})
    sway_node = len(gltf["nodes"]) - 1
    scene["nodes"] = [sway_node]

    # ---- 关键帧数据 ----
    times, rots, scales = build_keyframes()
    n = len(times)
    accessors = gltf.setdefault("accessors", [])

    acc_time_idxs = []
    for _ in (0, 1):  # rotation / scale 各用一个 input
        buf = bytearray()
        for t in times:
            buf += struct.pack("<f", t)
        bvi = len(blobs)
        blobs[bvi] = bytes(buf)
        bviews.append({"buffer": 0, "byteLength": len(buf)})  # 无 target
        acc_idx = len(accessors)
        accessors.append({
            "bufferView": bvi,
            "componentType": FLOAT,
            "count": n,
            "type": SCALAR,
            "min": [0.0],
            "max": [float(PERIOD)],
        })
        acc_time_idxs.append(acc_idx)

    def add_output(type_, comp_count, rows):
        buf = bytearray()
        for row in rows:
            buf += struct.pack("<" + "f" * comp_count, *row)
        bvi = len(blobs)
        blobs[bvi] = bytes(buf)
        bviews.append({"buffer": 0, "byteLength": len(buf)})
        acc_idx = len(accessors)
        accessors.append({
            "bufferView": bvi,
            "componentType": FLOAT,
            "count": len(rows),
            "type": type_,
        })
        return acc_idx

    acc_rot = add_output(VEC4, 4, rots)
    acc_scale = add_output(VEC3, 3, scales)

    gltf["animations"] = [{
        "name": "sway-breathe",
        "samplers": [
            {"input": acc_time_idxs[0], "interpolation": "LINEAR", "output": acc_rot},
            {"input": acc_time_idxs[1], "interpolation": "LINEAR", "output": acc_scale},
        ],
        "channels": [
            {"sampler": 0, "target": {"node": sway_node, "path": "rotation"}},
            {"sampler": 1, "target": {"node": sway_node, "path": "scale"}},
        ],
    }]

    # ---- 重写 buffer（保留原顺序，追加新数据，统一 4 字节对齐）----
    new_bin = bytearray()
    for i, bv in enumerate(bviews):
        while len(new_bin) % 4:
            new_bin += b"\x00"
        bv["byteOffset"] = len(new_bin)
        bv["byteLength"] = len(blobs[i])
        new_bin += blobs[i]
    gltf["buffers"] = [{"byteLength": len(new_bin)}]

    js = json.dumps(gltf, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    js += b" " * pad4(len(js))
    bn = bytes(new_bin)
    bn += b"\x00" * pad4(len(bn))
    out = bytearray()
    out += struct.pack("<III", 0x46546C67, 2, 12 + 8 + len(js) + 8 + len(bn))
    out += struct.pack("<II", len(js), 0x4E4F534A)
    out += js
    out += struct.pack("<II", len(bn), 0x004E4942)
    out += bn

    os.makedirs(os.path.dirname(dst), exist_ok=True)
    open(dst, "wb").write(bytes(out))
    print("IN_MB: %.2f" % (os.path.getsize(src) / 1048576.0))
    print("OUT_MB: %.2f" % (len(out) / 1048576.0))
    print("ANIMATION: %d keyframes, period=%.1fs, sway=%.1f deg, breathe=%.3f" % (
        n, PERIOD, SWAY_DEG, BREATHE))
    return 0


if __name__ == "__main__":
    sys.exit(main())
