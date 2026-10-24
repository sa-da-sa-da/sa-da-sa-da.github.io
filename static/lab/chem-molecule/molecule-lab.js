/**
 * 3D 分子结构实验室 · 主模块
 * ---------------------------------------------------------------
 * 功能：
 *   1. 球棍模型展示 NaCl / NaHCO₃ / NH₄Cl / Na₂CO₃ 的分子/晶体结构
 *   2. 鼠标拖拽旋转 · 滚轮缩放 · 自动旋转开关
 *   3. 原子标注（元素符号高亮）
 *   4. 离子反应动画：Na⁺ + Cl⁻ + NH₃ + CO₂ → NaHCO₃↓ + NH₄Cl
 *
 * 依赖：../vendor/three.module.js（本地离线副本）
 */

import * as THREE from "./vendor/three.module.js";
import { MOLECULES, ATOM_COLORS, ATOM_RADII, BOND_RADIUS, REACTION_PARTICLES }
  from "./molecule-data.js";

export class MoleculeLab {
  constructor(root) {
    this.root = root;
    this.currentMol = "nacl";
    this.autoRotate = true;
    this.showLabels = true;
    this.running = false;
    this.frame = 0;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.hoveredAtom = null;

    // 轨道相机参数
    this.orbit = {
      theta: -Math.PI * 0.25,
      phi: 0.95,
      dist: 12,
      target: new THREE.Vector3(0, 0, 0),
    };

    // 反应动画状态
    this.reactionMode = false;
    this.particles = [];
    this.products = [];

    this.buildDom();
    this.initThree();
    this.loadMolecule("nacl");
    this.bindEvents();
  }

  /* ============================================================
   * DOM：左侧控制台 + 右侧 3D 画布 + 底部信息栏
   * ============================================================ */
  buildDom() {
    this.root.innerHTML = `
      <div class="lab-wrap">
        <aside class="lab-panel">
          <div class="lab-head">
            <div class="lab-title">3D 分子结构实验室</div>
            <div class="lab-sub">制碱工艺 · 球棍模型与离子反应</div>
          </div>

          <div class="lab-group">
            <div class="lab-group-title">① 选择分子 / 模式</div>
            <div class="mol-tabs" id="mol-tabs">
              <button class="mol-tab active" data-mol="nacl">NaCl<br/><small>离子晶体</small></button>
              <button class="mol-tab" data-mol="nahco3">NaHCO₃<br/><small>碳酸氢钠</small></button>
              <button class="mol-tab" data-mol="nh4cl">NH₄Cl<br/><small>氯化铵</small></button>
              <button class="mol-tab" data-mol="na2co3">Na₂CO₃<br/><small>碳酸钠</small></button>
              <button class="mol-tab reaction" data-mol="reaction">反应动画<br/><small>离子反应</small></button>
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
            <div class="lab-group-title">③ 分子信息</div>
            <div class="mol-info-content"></div>
          </div>

          <div class="lab-exit">
            <button class="lab-btn primary" id="btn-exit">返回主菜单 (Esc)</button>
          </div>
        </aside>

        <div class="lab-canvas-wrap" id="lab-canvas">
          <canvas id="mol-three-canvas"></canvas>
          <div class="lab-overlay-top" id="lab-overlay-top"></div>
          <div class="lab-caption" id="lab-caption">
            <span class="caption-text" id="lab-caption-text"></span>
            <button class="caption-btn" id="lab-caption-replay" style="display:none">重新播放</button>
          </div>
          <div class="lab-legend" id="lab-legend">
            <div class="legend-title">原子配色</div>
            <div class="legend-items"></div>
          </div>
        </div>
      </div>
    `;

    // 缓存 DOM 引用
    this.elCanvas = this.root.querySelector("#mol-three-canvas");
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

    // 渲染原子图例
    const legendElems = [
      { elem: "H", color: "#ffffff", name: "氢" },
      { elem: "C", color: "#333333", name: "碳" },
      { elem: "N", color: "#3050f8", name: "氮" },
      { elem: "O", color: "#ff0d0d", name: "氧" },
      { elem: "Na", color: "#ab5cf2", name: "钠" },
      { elem: "Cl", color: "#1fe01f", name: "氯" },
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

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.elCanvas,
      antialias: true,
      alpha: false,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(w, h);
    this.renderer.setClearColor(0x0a0e1a, 1);

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0x0a0e1a, 25, 60);

    this.camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 200);

    // 光照
    const ambient = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(10, 15, 8);
    this.scene.add(dirLight);

    const dirLight2 = new THREE.DirectionalLight(0x88aaff, 0.3);
    dirLight2.position.set(-8, -5, -10);
    this.scene.add(dirLight2);

    // 分子组（每次切换分子时清空重建）
    this.molGroup = new THREE.Group();
    this.scene.add(this.molGroup);

    // 标签组（CSS2D-like 用 Sprite）
    this.labelGroup = new THREE.Group();
    this.scene.add(this.labelGroup);

    this.applyCamera();
  }

  /* ============================================================
   * 加载分子
   * ============================================================ */
  loadMolecule(key) {
    // 清空当前
    this.disposeGroup(this.molGroup);
    this.disposeGroup(this.labelGroup);
    this.reactionMode = false;

    if (key === "reaction") {
      this.elCaption.style.display = "flex";
      this.startReactionAnimation();
      return;
    }

    // 非反应模式：隐藏字幕条
    this.elCaption.style.display = "none";

    const mol = MOLECULES[key];
    if (!mol) return;
    this.currentMol = key;

    // 更新信息面板
    this.elInfo.innerHTML = `
      <div class="mol-name">${mol.name}</div>
      <div class="mol-type">${mol.type}</div>
      <div class="mol-desc">${mol.desc}</div>
      <div class="mol-atoms">原子数：${mol.atoms.length}　|　键数：${mol.bonds.length}</div>
    `;

    // 构建球棍模型
    this.buildBallAndStick(mol);

    // 调整相机距离
    if (mol.isLattice) {
      this.orbit.dist = 22;
    } else {
      this.orbit.dist = 10;
    }
    this.applyCamera();

    // 更新 overlay
    this.elOverlayTop.innerHTML = `<div class="overlay-formula">${mol.formula}</div>`;
  }

  /* ============================================================
   * 构建球棍模型
   * ============================================================ */
  buildBallAndStick(mol) {
    const atomMeshes = [];

    // 创建原子
    mol.atoms.forEach(atom => {
      const radius = ATOM_RADII[atom.elem] || 0.5;
      const color = ATOM_COLORS[atom.elem] || 0x888888;
      const geo = new THREE.SphereGeometry(radius, 32, 24);
      const mat = new THREE.MeshPhongMaterial({
        color: color,
        shininess: 80,
        specular: 0x444444,
        emissive: color,
        emissiveIntensity: 0.08,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(...atom.pos);
      mesh.userData = { elem: atom.elem, id: atom.id };
      this.molGroup.add(mesh);
      atomMeshes.push(mesh);

      // 元素标签（用 Canvas 纹理 Sprite）
      if (this.showLabels) {
        const label = this.makeTextLabel(atom.elem);
        label.position.set(...atom.pos);
        label.position.y += radius + 0.3;
        this.labelGroup.add(label);
      }
    });

    // 创建键
    mol.bonds.forEach(bond => {
      const [a, b, order] = bond;
      const atomA = mol.atoms[a];
      const atomB = mol.atoms[b];
      if (!atomA || !atomB) return;
      this.createBond(atomA.pos, atomB.pos, order || 1);
    });
  }

  createBond(posA, posB, order) {
    const vA = new THREE.Vector3(...posA);
    const vB = new THREE.Vector3(...posB);
    const dir = new THREE.Vector3().subVectors(vB, vA);
    const length = dir.length();
    if (length < 0.01) return;

    const radius = BOND_RADIUS * (order < 1 ? 0.5 : 1.0);
    const geo = new THREE.CylinderGeometry(radius, radius, length, 12);
    const mat = new THREE.MeshLambertMaterial({
      color: order < 1 ? 0x4466aa : 0x999999,
      transparent: order < 1,
      opacity: order < 1 ? 0.4 : 1.0,
    });
    const mesh = new THREE.Mesh(geo, mat);

    // 定位到中点并旋转
    const mid = new THREE.Vector3().addVectors(vA, vB).multiplyScalar(0.5);
    mesh.position.copy(mid);
    mesh.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      dir.clone().normalize()
    );
    this.molGroup.add(mesh);

    // 双键：在旁边加一个偏移的圆柱
    if (order >= 2) {
      const offset = new THREE.Vector3();
      // 找一个垂直于dir的方向
      const up = Math.abs(dir.y) < 0.99 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
      offset.crossVectors(dir, up).normalize().multiplyScalar(0.2);
      const mesh2 = new THREE.Mesh(geo.clone(), mat.clone());
      mesh2.position.copy(mid).add(offset);
      mesh2.quaternion.copy(mesh.quaternion);
      this.molGroup.add(mesh2);
    }
  }

  /* ============================================================
   * 文字标签（Canvas 纹理 Sprite）
   * ============================================================ */
  makeTextLabel(text) {
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 64;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.font = "bold 36px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, 64, 32);

    const texture = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(1.2, 0.6, 1);
    return sprite;
  }

  /* ============================================================
   * 小型球棍分子（用于反应动画产物）
   * ============================================================ */
  buildMiniMolecule(molKey, labelText, scale = 0.35) {
    const mol = MOLECULES[molKey];
    if (!mol) return new THREE.Group();

    const group = new THREE.Group();

    // 原子
    mol.atoms.forEach(atom => {
      const r = (ATOM_RADII[atom.elem] || 0.5) * scale;
      const geo = new THREE.SphereGeometry(r, 20, 16);
      const color = ATOM_COLORS[atom.elem] || 0x888888;
      const mat = new THREE.MeshPhongMaterial({
        color: color,
        shininess: 60,
        emissive: color,
        emissiveIntensity: 0.05,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(...atom.pos).multiplyScalar(scale);
      group.add(mesh);
    });

    // 键
    mol.bonds.forEach(bond => {
      const [aIdx, bIdx, order] = bond;
      const atomA = mol.atoms[aIdx];
      const atomB = mol.atoms[bIdx];
      if (!atomA || !atomB) return;
      const vA = new THREE.Vector3(...atomA.pos).multiplyScalar(scale);
      const vB = new THREE.Vector3(...atomB.pos).multiplyScalar(scale);
      const dir = new THREE.Vector3().subVectors(vB, vA);
      const length = dir.length();
      if (length < 0.01) return;
      const radius = BOND_RADIUS * scale * (order < 1 ? 0.6 : 1.0);
      const geo = new THREE.CylinderGeometry(radius, radius, length, 10);
      const mat = new THREE.MeshLambertMaterial({
        color: order < 1 ? 0x4466aa : 0x999999,
        transparent: order < 1,
        opacity: order < 1 ? 0.5 : 1.0,
      });
      const mesh = new THREE.Mesh(geo, mat);
      const mid = new THREE.Vector3().addVectors(vA, vB).multiplyScalar(0.5);
      mesh.position.copy(mid);
      mesh.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        dir.clone().normalize()
      );
      group.add(mesh);
    });

    // 标签
    if (labelText) {
      const label = this.makeTextLabel(labelText);
      label.position.y = 1.4 * scale + 0.35;
      label.scale.set(0.8, 0.4, 1);
      group.add(label);
    }

    return group;
  }

  /* ============================================================
   * 离子反应动画
   * ============================================================ */
  startReactionAnimation() {
    this.reactionMode = true;
    this.currentMol = "reaction";
    this.pendingReaction = null;
    this.reactionCount = 0;
    this.reactionComplete = false;
    this.maxReactions = 6; // 每组各 6 份反应物 → 6 组反应

    // 清掉旧烧杯，避免残留
    if (this.beaker) {
      this.scene.remove(this.beaker);
      this.beaker = null;
    }

    this.elInfo.innerHTML = `
      <div class="mol-name">离子反应动画</div>
      <div class="mol-type">NaCl + NH₃ + CO₂ + H₂O → NaHCO₃↓ + NH₄Cl</div>
      <div class="mol-desc">
        在溶液中，Na⁺、Cl⁻、NH₃、CO₂、H₂O 相遇并反应。
        NaHCO₃ 因溶解度小而析出（沉淀），NH₄Cl 留在溶液中。
        这是索尔维法和联合制碱法的核心反应。
      </div>
      <div class="mol-atoms">绿色球=Cl⁻　紫色球=Na⁺　蓝色=NH₃　黑红=CO₂　红白=H₂O</div>
    `;

    this.elOverlayTop.innerHTML = `
      <div class="overlay-formula reaction-eq">NaCl + NH₃ + CO₂ + H₂O → NaHCO₃↓ + NH₄Cl</div>
    `;

    // 字幕：初始提示
    this.elCaptionReplay.style.display = "none";
    this.elCaptionReplay.classList.remove("complete");
    this.setCaption(
      "① 反应物在盐水中自由游动：Na⁺、Cl⁻、NH₃、CO₂、H₂O（各 6 个）"
    );

    // 创建粒子：配比 1:1:1:1:1 → 生成 1 NaHCO₃ + 1 NH₄Cl
    this.particles = [];
    this.products = [];
    const beakerSize = 8;

    for (let i = 0; i < 6; i++) this.particles.push(this.createParticle("Na", beakerSize));
    for (let i = 0; i < 6; i++) this.particles.push(this.createParticle("Cl", beakerSize));
    for (let i = 0; i < 6; i++) this.particles.push(this.createParticle("NH3", beakerSize));
    for (let i = 0; i < 6; i++) this.particles.push(this.createParticle("CO2", beakerSize));
    for (let i = 0; i < 6; i++) this.particles.push(this.createParticle("H2O", beakerSize));

    // 反应产物计数器
    this.productCount = 0;
    this.reactionTimer = 0;

    // 创建烧杯边框（透明框）
    const beakerGeo = new THREE.BoxGeometry(beakerSize * 2, beakerSize * 2, beakerSize * 2);
    const beakerEdges = new THREE.EdgesGeometry(beakerGeo);
    const beakerMat = new THREE.LineBasicMaterial({ color: 0x3a6080, transparent: true, opacity: 0.4 });
    this.beaker = new THREE.LineSegments(beakerEdges, beakerMat);
    this.scene.add(this.beaker);

    this.orbit.dist = 18;
    this.applyCamera();
  }

  /* 更新反应动画字幕 */
  setCaption(text) {
    if (this.elCaptionText) this.elCaptionText.innerHTML = text;
  }

  /* 全部反应完成：常驻最终态 + 显示重播按钮 */
  showFinalCaption() {
    this.setCaption(
      "✓ <em>反应完成</em>：NaHCO₃ 沉淀沉在烧杯底部，NH₄Cl 溶解在溶液中 —— 点击「重新播放」可再看一遍"
    );
    this.elCaptionReplay.classList.add("complete");
    this.elCaptionReplay.style.display = "inline-block";
  }

  /* 重新播放：清空重来 */
  replayReaction() {
    this.disposeGroup(this.molGroup);
    this.disposeGroup(this.labelGroup);
    this.particles = [];
    this.products = [];
    this.startReactionAnimation();
  }

  createParticle(type, bound) {
    const group = new THREE.Group();
    const colorMap = {
      "Na": 0xab5cf2,
      "Cl": 0x1fe01f,
      "NH3": 0x3050f8,
      "CO2": 0xff4444,
    };
    const radiusMap = {
      "Na": 0.5,
      "Cl": 0.8,
      "NH3": 0.55,
      "CO2": 0.5,
    };

    const radius = radiusMap[type] || 0.5;
    const color = colorMap[type] || 0xffffff;

    if (type === "NH3") {
      // N + 3H 简化（三角锥）
      const nGeo = new THREE.SphereGeometry(0.5, 20, 16);
      const nMat = new THREE.MeshPhongMaterial({ color: 0x3050f8, shininess: 60 });
      const nMesh = new THREE.Mesh(nGeo, nMat);
      group.add(nMesh);
      for (let i = 0; i < 3; i++) {
        const hGeo = new THREE.SphereGeometry(0.2, 12, 8);
        const hMat = new THREE.MeshPhongMaterial({ color: 0xffffff, shininess: 30 });
        const hMesh = new THREE.Mesh(hGeo, hMat);
        const angle = (i / 3) * Math.PI * 2;
        hMesh.position.set(Math.cos(angle) * 0.6, Math.sin(angle) * 0.6, 0);
        group.add(hMesh);
      }
    } else if (type === "CO2") {
      // C + 2O 线性
      const cGeo = new THREE.SphereGeometry(0.4, 20, 16);
      const cMat = new THREE.MeshPhongMaterial({ color: 0x333333, shininess: 60 });
      const cMesh = new THREE.Mesh(cGeo, cMat);
      group.add(cMesh);
      for (let i = 0; i < 2; i++) {
        const oGeo = new THREE.SphereGeometry(0.35, 16, 12);
        const oMat = new THREE.MeshPhongMaterial({ color: 0xff0d0d, shininess: 60 });
        const oMesh = new THREE.Mesh(oGeo, oMat);
        oMesh.position.x = i === 0 ? -0.9 : 0.9;
        group.add(oMesh);
      }
    } else if (type === "H2O") {
      // O + 2H（弯曲形，约 104°）
      const oGeo = new THREE.SphereGeometry(0.4, 20, 16);
      const oMat = new THREE.MeshPhongMaterial({ color: 0xff0d0d, shininess: 60 });
      const oMesh = new THREE.Mesh(oGeo, oMat);
      group.add(oMesh);
      for (let i = 0; i < 2; i++) {
        const hGeo = new THREE.SphereGeometry(0.22, 12, 8);
        const hMat = new THREE.MeshPhongMaterial({ color: 0xffffff, shininess: 30 });
        const hMesh = new THREE.Mesh(hGeo, hMat);
        const angle = i === 0 ? -0.75 : 0.75;
        hMesh.position.set(Math.sin(angle) * 0.62, Math.cos(angle) * 0.62, 0);
        group.add(hMesh);
      }
    } else {
      // 单原子离子
      const geo = new THREE.SphereGeometry(radius, 24, 18);
      const mat = new THREE.MeshPhongMaterial({
        color: color,
        shininess: 70,
        emissive: color,
        emissiveIntensity: 0.1,
      });
      const mesh = new THREE.Mesh(geo, mat);
      group.add(mesh);
    }

    // 标签
    const labelMap = { "Na": "Na⁺", "Cl": "Cl⁻", "NH3": "NH₃", "CO2": "CO₂", "H2O": "H₂O" };
    const label = this.makeTextLabel(labelMap[type] || type);
    label.position.y = radius + 0.4;
    label.scale.set(0.8, 0.4, 1);
    group.add(label);

    // 随机位置和速度
    group.position.set(
      (Math.random() - 0.5) * bound * 1.5,
      (Math.random() - 0.5) * bound * 1.5,
      (Math.random() - 0.5) * bound * 1.5
    );
    group.userData = {
      type: type,
      vel: new THREE.Vector3(
        (Math.random() - 0.5) * 0.04,
        (Math.random() - 0.5) * 0.04,
        (Math.random() - 0.5) * 0.04
      ),
      bound: bound,
      reacted: false,
      label: label,
    };

    this.molGroup.add(group);
    return group;
  }

  updateReactionAnimation() {
    if (!this.reactionMode) return;
    const bound = 7;

    // 处理“会合中”的反应：把反应物拉到一起，再生成产物
    if (this.pendingReaction) {
      const { pair, center } = this.pendingReaction;
      let allArrived = true;
      pair.forEach(p => {
        if (p.userData.reacted) return;
        p.position.lerp(center, 0.12);
        if (p.position.distanceTo(center) > 0.6) allArrived = false;
      });
      this.pendingReaction.timer--;

      if (allArrived || this.pendingReaction.timer <= 0) {
        this.formProducts(this.pendingReaction);
        this.pendingReaction = null;
      }
      return; // 会合期间暂停其他粒子的随机运动
    }

    this.particles.forEach(p => {
      if (p.userData.reacted || p.userData.pairing) return;
      p.position.add(p.userData.vel);
      // 边界反弹
      ["x", "y", "z"].forEach(axis => {
        if (Math.abs(p.position[axis]) > bound) {
          p.position[axis] = Math.sign(p.position[axis]) * bound;
          p.userData.vel[axis] *= -1;
        }
      });
      // 旋转
      p.rotation.y += 0.01;
      p.rotation.x += 0.005;
    });

    // 定期触发反应
    this.reactionTimer++;
    const activeCount = this.particles.filter(p => !p.userData.reacted && !p.userData.pairing).length;
    if (this.reactionTimer > 100 && activeCount >= 5) {
      this.triggerReaction();
      this.reactionTimer = 0;
    }
  }

  triggerReaction() {
    // 化学计量：1 Na + 1 Cl + 1 NH3 + 1 CO2 + 1 H2O → 1 NaHCO3↓ + 1 NH4Cl
    const active = this.particles.filter(p => !p.userData.reacted && !p.userData.pairing);
    const na  = active.find(p => p.userData.type === "Na");
    const cl  = active.find(p => p.userData.type === "Cl");
    const nh3 = active.find(p => p.userData.type === "NH3");
    const co2 = active.find(p => p.userData.type === "CO2");
    const h2o = active.find(p => p.userData.type === "H2O");

    if (!na || !cl || !nh3 || !co2 || !h2o) return;

    const pair = [na, cl, nh3, co2, h2o];
    const center = new THREE.Vector3();
    pair.forEach(p => center.add(p.position));
    center.divideScalar(pair.length);

    pair.forEach(p => {
      p.userData.pairing = true;
      p.userData.target = center.clone();
    });

    this.setCaption(
      "② 五种粒子相遇：Na⁺ + Cl⁻ + NH₃ + CO₂ + H₂O → 准备生成产物"
    );
    this.pendingReaction = { pair, timer: 45, center };
  }

  formProducts({ pair, center }) {
    // 标记反应物已消耗
    pair.forEach(p => {
      p.userData.reacted = true;
      p.userData.pairing = false;
      p.userData.fadeOut = true;
      p.userData.fadeLife = 40;
    });

    // ① NaHCO3 沉淀：从中心略上方出现，向下快速沉降到底部
    const precip = this.buildMiniMolecule("nahco3", "NaHCO₃↓", 0.30);
    precip.position.copy(center).add(new THREE.Vector3(0, 0.6, 0));
    precip.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
    precip.userData = {
      vel: new THREE.Vector3(0, -0.10, 0),
      kind: "precip",
    };
    this.molGroup.add(precip);
    this.products.push(precip);

    // ② NH4Cl 溶液产物：从中心斜上方 2~3 单位外出现，缓慢漂移
    //    与 NaHCO3 明显错开，避免镜头拉近时叠成一团
    const angle = Math.random() * Math.PI * 2;
    const solOffset = new THREE.Vector3(
      Math.cos(angle) * 2.6,
      1.0 + Math.random() * 0.6,
      Math.sin(angle) * 2.6
    );
    const sol = this.buildMiniMolecule("nh4cl", "NH₄Cl", 0.30);
    sol.position.copy(center).add(solOffset);
    sol.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
    sol.userData = {
      vel: new THREE.Vector3(
        (Math.random() - 0.5) * 0.010,
        0.002,
        (Math.random() - 0.5) * 0.010
      ),
      kind: "solution",
    };
    this.molGroup.add(sol);
    this.products.push(sol);

    this.productCount++;
    this.reactionCount++;
    this.setCaption(
      `③ 第 ${this.reactionCount} / ${this.maxReactions} 组：生成 <em>NaHCO₃↓</em>（沉淀，下沉）和 <em>NH₄Cl</em>（留在溶液）`
    );
  }

  updateProducts() {
    const bound = 7;

    // 更新产物运动（常驻最终态，不消失）
    this.products.forEach(p => {
      // 沉淀：到 beaker 底部就停住
      if (p.userData.kind === "precip") {
        if (p.position.y > -bound + 0.5) {
          p.position.y += p.userData.vel.y;
        } else {
          p.userData.vel.set(0, 0, 0);  // 沉到底部，停住
          // 在底部轻微左右摆动
          p.position.x += Math.sin(Date.now() * 0.001 + p.id) * 0.002;
        }
      } else {
        // 溶液产物：轻微漂移
        p.position.add(p.userData.vel);
        // 边界反弹
        ["x", "y", "z"].forEach(axis => {
          if (Math.abs(p.position[axis]) > bound) {
            p.position[axis] = Math.sign(p.position[axis]) * bound;
            p.userData.vel[axis] *= -0.8;
          }
        });
        // 上下浮动
        p.position.y += Math.sin(Date.now() * 0.002 + p.id) * 0.01;
      }
      p.rotation.y += 0.005;
    });

    // 淡出已反应粒子
    this.particles.forEach(p => {
      if (p.userData.fadeOut) {
        p.userData.fadeLife--;
        p.children.forEach(c => {
          if (c.material) {
            c.material.transparent = true;
            c.material.opacity = Math.max(0, p.userData.fadeLife / 60);
          }
        });
        if (p.userData.fadeLife <= 0) {
          p.visible = false;
        }
      }
    });

    // 全部反应完成 → 常驻最终状态，显示完成字幕与重播按钮
    if (!this.reactionComplete && this.reactionCount >= this.maxReactions
        && this.particles.every(p => p.userData.reacted)) {
      this.reactionComplete = true;
      this.showFinalCaption();
    }
  }

  /* ============================================================
   * 相机控制
   * ============================================================ */
  applyCamera() {
    const { theta, phi, dist, target } = this.orbit;
    const x = target.x + dist * Math.sin(phi) * Math.cos(theta);
    const y = target.y + dist * Math.cos(phi);
    const z = target.z + dist * Math.sin(phi) * Math.sin(theta);
    this.camera.position.set(x, y, z);
    this.camera.lookAt(target);
  }

  /* ============================================================
   * 事件绑定
   * ============================================================ */
  bindEvents() {
    // 分子切换
    this.elTabs.addEventListener("click", (e) => {
      const btn = e.target.closest(".mol-tab");
      if (!btn) return;
      this.elTabs.querySelectorAll(".mol-tab").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      const mol = btn.dataset.mol;
      this.loadMolecule(mol);
    });

    // 自动旋转
    this.elBtnRotate.addEventListener("click", () => {
      this.autoRotate = !this.autoRotate;
      this.elBtnRotate.textContent = this.autoRotate ? "自动旋转 开" : "自动旋转 关";
      this.elBtnRotate.classList.toggle("active", this.autoRotate);
    });

    // 重置视角
    this.elBtnReset.addEventListener("click", () => {
      this.orbit.theta = -Math.PI * 0.25;
      this.orbit.phi = 0.95;
      this.orbit.dist = this.reactionMode ? 18 : (MOLECULES[this.currentMol]?.isLattice ? 22 : 10);
      this.orbit.target.set(0, 0, 0);
      this.applyCamera();
    });

    // 退出
    this.elBtnExit.addEventListener("click", () => {
      if (this.onExit) this.onExit();
    });

    // 反应动画：重新播放
    this.elCaptionReplay.addEventListener("click", () => {
      this.replayReaction();
    });

    // 鼠标拖拽旋转
    let dragging = false;
    let lastX = 0, lastY = 0;
    const canvas = this.elCanvasWrap;

    canvas.addEventListener("pointerdown", (e) => {
      dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
      if (canvas.hasPointerCapture) {
        try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
      }
    });
    canvas.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      this.orbit.theta -= dx * 0.01;
      this.orbit.phi = Math.max(0.1, Math.min(Math.PI - 0.1, this.orbit.phi - dy * 0.01));
      this.applyCamera();
    });
    canvas.addEventListener("pointerup", (e) => {
      dragging = false;
      if (canvas.hasPointerCapture) {
        try { canvas.releasePointerCapture(e.pointerId); } catch (err) {}
      }
    });
    canvas.addEventListener("pointercancel", () => { dragging = false; });

    // 滚轮缩放
    canvas.addEventListener("wheel", (e) => {
      e.preventDefault();
      this.orbit.dist *= e.deltaY > 0 ? 1.1 : 0.92;
      this.orbit.dist = Math.max(3, Math.min(50, this.orbit.dist));
      this.applyCamera();
    }, { passive: false });

    // 窗口大小变化
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

  /* ============================================================
   * 工具：清空 Group 并释放资源
   * ============================================================ */
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
      if (Array.isArray(obj.material)) {
        obj.material.forEach(m => { if (m.map) m.map.dispose(); m.dispose(); });
      } else {
        if (obj.material.map) obj.material.map.dispose();
        obj.material.dispose();
      }
    }
    if (obj.children && obj.children.length > 0) {
      [...obj.children].forEach(c => this.disposeObject(c));
    }
  }

  /* ============================================================
   * 动画循环
   * ============================================================ */
  start() {
    if (this.running) return;
    this.running = true;
    this.loop();
  }

  stop() {
    this.running = false;
    window.removeEventListener("resize", this.resizeHandler);
  }

  dispose() {
    this.stop();
    if (this.molGroup) this.disposeGroup(this.molGroup);
    if (this.labelGroup) this.disposeGroup(this.labelGroup);
    if (this.beaker) this.scene.remove(this.beaker);
    if (this.renderer) {
      this.renderer.dispose();
      if (this.renderer.forceContextLoss) this.renderer.forceContextLoss();
    }
  }

  loop() {
    if (!this.running) return;
    this.frame++;

    // 自动旋转
    if (this.autoRotate && !this.reactionMode) {
      this.orbit.theta += 0.005;
      this.applyCamera();
    }

    // 反应动画更新
    if (this.reactionMode) {
      this.updateReactionAnimation();
      this.updateProducts();
      if (this.autoRotate) {
        this.orbit.theta += 0.003;
        this.applyCamera();
      }
    }

    // 清理烧杯
    if (!this.reactionMode && this.beaker) {
      this.scene.remove(this.beaker);
      this.beaker = null;
    }

    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame(() => this.loop());
  }
}
