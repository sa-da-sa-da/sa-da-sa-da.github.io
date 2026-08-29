/**
 * 3D 地形实验室 · 高程数据生成与地形图算法
 * ---------------------------------------------------------------
 * 内容：
 *   1. 喀斯特地貌三阶段高程场生成（峰丛 → 峰林 → 孤峰）
 *   2. 分层设色配色表（对标地图册「分层设色地形图」惯用色系）
 *   3. 等高线提取（marching squares）
 *
 * 地理依据：
 *   · 峰丛：山峰基座相连，洼地封闭，溶蚀发育较早阶段
 *   · 峰林：基座被溶蚀切开，山峰平地拔起、各自分离
 *   · 孤峰：溶蚀晚期大部山体被夷平，仅少数残留山峰立于平原
 *   · 落水洞：洼地底部通向地下河的垂向通道，地表水由此转为地下径流
 *   （人教版《地理必修第一册》第四章第一节）
 *
 * 高程标度：桂林一带平原面海拔约 150m，峰顶多在 400~500m
 *   → 本模型 elev = BASE_ELEV + h * ELEV_RANGE，范围约 120~500m
 */

export const N = 96;                 // 网格边长（顶点数）
export const BASE_ELEV = 120;        // 最低海拔 m
export const ELEV_RANGE = 380;       // 高差 m
export const GRID_SPAN_M = 4000;     // 网格实际跨度（4 千米）
export const CONTOUR_INTERVAL = 50;  // 等高距 m

/* ============ 分层设色配色（由低到高） ============ */
export const RAMP = [
  { max: 170, color: [0.18, 0.49, 0.31], label: "120–170" },
  { max: 220, color: [0.30, 0.60, 0.35], label: "170–220" },
  { max: 270, color: [0.56, 0.71, 0.35], label: "220–270" },
  { max: 320, color: [0.85, 0.78, 0.47], label: "270–320" },
  { max: 370, color: [0.79, 0.64, 0.29], label: "320–370" },
  { max: 420, color: [0.70, 0.50, 0.25], label: "370–420" },
  { max: 470, color: [0.59, 0.38, 0.23], label: "420–470" },
  { max: 1e9, color: [0.48, 0.28, 0.20], label: "470 以上" }
];
export const RIVER_COLOR = [0.18, 0.44, 0.63];
export const SINK_COLOR = [0.36, 0.29, 0.44];

export function elevColor(elev, isRiver, isSink) {
  if (isRiver) return RIVER_COLOR;
  if (isSink) return SINK_COLOR;
  for (const band of RAMP) if (elev < band.max) return band.color;
  return RAMP[RAMP.length - 1].color;
}

/* ============ 确定性随机（保证每次进入实验室地形一致） ============ */
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ============ 峰体 / 河流 / 落水洞 的固定布局 ============ */
const rnd = mulberry32(20260728);

/** 山峰：位置、半径、相对高度、抗溶蚀能力（决定晚期能否残留） */
const PEAKS = Array.from({ length: 30 }, () => {
  const h = 0.50 + rnd() * 0.50;
  return {
    x: 0.07 + rnd() * 0.86,
    y: 0.07 + rnd() * 0.86,
    r: 0.052 + rnd() * 0.062,
    h,
    // 抗溶蚀能力与山体规模正相关：高大山体更易残留为孤峰
    res: 0.45 * rnd() + 0.55 * h
  };
});

/* 按抗溶蚀能力降序排名：rank=0 最难被溶蚀，晚期残留为孤峰 */
(() => {
  const order = PEAKS.map((p, i) => ({ i, res: p.res })).sort((a, b) => b.res - a.res);
  order.forEach((o, rank) => { PEAKS[o.i].rank = rank; });
})();

/** 各阶段残留山峰数：峰林期 30 座 → 孤峰期 5 座 */
const PEAK_COUNT_EARLY = PEAKS.length;
const PEAK_COUNT_LATE = 5;

/** 漓江：自西北流向东南的弯曲河道（折线控制点） */
const RIVER_PTS = [
  [0.02, 0.20], [0.18, 0.28], [0.33, 0.40], [0.45, 0.52],
  [0.58, 0.58], [0.72, 0.70], [0.86, 0.82], [0.99, 0.92]
];

/** 落水洞：位于峰间洼地，地表水由此汇入地下河 */
const SINKS = [
  { x: 0.24, y: 0.62, r: 0.030 },
  { x: 0.62, y: 0.24, r: 0.028 },
  { x: 0.80, y: 0.44, r: 0.026 },
  { x: 0.40, y: 0.80, r: 0.028 },
  { x: 0.14, y: 0.40, r: 0.024 }
];

/* ============ 值噪声（细部起伏，避免塑料感） ============ */
const NOISE_SIZE = 32;
const noiseGrid = Array.from({ length: NOISE_SIZE * NOISE_SIZE }, () => rnd());
function valueNoise(u, v) {
  const x = u * NOISE_SIZE, y = v * NOISE_SIZE;
  const x0 = Math.floor(x), y0 = Math.floor(y);
  const fx = x - x0, fy = y - y0;
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  const at = (i, j) =>
    noiseGrid[((j % NOISE_SIZE) + NOISE_SIZE) % NOISE_SIZE * NOISE_SIZE +
              (((i % NOISE_SIZE) + NOISE_SIZE) % NOISE_SIZE)];
  const a = at(x0, y0), b = at(x0 + 1, y0), c = at(x0, y0 + 1), d = at(x0 + 1, y0 + 1);
  return (a * (1 - sx) + b * sx) * (1 - sy) + (c * (1 - sx) + d * sx) * sy;
}

/* ============ 点到河道折线的最近距离与沿河位置 ============ */
function riverGeom(u, v) {
  let best = 1e9, bestT = 0;
  const total = RIVER_PTS.length - 1;
  for (let k = 0; k < total; k++) {
    const [ax, ay] = RIVER_PTS[k], [bx, by] = RIVER_PTS[k + 1];
    const dx = bx - ax, dy = by - ay;
    const len2 = dx * dx + dy * dy;
    let t = ((u - ax) * dx + (v - ay) * dy) / len2;
    t = Math.max(0, Math.min(1, t));
    const px = ax + t * dx, py = ay + t * dy;
    const d = Math.hypot(u - px, v - py);
    if (d < best) { best = d; bestT = (k + t) / total; }
  }
  return { dist: best, along: bestT };
}

/**
 * 生成指定演化阶段的高程场
 * @param {number} stage 0=峰丛期，1=峰林期，2=孤峰期（可取小数，实现连续过渡）
 * @returns {{h:Float32Array, elev:Float32Array, river:Uint8Array, sink:Uint8Array,
 *            minElev:number, maxElev:number}}
 */
export function buildTerrain(stage) {
  const s = Math.max(0, Math.min(2, stage));
  const h = new Float32Array(N * N);
  const elev = new Float32Array(N * N);
  const river = new Uint8Array(N * N);
  const sink = new Uint8Array(N * N);

  const lerp = (a, b, t) => a + (b - a) * t;
  // 平原（洼地）基面：溶蚀越充分，基面越低平
  const plain = s <= 1 ? lerp(0.30, 0.155, s) : lerp(0.155, 0.075, s - 1);
  // 峰顶目标高度：山体逐步被夷低
  const summitMax = s <= 1 ? lerp(0.95, 0.87, s) : lerp(0.87, 0.75, s - 1);
  // 基座连片程度：峰丛期为 1，峰林期起归零
  const apronW = Math.max(0, 1 - s);
  const apronCap = 0.17;
  // 晚期溶蚀强度：只有抗溶蚀强的山峰能残留为孤峰
  const late = Math.max(0, s - 1);
  // 当前残留山峰数（带小数，使边界山峰平滑瞮小）
  const keepCount = lerp(PEAK_COUNT_EARLY, PEAK_COUNT_LATE, late);

  let minE = Infinity, maxE = -Infinity;

  for (let j = 0; j < N; j++) {
    for (let i = 0; i < N; i++) {
      const u = i / (N - 1), v = j / (N - 1);

      // ---- 基座裙（峰丛期使山峰基座相连）----
      let apron = 0;
      // ---- 塔状峰体：取最大值而非叠加，保证峰顶高度可控 ----
      let tower = 0;

      for (const p of PEAKS) {
        // 残留判定：按抗溶蚀排名，晚期仅少数山峰残留为孤峰
        const survive = Math.max(0, Math.min(1, keepCount - p.rank));
        if (survive <= 0) continue;
        const d = Math.hypot(u - p.x, v - p.y);
        const summit = summitMax * (0.70 + 0.30 * p.h) * survive;

        const t = d / (p.r * (0.90 + 0.20 * valueNoise(u * 5.5 + p.x * 9, v * 5.5 + p.y * 9)));
        if (t < 1) {
          const z = summit * Math.pow(1 - t * t, 0.65);   // 降壁圆顶的塔状峰体
          if (z > tower) tower = z;
        }
        if (apronW > 0) {
          const ta = d / (p.r * 2.6);
          apron += summit * 0.30 * Math.exp(-ta * ta) * apronW;
        }
      }

      // ---- 区域坡度：平原面自分水岭向干流缓缓倾斜 ----
      // （否则平原完全水平，降水无法汇流成水系）
      const rg = riverGeom(u, v);
      const rampT = Math.min(1, rg.dist / 0.42);
      const ramp = 0.13 * (rampT * rampT * (3 - 2 * rampT));   // smoothstep
      let z = Math.max(plain + Math.min(apron, apronCap) + ramp, tower);

      // ---- 峰丛期的封闭洼地：山峰之间成片出现不规则洼地 ----
      if (apronW > 0 && tower < 0.02) {
        const nlow = valueNoise(u * 3.6 + 4.1, v * 3.6 + 7.3);
        const dimple = Math.max(0, 0.52 - nlow) * 2;      // 0~1
        z -= 0.095 * dimple * apronW;
      }

      // ---- 河谷下切：强制河道降到侵蚀基面（上游高、下游低）----
      const rw = 0.044 + 0.022 * s;
      const riverBase = lerp(0.26, 0.085, rg.along) * lerp(1.0, 0.82, s / 2);
      // 指数 1.5 比高斯更缓，避免河岸出现垂直峡壁
      const w = Math.exp(-Math.pow(rg.dist / rw, 1.5));
      z = z * (1 - w) + riverBase * w;
      // 河道及河漫滩（谷底平坦部分）都计作地表水系
      if (rg.dist < rw * 0.8) river[j * N + i] = 1;

      // ---- 落水洞与封闭洼地 ----
      for (const k of SINKS) {
        const d = Math.hypot(u - k.x, v - k.y);
        const t = d / k.r;
        if (t < 1.8) z -= 0.075 * Math.exp(-t * t * 1.6);
        if (t < 0.55) sink[j * N + i] = 1;
      }

      // ---- 细部起伏（幅度明显小于区域坡度，不打乱排水方向）----
      z += (valueNoise(u * 2.4, v * 2.4) - 0.5) * 0.010;
      z += (valueNoise(u * 6.5, v * 6.5) - 0.5) * 0.004;

      z = Math.max(0, Math.min(1, z));
      h[j * N + i] = z;
      const e = BASE_ELEV + z * ELEV_RANGE;
      elev[j * N + i] = e;
      if (e < minE) minE = e;
      if (e > maxE) maxE = e;
    }
  }
  return { h, elev, river, sink, minElev: minE, maxElev: maxE };
}

/* ============ 等高线提取（marching squares） ============
 * 返回若干线段，坐标为网格连续坐标 [i1, j1, i2, j2]
 */
export function contourSegments(elev, level) {
  const segs = [];
  const at = (i, j) => elev[j * N + i];
  // 顶点沿边的线性插值位置
  const lerpEdge = (v1, v2) => (level - v1) / (v2 - v1);

  for (let j = 0; j < N - 1; j++) {
    for (let i = 0; i < N - 1; i++) {
      const a = at(i, j), b = at(i + 1, j), c = at(i + 1, j + 1), d = at(i, j + 1);
      let code = 0;
      if (a > level) code |= 1;
      if (b > level) code |= 2;
      if (c > level) code |= 4;
      if (d > level) code |= 8;
      if (code === 0 || code === 15) continue;

      // 四条边的交点（上 右 下 左）
      const top    = () => [i + lerpEdge(a, b), j];
      const right  = () => [i + 1, j + lerpEdge(b, c)];
      const bottom = () => [i + lerpEdge(d, c), j + 1];
      const left   = () => [i, j + lerpEdge(a, d)];

      const push = (p, q) => segs.push(p[0], p[1], q[0], q[1]);

      switch (code) {
        case 1: case 14: push(left(), top()); break;
        case 2: case 13: push(top(), right()); break;
        case 3: case 12: push(left(), right()); break;
        case 4: case 11: push(right(), bottom()); break;
        case 6: case 9:  push(top(), bottom()); break;
        case 7: case 8:  push(left(), bottom()); break;
        case 5:  push(left(), top());    push(right(), bottom()); break;
        case 10: push(top(), right());   push(left(), bottom());  break;
      }
    }
  }
  return segs;
}

/** 全部等高线层级（按等高距枚举） */
export function contourLevels() {
  const levels = [];
  const start = Math.ceil((BASE_ELEV + 10) / CONTOUR_INTERVAL) * CONTOUR_INTERVAL;
  for (let e = start; e <= BASE_ELEV + ELEV_RANGE; e += CONTOUR_INTERVAL) levels.push(e);
  return levels;
}

/** 双线性采样归一化高度（供水滴运动使用） */
export function sampleH(h, gx, gy) {
  const x = Math.max(0, Math.min(N - 1.001, gx));
  const y = Math.max(0, Math.min(N - 1.001, gy));
  const i = Math.floor(x), j = Math.floor(y);
  const fx = x - i, fy = y - j;
  const a = h[j * N + i], b = h[j * N + i + 1];
  const c = h[(j + 1) * N + i], d = h[(j + 1) * N + i + 1];
  return (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy;
}

/** 阶段说明（教学提示文案） */
export function stageInfo(stage) {
  if (stage < 0.67) {
    return {
      name: "峰丛期",
      tip: "山峰基座相连、簇生成群，峰间是封闭洼地——溶蚀发育的较早阶段。注意看：等高线在山峰之间并不闭合到平原面，说明基座还连在一起。"
    };
  }
  if (stage < 1.5) {
    return {
      name: "峰林期",
      tip: "溶蚀继续，基座被切开，山峰平地拔起、各自分离。等高线开始出现一圈圈独立闭合的山峰，河谷明显展宽。"
    };
  }
  return {
    name: "孤峰期",
    tip: "大部分山体被夷平为平原，只有抗溶蚀较强的少数山峰残留为孤峰（如桂林独秀峰、象鼻山）。等高线大片稀疏，仅零星几处密集闭合。"
  };
}
