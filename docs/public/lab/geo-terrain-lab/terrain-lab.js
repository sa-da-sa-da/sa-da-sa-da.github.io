/**
 * 3D 地形实验室 · 主模块
 * ---------------------------------------------------------------
 * 功能：
 *   1. 可旋转/缩放的 3D 喀斯特地形（分层设色 + 光照）
 *   2. 等高线开关 · 3D 立体 ⇄ 俯视等高线图 视角切换
 *   3. 时间轴：峰丛期 → 峰林期 → 孤峰期 连续演化
 *   4. 降雨汇流演示：水滴沿最陡坡下滑，显现水系与落水洞漏失
 *   5. 切剖面：任意位置横切/纵切，生成标准地形剖面图
 *
 * 依赖：../vendor/three.module.js（本地离线副本）
 */

import * as THREE from "./vendor/three.module.js";
import {
  N, buildTerrain, elevColor, contourLevels, contourSegments,
  stageInfo, RAMP, BASE_ELEV, ELEV_RANGE
} from "./terrain-gen.js";
import { RainSim } from "./rain-flow.js";
import { drawProfile, sampleLine } from "./profile.js";

const SPAN = 100;      // 地形在世界坐标中的边长
const HSCALE = 30;     // 高度缩放（垂直夸张，便于观察起伏）

export class TerrainLab {
  constructor(root) {
    this.root = root;
    this.stage = 0;
    this.showContours = true;
    this.topView = false;
    this.profileDir = "ew";
    this.profilePos = 0.5;
    this.showFlow = true;
    this.running = false;
    this.frame = 0;

    this.buildDom();
    this.initThree();
    this.rain = new RainSim(THREE, { count: 1500, span: SPAN, hscale: HSCALE });
    this.scene.add(this.rain.points);
    this.rebuild();
    this.bindEvents();
  }

  /* ============================================================
   * DOM：左侧控制台 + 右侧 3D 画布 + 底部剖面图
   * ============================================================ */
  buildDom() {
    this.root.innerHTML = `
      <div class="lab-wrap">
        <aside class="lab-panel">
          <div class="lab-head">
            <div class="lab-title">3D 地形实验室</div>
            <div class="lab-sub">桂林喀斯特 · 分层设色与水系模拟</div>
          </div>

          <div class="lab-group">
            <div class="lab-group-title">① 演化时间轴</div>
            <input type="range" id="lab-stage" min="0" max="100" value="0" class="lab-range" />
            <div class="lab-stage-marks"><span>峰丛期</span><span>峰林期</span><span>孤峰期</span></div>
            <div class="lab-stage-name" id="lab-stage-name">峰丛期</div>
            <div class="lab-tip" id="lab-stage-tip"></div>
          </div>

          <div class="lab-group">
            <div class="lab-group-title">② 视图与等高线</div>
            <div class="lab-btn-row">
              <button class="lab-btn" id="lab-btn-view">俯视等高线图</button>
              <button class="lab-btn active" id="lab-btn-contour">等高线 开</button>
            </div>
            <div class="lab-legend" id="lab-legend"></div>
          </div>

          <div class="lab-group">
            <div class="lab-group-title">③ 降雨与汇流</div>
            <div class="lab-btn-row">
              <button class="lab-btn primary" id="lab-btn-rain">开始降雨</button>
              <button class="lab-btn active" id="lab-btn-flow">水系 显示</button>
              <button class="lab-btn" id="lab-btn-clear">清空</button>
            </div>
            <div class="lab-stat" id="lab-rain-stat">点「开始降雨」，观察水滴往哪里流</div>
            <div class="lab-tip">喀斯特区裂隙、落水洞发育，大量降水滞留洼地后下渗——这就是「地表水缺乏、地下水丰富」的成因。</div>
          </div>

          <div class="lab-group">
            <div class="lab-group-title">④ 地形剖面</div>
            <div class="lab-btn-row">
              <button class="lab-btn active" id="lab-btn-dir">东西向切</button>
            </div>
            <input type="range" id="lab-profile-pos" min="0" max="100" value="50" class="lab-range" />
            <div class="lab-stat" id="lab-profile-stat"></div>
          </div>

          <button class="lab-btn back" id="lab-btn-back">← 返回主菜单（Esc）</button>
          <div class="lab-foot">鼠标拖动旋转 · 滚轮缩放 · 右键拖动平移</div>
        </aside>

        <div class="lab-stage-area">
          <div class="lab-canvas" id="lab-canvas"></div>
          <div class="lab-profile">
            <div class="lab-profile-title" id="lab-profile-title">地形剖面图（东西向）</div>
            <canvas id="lab-profile-canvas"></canvas>
          </div>
        </div>
      </div>
    `;

    this.elCanvas = this.root.querySelector("#lab-canvas");
    this.elStage = this.root.querySelector("#lab-stage");
    this.elStageName = this.root.querySelector("#lab-stage-name");
    this.elStageTip = this.root.querySelector("#lab-stage-tip");
    this.elBtnView = this.root.querySelector("#lab-btn-view");
    this.elBtnContour = this.root.querySelector("#lab-btn-contour");
    this.elBtnRain = this.root.querySelector("#lab-btn-rain");
    this.elBtnFlow = this.root.querySelector("#lab-btn-flow");
    this.elBtnClear = this.root.querySelector("#lab-btn-clear");
    this.elBtnDir = this.root.querySelector("#lab-btn-dir");
    this.elProfilePos = this.root.querySelector("#lab-profile-pos");
    this.elProfileStat = this.root.querySelector("#lab-profile-stat");
    this.elProfileTitle = this.root.querySelector("#lab-profile-title");
    this.elProfileCanvas = this.root.querySelector("#lab-profile-canvas");
    this.elRainStat = this.root.querySelector("#lab-rain-stat");
    this.elBtnBack = this.root.querySelector("#lab-btn-back");

    // 分层设色图例
    this.root.querySelector("#lab-legend").innerHTML = RAMP.map(b => {
      const c = b.color.map(v => Math.round(v * 255)).join(",");
      return `<div class="legend-item"><i style="background:rgb(${c})"></i>${b.label} m</div>`;
    }).join("") +
      `<div class="legend-item"><i style="background:rgb(46,112,161)"></i>河流</div>` +
      `<div class="legend-item"><i style="background:rgb(92,74,112)"></i>落水洞</div>`;
  }

  /* ============================================================
   * Three.js 场景
   * ============================================================ */
  initThree() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.elCanvas.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0b1020);
    this.scene.fog = new THREE.Fog(0x0b1020, 180, 340);

    this.camera = new THREE.PerspectiveCamera(46, 1, 0.5, 1200);

    // 球坐标轨道参数
    this.orbit = { theta: -Math.PI * 0.25, phi: 0.92, dist: 165, target: new THREE.Vector3(0, 6, 0) };
    this.applyCamera();

    this.scene.add(new THREE.HemisphereLight(0xbdd7ff, 0x38301f, 0.75));
    const sun = new THREE.DirectionalLight(0xfff2d8, 1.15);
    sun.position.set(-70, 110, 60);
    this.scene.add(sun);
    const fill = new THREE.DirectionalLight(0x9fc2ff, 0.35);
    fill.position.set(80, 40, -60);
    this.scene.add(fill);

    // 地形网格：PlaneGeometry 旋转到水平，顶点高度后续写入
    const geo = new THREE.PlaneGeometry(SPAN, SPAN, N - 1, N - 1);
    geo.rotateX(-Math.PI / 2);
    geo.setAttribute("color", new THREE.BufferAttribute(new Float32Array(N * N * 3), 3));
    this.terrainGeo = geo;
    this.terrainMesh = new THREE.Mesh(
      geo,
      new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide })
    );
    this.scene.add(this.terrainMesh);

    // 水系叠加层：与地形同形，RGBA 顶点色，按汇流量显蓝
    const flowGeo = new THREE.PlaneGeometry(SPAN, SPAN, N - 1, N - 1);
    flowGeo.rotateX(-Math.PI / 2);
    flowGeo.setAttribute("color", new THREE.BufferAttribute(new Float32Array(N * N * 4), 4));
    this.flowGeo = flowGeo;
    this.flowMesh = new THREE.Mesh(
      flowGeo,
      new THREE.MeshBasicMaterial({
        vertexColors: true, transparent: true, depthWrite: false, side: THREE.DoubleSide
      })
    );
    this.flowMesh.position.y = 0.22;
    this.scene.add(this.flowMesh);

    // 等高线
    this.contourGeo = new THREE.BufferGeometry();
    this.contourLines = new THREE.LineSegments(
      this.contourGeo,
      new THREE.LineBasicMaterial({ color: 0x2b2013, transparent: true, opacity: 0.55 })
    );
    this.contourLines.position.y = 0.12;
    this.scene.add(this.contourLines);

    // 剖面切线
    this.cutGeo = new THREE.BufferGeometry();
    this.cutLine = new THREE.Line(
      this.cutGeo,
      new THREE.LineBasicMaterial({ color: 0xffd24a })
    );
    this.cutLine.position.y = 0.5;
    this.scene.add(this.cutLine);

    this.resize();
  }

  applyCamera() {
    const o = this.orbit;
    o.phi = Math.max(0.08, Math.min(Math.PI / 2 - 0.02, o.phi));
    o.dist = Math.max(60, Math.min(300, o.dist));
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

  /* ============================================================
   * 地形重建（切换阶段时调用）
   * ============================================================ */
  rebuild() {
    this.terrain = buildTerrain(this.stage);
    const { h, elev, river, sink } = this.terrain;

    // 顶点高度与分层设色
    const pos = this.terrainGeo.attributes.position;
    const col = this.terrainGeo.attributes.color;
    for (let j = 0; j < N; j++) {
      for (let i = 0; i < N; i++) {
        const idx = j * N + i;
        pos.setY(idx, h[idx] * HSCALE);
        const c = elevColor(elev[idx], river[idx], sink[idx]);
        col.setXYZ(idx, c[0], c[1], c[2]);
      }
    }
    pos.needsUpdate = true;
    col.needsUpdate = true;
    this.terrainGeo.computeVertexNormals();

    // 水系层贴合地形
    const fpos = this.flowGeo.attributes.position;
    for (let idx = 0; idx < N * N; idx++) fpos.setY(idx, h[idx] * HSCALE);
    fpos.needsUpdate = true;

    this.rain.setTerrain(this.terrain);
    this.rain.reset();
    this.updateFlowColors();
    this.updateContours();
    this.updateCutLine();
    this.updateProfile();
    this.updateStageText();
    this.elRainStat.textContent = "点「开始降雨」，观察水滴往哪里流";
    this.elBtnRain.textContent = "开始降雨";
    this.elBtnRain.classList.add("primary");
  }

  updateStageText() {
    const info = stageInfo(this.stage);
    this.elStageName.textContent = info.name;
    this.elStageTip.textContent = info.tip;
  }

  /* ---- 等高线 ---- */
  updateContours() {
    const pts = [];
    const { elev, h } = this.terrain;
    const toWorld = (gx, gy) => {
      // 用双线性高度让等高线贴合坡面
      const i = Math.min(N - 2, Math.floor(gx)), j = Math.min(N - 2, Math.floor(gy));
      const fx = gx - i, fy = gy - j;
      const a = h[j * N + i], b = h[j * N + i + 1];
      const c = h[(j + 1) * N + i], d = h[(j + 1) * N + i + 1];
      const hh = (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy;
      return [
        -SPAN / 2 + (gx / (N - 1)) * SPAN,
        hh * HSCALE,
        -SPAN / 2 + (gy / (N - 1)) * SPAN
      ];
    };
    for (const level of contourLevels()) {
      const segs = contourSegments(elev, level);
      for (let k = 0; k < segs.length; k += 4) {
        const p = toWorld(segs[k], segs[k + 1]);
        const q = toWorld(segs[k + 2], segs[k + 3]);
        pts.push(p[0], p[1], p[2], q[0], q[1], q[2]);
      }
    }
    this.contourGeo.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    this.contourGeo.computeBoundingSphere();
    this.contourLines.visible = this.showContours;
  }

  /* ---- 水系叠加层着色 ---- */
  updateFlowColors() {
    const col = this.flowGeo.attributes.color;
    const acc = this.rain.flowAcc;
    // 用 flowMax 的低分位作参考，并对不透明度做开方压缩，
    // 使支流与干流同时可见（否则只有最热的几个格子显色）
    const ref = Math.max(8, this.rain.flowMax * 0.12);
    for (let idx = 0; idx < N * N; idx++) {
      const t = Math.min(1, acc[idx] / ref);
      const a = this.showFlow ? Math.min(0.86, Math.sqrt(t) * 0.9) : 0;
      // 汇流越多颜色越深蓝
      col.setXYZW(idx, 0.35 - 0.20 * t, 0.72 - 0.25 * t, 1.0, a);
    }
    col.needsUpdate = true;
  }

  /* ---- 剖面切线（3D 中的黄线） ---- */
  updateCutLine() {
    const { gx, gy } = sampleLine(this.terrain, this.profileDir, this.profilePos);
    const { h } = this.terrain;
    const pts = [];
    for (let k = 0; k < gx.length; k++) {
      const idx = gy[k] * N + gx[k];
      pts.push(
        -SPAN / 2 + (gx[k] / (N - 1)) * SPAN,
        h[idx] * HSCALE,
        -SPAN / 2 + (gy[k] / (N - 1)) * SPAN
      );
    }
    this.cutGeo.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    this.cutGeo.computeBoundingSphere();
  }

  updateProfile() {
    const st = drawProfile(this.elProfileCanvas, this.terrain, this.profileDir, this.profilePos);
    this.elProfileTitle.textContent =
      `地形剖面图（${this.profileDir === "ew" ? "东西向" : "南北向"}）`;
    this.elProfileStat.innerHTML =
      `最高 <b>${Math.round(st.maxElev)}m</b> · 最低 <b>${Math.round(st.minElev)}m</b> · `
      + `相对高差 <b>${Math.round(st.relief)}m</b> · `
      + `平均坡度 <b>${st.avgSlope.toFixed(1)}°</b> · 最陡处 <b>${st.maxSlope.toFixed(1)}°</b>`;
  }

  /* ============================================================
   * 交互
   * ============================================================ */
  bindEvents() {
    const dom = this.renderer.domElement;
    let dragging = 0, lx = 0, ly = 0;

    dom.addEventListener("contextmenu", e => e.preventDefault());
    dom.addEventListener("pointerdown", e => {
      dragging = e.button === 2 ? 2 : 1;
      lx = e.clientX; ly = e.clientY;
      dom.setPointerCapture(e.pointerId);
    });
    dom.addEventListener("pointermove", e => {
      if (!dragging) return;
      const dx = e.clientX - lx, dy = e.clientY - ly;
      lx = e.clientX; ly = e.clientY;
      if (dragging === 1) {
        this.orbit.theta -= dx * 0.006;
        this.orbit.phi += dy * 0.005;
        this.topView = false;
        this.elBtnView.textContent = "俯视等高线图";
      } else {
        // 右键平移
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

    // 时间轴
    this.elStage.addEventListener("input", () => {
      this.stage = (+this.elStage.value / 100) * 2;
      this.rebuild();
    });

    // 视角切换
    this.elBtnView.addEventListener("click", () => {
      this.topView = !this.topView;
      if (this.topView) {
        this.orbit.theta = 0;
        this.orbit.phi = Math.PI / 2 - 0.03;
        this.orbit.dist = 150;
        this.orbit.target.set(0, 0, 0);
        this.showContours = true;
        this.elBtnContour.classList.add("active");
        this.elBtnContour.textContent = "等高线 开";
        this.contourLines.visible = true;
        this.elBtnView.textContent = "回到 3D 立体";
      } else {
        this.orbit.theta = -Math.PI * 0.25;
        this.orbit.phi = 0.92;
        this.orbit.dist = 165;
        this.orbit.target.set(0, 6, 0);
        this.elBtnView.textContent = "俯视等高线图";
      }
      this.applyCamera();
    });

    // 等高线开关
    this.elBtnContour.addEventListener("click", () => {
      this.showContours = !this.showContours;
      this.contourLines.visible = this.showContours;
      this.elBtnContour.classList.toggle("active", this.showContours);
      this.elBtnContour.textContent = this.showContours ? "等高线 开" : "等高线 关";
    });

    // 降雨
    this.elBtnRain.addEventListener("click", () => {
      if (this.rain.raining) {
        this.rain.stop();
        this.elBtnRain.textContent = "继续降雨";
        this.elBtnRain.classList.add("primary");
      } else {
        this.rain.start();
        this.elBtnRain.textContent = "暂停降雨";
        this.elBtnRain.classList.remove("primary");
      }
    });
    this.elBtnFlow.addEventListener("click", () => {
      this.showFlow = !this.showFlow;
      this.elBtnFlow.classList.toggle("active", this.showFlow);
      this.elBtnFlow.textContent = this.showFlow ? "水系 显示" : "水系 隐藏";
      this.updateFlowColors();
    });
    this.elBtnClear.addEventListener("click", () => {
      this.rain.reset();
      this.updateFlowColors();
      this.elRainStat.textContent = "已清空汇流记录";
      this.elBtnRain.textContent = "开始降雨";
      this.elBtnRain.classList.add("primary");
    });

    // 剖面
    this.elBtnDir.addEventListener("click", () => {
      this.profileDir = this.profileDir === "ew" ? "ns" : "ew";
      this.elBtnDir.textContent = this.profileDir === "ew" ? "东西向切" : "南北向切";
      this.updateCutLine();
      this.updateProfile();
    });
    this.elProfilePos.addEventListener("input", () => {
      this.profilePos = +this.elProfilePos.value / 100;
      this.updateCutLine();
      this.updateProfile();
    });

    this.elBtnBack.addEventListener("click", () => this.onExit && this.onExit());

    this._onResize = () => { this.resize(); this.updateProfile(); };
    window.addEventListener("resize", this._onResize);
  }

  /* ============================================================
   * 渲染循环
   * ============================================================ */
  start() {
    if (this.running) return;
    this.running = true;
    this.resize();
    this.updateProfile();
    const loop = () => {
      if (!this.running) return;
      this._raf = requestAnimationFrame(loop);
      this.frame++;
      if (this.rain.raining) {
        this.rain.step();
        if (this.frame % 6 === 0) this.updateFlowColors();
        if (this.frame % 15 === 0) this.elRainStat.innerHTML = this.rain.statText();
      }
      this.renderer.render(this.scene, this.camera);
    };
    loop();
  }

  stop() {
    this.running = false;
    if (this._raf) cancelAnimationFrame(this._raf);
    this.rain.stop();
  }

  dispose() {
    this.stop();
    window.removeEventListener("resize", this._onResize);
    this.renderer.dispose();
  }
}
