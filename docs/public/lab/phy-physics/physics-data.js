/**
 * 物理实验室 · 数据文件
 * ---------------------------------------------------------------
 * 单摆 + 简谐振动 + 抛体运动的物理参数
 */

export const GRAVITY = 9.8;       // 重力加速度 m/s²
export const PENDULUM_GOLD = 0.618; // 黄金分割，作为示范摆长比

/* 颜色 */
export const COLOR_BOB = 0xffd98a;      // 摆球 金黄
export const COLOR_ROD = 0x9a8cff;      // 摆杆 紫
export const COLOR_PATH = 0x7fd8ff;     // 轨迹 青蓝
export const COLOR_AXIS = 0x556688;      // 坐标轴 灰
export const COLOR_EQ = 0x7ee2a8;        // 平衡位置 绿
export const COLOR_TARGET = 0xff7777;    // 目标/标记 红

/* 单摆演示配置 */
export const PENDULUM_DEMO = [
  { L: 0.25, label: "L=0.25m" },
  { L: 0.40, label: "L=0.40m" },
  { L: 0.62, label: "L=0.62m" },
  { L: 1.00, label: "L=1.00m" },
];