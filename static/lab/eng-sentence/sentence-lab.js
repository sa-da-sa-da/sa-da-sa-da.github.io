/**
 * 句型建构实验室 · 2D 拖拽组句工坊（左右分屏版：窗外场景 + 工作台）
 * ----------------------------------------------------------------------
 * 玩法：从「词块库」把词块拖入（或点击选词再点槽位）上方的句法槽位，
 *       组出正确顺序的句子；每填对一处，底部字幕条讲解该句法成分；
 *       全部就位后高亮整句，可「演示组句」重播组装过程。
 * 视觉：左侧是「句型结构树」——实时以主干 + 成分节点画出当前句子结构，
 *       填对一处即点亮对应节点；右侧是毛玻璃工作台，放槽位、词块、语法讲解。
 * 覆盖：五种基本句型 / be doing 表将来 / 情态动词 / 定语从句
 */
import { SENTENCES, SENTENCE_ORDER, WORD_COLORS, POS_NAMES } from "./sentence-data.js";

const cssColor = (hexNum) => "#" + (hexNum >>> 0).toString(16).padStart(6, "0");
const shuffle = (a) => {
  a = a.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const hexToRgba = (hex, a) => {
  const r = (hex >> 16) & 255, g = (hex >> 8) & 255, b = hex & 255;
  return `rgba(${r},${g},${b},${a})`;
};
const escapeXml = (s) => String(s).replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" }[c]));

export class MoleculeLab {
  constructor(el) {
    this.el = el;
    this.onExit = null;
    this.currentKey = SENTENCE_ORDER[0];
    this.slots = [];
    this.bankWords = [];
    this.selectedBid = null;
    this.demoTimer = null;
    this._onKey = (e) => { if (e.key === "Escape" && this.onExit) this.onExit(); };
    this._ensureStyle();
  }

  _ensureStyle() {
    if (document.getElementById("lab2d-style")) return;
    const s = document.createElement("style");
    s.id = "lab2d-style";
    s.textContent = `
.lab2d{position:absolute;inset:0;color:#eef3fb;overflow:hidden;background:#080e17;
  font-family:system-ui,"Microsoft YaHei","Noto Sans SC",sans-serif}
.lab2d-content{display:flex;flex-direction:column;height:100%;padding:15px 18px;box-sizing:border-box;gap:12px}
/* 顶部标题栏 */
.lab2d-head{display:flex;justify-content:space-between;align-items:center;flex-shrink:0}
.lab2d-title{font-size:19px;font-weight:700;color:#eaf1ff;letter-spacing:.5px}
.lab2d-sub{font-size:12.5px;color:#a9c0e0;font-weight:400;margin-left:6px}
.lab2d-exit{background:rgba(28,40,64,.7);color:#eaf1ff;border:1px solid rgba(150,180,230,.4);
  border-radius:9px;padding:7px 13px;cursor:pointer;font-size:12.5px}
.lab2d-exit:hover{background:rgba(40,56,86,.85)}
/* 主体左右分屏 */
.lab2d-body{flex:1;display:flex;gap:14px;min-height:0;overflow:hidden}
/* 左侧：句型结构树 */
.lab2d-view{flex:0 0 44%;max-width:680px;min-width:300px;border-radius:16px;overflow:hidden;
  position:relative;background:linear-gradient(160deg,#0e1828,#0a1119);border:1px solid rgba(120,150,200,.18);
  box-shadow:0 8px 30px rgba(0,0,0,.45);display:flex;flex-direction:column}
.lab2d-tree-head{padding:15px 18px 6px;flex-shrink:0}
.lab2d-tree-title{font-size:16px;font-weight:700;color:#eaf1ff;letter-spacing:.3px}
.lab2d-tree-sub{font-size:12px;color:#a9c0e0;margin-top:3px}
.lab2d-tree{flex:1;min-height:0;display:flex;align-items:center;justify-content:center;padding:6px 14px 22px}
.lab2d-tree svg{width:100%;height:100%}
.lab2d-tree-empty{color:#7e93b5;font-size:13px}
/* 右侧：工作台 */
.lab2d-work{flex:1;min-width:0;display:flex;flex-direction:column;gap:11px;min-height:0}
/* 句型标签条 */
.lab2d-tabs{display:flex;gap:7px;flex-wrap:wrap;flex-shrink:0}
.lab2d-tab{background:rgba(20,34,58,.65);color:#bcd0ee;border:1px solid rgba(120,150,200,.28);
  border-radius:999px;padding:6px 13px;cursor:pointer;font-size:12.5px;transition:.15s}
.lab2d-tab:hover{background:rgba(30,48,80,.8);color:#eaf1ff}
.lab2d-tab.active{background:rgba(64,120,210,.9);color:#fff;border-color:rgba(140,180,255,.6);
  box-shadow:0 2px 12px rgba(50,110,210,.45)}
/* 操作台面板 */
.lab2d-panel{display:flex;flex-direction:column;flex:1;min-height:0;
  background:rgba(16,26,44,.55);backdrop-filter:blur(10px);
  border:1px solid rgba(150,180,230,.16);border-radius:16px;padding:15px 16px;
  box-shadow:0 8px 30px rgba(0,0,0,.4);gap:11px}
.lab2d-grammar-pill{align-self:flex-start;background:rgba(110,80,200,.28);color:#e7d8ff;
  border:1px solid rgba(160,130,255,.42);border-radius:8px;padding:5px 12px;font-size:13px}
/* 句法槽位区 */
.lab2d-slots{flex:1;display:flex;flex-wrap:wrap;align-content:flex-start;gap:10px;
  padding:16px;border-radius:13px;background:rgba(255,255,255,.045);
  border:1px dashed rgba(150,180,230,.22);min-height:80px}
.lab2d-slot{min-width:106px;min-height:80px;border:2px dashed rgba(120,160,220,.5);border-radius:13px;
  display:flex;align-items:center;justify-content:center;position:relative;
  background:rgba(20,40,70,.4);transition:.18s;padding:6px}
.lab2d-slot.over{border-color:#7fb0ff;background:rgba(60,120,200,.3);transform:scale(1.03)}
.lab2d-slot.filled{border-style:solid;border-color:#4ad08a;background:rgba(40,130,86,.32);
  box-shadow:0 0 0 2px rgba(74,208,138,.28),0 4px 14px rgba(0,0,0,.35)}
.lab2d-slot.wrong{border-color:#ef6a58;background:rgba(200,70,60,.34);animation:labShake .4s}
.lab2d-slot-role{color:#9fb6d8;font-size:13px;text-align:center;line-height:1.4;pointer-events:none}
.lab2d-slot.filled .lab2d-slot-role{display:none}
.lab2d-word-text{font-size:18px;font-weight:700;color:#fff;text-align:center;line-height:1.2;
  text-shadow:0 2px 8px rgba(0,0,0,.45)}
.lab2d-slots.complete{background:rgba(50,150,100,.16);border-color:rgba(90,210,150,.5)}
/* 下方：词块库 + 讲解 */
.lab2d-bottom{display:flex;gap:13px;min-height:0}
.lab2d-bank-wrap{flex:1;display:flex;flex-direction:column;gap:7px;min-width:0}
.lab2d-bank-title{font-size:12.5px;color:#a9c0e0}
.lab2d-bank{flex:1;display:flex;flex-wrap:wrap;gap:9px;align-content:flex-start;
  padding:12px;border-radius:12px;background:rgba(255,255,255,.04);
  border:1px solid rgba(150,180,230,.16);min-height:70px}
.lab2d-word{--wc:#4a90d9;min-width:72px;padding:9px 12px;border-radius:11px;cursor:grab;
  background:var(--wc);border:1px solid rgba(255,255,255,.3);
  display:flex;flex-direction:column;align-items:center;gap:2px;
  box-shadow:0 4px 12px rgba(0,0,0,.42);transition:.14s;user-select:none}
.lab2d-word:hover{transform:translateY(-2px);box-shadow:0 7px 16px rgba(0,0,0,.5)}
.lab2d-word.selected{outline:3px solid #ffe08a;transform:translateY(-2px)}
.lab2d-word:active{cursor:grabbing}
.lab2d-word-pos{font-size:10.5px;color:rgba(255,255,255,.85);text-shadow:0 1px 3px rgba(0,0,0,.4)}
.lab2d-bank-done{color:#7fe0a6;font-size:14px;margin:auto}
.lab2d-ctrl{flex:0 0 210px;display:flex;flex-direction:column;gap:10px}
.lab2d-actions{display:flex;gap:9px}
.lab2d-actions button{flex:1;background:rgba(28,42,68,.75);color:#eaf1ff;border:1px solid rgba(120,150,200,.32);
  border-radius:9px;padding:9px;cursor:pointer;font-size:12.5px;transition:.15s}
.lab2d-actions button:hover{background:rgba(40,58,92,.9)}
.lab2d-note{flex:1;background:rgba(12,20,34,.65);border:1px solid rgba(120,150,200,.26);
  border-left:3px solid #5a8dd8;border-radius:10px;padding:10px 12px;font-size:12px;color:#c3d6f0;
  line-height:1.55;overflow:auto}
.lab2d-note b{color:#e4f0ff}
/* 字幕条 */
.lab2d-caption{min-height:40px;background:rgba(12,20,34,.7);border:1px solid rgba(120,150,200,.3);
  border-radius:10px;padding:10px 14px;font-size:13px;color:#d8e6fb;line-height:1.5;
  display:flex;align-items:center;animation:labFade .3s;backdrop-filter:blur(4px)}
.lab2d-caption.ok{color:#cdebd8;border-color:#3f7a55;background:rgba(20,50,38,.72)}
@keyframes labFade{from{opacity:.2;transform:translateY(4px)}to{opacity:1;transform:none}}
@keyframes labShake{0%,100%{transform:translateX(0)}25%{transform:translateX(-6px)}75%{transform:translateX(6px)}}
`;
    document.head.appendChild(s);
  }

  start() {
    document.addEventListener("keydown", this._onKey);
    this.renderShell();
    this.loadSentence(this.currentKey);
  }

  stop() {
    document.removeEventListener("keydown", this._onKey);
    if (this.demoTimer) clearTimeout(this.demoTimer);
    this.el.innerHTML = "";
  }

  renderShell() {
    this.el.innerHTML = `
      <div class="lab2d">
        <div class="lab2d-content">
          <div class="lab2d-head">
            <div class="lab2d-title">句型建构实验室<span class="lab2d-sub">· 拖拽词块组句 · 语法解析</span></div>
            <button class="lab2d-exit" id="lab2d-exit">返回菜单 (Esc)</button>
          </div>
          <div class="lab2d-body">
            <!-- 左侧：句型结构树 -->
            <div class="lab2d-view">
              <div class="lab2d-tree-head">
                <div class="lab2d-tree-title" id="lab2d-tree-title"></div>
                <div class="lab2d-tree-sub" id="lab2d-tree-sub"></div>
              </div>
              <div class="lab2d-tree" id="lab2d-tree"></div>
            </div>
            <!-- 右侧工作台 -->
            <div class="lab2d-work">
              <div class="lab2d-tabs" id="lab2d-tabs"></div>
              <div class="lab2d-panel">
                <div class="lab2d-grammar-pill" id="lab2d-grammar"></div>
                <div class="lab2d-slots" id="lab2d-slots"></div>
                <div class="lab2d-bottom">
                  <div class="lab2d-bank-wrap">
                    <div class="lab2d-bank-title">词块库（颜色 = 词性）</div>
                    <div class="lab2d-bank" id="lab2d-bank"></div>
                  </div>
                  <div class="lab2d-ctrl">
                    <div class="lab2d-actions">
                      <button id="lab2d-demo">▶ 演示组句</button>
                      <button id="lab2d-reset">↺ 重置</button>
                    </div>
                    <div class="lab2d-note" id="lab2d-note"></div>
                  </div>
                </div>
              </div>
              <div class="lab2d-caption" id="lab2d-caption">把下方词块拖入（或点击选词再点槽位）对应句法槽位，组成一个完整句子。</div>
            </div>
          </div>
        </div>
      </div>`;
    this.el.querySelector("#lab2d-exit").addEventListener("click", () => this.onExit && this.onExit());
    this.el.querySelector("#lab2d-demo").addEventListener("click", () => this.demo());
    this.el.querySelector("#lab2d-reset").addEventListener("click", () => this.loadSentence(this.currentKey));

    const tabs = this.el.querySelector("#lab2d-tabs");
    tabs.innerHTML = "";
    SENTENCE_ORDER.forEach((k) => {
      const b = document.createElement("button");
      b.className = "lab2d-tab" + (k === this.currentKey ? " active" : "");
      b.textContent = SENTENCES[k].name;
      b.addEventListener("click", () => this.loadSentence(k));
      tabs.appendChild(b);
    });
  }

  loadSentence(key) {
    if (this.demoTimer) { clearTimeout(this.demoTimer); this.demoTimer = null; }
    this.currentKey = key;
    const data = SENTENCES[key];

    // 更新左侧结构树标题
    const tt = this.el.querySelector("#lab2d-tree-title");
    if (tt) tt.textContent = data.name;
    const ts = this.el.querySelector("#lab2d-tree-sub");
    if (ts) ts.textContent = data.grammar + "　·　实时结构图";

    this.el.querySelectorAll(".lab2d-tab").forEach((t) => {
      t.classList.toggle("active", t.textContent === data.name);
    });
    this.el.querySelector("#lab2d-grammar").textContent = data.grammar;
    this.el.querySelector("#lab2d-note").innerHTML = "<b>语法讲解：</b>" + data.note;
    this.setCaption("把下方词块拖入（或点击选词再点槽位）对应句法槽位，组成一个完整句子。", false);

    const slotsEl = this.el.querySelector("#lab2d-slots");
    slotsEl.className = "lab2d-slots";
    slotsEl.innerHTML = "";
    this.slots = data.words.map((w, i) => ({
      expected: w.t,
      pos: w.p,
      role: data.roles ? data.roles[i] : "",
      filled: false,
      el: null,
    }));
    this.slots.forEach((sl, i) => {
      const d = document.createElement("div");
      d.className = "lab2d-slot";
      d.innerHTML = `<span class="lab2d-slot-role">${sl.role || ""}</span>`;
      d.addEventListener("dragover", (e) => { e.preventDefault(); if (!sl.filled) d.classList.add("over"); });
      d.addEventListener("dragleave", () => d.classList.remove("over"));
      d.addEventListener("drop", (e) => {
        e.preventDefault(); d.classList.remove("over");
        this.place(e.dataTransfer.getData("text/plain"), i);
      });
      d.addEventListener("click", () => { if (this.selectedBid != null) this.place(String(this.selectedBid), i); });
      sl.el = d;
      slotsEl.appendChild(d);
    });

    this.bankWords = shuffle(data.words.map((w, i) => ({ t: w.t, p: w.p, bid: i })));
    this.selectedBid = null;
    this.renderBank();
    this.renderTree();
  }

  renderBank() {
    const bank = this.el.querySelector("#lab2d-bank");
    bank.innerHTML = "";
    if (this.bankWords.length === 0) {
      bank.innerHTML = `<div class="lab2d-bank-done">✓ 全部词块已就位</div>`;
      return;
    }
    this.bankWords.forEach((w) => {
      const c = document.createElement("div");
      c.className = "lab2d-word" + (this.selectedBid === w.bid ? " selected" : "");
      c.style.setProperty("--wc", cssColor(WORD_COLORS[w.p]));
      c.draggable = true;
      c.innerHTML = `<span class="lab2d-word-text">${w.t}</span><span class="lab2d-word-pos">${POS_NAMES[w.p].zh}</span>`;
      c.addEventListener("dragstart", (e) => e.dataTransfer.setData("text/plain", String(w.bid)));
      c.addEventListener("click", () => this.selectWord(w.bid, c));
      bank.appendChild(c);
    });
  }

  selectWord(bid, el) {
    if (this.selectedBid === bid) {
      this.selectedBid = null; el.classList.remove("selected");
    } else {
      this.selectedBid = bid;
      this.el.querySelectorAll(".lab2d-word").forEach((x) => x.classList.remove("selected"));
      el.classList.add("selected");
    }
  }

  place(bidStr, slotIndex) {
    const bid = Number(bidStr);
    const slot = this.slots[slotIndex];
    if (!slot || slot.filled) return;
    const word = this.bankWords.find((b) => b.bid === bid);
    if (!word) return;

    if (slot.expected !== word.t) {
      slot.el.classList.add("wrong");
      setTimeout(() => slot.el.classList.remove("wrong"), 450);
      this.setCaption(`「${word.t}」不属于这个句法位置，试试别的槽位。`, false);
      return;
    }

    // 正确：落位
    slot.filled = true;
    slot.el.classList.add("filled");
    slot.el.innerHTML = `<span class="lab2d-word-text">${word.t}</span>`;
    this.bankWords = this.bankWords.filter((b) => b.bid !== bid);
    if (this.selectedBid === bid) this.selectedBid = null;
    this.renderBank();
    this.renderTree();

    const data = SENTENCES[this.currentKey];
    const idx = this.slots.filter((s) => s.filled).length - 1;
    this.setCaption(data.caption[idx] || "✓ 填对了！", true);

    if (this.slots.every((s) => s.filled)) {
      this.el.querySelector("#lab2d-slots").classList.add("complete");
      this.setCaption("✓ 组句完成！这就是「" + data.name + "」结构。", true);
    }
  }

  setCaption(text, ok) {
    const c = this.el.querySelector("#lab2d-caption");
    c.textContent = text;
    c.classList.toggle("ok", !!ok);
    c.style.animation = "none";
    void c.offsetWidth;
    c.style.animation = "";
  }

  /* 左侧：实时句型结构树（SVG） */
  renderTree() {
    const host = this.el.querySelector("#lab2d-tree");
    if (!host) return;
    const data = SENTENCES[this.currentKey];
    const n = this.slots.length;
    if (!n) { host.innerHTML = `<div class="lab2d-tree-empty">（暂无句型）</div>`; return; }

    const W = 124, GAP = 22;
    const totalW = n * W + (n - 1) * GAP;
    const viewW = totalW + 20;
    const viewH = 232;
    const cx = (i) => 10 + W / 2 + i * (W + GAP);
    const trunkY = viewH - 46;
    const nodeY = trunkY - 96, nodeH = 84;

    let nodes = "";
    for (let i = 0; i < n; i++) {
      const sl = this.slots[i];
      const filled = sl && sl.filled;
      const col = filled ? WORD_COLORS[sl.pos] : 0x7e93b5;
      const fill = filled ? hexToRgba(col, 0.22) : "rgba(255,255,255,.03)";
      const stroke = filled ? cssColor(col) : "rgba(150,180,230,.5)";
      const dash = filled ? "" : `stroke-dasharray="7 6"`;
      const wordText = filled ? sl.expected : "— — —";
      const wordColor = filled ? "#ffffff" : "rgba(180,200,230,.55)";
      const roleText = (data.roles && data.roles[i]) ? data.roles[i] : "";
      nodes += `
      <line x1="${cx(i)}" y1="${nodeY + nodeH}" x2="${cx(i)}" y2="${trunkY}"
            stroke="${filled ? cssColor(col) : "rgba(150,180,230,.4)"}" stroke-width="2"/>
      <rect x="${cx(i) - W / 2}" y="${nodeY}" width="${W}" height="${nodeH}" rx="13"
            fill="${fill}" stroke="${stroke}" stroke-width="2" ${dash}/>
      <text x="${cx(i)}" y="${nodeY + 27}" text-anchor="middle" font-size="12.5"
            fill="#9fb6d8" font-weight="600">${escapeXml(roleText)}</text>
      <text x="${cx(i)}" y="${nodeY + 59}" text-anchor="middle" font-size="19"
            font-weight="700" fill="${wordColor}">${escapeXml(wordText)}</text>`;
    }
    const trunk = n > 0
      ? `<line x1="${cx(0)}" y1="${trunkY}" x2="${cx(n - 1)}" y2="${trunkY}"
            stroke="rgba(150,180,230,.5)" stroke-width="3" stroke-linecap="round"/>`
      : "";
    const root = `<text x="${(cx(0) + cx(n - 1)) / 2}" y="${trunkY + 22}" text-anchor="middle"
            font-size="12" fill="rgba(160,185,220,.75)" letter-spacing="1">句子主干 · Sentence</text>`;

    host.innerHTML = `<svg viewBox="0 0 ${viewW} ${viewH}" preserveAspectRatio="xMidYMid meet">${trunk}${nodes}${root}</svg>`;
  }

  demo() {
    this.loadSentence(this.currentKey);
    const data = SENTENCES[this.currentKey];
    let i = 0;
    const step = () => {
      if (i >= data.words.length) {
        this.el.querySelector("#lab2d-slots").classList.add("complete");
        this.setCaption("✓ 组句完成！这就是「" + data.name + "」结构。", true);
        this.demoTimer = null;
        return;
      }
      const w = data.words[i];
      const entry = this.bankWords.find((b) => b.t === w.t);
      if (entry) this.place(String(entry.bid), i);
      this.setCaption(data.caption[i] || "", true);
      i++;
      this.demoTimer = setTimeout(step, 950);
    };
    step();
  }
}
