/**
 * 冰川秘境 · 沉浸式观察实验室（多场景版）
 * ---------------------------------------------------------------
 * 设计取向（与溶洞探秘一致，route A 全景天穹）：
 *   用「球形 360°全景天穹 + 少量几何 + 飘雪粒子 + 圆形雪地」营造身处冰川
 *   环境的氛围，并以此为基底做"冰川地貌"多场景对比观察教学——
 *   看完不同地貌，抛出供学生讨论分析的问题。
 *
 * 功能：
 *   1. 360°等距全景冰川图作内壁天穹（背景 + 环境光 IBL），相机在内部环顾即"身处冰川"
 *   2. 数据驱动多场景：GLACIER_SCENES 数组，每项 = 全景图 + 氛围参数 + 讲解 + 讨论题
 *   3. 场景切换（上一处 / 下一处）：换全景、调光照/雾/粒子、重建前景
 *   4. 两种漫游模式：引导穿越（CatmullRom 曲线） / 自由探索（WASD + 拖拽 + 滚轮）
 *   5. 冰川知识热点：3D 空间标记 + 左侧清单，点击弹讲解卡
 *   6. 氛围：点光冷色 + 轻雾 + 飘雪粒子 + 圆形雪地（遮底部极点）
 *
 * 依赖：../vendor/three.module.js（本地离线副本）
 * 集成：app.js 的 LESSON_CATALOG 加 { id:"geo-glacier-cave", kind:"lab" }，由 openLab 动态 import。
 */

import * as THREE from "./vendor/three.module.js";

/* 冰川知识点（热点内容，跨场景通用） */
const KNOWLEDGE = [
  {
    key: "glacier", title: "冰川是什么",
    pos: [-11, 11, -6],
    body: "在高纬或高山，积雪经年不化、被压实成冰，当冰体厚度足够大、能在重力作用下缓慢流动时，就形成了冰川。它是“会走的冰”，也是塑造地表的一支巨大力量。"
  },
  {
    key: "uvalley", title: "U 形谷",
    pos: [6, -8, 9],
    body: "河流下切出的是 V 形谷（谷壁陡、底部尖）；而厚重冰川像一把巨大的锉刀，把谷底和谷壁一起刨蚀、磨宽，形成谷壁和缓、谷底宽平的 U 形谷。看横剖面，就能区分二者。"
  },
  {
    key: "cirque", title: "冰斗",
    pos: [13, 9, -3],
    body: "位于雪线附近、三面环壁的围椅状凹地，是积雪压实成冰的“摇篮”。冰川从这里溢出下流，凹地本身则是冰斗——也是判断某地曾被冰川覆盖的重要证据之一。"
  },
  {
    key: "horn", title: "角峰",
    pos: [-18, 4, 7],
    body: "当三个或更多冰斗从不同方向围攻一座山峰，山尖被一圈冰斗“啃”成锥状尖峰，就是角峰，如珠穆朗玛峰。刃脊则是两个冰斗相向夹出的刀刃状山梁。"
  },
  {
    key: "moraine", title: "冰碛",
    pos: [0, -10, 1],
    body: "冰川在流动中裹挟、搬运大量岩石碎屑，冰退时这些物质就地堆积，称为冰碛。垄状的终碛标出冰川曾经到达的最远界线，是“冰川来过”的直接物证。"
  }
];

/* 多场景：三处典型冰川地貌（数据驱动）。
 * params: light 光照倍率, fog 雾密度, particle 可见粒子数, snow 雪地不透明度, dome 顶部遮挡透明度 */
const GLACIER_SCENES = [
  {
    id: "scene1",
    title: "场景一 · 冰蚀 U 形谷",
    pano: "./assets/glacier/pano1.jpg",
    intro: "你站在一条被冰川深深改造过的山谷里。两侧崖壁不像河流峡谷那样陡峭尖削，而是平缓地向远处展开，谷底宽而平——这是厚重冰床像锉刀一样“锉”出来的 U 形谷。试着环顾四周，记住它和河流峡谷的不同。",
    question: "单凭“山谷横剖面是 V 还是 U”，就能判断它曾被冰川作用过吗？还需要结合哪些地貌证据，才能下结论？",
    params: { light: 1.25, fog: 0.0085, particle: 700, snow: 0.85, dome: 0.5 }
  },
  {
    id: "scene2",
    title: "场景二 · 冰斗与角峰",
    pano: "./assets/glacier/pano2.jpg",
    intro: "抬起头，雪线之上的山势被“精雕”过：围椅状的冰斗嵌在崖壁之间，尖峰被削成金字塔形。这是冰川“削山尖”的杰作——冰斗、刃脊、角峰，和 U 形谷一样，都是冰蚀的招牌。",
    question: "为什么 U 形谷、冰斗、角峰常常“同框”出现？它们共同说明了什么？如果一个地方同时具备这三者，能反推出怎样的地理历史？",
    params: { light: 1.45, fog: 0.007, particle: 850, snow: 0.8, dome: 0.45 }
  },
  {
    id: "scene3",
    title: "场景三 · 冰碛与冰后期",
    pano: "./assets/glacier/pano3.jpg",
    intro: "冰川已经退去，却留下了“行李”——沿途散落的砾石与泥就是冰碛；垄状的终碛标出冰川曾经到达的最远界线。这里如今或许不再有冰，但满地冰碛诉说着曾经的冰期。",
    question: "为什么有的山谷今天根本没有冰川，却满布 U 形谷和冰碛？这跟气候变迁、地壳抬升有什么关系？我们还能从哪里找到“冰川来过”的证据？",
    params: { light: 1.6, fog: 0.0065, particle: 950, snow: 0.78, dome: 0.42 }
  }
];

export class GlacierCave {
  constructor(root) {
    this.root = root;
    this.mode = "guided";
    this.running = false;
    this.frame = 0;
    this.clock = new THREE.Clock();
    this.sceneIndex = 0;

    this.playing = false;
    this.t = 0;
    this.guideSpeed = 0.045;

    this.yaw = 0;
    this.pitch = 0;
    this.keys = {};
    this.dragging = false;
    this.lastX = 0;
    this.lastY = 0;
    this.moved = 0;

    this.hotspots = [];
    this.hotspotSprites = [];
    this.snow = null;
    this._snowBase = null;
    this._snowPhase = 0;
    this._particleMax = 1000;
    this._alphaTex = null;

    this.injectStyle();
    this.buildDom();
    this.initThree();
    this.buildScene();
    this.bindEvents();
  }

  injectStyle() {
    if (document.getElementById("glacier-style")) return;
    const s = document.createElement("style");
    s.id = "glacier-style";
    s.textContent = `
      #glc-canvas { width:100%; height:100%; display:block; }
      .lab-stage-area { position:relative; }
      .glc-loading { position:absolute; inset:0; display:flex; align-items:center;
        justify-content:center; color:#eaf4ff; font-size:18px;
        background:rgba(10,16,30,0.6); z-index:5; }
      .glc-info { position:absolute; right:18px; top:18px; width:340px; max-width:44%;
        background:rgba(14,22,40,0.92); border:1px solid rgba(150,200,255,0.35);
        border-radius:12px; padding:18px 20px; color:#eef5ff; z-index:6;
        box-shadow:0 8px 30px rgba(0,0,0,0.5); }
      .glc-info-close { position:absolute; right:10px; top:6px; background:none;
        border:none; color:#a9c2e0; font-size:22px; cursor:pointer; line-height:1; }
      .glc-info-title { font-size:18px; font-weight:700; margin-bottom:8px; color:#bfe6ff; }
      .glc-info-body { font-size:14px; line-height:1.7; color:#d9e6f7; }
      .glc-crosshair { position:absolute; left:50%; top:50%; width:8px; height:8px;
        margin:-4px 0 0 -4px; border-radius:50%; background:rgba(200,230,255,0.75);
        box-shadow:0 0 6px rgba(150,210,255,0.9); display:none; pointer-events:none; z-index:4; }
      .glc-hotspot-list { display:flex; flex-direction:column; gap:6px; }
      .glc-hotspot-item { text-align:left; background:rgba(255,255,255,0.06);
        border:1px solid rgba(150,200,255,0.2); color:#e0ecfb; border-radius:8px;
        padding:8px 10px; cursor:pointer; font-size:13px; }
      .glc-hotspot-item:hover { background:rgba(120,180,255,0.18); }
      .glc-stage-title-inline { font-size:15px; font-weight:700; color:#bfe6ff; margin-bottom:6px; }
      .glc-stage-nav { display:flex; align-items:center; gap:8px; }
      .glc-stage-nav .lab-btn { flex:1; padding:7px 4px; font-size:13px; }
      .glc-stage-prog { font-size:13px; color:#a9c2e0; min-width:38px; text-align:center; }
      .glc-stage { position:absolute; left:18px; bottom:18px; width:440px; max-width:48%;
        background:rgba(14,22,40,0.92); border:1px solid rgba(150,200,255,0.35);
        border-radius:12px; padding:16px 18px; color:#eef5ff; z-index:6;
        box-shadow:0 8px 30px rgba(0,0,0,0.5); display:none; }
      .glc-stage-close { position:absolute; right:10px; top:6px; background:none;
        border:none; color:#a9c2e0; font-size:22px; cursor:pointer; line-height:1; }
      .glc-stage-title { font-size:17px; font-weight:700; margin-bottom:6px; color:#bfe6ff; }
      .glc-stage-body { font-size:14px; line-height:1.7; color:#d9e6f7; }
      .glc-stage-q { margin-top:10px; padding:10px 12px; background:rgba(110,170,255,0.14);
        border-left:3px solid #74b4ff; border-radius:6px; font-size:14px; color:#eef5ff; }
      .glc-stage-q b { color:#fff; }
    `;
    document.head.appendChild(s);
  }

  buildDom() {
    this.root.innerHTML = `
      <div class="lab-wrap">
        <aside class="lab-panel">
          <div class="lab-head">
            <div class="lab-title">冰川秘境</div>
            <div class="lab-sub">冰川地貌 · 沉浸式观察</div>
          </div>

          <div class="lab-group">
            <div class="lab-group-title">① 漫游模式</div>
            <div class="lab-btn-row">
              <button class="lab-btn active" id="glc-btn-guided">引导穿越</button>
              <button class="lab-btn" id="glc-btn-free">自由探索</button>
            </div>
            <div class="lab-tip" id="glc-mode-tip">沿固定路线观察冰川地貌，可播放 / 暂停 / 拖动进度</div>
          </div>

          <div class="lab-group" id="glc-guided-group">
            <div class="lab-group-title">② 穿越进度</div>
            <input type="range" min="0" max="1000" value="0" class="lab-range" id="glc-progress" />
            <div class="lab-btn-row">
              <button class="lab-btn primary" id="glc-btn-play">▶ 播放</button>
            </div>
          </div>

          <div class="lab-group" id="glc-free-group" style="display:none">
            <div class="lab-group-title">② 自由移动</div>
            <div class="lab-tip">W / A / S / D 移动 · 鼠标拖拽转视角 · 滚轮升降</div>
          </div>

          <div class="lab-group">
            <div class="lab-group-title">③ 冰川知识</div>
            <div id="glc-hotspots" class="glc-hotspot-list"></div>
          </div>

          <div class="lab-group">
            <div class="lab-group-title">④ 冰川地貌场景</div>
            <div class="glc-stage-title-inline" id="glc-stage-title">场景一 · 冰蚀 U 形谷</div>
            <div class="glc-stage-nav">
              <button class="lab-btn" id="glc-stage-prev">← 上一处</button>
              <span class="glc-stage-prog" id="glc-stage-prog">1/3</span>
              <button class="lab-btn" id="glc-stage-next">下一处 →</button>
            </div>
            <div class="lab-tip">切换不同冰川地貌，观察形态差异并思考</div>
          </div>

          <button class="lab-btn back" id="glc-btn-back">← 返回主菜单（Esc）</button>
          <div class="lab-foot">引导模式：自动飞行 · 自由模式：WASD + 鼠标</div>
        </aside>

        <div class="lab-stage-area">
          <div class="lab-canvas" id="glc-canvas"></div>
          <div class="glc-loading" id="glc-loading">正在生成冰川场景…</div>
          <div class="glc-crosshair" id="glc-crosshair"></div>
          <div class="glc-info" id="glc-info" style="display:none">
            <button class="glc-info-close" id="glc-info-close">×</button>
            <div class="glc-info-title" id="glc-info-title"></div>
            <div class="glc-info-body" id="glc-info-body"></div>
          </div>
          <div class="glc-stage" id="glc-stage">
            <button class="glc-stage-close" id="glc-stage-close">×</button>
            <div class="glc-stage-title" id="glc-stage-cardtitle"></div>
            <div class="glc-stage-body" id="glc-stage-body"></div>
            <div class="glc-stage-q" id="glc-stage-q" style="display:none"></div>
          </div>
        </div>
      </div>
    `;

    this.elCanvas = this.root.querySelector("#glc-canvas");
    this.elLoading = this.root.querySelector("#glc-loading");
    this.elProgress = this.root.querySelector("#glc-progress");
    this.elPlay = this.root.querySelector("#glc-btn-play");
    this.elBtnGuided = this.root.querySelector("#glc-btn-guided");
    this.elBtnFree = this.root.querySelector("#glc-btn-free");
    this.elGuidedGroup = this.root.querySelector("#glc-guided-group");
    this.elFreeGroup = this.root.querySelector("#glc-free-group");
    this.elModeTip = this.root.querySelector("#glc-mode-tip");
    this.elHotspots = this.root.querySelector("#glc-hotspots");
    this.elInfo = this.root.querySelector("#glc-info");
    this.elInfoTitle = this.root.querySelector("#glc-info-title");
    this.elInfoBody = this.root.querySelector("#glc-info-body");
    this.elCrosshair = this.root.querySelector("#glc-crosshair");
    this.elBtnBack = this.root.querySelector("#glc-btn-back");
    this.elStageTitle = this.root.querySelector("#glc-stage-title");
    this.elStagePrev = this.root.querySelector("#glc-stage-prev");
    this.elStageNext = this.root.querySelector("#glc-stage-next");
    this.elStageProg = this.root.querySelector("#glc-stage-prog");
    this.elStage = this.root.querySelector("#glc-stage");
    this.elStageCardTitle = this.root.querySelector("#glc-stage-cardtitle");
    this.elStageBody = this.root.querySelector("#glc-stage-body");
    this.elStageQ = this.root.querySelector("#glc-stage-q");
    this.elStageClose = this.root.querySelector("#glc-stage-close");

    this.elHotspots.innerHTML = KNOWLEDGE.map(
      (k, i) => `<button class="glc-hotspot-item" data-i="${i}">◆ ${k.title}</button>`
    ).join("");
  }

  initThree() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.elCanvas.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a1424);
    this.scene.fog = new THREE.FogExp2(0x16263c, 0.007);

    this.camera = new THREE.PerspectiveCamera(
      62,
      (this.elCanvas.clientWidth || 900) / (this.elCanvas.clientHeight || 560),
      0.1,
      1000
    );
    this.camera.position.set(-20, 2, 6);

    this.ambient = new THREE.AmbientLight(0x50708a, 1.2);
    this.hemi = new THREE.HemisphereLight(0xbcd8ff, 0x1a2230, 1.2);
    const p1 = new THREE.PointLight(0xbfe4ff, 3.0, 160, 1.2);
    p1.position.set(-12, 8, -4);
    const p2 = new THREE.PointLight(0xcff0ff, 2.5, 150, 1.4);
    p2.position.set(12, -4, 6);
    const p3 = new THREE.PointLight(0xfff0d8, 2.0, 130, 1.6);
    p3.position.set(0, 14, 0);
    this.plights = [p1, p2, p3];
    this.scene.add(this.ambient, this.hemi, p1, p2, p3);

    this.raycaster = new THREE.Raycaster();
    this.scene.environment = null;
    this.resize();
  }

  buildScene() {
    this.caveGroup = new THREE.Group();
    this.scene.add(this.caveGroup);

    this.buildParticles();
    this.buildHotspots();
    this.elLoading.style.display = "none";
    this.showScene(0);
  }

  loadEnvironment(panoPath) {
    const tex = new THREE.TextureLoader().load(
      panoPath,
      undefined,
      undefined,
      () => { console.warn("[glacier] 全景图加载失败，回退纯色：" + panoPath); }
    );
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.mapping = THREE.EquirectangularReflectionMapping;
    this.envTexture = tex;
    if (this.scene) {
      this.scene.background = tex;
      this.scene.environment = tex;
    }
  }

  clearCave() {
    if (!this.caveGroup) return;
    for (let i = this.caveGroup.children.length - 1; i >= 0; i--) {
      const o = this.caveGroup.children[i];
      if (o.geometry) o.geometry.dispose();
      if (o.material) {
        const m = o.material;
        if (m.alphaMap) m.alphaMap.dispose();
        m.dispose();
      }
      this.caveGroup.remove(o);
    }
    this.snow = null;
    this._snowBase = null;
  }

  buildStage(p) {
    this.addDomeCap(p.dome);
    this.addSnowGround(p.snow);
  }

  /* 圆形雪地：方形网格 + 圆形 alpha 遮罩，遮底部极点且自然（无方台感） */
  addSnowGround(opacity = 0.8) {
    const geo = new THREE.PlaneGeometry(48, 48, 64, 64);
    const rpos = geo.attributes.position;
    this._snowBase = new Float32Array(rpos.count * 2);
    for (let i = 0; i < rpos.count; i++) {
      this._snowBase[i * 2] = rpos.getX(i);
      this._snowBase[i * 2 + 1] = rpos.getY(i);
    }
    const mat = new THREE.MeshStandardMaterial({
      color: 0xdfeaf5,
      roughness: 0.95,
      metalness: 0.0,
      emissive: 0x2a3a52,
      emissiveIntensity: 0.25,
      side: THREE.DoubleSide,
      transparent: true,
      opacity,
      alphaMap: this.circularAlpha()
    });
    const ground = new THREE.Mesh(geo, mat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -12;
    ground.frustumCulled = false;
    this.snow = ground;
    this.caveGroup.add(ground);
  }

  circularAlpha() {
    if (this._alphaTex) return this._alphaTex;
    const c = document.createElement("canvas");
    c.width = c.height = 256;
    const ctx = c.getContext("2d");
    const g = ctx.createRadialGradient(128, 128, 12, 128, 128, 128);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.72, "rgba(255,255,255,1)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);
    this._alphaTex = new THREE.CanvasTexture(c);
    return this._alphaTex;
  }

  /* 顶部半透明冷色穹顶：轻量遮住 360°全景极点放射线 */
  addDomeCap(opacity = 0.5) {
    const R = 34, theta = 0.32;
    const geo = new THREE.SphereGeometry(R, 48, 24, 0, Math.PI * 2, 0, theta);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x1a3050, transparent: true, opacity,
      side: THREE.DoubleSide, roughness: 0.4, metalness: 0.2,
      emissive: 0x102038, emissiveIntensity: 0.4
    });
    this.caveGroup.add(new THREE.Mesh(geo, mat));
  }

  buildParticles() {
    const N = this._particleMax;
    const arr = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const r = 5 + Math.random() * 32;
      const th = Math.random() * Math.PI * 2;
      const ph = Math.acos(2 * Math.random() - 1);
      arr[i * 3] = r * Math.sin(ph) * Math.cos(th);
      arr[i * 3 + 1] = (Math.random() * 2 - 1) * 17;
      arr[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(arr, 3));
    const m = new THREE.PointsMaterial({
      map: this.makeParticleTexture(),
      color: 0xffffff, size: 0.5, transparent: true, opacity: 0.7,
      depthWrite: false, blending: THREE.NormalBlending, sizeAttenuation: true
    });
    this.particles = new THREE.Points(g, m);
    this.particles.frustumCulled = false;
    this.scene.add(this.particles);
  }

  makeParticleTexture() {
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    const ctx = c.getContext("2d");
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 30);
    g.addColorStop(0.0, "rgba(255,255,255,1)");
    g.addColorStop(0.4, "rgba(255,255,255,0.6)");
    g.addColorStop(1.0, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(32, 32, 30, 0, Math.PI * 2);
    ctx.fill();
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }

  buildHotspots() {
    const tex = this.makeMarkerTexture();
    KNOWLEDGE.forEach((k, i) => {
      const mat = new THREE.SpriteMaterial({
        map: tex, transparent: true, depthWrite: false,
        color: 0xbfe6ff, blending: THREE.AdditiveBlending
      });
      const sp = new THREE.Sprite(mat);
      sp.position.set(k.pos[0], k.pos[1], k.pos[2]);
      sp.scale.set(3.2, 3.2, 3.2);
      sp.userData.index = i;
      this.scene.add(sp);
      this.hotspotSprites.push(sp);
      this.hotspots.push(k);
    });
  }

  makeMarkerTexture() {
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    const ctx = c.getContext("2d");
    const g = ctx.createRadialGradient(32, 32, 4, 32, 32, 30);
    g.addColorStop(0, "rgba(200,240,255,0.95)");
    g.addColorStop(0.5, "rgba(140,210,255,0.45)");
    g.addColorStop(1, "rgba(90,170,255,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(32, 32, 30, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(230,247,255,0.9)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(32, 32, 16, 0, Math.PI * 2);
    ctx.stroke();
    return new THREE.CanvasTexture(c);
  }

  showScene(index) {
    const n = GLACIER_SCENES.length;
    this.sceneIndex = ((index % n) + n) % n;
    const s = GLACIER_SCENES[this.sceneIndex];
    this.clearCave();
    this.loadEnvironment(s.pano);
    this.buildStage(s.params);
    this.applyParams(s.params);
    this.updateStageUI(s);
    this.showStageCard(s);
  }

  applyParams(p) {
    if (this.ambient) this.ambient.intensity = 1.2 * p.light;
    if (this.hemi) this.hemi.intensity = 1.2 * p.light;
    if (this.plights) {
      const base = [3.0, 2.5, 2.0];
      this.plights.forEach((pl, idx) => { pl.intensity = base[idx] * p.light; });
    }
    if (this.scene.fog) this.scene.fog.density = p.fog;
    if (this.particles) {
      this.particles.geometry.setDrawRange(0, Math.min(p.particle, this._particleMax));
    }
  }

  updateStageUI(s) {
    if (this.elStageTitle) this.elStageTitle.textContent = s.title;
    if (this.elStageProg) this.elStageProg.textContent = (this.sceneIndex + 1) + "/" + GLACIER_SCENES.length;
  }

  showStageCard(s) {
    if (!this.elStage) return;
    this.elStageCardTitle.textContent = s.title;
    this.elStageBody.textContent = s.intro;
    const isLast = this.sceneIndex === GLACIER_SCENES.length - 1;
    if (isLast && s.question) {
      this.elStageQ.style.display = "block";
      this.elStageQ.innerHTML = "<b>讨论：</b>" + s.question;
    } else {
      this.elStageQ.style.display = "none";
    }
    this.elStage.style.display = "block";
  }

  hideStageCard() {
    if (this.elStage) this.elStage.style.display = "none";
  }

  bindEvents() {
    const dom = this.renderer.domElement;
    dom.addEventListener("contextmenu", (e) => e.preventDefault());

    dom.addEventListener("pointerdown", (e) => {
      this.dragging = true;
      this.moved = 0;
      this.lastX = e.clientX;
      this.lastY = e.clientY;
      dom.setPointerCapture(e.pointerId);
    });
    dom.addEventListener("pointermove", (e) => {
      if (!this.dragging) return;
      const dx = e.clientX - this.lastX;
      const dy = e.clientY - this.lastY;
      this.lastX = e.clientX;
      this.lastY = e.clientY;
      this.moved += Math.abs(dx) + Math.abs(dy);
      if (this.mode === "free") {
        this.yaw -= dx * 0.0026;
        this.pitch -= dy * 0.0026;
        this.pitch = Math.max(-1.3, Math.min(1.3, this.pitch));
        this.applyFreeRotation();
      }
    });
    dom.addEventListener("pointerup", (e) => {
      this.dragging = false;
      if (this.moved < 6) this.tryPickHotspot(e);
      if (dom.hasPointerCapture(e.pointerId)) dom.releasePointerCapture(e.pointerId);
    });
    dom.addEventListener("wheel", (e) => {
      if (this.mode === "free") {
        e.preventDefault();
        this.camera.position.y -= e.deltaY * 0.02;
        this.clampCamera();
      }
    }, { passive: false });

    this.elBtnGuided.addEventListener("click", () => this.setMode("guided"));
    this.elBtnFree.addEventListener("click", () => this.setMode("free"));

    this.elPlay.addEventListener("click", () => {
      this.playing = !this.playing;
      this.elPlay.textContent = this.playing ? "⏸ 暂停" : "▶ 播放";
      this.elPlay.classList.toggle("primary", !this.playing);
    });
    this.elProgress.addEventListener("input", () => {
      this.t = +this.elProgress.value / 1000;
      this.playing = false;
      this.elPlay.textContent = "▶ 播放";
      this.elPlay.classList.add("primary");
      this.updateGuidedCamera();
    });

    this.elHotspots.querySelectorAll(".glc-hotspot-item").forEach((btn) => {
      btn.addEventListener("click", () => this.openInfo(+btn.dataset.i));
    });
    this.root.querySelector("#glc-info-close").addEventListener("click", () => {
      this.elInfo.style.display = "none";
    });

    this.elStagePrev.addEventListener("click", () => this.showScene(this.sceneIndex - 1));
    this.elStageNext.addEventListener("click", () => this.showScene(this.sceneIndex + 1));
    this.elStageClose.addEventListener("click", () => this.hideStageCard());

    this.elBtnBack.addEventListener("click", () => this.onExit && this.onExit());

    this._onResize = () => this.resize();
    window.addEventListener("resize", this._onResize);

    window.addEventListener("keydown", this._onKey = (e) => {
      this.keys[e.key.toLowerCase()] = true;
    });
    window.addEventListener("keyup", this._onKeyUp = (e) => {
      this.keys[e.key.toLowerCase()] = false;
    });
  }

  setMode(mode) {
    this.mode = mode;
    const guided = mode === "guided";
    this.elBtnGuided.classList.toggle("active", guided);
    this.elBtnFree.classList.toggle("active", !guided);
    this.elGuidedGroup.style.display = guided ? "" : "none";
    this.elFreeGroup.style.display = guided ? "none" : "";
    this.elCrosshair.style.display = guided ? "none" : "block";
    this.elModeTip.textContent = guided
      ? "沿固定路线观察冰川地貌，可播放 / 暂停 / 拖动进度"
      : "WASD 移动 · 鼠标拖拽转视角 · 滚轮升降";
    if (guided) this.updateGuidedCamera();
  }

  applyFreeRotation() {
    this.camera.rotation.set(this.pitch, this.yaw, 0, "YXZ");
  }

  clampCamera() {
    const p = this.camera.position;
    const r = Math.sqrt(p.x * p.x + p.y * p.y + p.z * p.z);
    if (r > 33) { p.multiplyScalar(33 / r); }
    p.y = Math.max(-11.5, Math.min(28, p.y));
  }

  tryPickHotspot(e) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const ny = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera({ x: nx, y: ny }, this.camera);
    const hits = this.raycaster.intersectObjects(this.hotspotSprites, false);
    if (hits.length) this.openInfo(hits[0].object.userData.index);
  }

  openInfo(i) {
    const k = this.hotspots[i];
    if (!k) return;
    this.elInfoTitle.textContent = k.title;
    this.elInfoBody.textContent = k.body;
    this.elInfo.style.display = "block";
  }

  getGuideCurve() {
    if (this._curve) return this._curve;
    const pts = [
      new THREE.Vector3(-22, 0, 8),
      new THREE.Vector3(-10, 6, -6),
      new THREE.Vector3(2, -2, 10),
      new THREE.Vector3(12, 8, -4),
      new THREE.Vector3(20, 0, 6)
    ];
    this._curve = new THREE.CatmullRomCurve3(pts, false, "catmullrom", 0.5);
    return this._curve;
  }

  updateGuidedCamera() {
    const c = this.getGuideCurve();
    const p = c.getPointAt(Math.min(this.t, 1));
    const look = c.getPointAt(Math.min(this.t + 0.02, 1));
    this.camera.position.copy(p);
    this.camera.lookAt(look);
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.clock.start();
    this.resize();
    if (this.mode === "guided") this.updateGuidedCamera();
    const loop = () => {
      if (!this.running) return;
      this._raf = requestAnimationFrame(loop);
      this.frame++;
      const dt = Math.min(this.clock.getDelta(), 0.05);

      // 雪花缓慢飘落 + 轻微旋转
      if (this.particles) {
        const pos = this.particles.geometry.attributes.position;
        this._snowPhase += dt;
        for (let i = 0; i < pos.count; i++) {
          let y = pos.getY(i) - dt * 1.6;
          if (y < -17) y = 17;
          pos.setY(i, y);
        }
        pos.needsUpdate = true;
        this.particles.rotation.y += dt * 0.02;
      }

      // 雪地轻微起伏
      if (this.snow && this._snowBase) {
        const t = this.clock.elapsedTime;
        const p = this.snow.geometry.attributes.position;
        const b = this._snowBase;
        for (let i = 0; i < p.count; i++) {
          const x = b[i * 2], y = b[i * 2 + 1];
          p.setZ(i, Math.sin(x * 0.3 + t * 0.8) * 0.12 + Math.cos(y * 0.4 + t * 0.6) * 0.1);
        }
        p.needsUpdate = true;
        this.snow.geometry.computeVertexNormals();
      }

      if (this.mode === "guided" && this.playing) {
        this.t += dt * this.guideSpeed;
        if (this.t >= 1) { this.t = 1; this.playing = false; this.elPlay.textContent = "▶ 播放"; this.elPlay.classList.add("primary"); }
        this.elProgress.value = Math.round(this.t * 1000);
        this.updateGuidedCamera();
      } else if (this.mode === "free") {
        this.stepFree(dt);
      }

      this.renderer.render(this.scene, this.camera);
    };
    loop();
  }

  stepFree(dt) {
    const v = 14 * dt;
    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);
    const right = new THREE.Vector3().crossVectors(dir, this.camera.up).normalize();
    if (this.keys["w"]) this.camera.position.addScaledVector(dir, v);
    if (this.keys["s"]) this.camera.position.addScaledVector(dir, -v);
    if (this.keys["d"]) this.camera.position.addScaledVector(right, v);
    if (this.keys["a"]) this.camera.position.addScaledVector(right, -v);
    this.clampCamera();
  }

  stop() {
    this.running = false;
    if (this._raf) cancelAnimationFrame(this._raf);
  }

  resize() {
    const w = this.elCanvas.clientWidth || 900;
    const h = this.elCanvas.clientHeight || 560;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  dispose() {
    this.stop();
    window.removeEventListener("resize", this._onResize);
    window.removeEventListener("keydown", this._onKey);
    window.removeEventListener("keyup", this._onKeyUp);
    this.renderer.dispose();
  }
}
