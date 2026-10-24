// 卷积运算可视化实验室（A）
// three.js 离线副本。展示：输入 f(τ)、核 g 翻转平移 g(t−τ)、逐点乘积、积分面积、卷积结果曲线。
// 含「运算」与「曲面」两种视角；字幕分 5 阶段；支持重播与手动拖动 t。
import * as THREE from "./vendor/three.module.js";
import {
  DOMAIN, SCALE_V, WIDTH, RESULT_OFFSET,
  fx, gx, gShift, convAt, dx, sample, worldX
} from "./conv-data.js";

const N = DOMAIN.N;

export class ConvLab {
  constructor(root) {
    this.root = root;
    this.mode = "op";          // 'op' | 'surf'
    this.running = false;
    this.playing = false;
    this.finished = false;
    this.manual = false;
    this.T = DOMAIN.min;
    this.autoRotate = true;
    this.threeBuilt = false;
    this.replayBtn = null;
    this.lastT = 0;
    this._onResize = () => this.resize();
    this.buildDom();
    this.bindEvents();
  }

  buildDom() {
    this.root.innerHTML = `
    <div class="lab-wrap">
      <div class="lab-panel">
        <div class="lab-group">
          <div class="lab-group-title">卷积可视化 · (f*g)(t)</div>
          <div class="lab-readout">
            青线 = 输入 f(τ)<br/>
            品红线 = 核 g，翻转平移后 g(t−τ)<br/>
            黄面 = f(τ)·g(t−τ)，其面积即 (f*g)(t)<br/>
            绿线 = 卷积结果，随 t 生长
          </div>
        </div>
        <div class="lab-group">
          <div class="lab-group-title">视角</div>
          <div class="lab-btn-row">
            <button class="lab-btn active" data-act="op">运算视图</button>
            <button class="lab-btn" data-act="surf">曲面视图</button>
          </div>
        </div>
        <div class="lab-group">
          <div class="lab-group-title">播放</div>
          <div class="lab-btn-row">
            <button class="lab-btn primary" data-act="play">▶ 播放</button>
            <button class="lab-btn" data-act="replay">↻ 重播</button>
            <button class="lab-btn" data-act="rotate">⟳ 自转</button>
            <button class="lab-btn" data-act="reset">⌖ 复位视角</button>
          </div>
        </div>
        <div class="lab-group">
          <div class="lab-group-title">手动拖动 t</div>
          <div class="lab-slider-row">
            <input type="range" id="convT" min="${DOMAIN.min}" max="${DOMAIN.max}" step="0.01" value="${DOMAIN.min}" />
            <span class="val" id="convTval">${DOMAIN.min.toFixed(2)}</span>
          </div>
        </div>
        <div class="lab-group">
          <div class="lab-group-title">说明</div>
          <div class="lab-readout">
            先点「播放」看 g 如何翻转、平移、相乘、积分；<br/>
            也可直接拖滑块手动扫 t；<br/>
            切到「曲面视图」看 f(τ)·g(t−τ) 的高度场，竖切面即乘积曲线。
          </div>
        </div>
      </div>
      <div class="lab-canvas-wrap" style="position:relative;">
        <canvas id="convCanvas"></canvas>
        <div class="lab-caption" id="convCaption" style="position:absolute;left:0;right:0;bottom:0;">
          <span id="convCaptionText">① 两个信号：输入 f(τ)（青）与核 g(τ)（品红）。卷积就是让 g 滑过 f。</span>
          <button id="convReplay" style="display:none;margin-left:12px;">重新播放 ▸</button>
        </div>
      </div>
    </div>`;
    this.canvas = this.root.querySelector("#convCanvas");
    this.captionText = this.root.querySelector("#convCaptionText");
    this.replayBtn = this.root.querySelector("#convReplay");
    this.tSlider = this.root.querySelector("#convT");
    this.tVal = this.root.querySelector("#convTval");
    this.replayBtn.addEventListener("click", () => this.replay());
  }

  bindEvents() {
    // 自研球坐标轨道相机
    this.orbit = { theta: 0.6, phi: 1.15, dist: 16, target: new THREE.Vector3(0, -0.8, 0) };
    let dragging = false, lx = 0, ly = 0;
    this.canvas.addEventListener("pointerdown", e => { dragging = true; lx = e.clientX; ly = e.clientY; this.canvas.setPointerCapture(e.pointerId); });
    this.canvas.addEventListener("pointermove", e => {
      if (!dragging) return;
      const dxm = e.clientX - lx, dym = e.clientY - ly; lx = e.clientX; ly = e.clientY;
      this.orbit.theta -= dxm * 0.008;
      this.orbit.phi = Math.max(0.15, Math.min(Math.PI - 0.15, this.orbit.phi - dym * 0.008));
    });
    this.canvas.addEventListener("pointerup", () => dragging = false);
    this.canvas.addEventListener("pointercancel", () => dragging = false);
    this.canvas.addEventListener("wheel", e => {
      e.preventDefault();
      this.orbit.dist = Math.max(7, Math.min(40, this.orbit.dist * (e.deltaY > 0 ? 1.1 : 0.92)));
    }, { passive: false });

    this.root.querySelectorAll(".lab-btn").forEach(b => {
      b.addEventListener("click", () => this.onBtn(b));
    });
    this.tSlider.addEventListener("input", () => {
      this.manual = true; this.playing = false; this.finished = false;
      this.T = parseFloat(this.tSlider.value);
      this.tVal.textContent = this.T.toFixed(2);
      this.replayBtn.style.display = "none";
      this.updateScene();
    });
  }

  onBtn(b) {
    const act = b.dataset.act;
    if (act === "op" || act === "surf") {
      this.mode = act;
      this.root.querySelectorAll(".lab-btn").forEach(x => { if (x.dataset.act === "op" || x.dataset.act === "surf") x.classList.toggle("active", x.dataset.act === act); });
      this.showMode();
    } else if (act === "play") {
      if (this.finished) this.replay();
      this.playing = true; this.manual = false;
    } else if (act === "replay") {
      this.replay();
    } else if (act === "rotate") {
      this.autoRotate = !this.autoRotate;
      b.classList.toggle("active", this.autoRotate);
    } else if (act === "reset") {
      this.orbit.theta = 0.6; this.orbit.phi = 1.15; this.orbit.dist = 16;
    }
  }

  showMode() {
    const op = this.mode === "op";
    this.opGroup.visible = op;
    this.surfGroup.visible = !op;
  }

  ensureThree() {
    if (this.threeBuilt) return;
    const w = this.canvas.clientWidth || 800, h = this.canvas.clientHeight || 600;
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(w, h, false);
    this.renderer.setClearColor(0x04101c, 1);

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0x04101c, 22, 55);
    this.camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 200);
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const d1 = new THREE.DirectionalLight(0x9fe8ff, 0.9); d1.position.set(5, 10, 7); this.scene.add(d1);
    const d2 = new THREE.DirectionalLight(0x4ec9d8, 0.5); d2.position.set(-6, 4, -4); this.scene.add(d2);

    this.opGroup = new THREE.Group();
    this.surfGroup = new THREE.Group();
    this.scene.add(this.opGroup);
    this.scene.add(this.surfGroup);

    // 基线
    const baseGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(worldX(DOMAIN.min), 0, 0), new THREE.Vector3(worldX(DOMAIN.max), 0, 0)
    ]);
    this.opGroup.add(new THREE.Line(baseGeo, new THREE.LineBasicMaterial({ color: 0x335066 })));
    const resGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(worldX(DOMAIN.min), RESULT_OFFSET, 0), new THREE.Vector3(worldX(DOMAIN.max), RESULT_OFFSET, 0)
    ]);
    this.opGroup.add(new THREE.Line(resGeo, new THREE.LineBasicMaterial({ color: 0x335066 })));

    // f(τ) 静态线
    const fArr = sample(fx);
    const fPos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) { fPos[3*i] = worldX(DOMAIN.min + i*dx); fPos[3*i+1] = fArr[i]*SCALE_V; fPos[3*i+2] = 0; }
    const fGeo = new THREE.BufferGeometry();
    fGeo.setAttribute("position", new THREE.BufferAttribute(fPos, 3));
    this.fLine = new THREE.Line(fGeo, new THREE.LineBasicMaterial({ color: 0x4ec9d8 }));
    this.opGroup.add(this.fLine);

    // g(t−τ) 动态线
    this.gPos = new Float32Array(N * 3);
    const gGeo = new THREE.BufferGeometry();
    gGeo.setAttribute("position", new THREE.BufferAttribute(this.gPos, 3));
    this.gLine = new THREE.Line(gGeo, new THREE.LineBasicMaterial({ color: 0xff6bd0 }));
    this.opGroup.add(this.gLine);

    // 乘积 f·g 动态线
    this.pPos = new Float32Array(N * 3);
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute("position", new THREE.BufferAttribute(this.pPos, 3));
    this.pLine = new THREE.Line(pGeo, new THREE.LineBasicMaterial({ color: 0xffd95c }));
    this.opGroup.add(this.pLine);

    // 积分面积（半透明填充）
    this.areaPos = new Float32Array(2 * N * 3);
    const aGeo = new THREE.BufferGeometry();
    aGeo.setAttribute("position", new THREE.BufferAttribute(this.areaPos, 3));
    const idx = [];
    for (let i = 0; i < N - 1; i++) {
      idx.push(2*i, 2*i+1, 2*i+2, 2*i+1, 2*i+2, 2*i+3);
    }
    aGeo.setIndex(idx);
    this.areaMesh = new THREE.Mesh(aGeo, new THREE.MeshBasicMaterial({ color: 0xffd95c, transparent: true, opacity: 0.28, side: THREE.DoubleSide }));
    this.opGroup.add(this.areaMesh);

    // 卷积结果曲线（绿），逐帧用 drawRange 生长
    this.rPos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) { this.rPos[3*i] = worldX(DOMAIN.min + i*dx); this.rPos[3*i+1] = RESULT_OFFSET; this.rPos[3*i+2] = -2.2; }
    const rGeo = new THREE.BufferGeometry();
    rGeo.setAttribute("position", new THREE.BufferAttribute(this.rPos, 3));
    this.rLine = new THREE.Line(rGeo, new THREE.LineBasicMaterial({ color: 0x5fff9f }));
    this.rLine.geometry.setDrawRange(0, 1);
    this.opGroup.add(this.rLine);

    this.buildSurface();
    this.threeBuilt = true;
    this.showMode();
  }

  buildSurface() {
    const M = 90;
    this.M = M;
    const pos = new Float32Array(M * M * 3);
    const idx = [];
    for (let iy = 0; iy < M; iy++) {
      const t = DOMAIN.min + (iy / (M - 1)) * (DOMAIN.max - DOMAIN.min);
      for (let ix = 0; ix < M; ix++) {
        const tau = DOMAIN.min + (ix / (M - 1)) * (DOMAIN.max - DOMAIN.min);
        const k = (iy * M + ix) * 3;
        pos[k] = worldX(tau);
        pos[k+1] = fx(tau) * gx(t - tau) * SCALE_V * 1.4;
        pos[k+2] = worldX(t);
      }
    }
    for (let iy = 0; iy < M - 1; iy++) {
      for (let ix = 0; ix < M - 1; ix++) {
        const a = iy*M+ix, b = iy*M+ix+1, c = (iy+1)*M+ix, d = (iy+1)*M+ix+1;
        idx.push(a, c, b, b, c, d);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0x2f8fb0, wireframe: true, transparent: true, opacity: 0.6 }));
    this.surfGroup.add(mesh);

    // 竖切扫描线（当前 t 处的乘积曲线）
    this.surfLinePos = new Float32Array(M * 3);
    const sGeo = new THREE.BufferGeometry();
    sGeo.setAttribute("position", new THREE.BufferAttribute(this.surfLinePos, 3));
    this.surfLine = new THREE.Line(sGeo, new THREE.LineBasicMaterial({ color: 0xffd95c }));
    this.surfGroup.add(this.surfLine);
  }

  updateScene() {
    // 更新 g、乘积、面积、结果
    for (let i = 0; i < N; i++) {
      const tau = DOMAIN.min + i * dx;
      const x = worldX(tau);
      const gv = gShift(tau, this.T);
      const pv = fx(tau) * gv;
      this.gPos[3*i] = x; this.gPos[3*i+1] = gv * SCALE_V; this.gPos[3*i+2] = 0.0;
      this.pPos[3*i] = x; this.pPos[3*i+1] = pv * SCALE_V; this.pPos[3*i+2] = 0.0;
      // 面积填充：底 (x,0) 顶 (x, pv)
      const a = 2*i*3, b = (2*i+1)*3;
      this.areaPos[a] = x; this.areaPos[a+1] = 0; this.areaPos[a+2] = 0;
      this.areaPos[b] = x; this.areaPos[b+1] = pv * SCALE_V; this.areaPos[b+2] = 0;
    }
    this.gLine.geometry.attributes.position.needsUpdate = true;
    this.pLine.geometry.attributes.position.needsUpdate = true;
    this.areaMesh.geometry.attributes.position.needsUpdate = true;

    // 结果曲线生长
    const cnt = Math.max(1, Math.round((this.T - DOMAIN.min) / (DOMAIN.max - DOMAIN.min) * (N - 1)) + 1);
    for (let i = 0; i < cnt; i++) {
      const t = DOMAIN.min + i * dx;
      this.rPos[3*i+1] = RESULT_OFFSET + convAt(t) * SCALE_V;
    }
    this.rLine.geometry.attributes.position.needsUpdate = true;
    this.rLine.geometry.setDrawRange(0, cnt);

    // 曲面扫描线
    if (this.surfGroup.visible) {
      const M = this.M;
      const ti = Math.round((this.T - DOMAIN.min) / (DOMAIN.max - DOMAIN.min) * (M - 1));
      const tc = DOMAIN.min + (ti / (M - 1)) * (DOMAIN.max - DOMAIN.min);
      for (let ix = 0; ix < M; ix++) {
        const tau = DOMAIN.min + (ix / (M - 1)) * (DOMAIN.max - DOMAIN.min);
        this.surfLinePos[3*ix] = worldX(tau);
        this.surfLinePos[3*ix+1] = fx(tau) * gx(tc - tau) * SCALE_V * 1.4;
        this.surfLinePos[3*ix+2] = worldX(tc);
      }
      this.surfLine.geometry.attributes.position.needsUpdate = true;
    }
    this.updateCaption();
  }

  updateCaption() {
    if (!this._started) {
      this.captionText.textContent = "① 两个信号：输入 f(τ)（青）与核 g(τ)（品红）。卷积就是让 g 滑过 f。";
      return;
    }
    if (this.finished) {
      this.captionText.textContent = "⑤ 相乘再对 τ 积分，面积即 (f*g)(t)。扫完一遍，绿色曲线就是完整卷积。点「重新播放」再看一次。";
      this.replayBtn.style.display = "inline-block";
      return;
    }
    const p = (this.T - DOMAIN.min) / (DOMAIN.max - DOMAIN.min);
    let txt;
    if (p < 0.12) txt = "② 核先翻转：g(τ) → g(−τ)（品红线从右倾变左倾）";
    else if (p < 0.45) txt = "③ 再平移到 t：g(t−τ)，让它滑过 f";
    else if (p < 0.9) txt = "④ 在每个 τ 处，f(τ) 与 g(t−τ) 逐点相乘（黄），其下面积即积分";
    else txt = "⑤ 当 t 走到这里，面积 = (f*g)(t)，绿色结果曲线随之生长";
    this.captionText.textContent = txt;
  }

  replay() {
    this.T = DOMAIN.min;
    this.finished = false;
    this._started = true;
    this.manual = false;
    this.playing = true;
    this.tSlider.value = DOMAIN.min;
    this.tVal.textContent = DOMAIN.min.toFixed(2);
    this.replayBtn.style.display = "none";
    this.updateScene();
  }

  applyCamera() {
    const o = this.orbit;
    const x = o.dist * Math.sin(o.phi) * Math.sin(o.theta);
    const y = o.dist * Math.cos(o.phi);
    const z = o.dist * Math.sin(o.phi) * Math.cos(o.theta);
    this.camera.position.set(o.target.x + x, o.target.y + y, o.target.z + z);
    this.camera.lookAt(o.target);
  }

  resize() {
    if (!this.threeBuilt) return;
    const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  start() {
    this.ensureThree();
    window.addEventListener("resize", this._onResize);
    if (!this._started) { this._started = true; }
    this.playing = true; this.finished = false; this.manual = false;
    this.T = DOMAIN.min;
    this.tSlider.value = DOMAIN.min; this.tVal.textContent = DOMAIN.min.toFixed(2);
    this.updateScene();
    this.running = true;
    this.lastT = performance.now();
    this.loop();
  }

  stop() {
    this.running = false;
    window.removeEventListener("resize", this._onResize);
  }

  loop() {
    if (!this.running) return;
    const now = performance.now();
    const dt = Math.min(0.05, (now - this.lastT) / 1000);
    this.lastT = now;

    if (this.autoRotate && this.mode === "op") { this.orbit.theta += 0.0035; }
    if (this.playing && !this.manual) {
      this.T += dt * 2.0;
      if (this.T >= DOMAIN.max) { this.T = DOMAIN.max; this.playing = false; this.finished = true; }
      this.tSlider.value = this.T;
      this.tVal.textContent = this.T.toFixed(2);
      this.updateScene();
    }
    this.applyCamera();
    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame(() => this.loop());
  }
}
