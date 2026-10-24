/**
 * 3D DNA 实验室 · 主模块
 * ---------------------------------------------------------------
 * 功能：
 *   1. DNA 双螺旋模型（双链反向平行、碱基互补配对、氢键）
 *   2. 碱基配对原则（A-T / C-G 展示）
 *   3. 分离定律动画（Aa × Aa → 3:1，配子随机结合）
 *   4. DNA 复制动画（解旋 → 互补配对 → 两个 DNA）
 *
 * 依赖：../vendor/three.module.js（本地离线副本）
 */

import * as THREE from "./vendor/three.module.js";
import { DNA_COLORS, DNA_RADII, BASE_PAIRS, DNA_HELIX, DNA_SEQUENCE }
  from "./dna-data.js";

export class DnaLab {
  constructor(root) {
    this.root = root;
    this.currentModel = "dna";
    this.autoRotate = true;
    this.running = false;
    this.frame = 0;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.orbit = {
      theta: -Math.PI * 0.25,
      phi: 0.95,
      dist: 14,
      target: new THREE.Vector3(0, 0, 0),
    };

    this.animMode = false;
    this.particles = [];
    this.products = [];

    this.buildDom();
    this.initThree();
    this.loadModel("dna");
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
            <div class="lab-title">3D DNA 实验室</div>
            <div class="lab-sub">双螺旋 · 碱基配对 · 遗传规律</div>
          </div>

          <div class="lab-group">
            <div class="lab-group-title">① 选择模型 / 模式</div>
            <div class="mol-tabs" id="mol-tabs">
              <button class="mol-tab active" data-mol="dna">DNA 双螺旋<br/><small>结构与配对</small></button>
              <button class="mol-tab" data-mol="separation">分离定律<br/><small>Aa×Aa → 3:1</small></button>
              <button class="mol-tab" data-mol="replication">DNA 复制<br/><small>半保留复制</small></button>
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
          <canvas id="dna-three-canvas"></canvas>
          <div class="lab-overlay-top" id="lab-overlay-top"></div>
          <div class="lab-caption" id="lab-caption">
            <span class="caption-text" id="lab-caption-text"></span>
            <button class="caption-btn" id="lab-caption-replay" style="display:none">重新播放</button>
          </div>
          <div class="lab-legend" id="lab-legend">
            <div class="legend-title">碱基配色</div>
            <div class="legend-items"></div>
          </div>
        </div>
      </div>
    `;

    this.elCanvas = this.root.querySelector("#dna-three-canvas");
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
      { elem: "A", color: "#ff5555", name: "腺嘌呤" },
      { elem: "T", color: "#55aaff", name: "胸腺嘧啶" },
      { elem: "C", color: "#55dd66", name: "胞嘧啶" },
      { elem: "G", color: "#ffcc44", name: "鸟嘌呤" },
      { elem: "P", color: "#ff8c42", name: "磷酸" },
      { elem: "S", color: "#66dddd", name: "脱氧核糖" },
    ];
    this.elLegend.innerHTML = legendElems.map(e =>
      `<div class="legend-item"><span class="legend-dot" style="background:${e.color}"></span>${e.elem} (${e.name})</div>`
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
    this.scene.fog = new THREE.Fog(0x0a0e1a, 30, 70);

    this.camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 200);

    const ambient = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambient);
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(10, 15, 8);
    this.scene.add(dirLight);
    const dirLight2 = new THREE.DirectionalLight(0x88aaff, 0.3);
    dirLight2.position.set(-8, -5, -10);
    this.scene.add(dirLight2);

    this.molGroup = new THREE.Group();
    this.scene.add(this.molGroup);
    this.labelGroup = new THREE.Group();
    this.scene.add(this.labelGroup);

    this.applyCamera();
  }

  /* ============================================================
   * 加载模型 / 模式
   * ============================================================ */
  loadModel(key) {
    this.disposeGroup(this.molGroup);
    this.disposeGroup(this.labelGroup);
    this.animMode = false;
    this.particles = [];
    this.products = [];
    this.pendingAnim = null;

    if (key === "separation") { this.startSeparation(); return; }
    if (key === "replication") { this.startReplication(); return; }

    this.elCaption.style.display = "none";
    this.currentModel = "dna";

    this.elInfo.innerHTML = `
      <div class="mol-name">DNA 双螺旋结构</div>
      <div class="mol-type">双链 · 反向平行 · 碱基互补配对</div>
      <div class="mol-desc">两条脱氧核苷酸链反向平行盘旋；外侧为磷酸—脱氧核糖骨架，内侧碱基通过氢键配对（A 配 T，C 配 G）。基因是有遗传效应的 DNA 片段。</div>
      <div class="mol-atoms">骨架：磷酸(橙)—脱氧核糖(青)　碱基：A(红) T(蓝) C(绿) G(黄)</div>
    `;
    this.elOverlayTop.innerHTML = `<div class="overlay-formula">DNA 双螺旋 · 碱基互补配对</div>`;

    this.buildHelix();
    this.orbit.dist = 16;
    this.applyCamera();
  }

  /* ============================================================
   * DNA 双螺旋
   * ============================================================ */
  buildHelix() {
    const { radius, pitch, turns, start, pairs } = DNA_HELIX;
    const seq = DNA_SEQUENCE;
    const totalAngle = turns * Math.PI * 2;
    const step = totalAngle / (pairs - 1);

    for (let i = 0; i < pairs; i++) {
      const theta = start + i * step;
      const y = (i / (pairs - 1) - 0.5) * pitch * turns;
      // 链 1 的骨架位置
      const x1 = radius * Math.cos(theta);
      const z1 = radius * Math.sin(theta);
      // 链 2 与链 1 反向平行（相差 π）
      const x2 = radius * Math.cos(theta + Math.PI);
      const z2 = radius * Math.sin(theta + Math.PI);

      // 碱基
      const base1 = seq[i % seq.length];
      const base2 = BASE_PAIRS[base1];

      // 骨架小球（磷酸 + 脱氧核糖交替，简化每位置一个糖+磷）
      this.addSphere([x1, y, z1], DNA_RADII.P, DNA_COLORS.P);
      this.addSphere([x1, y + 0.6, z1], DNA_RADII.S, DNA_COLORS.S);
      this.addSphere([x2, y, z2], DNA_RADII.P, DNA_COLORS.P);
      this.addSphere([x2, y - 0.6, z2], DNA_RADII.S, DNA_COLORS.S);

      // 碱基横档（从链1骨架伸向链2骨架）
      const midX = (x1 + x2) / 2;
      const midZ = (z1 + z2) / 2;
      // 碱基球放在离骨架内侧一点
      const r1 = radius - 0.5, r2 = radius - 0.5;
      const bx1 = r1 * Math.cos(theta);
      const bz1 = r1 * Math.sin(theta);
      const bx2 = r2 * Math.cos(theta + Math.PI);
      const bz2 = r2 * Math.sin(theta + Math.PI);
      this.addSphere([bx1, y, bz1], DNA_RADII[base1], DNA_COLORS[base1]);
      this.addSphere([bx2, y, bz2], DNA_RADII[base2], DNA_COLORS[base2]);

      // 碱基间的氢键（细圆柱）
      this.addBond([bx1, y, bz1], [bx2, y, bz2], 0.06, DNA_COLORS.H_BOND, 0.6);

      // 标签（只给几处加，避免太密）
      if (i % 6 === 0) {
        const label = this.makeTextLabel(base1);
        label.position.set(bx1, y + 0.5, bz1);
        label.scale.set(0.7, 0.35, 1);
        this.labelGroup.add(label);
      }
      void midX; void midZ;
    }
  }

  addSphere(pos, radius, color) {
    const geo = new THREE.SphereGeometry(radius, 20, 16);
    const mat = new THREE.MeshPhongMaterial({
      color, shininess: 70, emissive: color, emissiveIntensity: 0.12,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(...pos);
    this.molGroup.add(mesh);
    return mesh;
  }

  addBond(a, b, radius, color, opacity = 1) {
    const vA = new THREE.Vector3(...a);
    const vB = new THREE.Vector3(...b);
    const dir = new THREE.Vector3().subVectors(vB, vA);
    const len = dir.length();
    if (len < 0.01) return;
    const geo = new THREE.CylinderGeometry(radius, radius, len, 8);
    const mat = new THREE.MeshLambertMaterial({
      color, transparent: opacity < 1, opacity,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(vA.clone().add(vB).multiplyScalar(0.5));
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
    this.molGroup.add(mesh);
  }

  makeTextLabel(text) {
    const canvas = document.createElement("canvas");
    canvas.width = 128; canvas.height = 64;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.font = "bold 38px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, 64, 32);
    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(1.2, 0.6, 1);
    return sprite;
  }

  /* ============================================================
   * 分离定律动画（Aa × Aa → 3:1）
   * ============================================================ */
  startSeparation() {
    this.animMode = true;
    this.currentModel = "separation";
    this.elCaption.style.display = "flex";
    this.elCaptionReplay.style.display = "none";
    this.elCaptionReplay.classList.remove("complete");

    this.elInfo.innerHTML = `
      <div class="mol-name">孟德尔分离定律动画</div>
      <div class="mol-type">Aa × Aa → 配子 → 3:1</div>
      <div class="mol-desc">两株杂交水稻（基因型均为 Aa）杂交：各自产生 A、a 两种配子各一半，雌雄配子随机结合，后代 AA:Aa:aa = 1:2:1，显性:隐性 = 3:1。这就是杂种 F1 自交后优势衰退的原因。</div>
      <div class="mol-atoms">红色球=配子 A　蓝色球=配子 a</div>
    `;
    this.elOverlayTop.innerHTML = `<div class="overlay-formula">分离定律 · Aa × Aa</div>`;
    this.setCaption("① 两株亲本（Aa）位于两侧，各产生 A、a 两种配子");

    // 两个亲本：♂左（x=-6），♀右（x=6）
    const parentColor = 0xffffff;
    for (const sx of [-6, 6]) {
      const p = new THREE.Group();
      const geo = new THREE.SphereGeometry(0.9, 24, 18);
      const mat = new THREE.MeshPhongMaterial({ color: parentColor, shininess: 40, emissive: 0x666666, emissiveIntensity: 0.15 });
      p.add(new THREE.Mesh(geo, mat));
      const l = this.makeTextLabel(sx < 0 ? "亲本 ♂ Aa" : "亲本 ♀ Aa");
      l.position.y = 1.4; l.scale.set(1.2, 0.6, 1);
      p.add(l);
      p.position.set(sx, 0, 0);
      this.molGroup.add(p);
      this.products.push(p);
    }

    this.maleGametes = ["A", "a", "A", "a"];   // ♂ 亲本（Aa）产生的配子，A:a = 1:1
    this.femaleGametes = ["A", "a", "A", "a"]; // ♀ 亲本（Aa）产生的配子，A:a = 1:1
    this.particles = [];
    this.offspring = [];
    this._offspringTypes = [];
    this.round = 0;
    this.animTimer = 0;
    this.phase = "release"; // release → combine → result → done
    this.pendingAnim = null;

    this.orbit.dist = 13;
    this.applyCamera();
  }

  updateSeparation() {
    if (this.phase === "done") return;
    this.animTimer++;

    // 每帧推进运动：配子飞向中心、后代落入结果行
    this.particles.forEach(p => {
      if (p.userData && p.userData.phase === "fly") {
        p.position.lerp(p.userData.target, 0.08);
        if (p.position.distanceTo(p.userData.target) < 0.2) p.userData.phase = "arrived";
      }
    });
    this.offspring.forEach(o => { o.position.lerp(o.userData.target, 0.07); });

    if (this.phase === "release" && this.animTimer > 30) {
      this.phase = "combine";
      this.animTimer = 0;
      if (!this.maleGametes.length || !this.femaleGametes.length) { this.finishSeparation(); return; }
      // 从两个亲本各随机取一个配子（不放回），模拟雌雄配子随机结合
      const mi = Math.floor(Math.random() * this.maleGametes.length);
      const fi = Math.floor(Math.random() * this.femaleGametes.length);
      const maleAllele = this.maleGametes.splice(mi, 1)[0];
      const femaleAllele = this.femaleGametes.splice(fi, 1)[0];
      const mk = this.spawnGamete(-6, maleAllele);
      const fk = this.spawnGamete(6, femaleAllele);
      this.pendingAnim = { male: mk, female: fk, maleAllele, femaleAllele };
      this.setCaption(`② 配子相遇：${maleAllele}（♂） × ${femaleAllele}（♀） → 结合`);
    } else if (this.phase === "combine") {
      if (this.animTimer > 60) {
        this.phase = "result";
        this.animTimer = 0;
        // 配子结合：移除两个配子，生成后代
        this.removeParticle(this.pendingAnim.male);
        this.removeParticle(this.pendingAnim.female);
        const geno = [this.pendingAnim.maleAllele, this.pendingAnim.femaleAllele].sort().join("");
        this.spawnOffspring(geno);
        this.setCaption(`③ 后代基因型 ${geno}（第 ${this.round + 1} 个）`);
      }
    } else if (this.phase === "result") {
      if (this.animTimer > 50) {
        this.round++;
        if (this.round >= 4) {
          this.finishSeparation();
        } else {
          this.phase = "release";
          this.animTimer = 0;
          this.setCaption("① 下一轮：亲本再次产生配子");
        }
      }
    }
  }

  spawnGamete(fromX, allele) {
    const g = new THREE.Group();
    const color = allele === "A" ? 0xff5555 : 0x55aaff;
    const geo = new THREE.SphereGeometry(0.5, 20, 16);
    const mat = new THREE.MeshPhongMaterial({ color, shininess: 60, emissive: color, emissiveIntensity: 0.15 });
    g.add(new THREE.Mesh(geo, mat));
    const l = this.makeTextLabel(allele);
    l.position.y = 0.8; l.scale.set(0.7, 0.35, 1);
    g.add(l);
    g.position.set(fromX, 0, 0);
    g.userData = { allele, target: new THREE.Vector3(0, 0, 0), phase: "fly" };
    this.molGroup.add(g);
    this.particles.push(g);
    return g;
  }

  spawnOffspring(geno) {
    const o = new THREE.Group();
    const [a, b] = geno.split("");
    const ma = new THREE.Mesh(new THREE.SphereGeometry(0.45, 16, 12),
      new THREE.MeshPhongMaterial({ color: a === "A" ? 0xff5555 : 0x55aaff, shininess: 50, emissive: a === "A" ? 0xff5555 : 0x55aaff, emissiveIntensity: 0.12 }));
    ma.position.set(-0.4, 0, 0);
    const mb = new THREE.Mesh(new THREE.SphereGeometry(0.45, 16, 12),
      new THREE.MeshPhongMaterial({ color: b === "A" ? 0xff5555 : 0x55aaff, shininess: 50, emissive: b === "A" ? 0xff5555 : 0x55aaff, emissiveIntensity: 0.12 }));
    mb.position.set(0.4, 0, 0);
    o.add(ma); o.add(mb);
    const label = this.makeTextLabel(geno);
    label.position.y = 0.8; label.scale.set(0.8, 0.4, 1);
    o.add(label);
    const x = (this.offspring.length - 1.5) * 2.2;
    o.userData = { target: new THREE.Vector3(x, -3.5, 0), geno };
    o.position.set(0, 1.5, 0); // 从中间下落
    this.molGroup.add(o);
    this.offspring.push(o);
    this.products.push(o);
    this._offspringTypes.push(geno);
  }

  removeParticle(p) {
    const i = this.particles.indexOf(p);
    if (i >= 0) this.particles.splice(i, 1);
    this.molGroup.remove(p);
    this.disposeObject(p);
  }

  finishSeparation() {
    this.phase = "done";
    let dom = 0, rec = 0;
    (this._offspringTypes || []).forEach(t => {
      if (t.includes("A")) dom++; else rec++;
    });
    this.setCaption(`✓ 完成：4 个后代，显性(${dom}) : 隐性(${rec}) = ${dom}:${rec}（理论 3:1）—— 点击「重新播放」可再看一遍`);
    this.elCaptionReplay.classList.add("complete");
    this.elCaptionReplay.style.display = "inline-block";
  }

  /* ============================================================
   * DNA 复制动画（简化：解旋 + 互补配对）
   * ============================================================ */
  startReplication() {
    this.animMode = true;
    this.currentModel = "replication";
    this.elCaption.style.display = "flex";
    this.elCaptionReplay.style.display = "none";
    this.elCaptionReplay.classList.remove("complete");

    this.elInfo.innerHTML = `
      <div class="mol-name">DNA 复制动画</div>
      <div class="mol-type">解旋 → 互补配对 → 两个 DNA</div>
      <div class="mol-desc">DNA 复制是半保留复制：双链解旋后，每条链按碱基互补配对原则（A配T、C配G）合成新链，一个 DNA 变成两个一模一样的 DNA。</div>
      <div class="mol-atoms">红=A 蓝=T 绿=C 黄=G</div>
    `;
    this.elOverlayTop.innerHTML = `<div class="overlay-formula">DNA 半保留复制</div>`;
    this.setCaption("① 一段 DNA 双链（10 对碱基）");

    // 原始双链（上下两排碱基对，x 方向排开）
    const seq = "ATCGGTACCA".split("");
    this.repPairs = seq.map((b, i) => ({
      top: b, bottom: BASE_PAIRS[b], x: (i - 4.5) * 1.1,
    }));
    this.repState = "init"; // init → unwinding → synthesis → done
    this.repTimer = 0;
    this.repProgress = 0;
    this.newTop = [];
    this.newBottom = [];
    this.buildRepHelix(false);
    this.orbit.dist = 13;
    this.applyCamera();
  }

  buildRepHelix(synthesized) {
    // 原始双链：上方显示 top 链，下方显示 bottom 链（x 方向）
    this.repPairs.forEach((p, idx) => {
      const yTop = 2.0, yBot = -2.0;
      if (!synthesized || p.syn) {
        this.addSphere([p.x, yTop, 0], 0.5, DNA_COLORS[p.top]);
        this.addSphere([p.x, yBot, 0], 0.5, DNA_COLORS[p.bottom]);
        this.addBond([p.x, yTop, 0], [p.x, yBot, 0], 0.05, 0x888888, 0.5);
      }
    });
  }

  updateReplication() {
    if (this.repState === "done") return;
    this.repTimer++;

    if (this.repState === "init" && this.repTimer > 30) {
      this.repState = "unwinding";
      this.repTimer = 0;
      this.setCaption("② 解旋：两条链分开，暴露碱基");
      // 清掉原始配对
      this.disposeGroup(this.molGroup);
      this.repPairs.forEach(p => {
        const yTop = 2.0, yBot = -2.0;
        this.addSphere([p.x, yTop, 0], 0.5, DNA_COLORS[p.top]);
        this.addSphere([p.x, yBot, 0], 0.5, DNA_COLORS[p.bottom]);
      });
    } else if (this.repState === "unwinding" && this.repTimer > 50) {
      this.repState = "synthesis";
      this.repTimer = 0;
      this.repProgress = 0;
      this.setCaption("③ 合成新链：按互补配对原则（A-T、C-G）");
    } else if (this.repState === "synthesis") {
      if (this.repTimer % 12 === 0 && this.repProgress < this.repPairs.length) {
        const p = this.repPairs[this.repProgress];
        // 上方链下面补新链（bottom' = 与 top 互补），位置 y=0.9
        const nb = BASE_PAIRS[p.top];
        this.addSphere([p.x, 0.9, 0], 0.45, DNA_COLORS[nb]);
        this.addBond([p.x, 2.0, 0], [p.x, 0.9, 0], 0.05, 0x888888, 0.4);
        this.newBottom.push({ x: p.x, base: nb });
        // 下方链上面补新链（top' = 与 bottom 互补），位置 y=-0.9
        const nt = BASE_PAIRS[p.bottom];
        this.addSphere([p.x, -0.9, 0], 0.45, DNA_COLORS[nt]);
        this.addBond([p.x, -0.9, 0], [p.x, -2.0, 0], 0.05, 0x888888, 0.4);
        this.newTop.push({ x: p.x, base: nt });
        this.repProgress++;
        this.setCaption(`③ 合成新链 ${this.repProgress}/${this.repPairs.length}：A配T、C配G，互补延伸`);
      }
      if (this.repProgress >= this.repPairs.length) {
        this.repState = "done";
        this.setCaption(`✓ 复制完成：1 个 DNA → 2 个 DNA（半保留）—— 点击「重新播放」可再看一遍`);
        this.elCaptionReplay.classList.add("complete");
        this.elCaptionReplay.style.display = "inline-block";
      }
    }
  }

  /* ============================================================
   * 相机 / 事件 / 循环（与分子实验室一致）
   * ============================================================ */
  applyCamera() {
    const { theta, phi, dist, target } = this.orbit;
    const x = target.x + dist * Math.sin(phi) * Math.cos(theta);
    const y = target.y + dist * Math.cos(phi);
    const z = target.z + dist * Math.sin(phi) * Math.sin(theta);
    this.camera.position.set(x, y, z);
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
      this.orbit.dist = this.animMode ? 13 : 16;
      this.orbit.target.set(0, 0, 0);
      this.applyCamera();
    });

    this.elBtnExit.addEventListener("click", () => {
      if (this.onExit) this.onExit();
    });

    this.elCaptionReplay.addEventListener("click", () => {
      this.disposeGroup(this.molGroup);
      this.disposeGroup(this.labelGroup);
      this.particles = [];
      this.products = [];
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
      this.orbit.dist = Math.max(3, Math.min(50, this.orbit.dist));
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
      this.orbit.theta += 0.005;
      this.applyCamera();
    }

    if (this.animMode) {
      if (this.currentModel === "separation") this.updateSeparation();
      if (this.currentModel === "replication") this.updateReplication();
      if (this.autoRotate) { this.orbit.theta += 0.003; this.applyCamera(); }
    }

    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame(() => this.loop());
  }
}
