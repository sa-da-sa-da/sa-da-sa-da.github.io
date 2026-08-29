/**
 * 3D 力学实验室 · 主模块
 * ---------------------------------------------------------------
 * 功能：
 *   1. 单摆演示（4 个摆长同时摆动，对比周期 T = 2π√(L/g)）
 *   2. 简谐振动（位移-时间正弦曲线）
 *   3. 抛体运动（不同发射角的速度包络）
 *
 * 依赖：../vendor/three.module.js
 */

import * as THREE from "./vendor/three.module.js";
import { GRAVITY, COLOR_BOB, COLOR_ROD, COLOR_PATH, COLOR_AXIS, COLOR_EQ, COLOR_TARGET, PENDULUM_DEMO }
  from "./physics-data.js";

export class PhysicsLab {
  constructor(root) {
    this.root = root;
    this.currentModel = "pendulum";
    this.autoRotate = true;
    this.running = false;
    this.frame = 0;
    this.demoIdx = 0;

    this.orbit = {
      theta: -Math.PI * 0.25,
      phi: 0.95,
      dist: 9,
      target: new THREE.Vector3(0, 0, 0),
    };

    this.animMode = false;
    this.buildDom();
    this.initThree();
    this.loadModel("pendulum");
    this.bindEvents();
  }

  /* ============================================================
   * DOM
   * ============================================================ */
  buildDom() {
    this.root.innerHTML = `
      <div class="lab-wrap">
        <aside class="lab-panel">
          <div class="lab-head">
            <div class="lab-title">3D 力学实验室</div>
            <div class="lab-sub">单摆 · 振动 · 抛体 · 钱学森弹道</div>
          </div>

          <div class="lab-group">
            <div class="lab-group-title">① 选择模型 / 模式</div>
            <div class="mol-tabs" id="mol-tabs">
              <button class="mol-tab active" data-mol="pendulum">单摆<br/><small>不同摆长对比</small></button>
              <button class="mol-tab" data-mol="shm">简谐振动<br/><small>x-t 正弦曲线</small></button>
              <button class="mol-tab" data-mol="projectile">抛体运动<br/><small>角度 vs 射程</small></button>
              <button class="mol-tab" data-mol="trajectory">钱学森弹道<br/><small>助推·滑翔跳跃</small></button>
            </div>
          </div>

          <div class="lab-group">
            <div class="lab-group-title">② 视角控制</div>
            <div class="lab-btn-row">
              <button class="lab-btn active" id="btn-rotate">自动旋转 开</button>
              <button class="lab-btn" id="btn-reset">重置视角</button>
            </div>
            <div class="lab-hint">鼠标拖拽：旋转　|　滚轮：缩放</div>
          </div>

          <div class="lab-group mol-info" id="mol-info">
            <div class="lab-group-title">③ 模型信息</div>
            <div class="mol-info-content"></div>
          </div>

          <div class="lab-exit">
            <button class="lab-btn primary" id="btn-exit">返回主菜单 (Esc)</button>
          </div>
        </aside>

        <div class="lab-canvas-wrap" id="lab-canvas">
          <canvas id="phys-three-canvas"></canvas>
          <div class="lab-overlay-top" id="lab-overlay-top"></div>
          <div class="lab-caption" id="lab-caption">
            <span class="caption-text" id="lab-caption-text"></span>
            <button class="caption-btn" id="lab-caption-replay" style="display:none">重新播放</button>
          </div>
          <div class="lab-legend" id="lab-legend">
            <div class="legend-title">图例</div>
            <div class="legend-items"></div>
          </div>
        </div>
      </div>
    `;

    this.elCanvas = this.root.querySelector("#phys-three-canvas");
    this.elCanvasWrap = this.root.querySelector("#lab-canvas");
    this.elTabs = this.root.querySelector("#mol-tabs");
    this.elInfo = this.root.querySelector("#mol-info .mol-info-content");
    this.elOverlayTop = this.root.querySelector("#lab-overlay-top");
    this.elLegend = this.root.querySelector("#lab-legend .legend-items");
    this.elBtnRotate = this.root.querySelector("#btn-rotate");
    this.elBtnReset = this.root.querySelector("#btn-reset");
    this.elBtnExit = this.root.querySelector("#btn-exit");
    this.elCaption = this.root.querySelector("#lab-caption");
    this.elCaptionText = this.root.querySelector("#lab-caption-text");
    this.elCaptionReplay = this.root.querySelector("#lab-caption-replay");

    const legendElems = [
      { label: "摆球", color: "#ffd98a" },
      { label: "摆杆/绳", color: "#9a8cff" },
      { label: "轨迹", color: "#7fd8ff" },
      { label: "平衡位置", color: "#7ee2a8" },
    ];
    this.elLegend.innerHTML = legendElems.map(e =>
      `<div class="legend-item"><span class="legend-dot" style="background:${e.color}"></span>${e.label}</div>`
    ).join("");
  }

  /* ============================================================
   * three.js
   * ============================================================ */
  initThree() {
    const w = this.elCanvasWrap.clientWidth || 800;
    const h = this.elCanvasWrap.clientHeight || 600;

    this.renderer = new THREE.WebGLRenderer({ canvas: this.elCanvas, antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(w, h);
    this.renderer.setClearColor(0x0a0e1a, 1);

    this.scene = new THREE.Scene();
    this.defaultFog = new THREE.Fog(0x0a0e1a, 18, 40);
    this.scene.fog = this.defaultFog;
    this.camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100);

    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambient);
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(8, 12, 6);
    this.scene.add(dirLight);

    this.molGroup = new THREE.Group();
    this.scene.add(this.molGroup);
    this.labelGroup = new THREE.Group();
    this.scene.add(this.labelGroup);

    this.applyCamera();
  }

  /* ============================================================
   * 加载模型
   * ============================================================ */
  loadModel(key) {
    this.disposeGroup(this.molGroup);
    this.disposeGroup(this.labelGroup);
    this.animMode = false;
    this.pendingAnim = null;
    this.trajPts = null;
    // 弹道图是大尺度平面示意图，关闭雾效避免整体被背景色洗白
    this.scene.fog = (key === "trajectory") ? null : this.defaultFog;

    if (key === "shm") { this.startSHM(); return; }
    if (key === "projectile") { this.startProjectile(); return; }
    if (key === "trajectory") { this.startTrajectory(); return; }

    this.elCaption.style.display = "none";
    this.currentModel = "pendulum";
    this.startPendulum();
  }

  /* 通用：3D 坐标转屏幕像素（仅用于标签定位） */
  makeLabel(text, size = 0.9, color = "rgba(255,255,255,0.92)") {
    const FONT = "bold 40px \"Microsoft YaHei\", Arial, sans-serif";
    const canvas = document.createElement("canvas");
    let ctx = canvas.getContext("2d");
    ctx.font = FONT;
    // 按文本实际宽度扩展画布，避免长中文标签被裁切
    const textW = Math.ceil(ctx.measureText(text).width);
    const W = Math.max(256, textW + 48);
    canvas.width = W; canvas.height = 96;
    ctx = canvas.getContext("2d");
    ctx.font = FONT;                       // 改变尺寸会重置上下文，需重设
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineJoin = "round";
    ctx.lineWidth = 7;
    ctx.strokeStyle = "rgba(4,10,22,0.78)"; // 深色描边，保证在浅色遮罩上可读
    ctx.strokeText(text, W / 2, 48);
    ctx.fillStyle = color;
    ctx.fillText(text, W / 2, 48);
    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(size * 1.8 * (W / 256), size * 0.7, 1);
    return sprite;
  }

  /* ============================================================
   * 单摆演示：4 个不同摆长同时摆动
   * ============================================================ */
  startPendulum() {
    this.currentModel = "pendulum";
    this.elInfo.innerHTML = `
      <div class="mol-name">单摆周期对比</div>
      <div class="mol-type">T = 2π√(L/g)，g≈9.8 m/s²</div>
      <div class="mol-desc">同时启动 4 个摆长不同的单摆（小角度下）。摆长越短，周期越小、摆动越快；摆长越长，周期越大、摆动越慢。周期只与摆长和重力加速度有关，与摆球质量无关（伽利略的等时性）。</div>
      <div class="mol-atoms">球=金黄　绳=紫　平衡位置=绿</div>
    `;
    this.elOverlayTop.innerHTML = `<div class="overlay-formula">单摆 · T = 2π√(L/g)</div>`;

    this.scene.userData.t0 = performance.now() / 1000;
    this.pendulumBobs = [];
    this.pendulumRods = [];

    const xStep = 1.0;
    const baseX = -1.5;
    PENDULUM_DEMO.forEach((p, i) => {
      const pivotX = baseX + i * xStep;
      const pivotY = 2.5;
      const T = 2 * Math.PI * Math.sqrt(p.L / GRAVITY);
      const omega = 2 * Math.PI / T;
      // 摆杆
      const rodGeo = new THREE.CylinderGeometry(0.015, 0.015, p.L, 8);
      const rodMat = new THREE.MeshPhongMaterial({ color: COLOR_ROD });
      const rod = new THREE.Mesh(rodGeo, rodMat);
      rod.userData = { pivot: new THREE.Vector3(pivotX, pivotY, 0), L: p.L, omega, phi0: 0.4, restY: pivotY - p.L };
      this.molGroup.add(rod);
      this.pendulumRods.push(rod);
      // 摆球
      const bobGeo = new THREE.SphereGeometry(0.13, 20, 14);
      const bobMat = new THREE.MeshPhongMaterial({ color: COLOR_BOB, emissive: COLOR_BOB, emissiveIntensity: 0.2, shininess: 60 });
      const bob = new THREE.Mesh(bobGeo, bobMat);
      this.molGroup.add(bob);
      this.pendulumBobs.push(bob);
      // 标签
      const lab = this.makeLabel(p.label);
      lab.position.set(pivotX, pivotY + 0.4, 0);
      this.labelGroup.add(lab);
      // 平衡位置竖线
      const linePts = [new THREE.Vector3(pivotX, pivotY - p.L - 0.3, 0), new THREE.Vector3(pivotX, pivotY + 0.3, 0)];
      const lineGeo = new THREE.BufferGeometry().setFromPoints(linePts);
      const lineMat = new THREE.LineBasicMaterial({ color: COLOR_EQ, transparent: true, opacity: 0.4 });
      this.molGroup.add(new THREE.Line(lineGeo, lineMat));
    });

    // 横轴
    const axisPts = [new THREE.Vector3(-3, 0, 0), new THREE.Vector3(3, 0, 0)];
    const axisGeo = new THREE.BufferGeometry().setFromPoints(axisPts);
    this.molGroup.add(new THREE.Line(axisGeo, new THREE.LineBasicMaterial({ color: COLOR_AXIS })));

    this.orbit.dist = 8;
    this.applyCamera();
  }

  updatePendulum() {
    if (!this.pendulumBobs) return;
    const t = performance.now() / 1000 - this.scene.userData.t0;
    this.pendulumBobs.forEach((bob, i) => {
      const r = this.pendulumRods[i].userData;
      const theta = r.phi0 * Math.cos(r.omega * t);
      // 球位置
      const bx = r.pivot.x + r.L * Math.sin(theta);
      const by = r.pivot.y - r.L * Math.cos(theta);
      bob.position.set(bx, by, 0);
      // 杆朝向（从 pivot 指向 bob）
      const dir = new THREE.Vector3(bx - r.pivot.x, by - r.pivot.y, 0);
      const len = dir.length();
      if (len > 0.001) {
        this.pendulumRods[i].position.set((bx + r.pivot.x) / 2, (by + r.pivot.y) / 2, 0);
        this.pendulumRods[i].quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
      }
    });
  }

  /* ============================================================
   * 简谐振动：x-t 正弦曲线
   * ============================================================ */
  startSHM() {
    this.animMode = false;
    this.currentModel = "shm";
    this.elCaption.style.display = "none";
    this.elInfo.innerHTML = `
      <div class="mol-name">简谐振动</div>
      <div class="mol-type">x(t) = A·cos(ωt)，ω = √(k/m)</div>
      <div class="mol-desc">弹簧振子或单摆的小角度摆动，回复力 F=-kx。位移随时间按正弦规律变化。可以同时看到弹簧在 x-y 平面上振动 + 时间轴上的正弦曲线波形。</div>
      <div class="mol-atoms">x 轴：时间 t　y 轴：位移 x</div>
    `;
    this.elOverlayTop.innerHTML = `<div class="overlay-formula">简谐振动 · x = A·cos(ωt)</div>`;
    this.setLegend([
      { label: "振动质点", color: "#ffd98a" },
      { label: "参考曲线", color: "#7ee2a8" },
    ]);

    // 坐标系
    const axisPts = (a, b) => [new THREE.Vector3(...a), new THREE.Vector3(...b)];
    const xGeo = new THREE.BufferGeometry().setFromPoints(axisPts([-3, 0, 0], [3, 0, 0]));
    const yGeo = new THREE.BufferGeometry().setFromPoints(axisPts([0, -1.5, 0], [0, 1.5, 0]));
    this.molGroup.add(new THREE.Line(xGeo, new THREE.LineBasicMaterial({ color: COLOR_AXIS })));
    this.molGroup.add(new THREE.Line(yGeo, new THREE.LineBasicMaterial({ color: COLOR_AXIS })));

    // 静态正弦曲线（参考）
    const refPts = [];
    for (let i = 0; i <= 120; i++) {
      const t = (i / 120) * 6 - 3;
      refPts.push(new THREE.Vector3(t, Math.cos(t * 1.5), 0));
    }
    const refGeo = new THREE.BufferGeometry().setFromPoints(refPts);
    this.molGroup.add(new THREE.Line(refGeo, new THREE.LineBasicMaterial({ color: COLOR_EQ, transparent: true, opacity: 0.25 })));

    // 动点
    this.shmTrace = [];
    this.shmDot = (() => {
      const geo = new THREE.SphereGeometry(0.1, 16, 12);
      const mat = new THREE.MeshPhongMaterial({ color: COLOR_BOB, emissive: COLOR_BOB, emissiveIntensity: 0.3, shininess: 60 });
      const m = new THREE.Mesh(geo, mat);
      this.molGroup.add(m);
      return m;
    })();

    this.scene.userData.t0 = performance.now() / 1000;

    const lab = this.makeLabel("时间 t →");
    lab.position.set(3.3, -0.3, 0);
    this.labelGroup.add(lab);
    const lab2 = this.makeLabel("位移 x");
    lab2.position.set(-0.4, 1.9, 0);
    this.labelGroup.add(lab2);

    this.orbit.dist = 8;
    this.applyCamera();
  }

  updateSHM() {
    if (!this.shmDot) return;
    const t = performance.now() / 1000 - this.scene.userData.t0;
    const tpos = (t * 0.8) % 6 - 3; // 时间轴归一到 [-3, 3]
    const x = Math.cos(tpos * 1.5);  // 动点必须落在参考正弦曲线上（用同一横坐标）
    this.shmDot.position.set(tpos, x, 0);
  }

  /* ============================================================
   * 抛体运动：不同角度的轨迹包络
   * ============================================================ */
  startProjectile() {
    this.animMode = false;
    this.currentModel = "projectile";
    this.elCaption.style.display = "none";
    this.elInfo.innerHTML = `
      <div class="mol-name">抛体运动（不同发射角）</div>
      <div class="mol-type">R = v₀² sin2θ / g，θ=45° 时射程最大</div>
      <div class="mol-desc">同一初速度 v₀=8 m/s，发射角分别为 30°、45°、60°、75°。观察水平射程、最大高度和飞行时间的差异。理想情况，忽略空气阻力。</div>
      <div class="mol-atoms">轨迹=青蓝　地面=绿　目标=红</div>
    `;
    this.elOverlayTop.innerHTML = `<div class="overlay-formula">抛体 · R = v₀² sin2θ / g</div>`;
    this.setLegend([
      { label: "轨迹", color: "#7fd8ff" },
      { label: "地面", color: "#7ee2a8" },
      { label: "45°最远", color: "#ff6b6b" },
    ]);

    const v0 = 8;
    // 地面
    const gPts = [new THREE.Vector3(-4, -1.5, 0), new THREE.Vector3(4, -1.5, 0)];
    const gGeo = new THREE.BufferGeometry().setFromPoints(gPts);
    this.molGroup.add(new THREE.Line(gGeo, new THREE.LineBasicMaterial({ color: COLOR_EQ })));

    const angles = [30, 45, 60, 75];
    this.projectileTraces = angles.map(theta => {
      const rad = theta * Math.PI / 180;
      const vx = v0 * Math.cos(rad);
      const vy = v0 * Math.sin(rad);
      const tFlight = 2 * vy / GRAVITY;
      const range = vx * tFlight;
      const pts = [];
      const steps = 40;
      for (let i = 0; i <= steps; i++) {
        const t = (i / steps) * tFlight;
        pts.push(new THREE.Vector3(vx * t - 4, -1.5 + vy * t - 0.5 * GRAVITY * t * t, 0));
      }
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      const mat = new THREE.LineBasicMaterial({ color: COLOR_PATH, transparent: true, opacity: 0.7 });
      const line = new THREE.Line(geo, mat);
      this.molGroup.add(line);
      // 终点标记（45° 最远）
      const isMax = theta === 45;
      const endMat = new THREE.MeshPhongMaterial({ color: isMax ? COLOR_TARGET : COLOR_AXIS });
      const endGeo = new THREE.SphereGeometry(isMax ? 0.12 : 0.08, 16, 12);
      const endMarker = new THREE.Mesh(endGeo, endMat);
      endMarker.position.set(range - 4, -1.5, 0);
      this.molGroup.add(endMarker);
      // 标签
      const lab = this.makeLabel(`${theta}° R=${range.toFixed(1)}m`);
      lab.position.set(Math.min(range - 4, 3), -1.5 + (theta === 45 ? 0.4 : -0.3), 0);
      this.labelGroup.add(lab);
      return line;
    });

    // 起点标记（发射点）
    const startMat = new THREE.MeshPhongMaterial({ color: COLOR_BOB, emissive: COLOR_BOB, emissiveIntensity: 0.3 });
    const startGeo = new THREE.SphereGeometry(0.1, 16, 12);
    const startMarker = new THREE.Mesh(startGeo, startMat);
    startMarker.position.set(-4, -1.5, 0);
    this.molGroup.add(startMarker);

    const lab = this.makeLabel("v₀=8 m/s");
    lab.position.set(-4, -2.1, 0);
    this.labelGroup.add(lab);

    this.orbit.dist = 8;
    this.applyCamera();
  }

  /* ============================================================
   * 钱学森弹道：地球弧面 + 大气层 + 助推·再入·跳跃滑翔
   * ------------------------------------------------------------
   * 视觉：深蓝弧形地球截面（非平地）、淡蓝半透明大气层遮罩、
   *       大气层顶虚线弧。弹头每次"打水漂"都切到大气层顶再弹起。
   * ============================================================ */
  trajInit() {
    const xL = -7, xR = 7;              // 弹道起止（发射→命中）
    const R = 15, Y0 = -2.6;            // 地球截面半径 / x=0 处地表高度
    const atmAlt = 2.0;                 // 大气层顶（相对地表的高度）
    const peakAlt = 5.2;                // 助推段最高点
    const boostSpan = 2.0, diveSpan = 1.3, termSpan = 2.0;
    const weights = [1.25, 1.13, 1.0, 0.9, 0.8];   // 跳跃段长度（逐次变短）
    const humps = [2.6, 2.0, 1.5, 1.1, 0.75];      // 跳跃拱高（能量耗散）
    const xBoostEnd = xL + boostSpan;
    const xDiveEnd = xBoostEnd + diveSpan;
    const xTermStart = xR - termSpan;
    const wSum = weights.reduce((a, b) => a + b, 0);
    const spans = weights.map(w => (w / wSum) * (xTermStart - xDiveEnd));
    const bounce = [xDiveEnd];
    let acc = xDiveEnd;
    for (const s of spans) { acc += s; bounce.push(acc); }
    this.TRAJ = {
      xL, xR, R, yc: Y0 - R, atmAlt, peakAlt,
      xBoostEnd, xDiveEnd, xTermStart, boostSpan, diveSpan, termSpan,
      spans, humps, bounce, xDrawL: -8.6, xDrawR: 8.6,
    };
  }

  /* 地表（大圆弧）在横坐标 x 处的场景 y */
  surfY(x) {
    const T = this.TRAJ;
    return T.yc + Math.sqrt(Math.max(0, T.R * T.R - x * x));
  }

  /* 弹道相对地表的高度（altitude） */
  trajAlt(x) {
    const T = this.TRAJ;
    if (x <= T.xBoostEnd) {                        // ① 助推爬升
      const s = (x - T.xL) / T.boostSpan;
      return T.peakAlt * Math.sin(Math.max(0, s) * Math.PI / 2);
    }
    if (x <= T.xDiveEnd) {                         // ② 关机后俯冲再入
      const s = (x - T.xBoostEnd) / T.diveSpan;
      return T.atmAlt + (T.peakAlt - T.atmAlt) * Math.cos(s * Math.PI / 2);
    }
    if (x >= T.xTermStart) {                       // ④ 末端俯冲命中
      const s = Math.min(1, (x - T.xTermStart) / T.termSpan);
      return T.atmAlt * (1 - Math.pow(s, 1.8));
    }
    let x0 = T.xDiveEnd;                           // ③ 大气层顶跳跃滑翔
    for (let i = 0; i < T.spans.length; i++) {
      if (x <= x0 + T.spans[i] || i === T.spans.length - 1) {
        const s = Math.min(1, Math.max(0, (x - x0) / T.spans[i]));
        return T.atmAlt + T.humps[i] * Math.sin(s * Math.PI);
      }
      x0 += T.spans[i];
    }
    return T.atmAlt;
  }

  /* 沿地球弧面、距地表 alt 高度的一条弧线采样点 */
  arcPoints(alt, x0, x1, n = 140, z = 0) {
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const x = x0 + (x1 - x0) * i / n;
      pts.push(new THREE.Vector3(x, this.surfY(x) + alt, z));
    }
    return pts;
  }

  /* 地表到 altTop 之间的弧形填充区域 */
  arcBandMesh(altBottom, altTop, color, opacity, z) {
    const T = this.TRAJ, M = 120;
    const shape = new THREE.Shape();
    shape.moveTo(T.xDrawL, this.surfY(T.xDrawL) + altBottom);
    for (let i = 1; i <= M; i++) {
      const x = T.xDrawL + (T.xDrawR - T.xDrawL) * i / M;
      shape.lineTo(x, this.surfY(x) + altBottom);
    }
    shape.lineTo(T.xDrawR, this.surfY(T.xDrawR) + altTop);
    for (let i = M - 1; i >= 0; i--) {
      const x = T.xDrawL + (T.xDrawR - T.xDrawL) * i / M;
      shape.lineTo(x, this.surfY(x) + altTop);
    }
    shape.closePath();
    const mesh = new THREE.Mesh(
      new THREE.ShapeGeometry(shape),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity, side: THREE.DoubleSide, depthWrite: false })
    );
    mesh.position.z = z;
    return mesh;
  }

  /* 按画布宽高比自动选取相机距离，保证整幅弹道图完整入镜 */
  fitTrajectoryCamera() {
    const halfW = 7.9, halfH = 4.3, cy = -1.05;
    const aspect = this.camera.aspect || 1.5;
    const tan = Math.tan((this.camera.fov / 2) * Math.PI / 180);
    const dist = Math.max(halfH / tan, halfW / (tan * aspect)) * 1.05;
    this.orbit.dist = dist;
    this.orbit.target.set(0, cy, 0);
    this.applyCamera();
  }

  /* 沿弧面的虚线 */
  arcDashed(alt, color, opacity, dash = 0.26, gap = 0.2, z = 0) {
    const T = this.TRAJ;
    const line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(this.arcPoints(alt, T.xDrawL, T.xDrawR, 200, z)),
      new THREE.LineDashedMaterial({ color, dashSize: dash, gapSize: gap, transparent: true, opacity })
    );
    line.computeLineDistances();
    return line;
  }

  startTrajectory() {
    this.currentModel = "trajectory";
    this.trajInit();
    const T = this.TRAJ;

    // 平面示意图，自动旋转会破坏读图，进入时关掉
    if (this.autoRotate) {
      this.autoRotate = false;
      this.elBtnRotate.textContent = "自动旋转 关";
      this.elBtnRotate.classList.remove("active");
    }

    this.elCaption.style.display = "flex";
    this.elCaptionReplay.style.display = "inline-block";
    this.elCaptionReplay.classList.remove("complete");
    this.elInfo.innerHTML = `
      <div class="mol-name">钱学森弹道（助推-滑翔弹道）</div>
      <div class="mol-type">Sänger-Qian 弹道 · 大气层顶跳跃滑翔</div>
      <div class="mol-desc">
        ① <b>助推爬升</b>：火箭把弹头送出稠密大气，抬升到临近空间。<br/>
        ② <b>关机再入</b>：弹头无动力俯冲，重新扎向大气层顶缘。<br/>
        ③ <b>跳跃滑翔</b>：稀薄大气给出升力，弹头像石片打水漂一样被"弹"起来，如此往复。每跳一次损失一些能量，拱高逐次降低。<br/>
        ④ <b>末端俯冲</b>：能量耗尽后压低弹道，扎向目标。<br/>
        相比经典抛物线弹道，它<b>射程更远、弹道更低更难预测</b>，压缩了对方的拦截窗口。
      </div>
      <div class="mol-atoms">橙=助推/末端　青=滑翔　淡蓝区=大气层内</div>
    `;
    this.elOverlayTop.innerHTML = `<div class="overlay-formula">钱学森弹道 · 助推 → 再入 → 跳跃滑翔 → 命中</div>`;
    this.setLegend([
      { label: "助推 / 末端", color: "#ff8a5c" },
      { label: "跳跃滑翔", color: "#7fd8ff" },
      { label: "大气层顶", color: "#9fdcff" },
      { label: "大气层内", color: "#3f86d8" },
      { label: "地球表面", color: "#6fe3ff" },
    ]);

    /* ---------- 地球与大气层 ---------- */
    // 地球本体（弧形截面，深蓝）
    this.molGroup.add(this.arcBandMesh(-9.5, 0, 0x0d2748, 0.98, -0.06));
    // 近地表亮带（地壳辉光，强化弧面感）
    this.molGroup.add(this.arcBandMesh(-0.55, 0, 0x1f5f9c, 0.55, -0.05));
    // 大气层内：淡蓝半透明遮罩（地表 → 大气层顶）
    this.molGroup.add(this.arcBandMesh(0, T.atmAlt, 0x3f86d8, 0.15, -0.04));
    // 大气层内部分层虚线（让"哪边是大气层内"一眼可辨）
    this.molGroup.add(this.arcDashed(0.7, 0x5fa8e8, 0.22, 0.2, 0.26, -0.02));
    this.molGroup.add(this.arcDashed(1.35, 0x5fa8e8, 0.22, 0.2, 0.26, -0.02));
    // 大气层顶（弹头打水漂的那条界线）
    this.molGroup.add(this.arcDashed(T.atmAlt, 0x9fdcff, 0.9, 0.3, 0.2, 0.01));
    // 地球表面弧线
    this.molGroup.add(new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(this.arcPoints(0, T.xDrawL, T.xDrawR, 200, 0.02)),
      new THREE.LineBasicMaterial({ color: 0x6fe3ff })
    ));

    /* ---------- 弹道采样 ---------- */
    const N = 720;
    this.trajPts = [];
    this.trajXs = [];
    const colors = [];
    const cBoost = new THREE.Color(0xff8a5c);
    const cGlide = new THREE.Color(0x7fd8ff);
    const cTerm = new THREE.Color(0xff6a4d);
    for (let i = 0; i <= N; i++) {
      const x = T.xL + (T.xR - T.xL) * i / N;
      this.trajXs.push(x);
      this.trajPts.push(new THREE.Vector3(x, this.surfY(x) + this.trajAlt(x), 0.05));
      let c;
      if (x <= T.xBoostEnd) c = cBoost;
      else if (x < T.xDiveEnd) c = cBoost.clone().lerp(cGlide, (x - T.xBoostEnd) / T.diveSpan);
      else if (x < T.xTermStart) c = cGlide;
      else c = cGlide.clone().lerp(cTerm, Math.min(1, (x - T.xTermStart) / (T.termSpan * 0.6)));
      colors.push(c.r, c.g, c.b);
    }

    // 完整规划弹道（暗底，让人先看到全貌）
    const planGeo = new THREE.BufferGeometry().setFromPoints(
      this.trajPts.map(p => new THREE.Vector3(p.x, p.y, 0.03))
    );
    const planLine = new THREE.Line(planGeo,
      new THREE.LineDashedMaterial({ color: 0x8ab8dd, dashSize: 0.18, gapSize: 0.16, transparent: true, opacity: 0.35 })
    );
    planLine.computeLineDistances();
    this.molGroup.add(planLine);

    // 渐显实际轨迹（按阶段渐变着色）
    const trailGeo = new THREE.BufferGeometry().setFromPoints(this.trajPts);
    trailGeo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    trailGeo.setDrawRange(0, 0);
    this.trajTrail = new THREE.Line(trailGeo, new THREE.LineBasicMaterial({ vertexColors: true }));
    this.molGroup.add(this.trajTrail);

    /* ---------- 打水漂接触点 ---------- */
    this.trajDots = [];
    for (const bx of T.bounce) {
      const dot = new THREE.Mesh(
        new THREE.SphereGeometry(0.11, 14, 12),
        new THREE.MeshBasicMaterial({ color: 0xbfeaff, transparent: true, opacity: 0.95 })
      );
      dot.position.set(bx, this.surfY(bx) + T.atmAlt, 0.06);
      dot.visible = false;
      dot.userData.idx = Math.round((bx - T.xL) / (T.xR - T.xL) * N);
      this.molGroup.add(dot);
      this.trajDots.push(dot);
    }

    /* ---------- 发射点 / 目标点 ---------- */
    const padMat = new THREE.MeshBasicMaterial({ color: 0xff8a5c });
    const pad = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.42, 14), padMat);
    pad.position.set(T.xL, this.surfY(T.xL) + 0.2, 0.06);
    this.molGroup.add(pad);

    const tgt = new THREE.Mesh(
      new THREE.RingGeometry(0.2, 0.3, 24),
      new THREE.MeshBasicMaterial({ color: 0xff5f5f, side: THREE.DoubleSide })
    );
    tgt.position.set(T.xR, this.surfY(T.xR) + 0.1, 0.06);
    this.molGroup.add(tgt);

    /* ---------- 飞行器 ---------- */
    this.trajMarker = new THREE.Mesh(
      new THREE.SphereGeometry(0.17, 18, 14),
      new THREE.MeshPhongMaterial({ color: 0xff8a5c, emissive: 0xff8a5c, emissiveIntensity: 0.5, shininess: 70 })
    );
    this.trajMarker.position.copy(this.trajPts[0]);
    this.molGroup.add(this.trajMarker);
    // 弹头光晕
    this.trajGlow = new THREE.Mesh(
      new THREE.SphereGeometry(0.34, 16, 12),
      new THREE.MeshBasicMaterial({ color: 0xff8a5c, transparent: true, opacity: 0.22 })
    );
    this.trajGlow.position.copy(this.trajPts[0]);
    this.molGroup.add(this.trajGlow);

    /* ---------- 标签 ---------- */
    const addLab = (text, x, y, size = 0.9, color) => {
      const l = this.makeLabel(text, size, color);
      l.position.set(x, y, 0.1);
      this.labelGroup.add(l);
    };
    const apexY = this.surfY(T.xBoostEnd) + T.peakAlt;
    addLab("① 助推爬升", T.xBoostEnd, apexY + 0.62, 0.85, "rgba(255,178,140,0.98)");
    addLab("② 再入俯冲", T.xDiveEnd + 0.15, this.surfY(T.xDiveEnd) + T.atmAlt + 1.55, 0.8, "rgba(255,214,180,0.95)");
    const s1x = (T.bounce[0] + T.bounce[1]) / 2;
    addLab("③ 跳跃滑翔·打水漂", s1x + 0.5, this.surfY(s1x) + T.atmAlt + T.humps[0] + 0.72, 0.85, "rgba(178,232,255,0.98)");
    addLab("④ 末端俯冲", T.xTermStart + 1.3, this.surfY(T.xTermStart + 1.3) + T.atmAlt + 0.95, 0.8, "rgba(255,160,140,0.96)");
    addLab("发射", T.xL + 0.1, this.surfY(T.xL) - 0.5, 0.78, "rgba(255,178,140,0.95)");
    addLab("命中", T.xR - 0.35, this.surfY(T.xR) - 0.5, 0.78, "rgba(255,130,130,0.95)");
    addLab("大气层顶", -5.6, this.surfY(-5.6) + T.atmAlt - 0.44, 0.72, "rgba(159,220,255,0.95)");
    addLab("大气层内", -6.3, this.surfY(-6.3) + 0.82, 0.72, "rgba(140,190,240,0.9)");
    addLab("地球表面", 2.3, this.surfY(2.3) - 0.55, 0.72, "rgba(111,227,255,0.92)");
    addLab("临近空间（稀薄大气）", 3.5, this.surfY(3.5) + 5.6, 0.72, "rgba(150,178,215,0.7)");

    this.trajT0 = performance.now() / 1000;
    this.trajDuration = 15;
    this.trajN = N;

    // 正视角（平面示意图），并按画布比例自适应缩放，保证整幅图不被裁切
    this.orbit.theta = Math.PI / 2;
    this.orbit.phi = Math.PI / 2;
    this.fitTrajectoryCamera();

    this.setCaption("钱学森弹道：助推出大气 → 无动力再入 → 在<em>大气层顶</em>反复「打水漂」式跳跃滑翔 → 末端俯冲命中。射程更远、弹道更低、更难拦截。");
  }

  updateTrajectory() {
    if (!this.trajPts) return;
    const T = this.TRAJ;
    const t = performance.now() / 1000 - this.trajT0;
    let p = t / this.trajDuration;
    if (p > 1) p = 1;
    const idx = Math.min(this.trajN, Math.floor(p * this.trajN));
    const pos = this.trajPts[idx];
    this.trajMarker.position.copy(pos);
    this.trajGlow.position.copy(pos);
    this.trajTrail.geometry.setDrawRange(0, idx + 1);

    // 阶段配色：助推橙 → 滑翔青 → 末端再入红
    const x = this.trajXs[idx];
    let col = 0x7fd8ff;
    if (x <= T.xBoostEnd) col = 0xff8a5c;
    else if (x >= T.xTermStart) col = 0xff6a4d;
    this.trajMarker.material.color.setHex(col);
    this.trajMarker.material.emissive.setHex(col);
    this.trajGlow.material.color.setHex(col);

    // 打水漂接触点：飞过即点亮，并做一次弹跳缩放
    if (this.trajDots) {
      for (const d of this.trajDots) {
        if (idx >= d.userData.idx) {
          d.visible = true;
          const age = (idx - d.userData.idx) / this.trajN * this.trajDuration;
          const s = 1 + 1.4 * Math.exp(-age * 4);
          d.scale.setScalar(s);
          d.material.opacity = 0.55 + 0.4 * Math.exp(-age * 2);
        } else {
          d.visible = false;
        }
      }
    }

    if (p >= 1) {
      this.elCaptionReplay.classList.add("complete");
      this.elCaptionReplay.textContent = "重新播放";
    }
  }

  /* ============================================================
   * 相机 / 事件 / 循环
   * ============================================================ */
  applyCamera() {
    const { theta, phi, dist, target } = this.orbit;
    this.camera.position.set(
      target.x + dist * Math.sin(phi) * Math.cos(theta),
      target.y + dist * Math.cos(phi),
      target.z + dist * Math.sin(phi) * Math.sin(theta)
    );
    this.camera.lookAt(target);
  }

  bindEvents() {
    this.elTabs.addEventListener("click", (e) => {
      const btn = e.target.closest(".mol-tab");
      if (!btn) return;
      this.elTabs.querySelectorAll(".mol-tab").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      this.loadModel(btn.dataset.mol);
    });

    this.elBtnRotate.addEventListener("click", () => {
      this.autoRotate = !this.autoRotate;
      this.elBtnRotate.textContent = this.autoRotate ? "自动旋转 开" : "自动旋转 关";
      this.elBtnRotate.classList.toggle("active", this.autoRotate);
    });

    this.elBtnReset.addEventListener("click", () => {
      this.orbit.theta = -Math.PI * 0.25;
      this.orbit.phi = 0.95;
      this.orbit.dist = 8;
      this.orbit.target.set(0, 0, 0);
      this.applyCamera();
    });

    this.elBtnExit.addEventListener("click", () => {
      if (this.onExit) this.onExit();
    });

    this.elCaptionReplay.addEventListener("click", () => {
      this.disposeGroup(this.molGroup);
      this.disposeGroup(this.labelGroup);
      this.loadModel(this.currentModel);
    });

    let dragging = false, lastX = 0, lastY = 0;
    const canvas = this.elCanvasWrap;
    canvas.addEventListener("pointerdown", (e) => {
      dragging = true; lastX = e.clientX; lastY = e.clientY;
      try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
    });
    canvas.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      this.orbit.theta -= (e.clientX - lastX) * 0.01;
      this.orbit.phi = Math.max(0.1, Math.min(Math.PI - 0.1, this.orbit.phi - (e.clientY - lastY) * 0.01));
      lastX = e.clientX; lastY = e.clientY;
      this.applyCamera();
    });
    canvas.addEventListener("pointerup", (e) => {
      dragging = false;
      try { canvas.releasePointerCapture(e.pointerId); } catch (err) {}
    });
    canvas.addEventListener("pointercancel", () => { dragging = false; });
    canvas.addEventListener("wheel", (e) => {
      e.preventDefault();
      this.orbit.dist *= e.deltaY > 0 ? 1.1 : 0.92;
      this.orbit.dist = Math.max(3, Math.min(30, this.orbit.dist));
      this.applyCamera();
    }, { passive: false });

    this.resizeHandler = () => this.resize();
    window.addEventListener("resize", this.resizeHandler);
  }

  resize() {
    const w = this.elCanvasWrap.clientWidth || 800;
    const h = this.elCanvasWrap.clientHeight || 600;
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    if (this.currentModel === "trajectory" && this.TRAJ) this.fitTrajectoryCamera();
  }

  disposeGroup(group) {
    while (group.children.length > 0) {
      const obj = group.children[0];
      group.remove(obj);
      this.disposeObject(obj);
    }
  }

  disposeObject(obj) {
    if (obj.geometry) obj.geometry.dispose();
    if (obj.material) {
      if (Array.isArray(obj.material)) obj.material.forEach(m => { if (m.map) m.map.dispose(); m.dispose(); });
      else { if (obj.material.map) obj.material.map.dispose(); obj.material.dispose(); }
    }
    if (obj.children && obj.children.length) [...obj.children].forEach(c => this.disposeObject(c));
  }

  setCaption(text) {
    if (this.elCaptionText) this.elCaptionText.innerHTML = text;
  }

  setLegend(items) {
    if (!this.elLegend) return;
    this.elLegend.innerHTML = items.map(e =>
      `<div class="legend-item"><span class="legend-dot" style="background:${e.color}"></span>${e.label}</div>`
    ).join("");
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.loop();
  }

  stop() {
    this.running = false;
    window.removeEventListener("resize", this.resizeHandler);
  }

  loop() {
    if (!this.running) return;
    this.frame++;

    if (this.autoRotate) {
      this.orbit.theta += 0.003;
      this.applyCamera();
    }

    if (this.currentModel === "pendulum") this.updatePendulum();
    if (this.currentModel === "shm") this.updateSHM();
    if (this.currentModel === "trajectory") this.updateTrajectory();

    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame(() => this.loop());
  }
}