/**
 * 3D 地形实验室 · 地形剖面图
 * ---------------------------------------------------------------
 * 沿指定方向切一刀，绘制标准地形剖面图（横轴水平距离、纵轴海拔），
 * 剖面下方按分层设色填充，并标注最高点、最低点、相对高差与平均坡度。
 *
 * 对应考点：等高线地形图判读 → 绘制/判读地形剖面图（高频题型）
 */

import { N, GRID_SPAN_M, BASE_ELEV, ELEV_RANGE, CONTOUR_INTERVAL, RAMP } from "./terrain-gen.js";

const PAD = { left: 52, right: 14, top: 16, bottom: 30 };

function rgbCss(c, alpha = 1) {
  return `rgba(${Math.round(c[0] * 255)},${Math.round(c[1] * 255)},${Math.round(c[2] * 255)},${alpha})`;
}

/**
 * 取剖面线上的采样点
 * @param {string} dir "ew"=东西向（沿 x），"ns"=南北向（沿 y）
 * @param {number} pos 0~1，剖面线位置
 * @returns {{ gx:number[], gy:number[], elev:number[] }}
 */
export function sampleLine(terrain, dir, pos) {
  const fixed = Math.round(pos * (N - 1));
  const gx = [], gy = [], elev = [];
  for (let k = 0; k < N; k++) {
    const i = dir === "ew" ? k : fixed;
    const j = dir === "ew" ? fixed : k;
    gx.push(i); gy.push(j);
    elev.push(terrain.elev[j * N + i]);
  }
  return { gx, gy, elev };
}

/**
 * 绘制剖面图
 * @returns {{maxElev:number, minElev:number, relief:number, avgSlope:number,
 *            maxAt:number, minAt:number}}
 */
export function drawProfile(canvas, terrain, dir, pos) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const cssW = canvas.clientWidth || 520;
  const cssH = canvas.clientHeight || 190;
  if (canvas.width !== cssW * dpr || canvas.height !== cssH * dpr) {
    canvas.width = cssW * dpr;
    canvas.height = cssH * dpr;
  }
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cssW, cssH);

  const { elev } = sampleLine(terrain, dir, pos);

  const eMin = BASE_ELEV;
  const eMax = BASE_ELEV + ELEV_RANGE;
  const plotW = cssW - PAD.left - PAD.right;
  const plotH = cssH - PAD.top - PAD.bottom;
  const X = k => PAD.left + (k / (N - 1)) * plotW;
  const Y = e => PAD.top + (1 - (e - eMin) / (eMax - eMin)) * plotH;

  // ---- 背景与水平网格（每一等高距一条）----
  ctx.fillStyle = "rgba(8,12,22,0.55)";
  ctx.fillRect(PAD.left, PAD.top, plotW, plotH);

  ctx.font = "10px system-ui, sans-serif";
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  for (let e = eMin; e <= eMax; e += CONTOUR_INTERVAL) {
    const y = Y(e);
    ctx.strokeStyle = "rgba(255,255,255,0.13)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(PAD.left, y);
    ctx.lineTo(PAD.left + plotW, y);
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.fillText(`${e}`, PAD.left - 6, y);
  }
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.textAlign = "left";
  ctx.fillText("海拔/m", 4, PAD.top - 8 < 8 ? 8 : PAD.top - 8);

  // ---- 分层设色填充：逐列按所在高程带着色 ----
  for (let k = 0; k < N - 1; k++) {
    const x0 = X(k), x1 = X(k + 1);
    const e0 = elev[k], e1 = elev[k + 1];
    const mid = (e0 + e1) / 2;
    let color = RAMP[RAMP.length - 1].color;
    for (const band of RAMP) { if (mid < band.max) { color = band.color; break; } }
    ctx.fillStyle = rgbCss(color, 0.82);
    ctx.beginPath();
    ctx.moveTo(x0, Y(e0));
    ctx.lineTo(x1, Y(e1));
    ctx.lineTo(x1, PAD.top + plotH);
    ctx.lineTo(x0, PAD.top + plotH);
    ctx.closePath();
    ctx.fill();
  }

  // ---- 地表线 ----
  ctx.strokeStyle = "rgba(255,235,190,0.95)";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  elev.forEach((e, k) => (k === 0 ? ctx.moveTo(X(k), Y(e)) : ctx.lineTo(X(k), Y(e))));
  ctx.stroke();

  // ---- 极值点标注 ----
  let maxE = -Infinity, minE = Infinity, maxAt = 0, minAt = 0;
  elev.forEach((e, k) => {
    if (e > maxE) { maxE = e; maxAt = k; }
    if (e < minE) { minE = e; minAt = k; }
  });
  const mark = (k, e, label, color) => {
    const x = X(k), y = Y(e);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, 3.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = "11px system-ui, sans-serif";
    ctx.textAlign = x > PAD.left + plotW * 0.8 ? "right" : "left";
    ctx.textBaseline = "bottom";
    ctx.fillText(`${label} ${Math.round(e)}m`, x + (ctx.textAlign === "right" ? -6 : 6), y - 4);
  };
  mark(maxAt, maxE, "最高", "#ffd98a");
  mark(minAt, minE, "最低", "#8fd8ff");

  // ---- 横轴：水平距离 ----
  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(PAD.left, PAD.top + plotH);
  ctx.lineTo(PAD.left + plotW, PAD.top + plotH);
  ctx.stroke();
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  for (let t = 0; t <= 4; t++) {
    const k = (N - 1) * t / 4;
    const m = (GRID_SPAN_M * t / 4) / 1000;
    ctx.fillText(`${m.toFixed(1)}km`, X(k), PAD.top + plotH + 6);
  }
  ctx.textAlign = "right";
  ctx.fillText(dir === "ew" ? "西 → 东" : "北 → 南", PAD.left + plotW, PAD.top + plotH + 17);

  // ---- 统计量 ----
  const relief = maxE - minE;
  // 平均坡度：沿剖面逐段坡度的平均值（而非最高–最低点连线坡度，
  // 后者在两点相邻时会得出很大的假坡度）
  const dx = GRID_SPAN_M / (N - 1);
  let slopeSum = 0, steepest = 0;
  for (let k = 0; k < N - 1; k++) {
    const g = Math.abs(elev[k + 1] - elev[k]) / dx;
    slopeSum += g;
    if (g > steepest) steepest = g;
  }
  const avgSlope = Math.atan(slopeSum / (N - 1)) * 180 / Math.PI;
  const maxSlope = Math.atan(steepest) * 180 / Math.PI;
  return { maxElev: maxE, minElev: minE, relief, avgSlope, maxSlope, maxAt, minAt };
}
