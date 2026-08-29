/**
 * 数学实验室 · 数据文件
 * ---------------------------------------------------------------
 * 曲线用 2D 函数（在 3D 空间中画在 x-y 平面），y = f(x)。
 */

export const CURVE_COLOR = 0x7fd8ff;      // 函数曲线 青蓝
export const AXIS_COLOR = 0x556688;       // 坐标轴 灰蓝
export const POINT_HI = 0xffd98a;         // 较优点 金黄
export const POINT_LO = 0xff7777;         // 被淘汰点 红
export const OPT_POINT = 0x7ee2a8;        // 最优点 绿
export const RANGE_COLOR = 0x9a8cff;      // 当前区间 紫

/* 单峰函数库（x∈[0,1] 归一化，f 值归一到 [0,1]） */
export const FUNCTIONS = [
  {
    key: "peak",
    name: "抛物线（单峰）",
    desc: "y = 1 - 4(x-0.5)²，最高点在 x=0.5。模拟「先升后降」的工艺参数—产量关系。",
    maxAt: 0.5,
    f: (x) => Math.max(0, 1 - 4 * (x - 0.5) * (x - 0.5)),
  },
  {
    key: "asym",
    name: "偏峰曲线（单峰）",
    desc: "y = 1 - (x-0.25)² 截断到 [0,1]，最高点在 x=0.25。模拟最优点偏左的实际问题。",
    maxAt: 0.25,
    f: (x) => Math.max(0, Math.min(1, 1 - (x - 0.25) * (x - 0.25) * 4)),
  },
  {
    key: "sway",
    name: "陡缓曲线（单峰）",
    desc: "y = 1 - 10(x-0.6)⁴，最高点在 x=0.6，峰顶平缓。模拟「高原型」参数区间。",
    maxAt: 0.6,
    f: (x) => Math.max(0, 1 - 10 * Math.pow(x - 0.6, 4)),
  },
];

/* 0.618 黄金比 */
export const PHI = (Math.sqrt(5) - 1) / 2;   // ≈ 0.618
export const PHI2 = 1 - PHI;                  // ≈ 0.382
