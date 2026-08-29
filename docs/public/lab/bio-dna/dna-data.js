/**
 * DNA 实验室 · 数据文件
 * ---------------------------------------------------------------
 * 碱基配色（CPK 风格）：
 *   A（腺嘌呤）红 / T（胸腺嘧啶）蓝 / C（胞嘧啶）绿 / G（鸟嘌呤）黄
 * 骨架：磷酸（橙）— 脱氧核糖（青）
 */

export const DNA_COLORS = {
  A: 0xff5555,   // 腺嘌呤 红
  T: 0x55aaff,   // 胸腺嘧啶 蓝
  C: 0x55dd66,   // 胞嘧啶 绿
  G: 0xffcc44,   // 鸟嘌呤 黄
  P: 0xff8c42,   // 磷酸 橙
  S: 0x66dddd,   // 脱氧核糖 青
  H_BOND: 0x888888, // 氢键 灰
};

export const DNA_RADII = {
  A: 0.55, T: 0.55, C: 0.5, G: 0.5,
  P: 0.32, S: 0.4,
};

/* 碱基互补配对表 */
export const BASE_PAIRS = { A: "T", T: "A", C: "G", G: "C" };

/* DNA 双螺旋参数（一个完整螺距 10 对碱基，间距 3.4） */
export const DNA_HELIX = {
  radius: 3.2,      // 螺旋半径
  pitch: 3.4,       // 每圈高度（10 bp）
  turns: 2.5,       // 圈数
  start: 0.4,       // 起点偏移
  pairs: 25,        // 碱基对数
};

/* 一条链的序列（25 bp，随机但合法） */
export const DNA_SEQUENCE =
  "ATCGGTACCAATGCTAGCCTTAAGGAC".slice(0, 25).split("");

/* 孟德尔分离定律动画数据 */
export const SEPARATION = {
  // Aa × Aa，配子 A:a = 1:1，后代 AA:Aa:aa = 1:2:1，显性:隐性 = 3:1
  parents: [
    { name: "亲本 ♂（Aa）", gametes: ["A", "a"] },
    { name: "亲本 ♀（Aa）", gametes: ["A", "a"] },
  ],
  combos: ["AA", "Aa", "Aa", "aa"],
};
