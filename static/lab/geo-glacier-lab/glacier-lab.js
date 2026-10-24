/**
 * 冰川作用实验室 · 主模块
 * ---------------------------------------------------------------
 * 功能：
 *   单时间轴演示冰川如何改造山谷：
 *     ① 初始：河流下切的 V 形谷（横剖面呈 V 字）
 *     ② 冰期推进：冰川自源头下刨，V 谷被改造为 U 形谷，源头刨出冰斗
 *     ③ 冰川鼎盛：整谷填满冰体，横剖面已成 U 形
 *     ④ 冰退时期：冰川消退，冰碛（砾石泥沙，大小混杂、无分选）沿途堆积
 *     ⑤ 冰后期：U 谷、冰斗、冰碛保留——曾被冰川覆盖的证据
 *
 * 交互：演化时间轴（拖动 / 播放）、3D⇄俯视、冰碛显示开关。
 * 依赖：./vendor/three.module.js（本地离线副本）
 */

import * as THREE from "./vendor/three.module.js";

const SPAN = 120;       // 地形世界边长
const N = 72;            // 网格分辨率
const COLOR_BASE = 3;    // 岩色映射基准（最低岩石高度）
const WALL = 36;         // 谷壁（边缘）高度
const FLOOR_V = 3;       // V 形谷底高度（最低、最尖）
const FLOOR_U = 7;       // U 形谷底高度（宽平、略高）
const ICE_THICK = 17;    // 冰体厚度
const ICE_CUTOFF = 28;   // 高于此高度视为谷壁，不积冰

// 平滑过渡
function smoothstep(a, b, x) {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}
function gauss(x, s) { return Math.exp(-(x * x) / (2 * s * s)); }

// 雪花圆形贴图（径向渐变，避免方块感）
function makeSnowTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d");
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.45, "rgba(255,255,255,0.8)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

// 沿谷坐标 u∈[0,1]（0=源头，1=河口）；横谷坐标 v∈[-1,1]
// 河流 V 形谷：底部尖锐、谷壁陡（三角形断面）
function valleyV(u, v) {
  const a = Math.abs(v);
  const wallStart = 0.78;            // |v| 超过此值进入陡立谷壁
  if (a <= wallStart) return FLOOR_V + (WALL - FLOOR_V) * (a / wallStart);
  return WALL + (a - wallStart) * 6; // 谷壁外缘略升，避免突变
}
// 冰川 U 形谷：底部宽平、两侧陡（梯形断面）
function valleyU(u, v) {
  const a = Math.abs(v);
  const flat = 0.5;                  // |v| < 0.5 为宽平底
  if (a <= flat) return FLOOR_U;
  const k = (a - flat) / (1 - flat);
  return FLOOR_U + (WALL - FLOOR_U) * (k * k);
}
// 源头冰斗：u 很小处向下刨出的围椅状凹地
function cirque(u, v) {
  if (u > 0.16) return 0;
  return 11 * gauss(u / 0.07, 1) * gauss(v / 0.55, 1);
}

// 冰川前锋（用于冰体充填 & 地形冰蚀）：t:0→0.5 推进 0→1
function frontNorm(t) {
  if (t <= 0.5) return t * 2 - 0.04;   // t=0 → -0.04（全 V），t=0.5 → 0.96（近全 U）
  return 1;
}
// 冰舌末端（冰退时缩回源头）
function snout(t) { return t <= 0.5 ? Math.max(0, t * 2) : Math.max(0, 1 - (t - 0.5) * 2); }

// 地形冰蚀程度（0=纯 V，1=纯 U），按前锋位置平滑
function carveAmount(u, t) {
  const f = Math.max(0, frontNorm(t));
  return 1 - smoothstep(f - 0.06, f + 0.02, u);
}

// 地形高度
function heightAt(u, v, t) {
  const carve = carveAmount(u, t);
  const base = valleyV(u, v) * (1 - carve) + valleyU(u, v) * carve;
  return base - cirque(u, v) + 1.5 * (1 - u); // 源头略高，制造纵向坡度
}

// 冰体顶面高度（无冰返回 -999）
function iceAt(u, v, t) {
  const f = frontNorm(t), s = snout(t);
  if (u >= s) return -999;
  if (u >= f + 0.02 && t <= 0.5) return -999; // 推进尚未到达
  const floor = valleyU(u, v);
  if (floor > ICE_CUTOFF) return -999;        // 谷壁不积冰
  return Math.min(floor + ICE_THICK, WALL * 0.95);
}

// 高度→岩色（低暗岩、中棕、顶雪白）
function rockColor(h) {
  const t = Math.max(0, Math.min(1, (h - COLOR_BASE) / (WALL - COLOR_BASE)));
  let r, g, b;
  if (t < 0.5) { const k = t / 0.5; r = 70 + k * 70; g = 58 + k * 40; b = 46 + k * 30; }
  else { const k = (t - 0.5) / 0.5; r = 140 + k * 100; g = 98 + k * 130; b = 76 + k * 150; }
  return [r / 255, g / 255, b / 255];
}

export class GlacierLab {
  constructor(root) {
    this.root = root;
    this.t = 0;
    this.playing = false;
    this.showMoraine = true;
    this.showSnow = true;
    this.topView = false;
    this.running = false;
    this.frame = 0;

    this.buildDom();
    this.initThree();
    this.rebuild();
    this.bindEvents();
  }

  buildDom() {
    this.root.innerHTML = `
      <div class="lab-wrap">
        <aside class="lab-panel">
          <div class="lab-head">
            <div class="lab-title">冰川作用实验室</div>
            <div class="lab-sub">V 形谷 → U 形谷 · 冰斗 · 冰碛</div>
          </div>

          <div class="lab-group">
            <div class="lab-group-title">① 演化时间轴</div>
            <input type="range" id="gl-stage" min="0" max="100" value="0" class="lab-range" />
            <div class="lab-stage-marks"><span>河流V谷</span><span>冰期推进</span><span>冰川鼎盛</span><span>冰退·冰碛</span><span>冰后期</span></div>
            <div class="lab-stage-name" id="gl-stage-name">河流 V 形谷</div>
            <div class="lab-tip" id="gl-stage-tip"></div>
          </div>

          <div class="lab-group">
            <div class="lab-group-title">② 演示控制</div>
            <div class="lab-btn-row">
              <button class="lab-btn primary" id="gl-btn-play">▶ 播放冰川作用</button>
              <button class="lab-btn" id="gl-btn-reset">↺ 重置</button>
            </div>
            <div class="lab-btn-row">
              <button class="lab-btn" id="gl-btn-view">俯视剖面</button>
              <button class="lab-btn active" id="gl-btn-moraine">冰碛 显示</button>
            </div>
            <div class="lab-btn-row">
              <button class="lab-btn active" id="gl-btn-snow">下雪 显示</button>
            </div>
            <div class="lab-stat" id="gl-stat"></div>
          </div>

          <div class="lab-group">
            <div class="lab-group-title">③ 对照要点</div>
            <div class="lab-tip">
              · 流水下切 → <b>V 形谷</b>（谷壁陡、底部尖）<br/>
              · 冰川刨蚀 → <b>U 形谷</b>（两壁陡立、谷底宽平）<br/>
              · 源头刨蚀 → <b>冰斗</b>（围椅状凹地）<br/>
              · 冰退堆积 → <b>冰碛</b>（砾石泥沙，大小混杂、无分选，沿谷与谷壁堆积）
            </div>
          </div>

          <div class="lab-group">
            <div class="lab-group-title">④ 横断面示意（中游）</div>
            <canvas id="gl-section" width="280" height="130" style="width:100%;height:auto;background:#0c1828;border-radius:8px;display:block;"></canvas>
            <div class="lab-tip" id="gl-section-label" style="margin-top:6px;"></div>
          </div>

          <button class="lab-btn back" id="gl-btn-back">← 返回主菜单（Esc）</button>
          <div class="lab-foot">鼠标拖动旋转 · 滚轮缩放 · 右键拖动平移</div>
        </aside>

        <div class="lab-stage-area">
          <div class="lab-canvas" id="gl-canvas"></div>
        </div>
      </div>
    `;

    this.elCanvas = this.root.querySelector("#gl-canvas");
    this.elStage = this.root.querySelector("#gl-stage");
    this.elStageName = this.root.querySelector("#gl-stage-name");
    this.elStageTip = this.root.querySelector("#gl-stage-tip");
    this.elBtnPlay = this.root.querySelector("#gl-btn-play");
    this.elBtnReset = this.root.querySelector("#gl-btn-reset");
    this.elBtnView = this.root.querySelector("#gl-btn-view");
    this.elBtnMoraine = this.root.querySelector("#gl-btn-moraine");
    this.elBtnSnow = this.root.querySelector("#gl-btn-snow");
    this.elStat = this.root.querySelector("#gl-stat");
    this.elBtnBack = this.root.querySelector("#gl-btn-back");
    this.elSection = this.root.querySelector("#gl-section");
    this.elSectionLabel = this.root.querySelector("#gl-section-label");
  }

  initThree() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.elCanvas.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a1422);
    this.scene.fog = new THREE.Fog(0x0a1422, 160, 320);

    this.camera = new THREE.PerspectiveCamera(46, 1, 0.5, 1200);
    this.orbit = { theta: -Math.PI * 0.22, phi: 0.95, dist: 175, target: new THREE.Vector3(0, 6, 0) };
    this.applyCamera();

    this.scene.add(new THREE.HemisphereLight(0xcfe6ff, 0x2a2630, 0.85));
    const sun = new THREE.DirectionalLight(0xfff4e0, 1.1);
    sun.position.set(-70, 120, 60);
    this.scene.add(sun);
    const fill = new THREE.DirectionalLight(0x9fc2ff, 0.35);
    fill.position.set(80, 40, -60);
    this.scene.add(fill);

    // 地形
    const geo = new THREE.PlaneGeometry(SPAN, SPAN, N - 1, N - 1);
    geo.rotateX(-Math.PI / 2);
    geo.setAttribute("color", new THREE.BufferAttribute(new Float32Array(N * N * 3), 3));
    this.terrainGeo = geo;
    this.terrainMesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }));
    this.scene.add(this.terrainMesh);

    // 冰体
    const igeo = new THREE.PlaneGeometry(SPAN, SPAN, N - 1, N - 1);
    igeo.rotateX(-Math.PI / 2);
    igeo.setAttribute("color", new THREE.BufferAttribute(new Float32Array(N * N * 3), 3));
    this.iceGeo = igeo;
    this.iceMesh = new THREE.Mesh(igeo, new THREE.MeshLambertMaterial({
      vertexColors: true, transparent: true, opacity: 0.74, side: THREE.DoubleSide, depthWrite: false
    }));
    this.scene.add(this.iceMesh);

    // 冰碛（沉积小丘群）
    this.moraineGroup = new THREE.Group();
    this.scene.add(this.moraineGroup);

    // 飘雪粒子系统（覆盖山谷上空，循环飘落）
    this.snowTex = makeSnowTexture();
    const SNOW_COUNT = 320;
    const snowPos = new Float32Array(SNOW_COUNT * 3);
    this.snowVel = new Float32Array(SNOW_COUNT);
    this.snowPhase = new Float32Array(SNOW_COUNT);
    for (let i = 0; i < SNOW_COUNT; i++) {
      snowPos[i * 3]     = (Math.random() - 0.5) * 120;
      snowPos[i * 3 + 1] = 8 + Math.random() * 100;
      snowPos[i * 3 + 2] = (Math.random() - 0.5) * 120;
      this.snowVel[i]   = 0.12 + Math.random() * 0.26;
      this.snowPhase[i] = Math.random() * Math.PI * 2;
    }
    const snowGeo = new THREE.BufferGeometry();
    snowGeo.setAttribute("position", new THREE.BufferAttribute(snowPos, 3));
    this.snowGeo = snowGeo;
    this.snowPoints = new THREE.Points(snowGeo, new THREE.PointsMaterial({
      size: 1.7, map: this.snowTex, transparent: true, opacity: 0.85,
      depthWrite: false, sizeAttenuation: true, color: 0xffffff
    }));
    this.scene.add(this.snowPoints);

    this.resize();
  }

  applyCamera() {
    const o = this.orbit;
    o.phi = Math.max(0.08, Math.min(Math.PI / 2 - 0.02, o.phi));
    o.dist = Math.max(60, Math.min(320, o.dist));
    this.camera.position.set(
      o.target.x + o.dist * Math.cos(o.phi) * Math.sin(o.theta),
      o.target.y + o.dist * Math.sin(o.phi),
      o.target.z + o.dist * Math.cos(o.phi) * Math.cos(o.theta)
    );
    this.camera.lookAt(o.target);
  }

  resize() {
    const w = this.elCanvas.clientWidth || 900;
    const h = this.elCanvas.clientHeight || 560;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  rebuild() {
    const t = this.t;
    const pos = this.terrainGeo.attributes.position;
    const col = this.terrainGeo.attributes.color;
    const ipos = this.iceGeo.attributes.position;
    const icol = this.iceGeo.attributes.color;
    for (let j = 0; j < N; j++) {
      const v = (j / (N - 1)) * 2 - 1;
      for (let i = 0; i < N; i++) {
        const u = i / (N - 1);
        const idx = j * N + i;
        const h = heightAt(u, v, t);
        pos.setY(idx, h);
        const c = rockColor(h);
        col.setXYZ(idx, c[0], c[1], c[2]);

        const ih = iceAt(u, v, t);
        if (ih > -900) {
          ipos.setY(idx, ih);
          // 冰体顶面：厚处偏白蓝、薄处偏深蓝
          const depth = Math.max(0, Math.min(1, (ih - valleyU(u, v)) / ICE_THICK));
          icol.setXYZ(idx, 0.62 + 0.3 * depth, 0.78 + 0.2 * depth, 0.95);
        } else {
          ipos.setY(idx, -50); // 藏到地形下方
          icol.setXYZ(idx, 0, 0, 0);
        }
      }
    }
    pos.needsUpdate = true; col.needsUpdate = true;
    ipos.needsUpdate = true; icol.needsUpdate = true;
    this.terrainGeo.computeVertexNormals();
    this.iceGeo.computeVertexNormals();

    this.updateMoraine();
    this.updateStageText();
    this.drawSection();
  }

  updateMoraine() {
    // 清空旧冰碛
    while (this.moraineGroup.children.length) {
      const m = this.moraineGroup.children.pop();
      m.geometry.dispose(); m.material.dispose();
    }
    this.moraineGroup.visible = this.showMoraine && this.t > 0.5;
    if (!this.moraineGroup.visible) return;
    const s = snout(this.t); // 当前冰舌末端
    // 在 [s, 1]（冰退途经区）沿谷底散布沉积小丘
    // 灰岩色碎石材质（去黄，贴近冰碛岩石本色；冰碛大小混杂、棱角、无分选）
    const mat = new THREE.MeshLambertMaterial({ color: 0x8a8175, roughness: 1 });
    // 一块棱角状碎石（十二面体 + 顶点扰动）
    const rock = (r) => {
      const g = new THREE.DodecahedronGeometry(r, 0);
      const p = g.attributes.position;
      for (let i = 0; i < p.count; i++) {
        p.setXYZ(i,
          p.getX(i) * (0.8 + Math.random() * 0.5),
          p.getY(i) * (0.7 + Math.random() * 0.6),
          p.getZ(i) * (0.8 + Math.random() * 0.5));
      }
      g.computeVertexNormals();
      return new THREE.Mesh(g, mat);
    };
    // ① 终碛垄：冰舌末端横向弧形垄带
    for (let k = 0; k < 16; k++) {
      const v = -0.4 + 0.8 * (k / 15);
      const u = s + (Math.random() - 0.5) * 0.04;
      const x = -SPAN / 2 + u * SPAN;
      const z = -SPAN / 2 + ((v + 1) / 2) * SPAN;
      const r = 1.2 + Math.random() * 1.8;
      const m = rock(r);
      m.position.set(x, valleyU(u, v) + r * 0.5, z);
      this.moraineGroup.add(m);
    }
    // ② 侧碛：谷壁两侧沿冰退途经区延伸的两条长垄
    for (const side of [-1, 1]) {
      const v = side * 0.43;
      for (let k = 0; k < 14; k++) {
        const u = s + (1 - s) * (k / 13) + (Math.random() - 0.5) * 0.03;
        const x = -SPAN / 2 + u * SPAN;
        const z = -SPAN / 2 + ((v + 1) / 2) * SPAN;
        const r = 1.0 + Math.random() * 1.5;
        const m = rock(r);
        m.position.set(x, valleyU(u, v) + r * 0.5, z);
        this.moraineGroup.add(m);
      }
    }
    // ③ 零散表碛：谷底中部散落的细碎石块（冰退后自冰面卸落的岩屑）
    for (let k = 0; k < 13; k++) {
      const u = s + 0.06 + Math.random() * (0.92 - s - 0.06);
      const v = (Math.random() - 0.5) * 0.56; // 中部 ±0.28
      const x = -SPAN / 2 + u * SPAN;
      const z = -SPAN / 2 + ((v + 1) / 2) * SPAN;
      const r = 0.6 + Math.random() * 1.0;
      const m = rock(r);
      m.position.set(x, valleyU(u, v) + r * 0.5, z);
      m.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      this.moraineGroup.add(m);
    }
  }

  drawSection() {
    const cv = this.elSection;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    const W = cv.width, H = cv.height;
    ctx.clearRect(0, 0, W, H);

    const xOf = (v) => 12 + (v + 1) / 2 * (W - 24);
    const hMin = FLOOR_V - 2, hMax = WALL + 4;
    const yOf = (h) => H - 14 - (h - hMin) / (hMax - hMin) * (H - 28);

    // 灰虚线：原始河流 V 形谷
    ctx.strokeStyle = "rgba(165,175,195,0.75)";
    ctx.setLineDash([5, 3]);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i <= 60; i++) {
      const v = -1 + 2 * i / 60;
      const x = xOf(v), y = yOf(valleyV(0.5, v));
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // 彩线：当前形态（中游 u=0.5，按 t 混合 V/U）
    const t = this.t;
    const carve = carveAmount(0.5, t);
    const lg = ctx.createLinearGradient(0, 0, W, 0);
    lg.addColorStop(0, "#5fb0ff");
    lg.addColorStop(1, "#9fe9ff");
    ctx.strokeStyle = lg;
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    for (let i = 0; i <= 60; i++) {
      const v = -1 + 2 * i / 60;
      const h = valleyV(0.5, v) * (1 - carve) + valleyU(0.5, v) * carve;
      const x = xOf(v), y = yOf(h);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();

    // 谷底标注
    ctx.fillStyle = "rgba(200,220,255,0.9)";
    ctx.font = "11px sans-serif";
    ctx.fillText("河床一侧", 14, H - 4);
    ctx.fillText("另一侧", W - 52, H - 4);

    const label = carve < 0.15 ? "V 形谷（流水下切）"
                : carve > 0.85 ? "U 形谷（冰川刨蚀）"
                : "V → U 改造中";
    if (this.elSectionLabel) {
      this.elSectionLabel.innerHTML = `灰虚线 = 原始河流谷　|　彩线 = 当前形态：<b>${label}</b>`;
    }
  }

  updateSnow() {
    const pts = this.snowPoints;
    if (!pts || !pts.visible) return;
    const pos = this.snowGeo.attributes.position;
    const t = this.frame * 0.02;
    for (let i = 0; i < this.snowVel.length; i++) {
      let y = pos.getY(i) - this.snowVel[i];
      let x = pos.getX(i) + Math.sin(t + this.snowPhase[i]) * 0.05;
      if (y < 4) {
        y = 106 + Math.random() * 6;
        x = (Math.random() - 0.5) * 120;
        pos.setZ(i, (Math.random() - 0.5) * 120);
      }
      pos.setX(i, x);
      pos.setY(i, y);
    }
    pos.needsUpdate = true;
  }

  updateStageText() {
    const t = this.t;
    let name, tip;
    if (t <= 0.001) {
      name = "河流 V 形谷";
      tip = "现代河流地貌：流水下切，谷壁陡峭、横剖面呈 V 字。拖动时间轴，看冰川如何改造它。";
    } else if (t < 0.5) {
      name = "冰期推进 · 刨蚀中";
      tip = "冰川自源头向下推进，厚重的冰床像锉刀刨蚀谷底——V 谷正被改造为 U 形谷，源头刨出冰斗。";
    } else if (t < 0.5 + 1e-3) {
      name = "冰川鼎盛";
      tip = "整条谷地填满冰体，横剖面已成宽平的 U 形谷，源头冰斗被刨深。";
    } else if (t < 0.999) {
      name = "冰退时期 · 冰碛堆积";
      tip = "气候转暖，冰川消退；裹挟的砾石、泥沙沿途堆积，留下冰碛地貌。";
    } else {
      name = "冰后期";
      tip = "冰川消失，U 形谷、冰斗、冰碛保留下来——它们是此地曾被冰川覆盖的有力证据。";
    }
    this.elStageName.textContent = name;
    this.elStageTip.textContent = tip;
    this.elStat.textContent =
      `演化进度 ${Math.round(t * 100)}%` +
      (this.t > 0.5 ? " · 冰碛已出露（可关闭对照）" : " · 冰体正充填谷地");
  }

  bindEvents() {
    const dom = this.renderer.domElement;
    let dragging = 0, lx = 0, ly = 0;
    dom.addEventListener("contextmenu", e => e.preventDefault());
    dom.addEventListener("pointerdown", e => {
      dragging = e.button === 2 ? 2 : 1; lx = e.clientX; ly = e.clientY;
      dom.setPointerCapture(e.pointerId);
    });
    dom.addEventListener("pointermove", e => {
      if (!dragging) return;
      const dx = e.clientX - lx, dy = e.clientY - ly; lx = e.clientX; ly = e.clientY;
      if (dragging === 1) {
        this.orbit.theta -= dx * 0.006; this.orbit.phi += dy * 0.005;
        this.topView = false; this.elBtnView.textContent = "俯视剖面";
      } else {
        const k = this.orbit.dist * 0.0016;
        const sinT = Math.sin(this.orbit.theta), cosT = Math.cos(this.orbit.theta);
        this.orbit.target.x -= (dx * cosT - dy * sinT) * k;
        this.orbit.target.z += (dx * sinT + dy * cosT) * k;
      }
      this.applyCamera();
    });
    dom.addEventListener("pointerup", e => {
      dragging = 0;
      if (dom.hasPointerCapture(e.pointerId)) dom.releasePointerCapture(e.pointerId);
    });
    dom.addEventListener("wheel", e => {
      e.preventDefault();
      this.orbit.dist *= e.deltaY > 0 ? 1.09 : 0.92;
      this.applyCamera();
    }, { passive: false });

    this.elStage.addEventListener("input", () => {
      this.t = +this.elStage.value / 100;
      this.rebuild();
    });
    this.elBtnPlay.addEventListener("click", () => this.togglePlay());
    this.elBtnReset.addEventListener("click", () => {
      this.t = 0; this.elStage.value = 0; this.rebuild();
      this.playing = false; this.elBtnPlay.textContent = "▶ 播放冰川作用";
      this.elBtnPlay.classList.add("primary");
    });
    this.elBtnView.addEventListener("click", () => {
      this.topView = !this.topView;
      if (this.topView) {
        this.orbit.theta = 0; this.orbit.phi = Math.PI / 2 - 0.03; this.orbit.dist = 160;
        this.orbit.target.set(0, 0, 0);
        this.elBtnView.textContent = "回到 3D 立体";
      } else {
        this.orbit.theta = -Math.PI * 0.22; this.orbit.phi = 0.95; this.orbit.dist = 175;
        this.orbit.target.set(0, 6, 0);
        this.elBtnView.textContent = "俯视剖面";
      }
      this.applyCamera();
    });
    this.elBtnMoraine.addEventListener("click", () => {
      this.showMoraine = !this.showMoraine;
      this.elBtnMoraine.classList.toggle("active", this.showMoraine);
      this.elBtnMoraine.textContent = this.showMoraine ? "冰碛 显示" : "冰碛 隐藏";
      this.updateMoraine();
    });
    this.elBtnSnow.addEventListener("click", () => {
      this.showSnow = !this.showSnow;
      this.elBtnSnow.classList.toggle("active", this.showSnow);
      this.elBtnSnow.textContent = this.showSnow ? "下雪 显示" : "下雪 隐藏";
      if (this.snowPoints) this.snowPoints.visible = this.showSnow;
    });
    this.elBtnBack.addEventListener("click", () => this.onExit && this.onExit());

    this._onResize = () => this.resize();
    window.addEventListener("resize", this._onResize);
  }

  togglePlay() {
    this.playing = !this.playing;
    if (this.playing && this.t >= 1) { this.t = 0; this.elStage.value = 0; }
    this.elBtnPlay.textContent = this.playing ? "⏸ 暂停" : "▶ 播放冰川作用";
    this.elBtnPlay.classList.toggle("primary", !this.playing);
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.resize();
    const loop = () => {
      if (!this.running) return;
      this._raf = requestAnimationFrame(loop);
      this.frame++;
      if (this.playing) {
        this.t = Math.min(1, this.t + 0.0022);
        this.elStage.value = Math.round(this.t * 100);
        this.rebuild();
        if (this.t >= 1) {
          this.playing = false;
          this.elBtnPlay.textContent = "▶ 重新播放";
          this.elBtnPlay.classList.add("primary");
        }
      }
      this.updateSnow();
      this.renderer.render(this.scene, this.camera);
    };
    loop();
  }

  stop() {
    this.running = false;
    if (this._raf) cancelAnimationFrame(this._raf);
  }

  dispose() {
    this.stop();
    window.removeEventListener("resize", this._onResize);
    this.renderer.dispose();
  }
}
