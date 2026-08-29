/**
 * 3D 地形实验室 · 降雨汇流模拟
 * ---------------------------------------------------------------
 * 原理（最陡坡降流向法，D8 思想的连续化版本）：
 *   每个水滴按当前位置的地形梯度向最陡下坡方向加速，
 *   带阻尼与惯性 → 汇集成股 → 逐渐显现出水系网络。
 *
 * 喀斯特特色：水滴有三种归宿
 *   ① 汇入落水洞 → 转为地下径流（喀斯特区地表水易漏失）
 *   ② 汇入地表河流（漓江）→ 地表径流
 *   ③ 滞留封闭洼地 → 积水成潭
 * 这正是「喀斯特区地表水缺乏、地下水丰富」的直观解释。
 */

import { N, sampleH } from "./terrain-gen.js";

const MAX_SPEED = 1.15;      // 每步最大位移（网格单元）
const DAMPING = 0.84;        // 阻尼（模拟摩擦）
const ACCEL = 26;            // 坡度加速度系数
const CRAWL = 0.075;         // 缓坡最小爬行速度（保证平原上仍能汇流）
const CHECK_STEPS = 40;      // 每隔多少步检查一次净位移
const MIN_PROGRESS = 0.9;    // 检查区间内净位移下限（网格单元）
const MAX_SPILL = 4;         // 允许的「洼地满溢」次数，超过则判为积水
const SPILL_R = 3;           // 溢流鲜口搜索半径（网格单元）

export class RainSim {
  /**
   * @param {object} THREE three 模块命名空间
   * @param {object} opts { count, span, hscale }
   */
  constructor(THREE, opts) {
    this.THREE = THREE;
    this.count = opts.count || 1400;
    this.span = opts.span;
    this.hscale = opts.hscale;

    this.terrain = null;
    this.flowAcc = new Float32Array(N * N);
    this.flowMax = 1;
    this.stats = { absorbed: 0, toRiver: 0, ponded: 0 };

    // 水滴状态：位置（网格连续坐标）、速度、低速计数、是否启用
    this.px = new Float32Array(this.count);
    this.py = new Float32Array(this.count);
    this.vx = new Float32Array(this.count);
    this.vy = new Float32Array(this.count);
    // 净位移检查点（用于识别在洼地里打转的水滴）
    this.ox = new Float32Array(this.count);
    this.oy = new Float32Array(this.count);
    this.slow = new Uint16Array(this.count);
    this.spill = new Uint8Array(this.count);   // 已使用的满溢次数
    this.lastCell = new Int32Array(this.count); // 上一步所在格（避免重复累计）
    this.live = new Uint8Array(this.count);

    const geo = new THREE.BufferGeometry();
    this.posAttr = new THREE.BufferAttribute(new Float32Array(this.count * 3), 3);
    this.posAttr.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute("position", this.posAttr);
    this.points = new THREE.Points(
      geo,
      new THREE.PointsMaterial({
        color: 0x7fd4ff,
        size: 0.62,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0.92,
        depthWrite: false
      })
    );
    this.points.visible = false;
    this.points.frustumCulled = false;
  }

  setTerrain(terrain) {
    this.terrain = terrain;
  }

  /** 清空水系累积与统计（切换阶段时调用） */
  reset() {
    this.flowAcc.fill(0);
    this.flowMax = 1;
    this.stats = { absorbed: 0, toRiver: 0, ponded: 0 };
    this.live.fill(0);
    this.points.visible = false;
  }

  /** 开始降雨：所有水滴在坡面随机落点 */
  start() {
    for (let k = 0; k < this.count; k++) this.respawn(k);
    this.points.visible = true;
    this.syncPositions();
  }

  stop() {
    this.points.visible = false;
    this.live.fill(0);
  }

  get raining() {
    return this.points.visible;
  }

  respawn(k) {
    this.px[k] = 1 + Math.random() * (N - 3);
    this.py[k] = 1 + Math.random() * (N - 3);
    this.ox[k] = this.px[k];
    this.oy[k] = this.py[k];
    this.vx[k] = 0;
    this.vy[k] = 0;
    this.slow[k] = 0;
    this.spill[k] = 0;
    this.lastCell[k] = -1;
    this.live[k] = 1;
  }

  /**
   * 洼地满溢：小凹坑被水填满后，从周围最低的鲜口溢出
   * —— 真实水文过程，也避免水滴被微小凹坑永久困住
   * @returns {boolean} 是否成功溢出
   */
  trySpill(k) {
    if (this.spill[k] >= MAX_SPILL) return false;
    const { h } = this.terrain;
    const cx = this.px[k], cy = this.py[k];
    const hc = sampleH(h, cx, cy);
    let bestH = Infinity, bx = cx, by = cy;
    // 在半径 SPILL_R 的圆环上找最低的点（满溢鲜口）
    for (let a = 0; a < 24; a++) {
      const ang = a / 24 * Math.PI * 2;
      const tx = cx + Math.cos(ang) * SPILL_R;
      const ty = cy + Math.sin(ang) * SPILL_R;
      if (tx < 1 || ty < 1 || tx > N - 2 || ty > N - 2) continue;
      const th = sampleH(h, tx, ty);
      if (th < bestH) { bestH = th; bx = tx; by = ty; }
    }
    // 允许略微爬升（模拟积水潭抬高水位），但不能翻过真正的高山
    if (bestH > hc + 0.012) return false;
    this.spill[k]++;
    this.px[k] = bx;
    this.py[k] = by;
    this.ox[k] = bx;
    this.oy[k] = by;
    this.vx[k] = 0;
    this.vy[k] = 0;
    this.slow[k] = 0;
    return true;
  }

  /** 推进一步模拟 */
  step() {
    if (!this.terrain || !this.points.visible) return;
    const { h, river, sink } = this.terrain;
    const d = 0.75;   // 梯度采样步长（网格单元）

    for (let k = 0; k < this.count; k++) {
      if (!this.live[k]) { this.respawn(k); continue; }

      const x = this.px[k], y = this.py[k];
      // 中心差分求梯度（归一化高度对网格坐标）
      const gx = (sampleH(h, x + d, y) - sampleH(h, x - d, y)) / (2 * d);
      const gy = (sampleH(h, x, y + d) - sampleH(h, x, y - d)) / (2 * d);

      let vx = (this.vx[k] - gx * ACCEL) * DAMPING;
      let vy = (this.vy[k] - gy * ACCEL) * DAMPING;
      // 缓坡爬行：只要存在下坡方向，就给一个沿最陡下坡的最小位移
      // （否则平原上水滴会因坡度过小而停止，被误判为洼地积水）
      const gmag = Math.hypot(gx, gy);
      if (gmag > 1e-6) {
        vx += -gx / gmag * CRAWL;
        vy += -gy / gmag * CRAWL;
      }
      const sp = Math.hypot(vx, vy);
      if (sp > MAX_SPEED) { vx = vx / sp * MAX_SPEED; vy = vy / sp * MAX_SPEED; }
      this.vx[k] = vx; this.vy[k] = vy;

      const nx = x + vx, ny = y + vy;

      // 出界：视作流出研究区（汇入干流）
      if (nx < 0.5 || ny < 0.5 || nx > N - 1.5 || ny > N - 1.5) {
        this.stats.toRiver++;
        this.live[k] = 0;
        continue;
      }

      this.px[k] = nx; this.py[k] = ny;

      const idx = (ny | 0) * N + (nx | 0);
      // 汇流量只在「进入新格」时累计，
      // 否则在原地振荡的水滴会把单格累计拉高数十倍，破坏水系配色归一化
      if (idx !== this.lastCell[k]) {
        this.lastCell[k] = idx;
        const acc = ++this.flowAcc[idx];
        if (acc > this.flowMax) this.flowMax = acc;
      }

      // 落水洞：地表水转为地下径流
      if (sink[idx]) {
        this.stats.absorbed++;
        this.live[k] = 0;
        continue;
      }
      // 汇入地表河流
      if (river[idx]) {
        this.stats.toRiver++;
        this.live[k] = 0;
        continue;
      }
      // 净位移判据：每 CHECK_STEPS 步看一次是否真的在往下流
      // （在封闭洼地里水滴会围绕最低点打转，瞬时速度不低但净位移很小）
      if (++this.slow[k] >= CHECK_STEPS) {
        const moved = Math.hypot(nx - this.ox[k], ny - this.oy[k]);
        this.slow[k] = 0;
        this.ox[k] = nx;
        this.oy[k] = ny;
        if (moved < MIN_PROGRESS && !this.trySpill(k)) {
          this.stats.ponded++;
          this.live[k] = 0;
        }
      }
    }
    this.syncPositions();
  }

  /** 把网格坐标写入 Points 的世界坐标缓冲 */
  syncPositions() {
    const arr = this.posAttr.array;
    const { h } = this.terrain;
    const span = this.span, hs = this.hscale;
    for (let k = 0; k < this.count; k++) {
      const gx = this.px[k], gy = this.py[k];
      const o = k * 3;
      if (!this.live[k]) {
        // 已消失的水滴移出视野（下一帧会重新投放）
        arr[o] = 0; arr[o + 1] = -9999; arr[o + 2] = 0;
        continue;
      }
      arr[o] = -span / 2 + (gx / (N - 1)) * span;
      arr[o + 1] = sampleH(h, gx, gy) * hs + 0.32;
      arr[o + 2] = -span / 2 + (gy / (N - 1)) * span;
    }
    this.posAttr.needsUpdate = true;
  }

  /** 汇流统计文本 */
  statText() {
    const s = this.stats;
    const total = s.absorbed + s.toRiver + s.ponded;
    if (total === 0) return "正在降雨……观察水滴沿最陡坡向下汇集";
    const pct = v => Math.round(v / total * 100);
    return `汇入落水洞转为地下径流 <b>${pct(s.absorbed)}%</b>｜`
         + `汇入地表河流 <b>${pct(s.toRiver)}%</b>｜`
         + `滞留洼地后下渗 <b>${pct(s.ponded)}%</b>`;
  }
}
