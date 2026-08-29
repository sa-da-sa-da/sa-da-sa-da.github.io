/**
 * 分子结构数据 · 制碱工艺相关分子/晶体
 * ---------------------------------------------------------------
 * 坐标系：three.js 右手系，单位为 three.js 世界单位（约 1 = 1Å 缩放）
 * 原子颜色遵循 CPK 配色标准
 */

/* CPK 原子配色 */
export const ATOM_COLORS = {
  H:  0xffffff,  // 白
  C:  0x333333,  // 深灰
  N:  0x3050f8,  // 蓝
  O:  0xff0d0d,  // 红
  Na: 0xab5cf2,  // 紫
  Cl: 0x1fe01f,  // 绿
};

/* 原子半径（显示用，非精确范德华半径） */
export const ATOM_RADII = {
  H:  0.35,
  C:  0.70,
  N:  0.65,
  O:  0.60,
  Na: 1.20,
  Cl: 1.00,
};

/* 键半径 */
export const BOND_RADIUS = 0.12;

/**
 * NaCl 离子晶体（岩盐结构）
 * 简化版：3×3×3 晶格，Na⁺ 和 Cl⁻ 交替排列
 */
function buildNaClLattice() {
  const atoms = [];
  const bonds = [];
  const size = 2; // -2..2，共5个位置，5×5×5=125个原子
  const spacing = 2.0;

  for (let i = -size; i <= size; i++) {
    for (let j = -size; j <= size; j++) {
      for (let k = -size; k <= size; k++) {
        const isNa = (i + j + k) % 2 === 0;
        const x = i * spacing, y = j * spacing, z = k * spacing;
        atoms.push({ id: atoms.length, elem: isNa ? "Na" : "Cl", pos: [x, y, z] });
      }
    }
  }
  // 键：只连接最近邻（距离 ≈ spacing）
  for (let a = 0; a < atoms.length; a++) {
    for (let b = a + 1; b < atoms.length; b++) {
      const dx = atoms[a].pos[0] - atoms[b].pos[0];
      const dy = atoms[a].pos[1] - atoms[b].pos[1];
      const dz = atoms[a].pos[2] - atoms[b].pos[2];
      const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
      if (dist < spacing * 1.15) bonds.push([a, b]);
    }
  }
  return { atoms, bonds };
}

/**
 * NaHCO₃ 碳酸氢钠 — 球棍模型
 * Na⁺ + HCO₃⁻ 离子对
 */
const nahco3_data = {
  atoms: [
    // Na⁺
    { id: 0, elem: "Na", pos: [3.5, 0, 0] },
    // HCO₃⁻ 离子
    { id: 1, elem: "C",  pos: [0, 0, 0] },     // 中心碳
    { id: 2, elem: "O",  pos: [0, 1.25, 0] },   // O1 (双键O)
    { id: 3, elem: "O",  pos: [-1.08, -0.63, 0] }, // O2 (单键O)
    { id: 4, elem: "O",  pos: [1.08, -0.63, 0] },  // O3 (连H的O)
    { id: 5, elem: "H",  pos: [1.7, -0.2, 0] },   // H 连在O3上
  ],
  bonds: [
    [1, 2, 2],  // C=O 双键
    [1, 3, 1],  // C-O 单键
    [1, 4, 1],  // C-O 单键
    [4, 5, 1],  // O-H 键
    // Na 与最近的O有离子作用（虚线表示，用细键）
    [0, 4, 0.5],
  ],
};

/**
 * NH₄Cl 氯化铵 — 球棍模型
 * NH₄⁺ 四面体 + Cl⁻
 */
const nh4cl_data = {
  atoms: [
    // NH₄⁺ 四面体
    { id: 0, elem: "N",  pos: [0, 0, 0] },
    { id: 1, elem: "H",  pos: [0.63, 0.63, 0.63] },
    { id: 2, elem: "H",  pos: [-0.63, -0.63, 0.63] },
    { id: 3, elem: "H",  pos: [-0.63, 0.63, -0.63] },
    { id: 4, elem: "H",  pos: [0.63, -0.63, -0.63] },
    // Cl⁻
    { id: 5, elem: "Cl", pos: [3.0, 0, 0] },
  ],
  bonds: [
    [0, 1, 1],
    [0, 2, 1],
    [0, 3, 1],
    [0, 4, 1],
    // N-Cl 离子作用（虚线，用细键）
    [0, 5, 0.5],
  ],
};

/**
 * Na₂CO₃ 碳酸钠 — 球棍模型
 * 2Na⁺ + CO₃²⁻
 */
const na2co3_data = {
  atoms: [
    // CO₃²⁻ 碳酸根（平面三角形）
    { id: 0, elem: "C",  pos: [0, 0, 0] },
    { id: 1, elem: "O",  pos: [0, 1.25, 0] },
    { id: 2, elem: "O",  pos: [-1.08, -0.63, 0] },
    { id: 3, elem: "O",  pos: [1.08, -0.63, 0] },
    // 2Na⁺
    { id: 4, elem: "Na", pos: [-3.0, 0, 0] },
    { id: 5, elem: "Na", pos: [3.0, 0, 0] },
  ],
  bonds: [
    [0, 1, 1.5],  // C-O 部分双键（共振平均）
    [0, 2, 1.5],
    [0, 3, 1.5],
    [4, 2, 0.5],
    [5, 3, 0.5],
  ],
};

/* 导出所有分子 */
export const MOLECULES = {
  nacl: {
    name: "氯化钠 (NaCl)",
    formula: "NaCl",
    type: "离子晶体",
    desc: "岩盐结构：Na⁺与Cl⁻交替排列，每个离子被6个异号离子包围。制碱原料。",
    ...buildNaClLattice(),
    isLattice: true,
  },
  nahco3: {
    name: "碳酸氢钠 (NaHCO₃)",
    formula: "NaHCO₃",
    type: "离子化合物",
    desc: "小苏打。Na⁺ + HCO₃⁻。溶解度较小，在制碱工艺中首先析出。",
    ...nahco3_data,
  },
  nh4cl: {
    name: "氯化铵 (NH₄Cl)",
    formula: "NH₄Cl",
    type: "离子化合物",
    desc: "NH₄⁺四面体 + Cl⁻。联合制碱法的副产氮肥。",
    ...nh4cl_data,
  },
  na2co3: {
    name: "碳酸钠 (Na₂CO₃)",
    formula: "Na₂CO₃",
    type: "离子化合物",
    desc: "纯碱。2Na⁺ + CO₃²⁻（平面三角形）。制碱最终产品。",
    ...na2co3_data,
  },
};

/* 离子反应动画粒子数据（文档/参考，实际动画在 molecule-lab.js 中硬编码） */
export const REACTION_PARTICLES = {
  // 反应物：1:1:1:1:1 配比
  reactants: [
    { elem: "Na",  count: 6, speed: 0.015 },
    { elem: "Cl",  count: 6, speed: 0.012 },
    { elem: "N",   count: 6, speed: 0.018, attached: "H3" },  // NH₃
    { elem: "C",   count: 6, speed: 0.014, attached: "O2" },  // CO₂
    { elem: "O",   count: 6, speed: 0.016, attached: "H2" },  // H₂O
  ],
  // 产物：由真实分子模型（nahco3 / nh4cl）生成
  products: [
    { compound: "NaHCO3", label: "NaHCO₃↓", behavior: "precipitate" },
    { compound: "NH4Cl",  label: "NH₄Cl",   behavior: "solution" },
  ],
  // 反应方程式
  equation: "NaCl + NH₃ + CO₂ + H₂O → NaHCO₃↓ + NH₄Cl",
};
