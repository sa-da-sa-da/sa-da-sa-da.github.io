// 图像卷积滤镜实验室（B）
// 纯 2D Canvas：离屏 getImageData 逐像素卷积。无 three.js 依赖。
// 支持：原图/滤后对比、预设滤镜、可编辑卷积核网格、强度混合、可分离卷积优化、内置样图与上传。
import { PRESETS, clonePreset, kernelSum } from "./filter-kernels.js";

export class FilterLab {
  constructor(root) {
    this.root = root;
    this.W = 360;
    this.H = 260;
    this.strength = 1;
    this.kernel = null;
    this.srcImageData = null;
    this.onExit = null;
    this.buildDom();
    this.bindEvents();
    this.loadSample("circuit");
    this.setKernel(PRESETS.find((p) => p.id === "box3"));
  }

  buildDom() {
    this.root.innerHTML = `
    <div class="lab-wrap">
      <div class="lab-panel">
        <div class="lab-head">
          <div class="lab-title">图像卷积滤镜实验室</div>
          <div class="lab-sub">模糊 · 锐化 · 边缘 · 浮雕 — 二维离散卷积</div>
        </div>

        <div class="lab-group">
          <div class="lab-group-title">示例图像</div>
          <div class="lab-btn-row">
            <button class="lab-btn active" data-sample="circuit">电路样图</button>
            <button class="lab-btn" data-sample="photo">风景样图</button>
            <button class="lab-btn" data-upload>↑ 上传图片</button>
          </div>
          <input type="file" accept="image/*" hidden />
        </div>

        <div class="lab-group">
          <div class="lab-group-title">滤镜预设</div>
          <div class="lab-presets" id="preset-row"></div>
        </div>

        <div class="lab-group">
          <div class="lab-group-title">卷积核（可直接改数字）</div>
          <div class="kernel-grid" id="kernel-grid"></div>
          <div class="lab-btn-row">
            <button class="lab-btn" data-act="normalize">权重归一</button>
            <button class="lab-btn" data-act="reset-zero">清零</button>
            <button class="lab-btn" data-act="reset-eye">单位核</button>
          </div>
          <div class="lab-readout" id="kernel-info"></div>
        </div>

        <div class="lab-group">
          <div class="lab-group-title">混合强度</div>
          <div class="lab-slider-row">
            <input type="range" id="strength" min="0" max="1" step="0.05" value="1" />
            <span class="val" id="strength-val">1.00</span>
          </div>
        </div>

        <div class="lab-exit">
          <button class="lab-btn back" data-act="exit">← 返回课程</button>
        </div>
      </div>

      <div class="lab-canvas-wrap">
        <div style="display:flex;gap:10px;width:100%;height:100%;padding:14px;box-sizing:border-box;">
          <figure style="flex:1;margin:0;display:flex;flex-direction:column;min-width:0;">
            <figcaption style="font-size:12px;color:rgba(255,255,255,0.6);text-align:center;margin-bottom:6px;">原图</figcaption>
            <canvas id="src-canvas" class="conv-canvas2d"></canvas>
          </figure>
          <figure style="flex:1;margin:0;display:flex;flex-direction:column;min-width:0;">
            <figcaption style="font-size:12px;color:rgba(255,255,255,0.6);text-align:center;margin-bottom:6px;">滤后结果</figcaption>
            <canvas id="dst-canvas" class="conv-canvas2d"></canvas>
          </figure>
        </div>
      </div>
    </div>`;

    this.srcCanvas = this.root.querySelector("#src-canvas");
    this.dstCanvas = this.root.querySelector("#dst-canvas");
    this.srcCanvas.width = this.W; this.srcCanvas.height = this.H;
    this.dstCanvas.width = this.W; this.dstCanvas.height = this.H;
    this.srcCtx = this.srcCanvas.getContext("2d");
    this.dstCtx = this.dstCanvas.getContext("2d");
    this.presetRow = this.root.querySelector("#preset-row");
    this.kernelGrid = this.root.querySelector("#kernel-grid");
    this.kernelInfo = this.root.querySelector("#kernel-info");
    this.fileInput = this.root.querySelector('input[type="file"]');
    this.strengthInput = this.root.querySelector("#strength");
    this.strengthVal = this.root.querySelector("#strength-val");

    // 预设按钮
    this.presetRow.innerHTML = PRESETS.map(
      (p) => `<button class="lab-btn" data-preset="${p.id}">${p.name}</button>`
    ).join("");
  }

  bindEvents() {
    this.root.querySelectorAll("[data-sample]").forEach((b) =>
      b.addEventListener("click", () => {
        this.root.querySelectorAll("[data-sample]").forEach((x) => x.classList.remove("active"));
        b.classList.add("active");
        this.loadSample(b.dataset.sample);
      })
    );
    this.root.querySelector("[data-upload]").addEventListener("click", () => this.fileInput.click());
    this.fileInput.addEventListener("change", (e) => {
      const f = e.target.files && e.target.files[0];
      if (f) this.loadImageFile(f);
    });
    this.presetRow.querySelectorAll("[data-preset]").forEach((b) =>
      b.addEventListener("click", () => {
        const p = PRESETS.find((x) => x.id === b.dataset.preset);
        if (p) this.setKernel(clonePreset(p));
      })
    );
    this.kernelGrid.addEventListener("input", (e) => {
      const el = e.target;
      if (!el.classList.contains("kernel-cell")) return;
      const r = +el.dataset.r, c = +el.dataset.c;
      const v = parseFloat(el.value);
      this.kernel.data[r][c] = isNaN(v) ? 0 : v;
      this.kernel.userEdited = true;
      this.apply();
    });
    this.root.querySelector('[data-act="normalize"]').addEventListener("click", () => {
      const s = kernelSum(this.kernel) || 1;
      for (const row of this.kernel.data) for (let i = 0; i < row.length; i++) row[i] = row[i] / s;
      this.kernel.normalize = true;
      this.renderKernelGrid();
      this.apply();
    });
    this.root.querySelector('[data-act="reset-zero"]').addEventListener("click", () => {
      for (const row of this.kernel.data) for (let i = 0; i < row.length; i++) row[i] = 0;
      this.kernel.userEdited = true;
      this.renderKernelGrid();
      this.apply();
    });
    this.root.querySelector('[data-act="reset-eye"]').addEventListener("click", () => {
      const s = this.kernel.size;
      for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) this.kernel.data[y][x] = (x === (s >> 1) && y === (s >> 1)) ? 1 : 0;
      this.kernel.userEdited = true;
      this.kernel.normalize = false;
      this.renderKernelGrid();
      this.apply();
    });
    this.strengthInput.addEventListener("input", () => {
      this.strength = parseFloat(this.strengthInput.value);
      this.strengthVal.textContent = this.strength.toFixed(2);
      this.apply();
    });
    this.root.querySelector('[data-act="exit"]').addEventListener("click", () => {
      if (this.onExit) this.onExit();
    });
  }

  loadSample(kind) {
    const cv = document.createElement("canvas");
    cv.width = this.W; cv.height = this.H;
    const ctx = cv.getContext("2d");
    if (kind === "photo") this.drawPhoto(ctx);
    else this.drawCircuit(ctx);
    this.srcImageData = ctx.getImageData(0, 0, this.W, this.H);
    this.srcCtx.putImageData(this.srcImageData, 0, 0);
    this.apply();
  }

  drawCircuit(ctx) {
    const { W, H } = this;
    ctx.fillStyle = "#0a1a2e"; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "rgba(78,201,216,0.18)"; ctx.lineWidth = 1;
    for (let x = 0; x <= W; x += 20) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y <= H; y += 20) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    // chips
    const chips = [[40, 40, 90, 60], [180, 50, 110, 70], [60, 150, 80, 50], [220, 160, 100, 60]];
    ctx.strokeStyle = "rgba(255,217,138,0.85)"; ctx.lineWidth = 2;
    for (const [x, y, w, h] of chips) { ctx.strokeRect(x, y, w, h); }
    // nodes
    ctx.fillStyle = "rgba(126,226,168,0.9)";
    for (let i = 0; i < 26; i++) {
      const x = 20 + Math.random() * (W - 40), y = 20 + Math.random() * (H - 40);
      ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill();
    }
    // traces
    ctx.strokeStyle = "rgba(255,255,255,0.35)"; ctx.lineWidth = 1.5;
    for (let i = 0; i < 14; i++) {
      ctx.beginPath();
      ctx.moveTo(20 + Math.random() * W, 20 + Math.random() * H);
      ctx.lineTo(20 + Math.random() * W, 20 + Math.random() * H);
      ctx.stroke();
    }
    this.addNoise(ctx, 26);
  }

  drawPhoto(ctx) {
    const { W, H } = this;
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#9ad0ff"); g.addColorStop(0.6, "#e8f3ff"); g.addColorStop(1, "#cfe6c9");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // sun
    ctx.fillStyle = "#ffd98a"; ctx.beginPath(); ctx.arc(W * 0.7, H * 0.3, 26, 0, Math.PI * 2); ctx.fill();
    // mountains
    ctx.fillStyle = "#3a6b4f";
    ctx.beginPath(); ctx.moveTo(0, H); ctx.lineTo(W * 0.35, H * 0.45); ctx.lineTo(W * 0.6, H); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#2c5440";
    ctx.beginPath(); ctx.moveTo(W * 0.45, H); ctx.lineTo(W * 0.8, H * 0.55); ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
    // foreground
    ctx.fillStyle = "#234d39"; ctx.fillRect(0, H * 0.82, W, H * 0.18);
    this.addNoise(ctx, 22);
  }

  addNoise(ctx, amp) {
    const { W, H } = this;
    const id = ctx.getImageData(0, 0, W, H);
    for (let i = 0; i < id.data.length; i += 4) {
      const n = (Math.random() - 0.5) * amp;
      id.data[i] = this.clamp(id.data[i] + n);
      id.data[i + 1] = this.clamp(id.data[i + 1] + n);
      id.data[i + 2] = this.clamp(id.data[i + 2] + n);
    }
    ctx.putImageData(id, 0, 0);
  }

  loadImageFile(file) {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const cv = document.createElement("canvas");
      cv.width = this.W; cv.height = this.H;
      const ctx = cv.getContext("2d");
      ctx.drawImage(img, 0, 0, this.W, this.H);
      this.srcImageData = ctx.getImageData(0, 0, this.W, this.H);
      this.srcCtx.putImageData(this.srcImageData, 0, 0);
      this.apply();
      URL.revokeObjectURL(url);
    };
    img.src = url;
  }

  setKernel(k) {
    this.kernel = k;
    k.userEdited = false;
    this.presetRow.querySelectorAll("[data-preset]").forEach((b) =>
      b.classList.toggle("active", b.dataset.preset === k.id)
    );
    this.renderKernelGrid();
    this.apply();
  }

  renderKernelGrid() {
    const s = this.kernel.size;
    this.kernelGrid.style.gridTemplateColumns = `repeat(${s}, 42px)`;
    let html = "";
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        const center = x === (s >> 1) && y === (s >> 1);
        const v = this.kernel.data[y][x];
        html += `<input class="kernel-cell${center ? " center" : ""}" type="number" step="0.5" data-r="${y}" data-c="${x}" value="${v}" title="行${y} 列${x}" />`;
      }
    }
    this.kernelGrid.innerHTML = html;
  }

  clamp(v) { return v < 0 ? 0 : v > 255 ? 255 : v; }
  clampIdx(v, max) { return v < 0 ? 0 : v >= max ? max - 1 : v; }

  apply() {
    if (!this.srcImageData || !this.kernel) return;
    const res = this.kernel.sep && !this.kernel.userEdited
      ? this.convolveSep(this.srcImageData.data, this.W, this.H, this.kernel, this.strength)
      : this.convolve(this.srcImageData.data, this.W, this.H, this.kernel, this.strength);
    this.dstCtx.putImageData(new ImageData(res, this.W, this.H), 0, 0);
    this.updateReadout();
  }

  convolve(src, w, h, k, strength) {
    const out = new Uint8ClampedArray(src.length);
    const size = k.size, half = (size - 1) >> 1, data = k.data;
    const gray = k.gray, offset = k.offset;
    const norm = (k.normalize ? kernelSum(k) : 1) || 1;
    const s = strength;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const oi = (y * w + x) * 4;
        if (gray) {
          let acc = 0;
          for (let ky = 0; ky < size; ky++) {
            const sy = this.clampIdx(y + ky - half, h);
            for (let kx = 0; kx < size; kx++) {
              const sx = this.clampIdx(x + kx - half, w);
              const si = (sy * w + sx) * 4;
              const lum = 0.299 * src[si] + 0.587 * src[si + 1] + 0.114 * src[si + 2];
              acc += lum * data[ky][kx];
            }
          }
          acc = acc / norm + offset;
          const ol = 0.299 * src[oi] + 0.587 * src[oi + 1] + 0.114 * src[oi + 2];
          const c = this.clamp(ol * (1 - s) + acc * s);
          out[oi] = c; out[oi + 1] = c; out[oi + 2] = c; out[oi + 3] = 255;
        } else {
          let r = 0, g = 0, b = 0;
          for (let ky = 0; ky < size; ky++) {
            const sy = this.clampIdx(y + ky - half, h);
            for (let kx = 0; kx < size; kx++) {
              const sx = this.clampIdx(x + kx - half, w);
              const si = (sy * w + sx) * 4;
              const wgt = data[ky][kx];
              r += src[si] * wgt; g += src[si + 1] * wgt; b += src[si + 2] * wgt;
            }
          }
          r = r / norm + offset; g = g / norm + offset; b = b / norm + offset;
          out[oi] = this.clamp(src[oi] * (1 - s) + r * s);
          out[oi + 1] = this.clamp(src[oi + 1] * (1 - s) + g * s);
          out[oi + 2] = this.clamp(src[oi + 2] * (1 - s) + b * s);
          out[oi + 3] = 255;
        }
      }
    }
    return out;
  }

  convolveSep(src, w, h, k, strength) {
    const sep = k.sep, n = sep.length, half = (n - 1) >> 1;
    const sn = sep.reduce((a, b) => a + b, 0) || 1;
    const tmp = new Float32Array(src.length);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const oi = (y * w + x) * 4;
        let r = 0, g = 0, b = 0;
        for (let i = 0; i < n; i++) {
          const sx = this.clampIdx(x + i - half, w);
          const si = (y * w + sx) * 4;
          const wgt = sep[i];
          r += src[si] * wgt; g += src[si + 1] * wgt; b += src[si + 2] * wgt;
        }
        tmp[oi] = r / sn; tmp[oi + 1] = g / sn; tmp[oi + 2] = b / sn;
      }
    }
    const out = new Uint8ClampedArray(src.length);
    const s = strength;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const oi = (y * w + x) * 4;
        let r = 0, g = 0, b = 0;
        for (let i = 0; i < n; i++) {
          const sy = this.clampIdx(y + i - half, h);
          const si = (sy * w + x) * 4;
          const wgt = sep[i];
          r += tmp[si] * wgt; g += tmp[si + 1] * wgt; b += tmp[si + 2] * wgt;
        }
        r = r / sn; g = g / sn; b = b / sn;
        out[oi] = this.clamp(src[oi] * (1 - s) + r * s);
        out[oi + 1] = this.clamp(src[oi + 1] * (1 - s) + g * s);
        out[oi + 2] = this.clamp(src[oi + 2] * (1 - s) + b * s);
        out[oi + 3] = 255;
      }
    }
    return out;
  }

  updateReadout() {
    const k = this.kernel;
    const sum = kernelSum(k);
    const type = k.gray ? "边缘/浮雕（灰度）" : (k.normalize ? "模糊（平滑）" : "锐化/其它");
    const sep = k.sep && !k.userEdited ? "可分离 ✓" : "通用二维";
    this.kernelInfo.innerHTML =
      `核尺寸 ${k.size}×${k.size} ｜ 权重和 ${sum.toFixed(2)}<br>` +
      `类型 ${type} ｜ ${sep}<br>` +
      `强度 ${this.strength.toFixed(2)}`;
  }

  start() { /* 静态实验室，无需动画循环 */ }
  stop() { /* 无持续资源，留空 */ }
}
