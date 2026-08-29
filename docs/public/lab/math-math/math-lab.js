/**
 * 3D 数学实验室 · 主模块
 * ---------------------------------------------------------------
 * 功能：
 *   1. 函数曲线浏览（3 个单峰函数，标出最值点）
 *   2. 0.618 优选法动画（黑箱寻优：逐轮缩小区间逼近最优点）
 *   3. 二分法对比动画（对单调函数找零点）
 *
 * 依赖：../vendor/three.module.js（本地离线副本）
 */

import * as THREE from "./vendor/three.module.js";
import { CURVE_COLOR, AXIS_COLOR, POINT_HI, POINT_LO, OPT_POINT, RANGE_COLOR, FUNCTIONS, PHI, PHI2 }
  from "./math-data.js";

export class MathLab {
  constructor(root) {
    this.root = root;
    this.currentModel = "curve";
    this.autoRotate = true;
    this.running = false;
    this.frame = 0;
    this.curveIdx = 0;

    this.orbit = {
      theta: -Math.PI * 0.25,
      phi: 0.95,
      dist: 8,
      target: new THREE.Vector3(0, 0, 0),
    };

    this.animMode = false;
    this.buildDom();
    this.initThree();
    this.loadModel("curve");
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
            <div class="lab-title">3D 数学实验室</div>
            <div class="lab-sub">函数曲线 · 0.618 优选法</div>
          </div>

          <div class="lab-group">
            <div class="lab-group-title">① 选择模型 / 模式</div>
            <div class="mol-tabs" id="mol-tabs">
              <button class="mol-tab active" data-mol="curve">函数曲线<br/><small>单峰函数浏览</small></button>
              <button class="mol-tab" data-mol="golden">优选法<br/><small>0.618 寻优动画</small></button>
              <button class="mol-tab" data-mol="bisect">二分法<br/><small>找零点对比</small></button>
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
          <canvas id="math-three-canvas"></canvas>
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

    this.elCanvas = this.root.querySelector("#math-three-canvas");
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
      { label: "函数曲线", color: "#7fd8ff" },
      { label: "较优点（保留）", color: "#ffd98a" },
      { label: "被淘汰点", color: "#ff7777" },
      { label: "最优点", color: "#7ee2a8" },
    ];
    this.elLegend.innerHTML = legendElems.map(e =>
      `<div class="legend-item"><span class="legend-dot" style="background:${e.color}"></span>${e.label}</div>`
    ).join("");
  }

  /* ============================================================
   * three.js 初始化
   * ============================================================ */
  initThree() {
    const w = this.elCanvasWrap.clientWidth || 800;
    const h = this.elCanvasWrap.clientHeight || 600;

    this.renderer = new THREE.WebGLRenderer({ canvas: this.elCanvas, antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(w, h);
    this.renderer.setClearColor(0x0a0e1a, 1);

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0x0a0e1a, 18, 40);
    this.camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100);

    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambient);
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(10, 15, 8);
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

    if (key === "golden") { this.startGolden(); return; }
    if (key === "bisect") { this.startBisect(); return; }

    this.elCaption.style.display = "none";
    this.currentModel = "curve";
    this.drawCurve();
  }

  /* 坐标系：x∈[0,1]→[-4,4]，y∈[0,1]→[0,4] */
  px(x) { return x * 8 - 4; }
  py(y) { return y * 4; }

  drawAxes() {
    const mk = (pts, color, opacity = 0.6) => {
      const geo = new THREE.BufferGeometry().setFromPoints(pts.map(p => new THREE.Vector3(...p)));
      const mat = new THREE.LineBasicMaterial({ color, transparent: opacity < 1, opacity });
      this.molGroup.add(new THREE.Line(geo, mat));
    };
    mk([[this.px(0), 0, 0], [this.px(1), 0, 0]], AXIS_COLOR);   // x 轴
    mk([[this.px(0), 0, 0], [this.px(0), 4, 0]], AXIS_COLOR);   // y 轴
  }

  plotCurve(fn, color = CURVE_COLOR, segments = 120) {
    const pts = [];
    for (let i = 0; i <= segments; i++) {
      const x = i / segments;
      pts.push(new THREE.Vector3(this.px(x), this.py(fn(x)), 0));
    }
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const mat = new THREE.LineBasicMaterial({ color, linewidth: 1 });
    this.molGroup.add(new THREE.Line(geo, mat));
  }

  addDot(x, y, color, radius = 0.12) {
    const geo = new THREE.SphereGeometry(radius, 16, 12);
    const mat = new THREE.MeshPhongMaterial({ color, emissive: color, emissiveIntensity: 0.3, shininess: 60 });
    const m = new THREE.Mesh(geo, mat);
    m.position.set(this.px(x), this.py(y), 0);
    this.molGroup.add(m);
    return m;
  }

  addVLine(x, color, opacity = 0.5) {
    const pts = [new THREE.Vector3(this.px(x), -0.1, 0), new THREE.Vector3(this.px(x), 4.1, 0)];
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const mat = new THREE.LineBasicMaterial({ color, transparent: opacity < 1, opacity });
    this.molGroup.add(new THREE.Line(geo, mat));
  }

  addLabel(text, x, y, size = 0.9) {
    const canvas = document.createElement("canvas");
    canvas.width = 256; canvas.height = 96;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.font = "bold 40px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, 128, 48);
    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
    const sprite = new THREE.Sprite(mat);
    sprite.position.set(this.px(x), this.py(y) + 0.35, 0);
    sprite.scale.set(size * 1.8, size * 0.7, 1);
    this.labelGroup.add(sprite);
    return sprite;
  }

  /* ============================================================
   * 函数曲线浏览
   * ============================================================ */
  drawCurve() {
    this.currentModel = "curve";
    const fn = FUNCTIONS[this.curveIdx];

    this.elInfo.innerHTML = `
      <div class="mol-name">${fn.name}</div>
      <div class="mol-type">单峰函数 · y = f(x)</div>
      <div class="mol-desc">${fn.desc}</div>
      <div class="mol-atoms">按「重置视角」或点击曲线信息可切换函数（共 ${FUNCTIONS.length} 个）</div>
    `;
    this.elOverlayTop.innerHTML = `<div class="overlay-formula">函数曲线 · ${fn.name}</div>`;

    this.drawAxes();
    this.plotCurve(fn.f);
    // 最值点标注
    this.addDot(fn.maxAt, fn.f(fn.maxAt), OPT_POINT, 0.16);
    this.addLabel("最值点", fn.maxAt, fn.f(fn.maxAt), 0.7);

    this.orbit.dist = 8;
    this.applyCamera();
  }

  /* ============================================================
   * 0.618 优选法动画
   * ============================================================ */
  startGolden() {
    this.animMode = true;
    this.currentModel = "golden";
    this.elCaption.style.display = "flex";
    this.elCaptionReplay.style.display = "none";
    this.elCaptionReplay.classList.remove("complete");

    this.fnIdx = 0; // 默认抛物线
    const fn = FUNCTIONS[this.fnIdx];

    this.elInfo.innerHTML = `
      <div class="mol-name">0.618 优选法动画</div>
      <div class="mol-type">单峰函数黑箱寻优</div>
      <div class="mol-desc">不知道函数表达式，只能「做试验看结果」。每轮在区间内取 0.382 与 0.618 两点试验，比较后淘汰一侧，区间缩至 0.618 倍。${fn.desc}</div>
      <div class="mol-atoms">金黄=较优点　红=被淘汰点　紫竖线=当前区间</div>
    `;
    this.elOverlayTop.innerHTML = `<div class="overlay-formula">0.618 优选法 · ${fn.name}</div>`;
    this.setCaption("① 初始区间 [0, 1]，最优点藏在某处（函数单峰）");

    this.drawAxes();
    this.plotCurve(fn.f, 0x3a5a72); // 画虚线感：用较暗色表示"看不见真实曲线"

    this.gold = {
      a: 0, b: 1,
      x1: 0 + PHI2 * 1, x2: 0 + PHI * 1,
      f1: null, f2: null,
      round: 0,
      phase: "probe1",   // probe1 → probe2 → compare → shrink → done
      timer: 0,
      maxRound: 7,
      probes: [],
      rangeLines: [],
    };
    // 画初始区间竖线
    this.addVLine(0, RANGE_COLOR, 0.7);
    this.addVLine(1, RANGE_COLOR, 0.7);
    this.addLabel("0", 0, -0.12, 0.55);
    this.addLabel("1", 1, -0.12, 0.55);

    this.orbit.dist = 8;
    this.applyCamera();
  }

  updateGolden() {
    const g = this.gold;
    if (!g || g.phase === "done") return;
    g.timer++;

    if (g.phase === "probe1") {
      if (g.timer > 25) {
        g.f1 = FUNCTIONS[this.fnIdx].f(g.x1);
        this.addDot(g.x1, g.f1, POINT_HI, 0.14);
        this.addLabel("x₁", g.x1, g.f1, 0.6);
        this.setCaption(`② 第 ${g.round + 1} 轮：在 x₁=${g.x1.toFixed(3)} 处试验（f=${g.f1.toFixed(3)}）`);
        g.phase = "probe2"; g.timer = 0;
      }
    } else if (g.phase === "probe2") {
      if (g.timer > 30) {
        g.f2 = FUNCTIONS[this.fnIdx].f(g.x2);
        this.addDot(g.x2, g.f2, POINT_HI, 0.14);
        this.addLabel("x₂", g.x2, g.f2, 0.6);
        this.setCaption(`③ 在 x₂=${g.x2.toFixed(3)} 处试验（f=${g.f2.toFixed(3)}），比较两者`);
        g.phase = "compare"; g.timer = 0;
      }
    } else if (g.phase === "compare") {
      if (g.timer > 40) {
        // 淘汰：f1 > f2 → 最优点在 [x1,b]，淘汰 [a,x1]；否则淘汰 [x2,b]
        let killLow, killHigh, keptFrom, keptTo;
        if (g.f1 >= g.f2) {
          killLow = g.a; killHigh = g.x1;
          keptFrom = g.x1; keptTo = g.b;
        } else {
          killLow = g.x2; killHigh = g.b;
          keptFrom = g.a; keptTo = g.x2;
        }
        // 被淘汰点变红
        this.molGroup.children.forEach(c => {
          if (c.userData && c.userData.isProbe) {
            const x = this.invPx(c.position.x);
            if (x >= killLow && x <= killHigh && c.material) {
              c.material.color.setHex(POINT_LO);
            }
          }
        });
        // 更新区间
        this.addVLine(keptFrom, RANGE_COLOR, 0.7);
        this.addVLine(keptTo, RANGE_COLOR, 0.7);
        this.setCaption(`④ 淘汰 [${killLow.toFixed(3)}, ${killHigh.toFixed(3)}]，新区间 [${keptFrom.toFixed(3)}, ${keptTo.toFixed(3)}]（长度 ×0.618）`);
        g.a = keptFrom; g.b = keptTo;
        g.x1 = g.a + PHI2 * (g.b - g.a);
        g.x2 = g.a + PHI * (g.b - g.a);
        g.round++;
        g.phase = g.round >= g.maxRound ? "done" : "probe1";
        g.timer = 0;
      }
    } else if (g.phase === "done") {
      this.setCaption(`✓ 完成：${g.maxRound} 轮后最优点落在 [${g.a.toFixed(3)}, ${g.b.toFixed(3)}]，区间缩至 0.618^${g.maxRound}≈${Math.pow(PHI, g.maxRound).toFixed(4)}—— 点击「重新播放」可再看一遍`);
      this.elCaptionReplay.classList.add("complete");
      this.elCaptionReplay.style.display = "inline-block";
    }
  }

  invPx(v) { return (v + 4) / 8; }

  /* ============================================================
   * 二分法动画（找零点，对比）
   * ============================================================ */
  startBisect() {
    this.animMode = true;
    this.currentModel = "bisect";
    this.elCaption.style.display = "flex";
    this.elCaptionReplay.style.display = "none";
    this.elCaptionReplay.classList.remove("complete");

    this.elInfo.innerHTML = `
      <div class="mol-name">二分法动画</div>
      <div class="mol-type">单调函数找零点（对比）</div>
      <div class="mol-desc">对单调函数，f(a)·f(b)<0 则 (a,b) 内必有零点。每次取中点 c=(a+b)/2，比较 f(c) 与 0 的符号，舍去不含零点的一半——区间每轮缩至 0.5 倍（比 0.618 法慢）。</div>
      <div class="mol-atoms">绿=零点附近　红=被舍去的点</div>
    `;
    this.elOverlayTop.innerHTML = `<div class="overlay-formula">二分法 · 零点搜索</div>`;
    this.setCaption("① 单调函数 y=2x-1，零点在 [0, 1] 内（f(0)=-1，f(1)=1）");

    // 二分法用单调函数：y = 2x - 1（零点 x=0.5），y∈[-1,1] → 归一到 [0,1]
    const fnMono = (x) => (2 * x - 1 + 1) / 2; // 归一到 [0,1]，零点 0.5
    this.drawAxes();
    this.plotCurve(fnMono, 0x7fd8ff);

    this.bis = {
      a: 0, b: 1, round: 0, timer: 0,
      phase: "probe", maxRound: 8,
    };
    this.addVLine(0, RANGE_COLOR, 0.7);
    this.addVLine(1, RANGE_COLOR, 0.7);
    this.addLabel("0", 0, -0.12, 0.55);
    this.addLabel("1", 1, -0.12, 0.55);
    this.orbit.dist = 8;
    this.applyCamera();
  }

  updateBisect() {
    const b = this.bis;
    if (!b || b.phase === "done") return;
    b.timer++;

    if (b.phase === "probe" && b.timer > 45) {
      const c = (b.a + b.b) / 2;
      const fMono = (x) => (2 * x - 1 + 1) / 2;
      const fc = fMono(c);
      this.addDot(c, fc, POINT_HI, 0.13);
      this.addLabel(`c=${c.toFixed(3)}`, c, fc, 0.6);
      this.setCaption(`② 第 ${b.round + 1} 轮：取中点 c=${c.toFixed(3)}，f(c)=${(fc * 2 - 1).toFixed(3)}`);
      // 判定：原函数 y=2x-1 在 c 处符号
      const sign = 2 * c - 1;
      let nextA, nextB;
      if (sign < 0) { nextA = c; nextB = b.b; }
      else { nextA = b.a; nextB = c; }
      b.a = nextA; b.b = nextB;
      b.round++;
      b.phase = b.round >= b.maxRound ? "done" : "probe";
      b.timer = 0;
      this.addVLine(nextA, RANGE_COLOR, 0.7);
      this.addVLine(nextB, RANGE_COLOR, 0.7);
      this.setCaption(`③ 舍去不含零点的一半，新区间 [${nextA.toFixed(3)}, ${nextB.toFixed(3)}]（长度 ×0.5）`);
    } else if (b.phase === "done") {
      this.setCaption(`✓ 完成：${b.maxRound} 轮后零点落在 [${b.a.toFixed(3)}, ${b.b.toFixed(3)}]，区间缩至 0.5^${b.maxRound}≈${Math.pow(0.5, b.maxRound).toFixed(4)}（0.618 法每轮缩 0.618，更快）—— 点击「重新播放」可再看一遍`);
      this.elCaptionReplay.classList.add("complete");
      this.elCaptionReplay.style.display = "inline-block";
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

    // 曲线浏览时点击画布切换函数
    this.elCanvasWrap.addEventListener("dblclick", () => {
      if (this.currentModel !== "curve") return;
      this.curveIdx = (this.curveIdx + 1) % FUNCTIONS.length;
      this.disposeGroup(this.molGroup);
      this.disposeGroup(this.labelGroup);
      this.drawCurve();
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
      this.orbit.dist = Math.max(2.5, Math.min(30, this.orbit.dist));
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

    if (this.autoRotate && !this.animMode) {
      this.orbit.theta += 0.004;
      this.applyCamera();
    }

    if (this.animMode) {
      if (this.currentModel === "golden") this.updateGolden();
      if (this.currentModel === "bisect") this.updateBisect();
      if (this.autoRotate) { this.orbit.theta += 0.002; this.applyCamera(); }
    }

    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame(() => this.loop());
  }
}
