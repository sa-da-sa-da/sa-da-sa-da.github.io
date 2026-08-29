/* ============================================================
 * 小镇模拟经营 · 社会发展思辨实验室（思想道德与法治）  v3
 * 纯前端 2D Canvas + DOM，无外部依赖。
 *
 * v3 改动（相对 v2）：
 *  ① 视觉引擎重写 —— 建筑分类型（住宅/工厂/学校/医院/公园/
 *      商业综合体/写字楼/广告牌/隔离墙），各有独特外观；
 *      人物改为可辨人形；加道路/云朵/地面纹理；冷暖过渡更细腻。
 *  ② 数据模型平衡化 —— 每个选项体现真实取舍（建厂=就业↑+繁荣↑
 *      但 资本集中度↑+房租压力）；民情反馈不再一边倒，市民同时感受
 *      到就业好处和生活成本；反思锚点更开放。
 *
 * 保留 v2 架构：反思锚点 / 民情反馈 / 结局复盘回扣剧本 / 重玩对比
 * 接口对齐 app.js：class TownLab { constructor(root); start(); stop(); onExit }
 * ============================================================ */
export class TownLab {
  constructor(root) {
    this.root = root;
    this.onExit = null;
    this.running = false;
    this.raf = null;
    this.round = 0;
    this.done = false;
    this.lastRun = null;
    this.metrics = { livelihood: 50, trust: 50, revenue: 50, prosperity: 50, capitalConc: 30 };
    this.disp = { ...this.metrics };
    this.rounds = this.buildRounds();
    this.built = false;
    this.ackReflected = false;
  }

  /* ========== 五轮决策（平衡化：每个选项都有真实取舍） ========== */
  buildRounds() {
    return [
      {
        title: "第 1 年 · 财政结余怎么用",
        reflection: "一笔钱投下去，它会在谁的手里增值？十年后，这笔投资产生的收益，归根到底属于谁？",
        q: "年度结余摆在桌上。大厂带着税收承诺来敲门，乡村小学和社区诊所却在等钱修围墙、买设备。你先往哪边倾？",
        options: [
          { label: "投入乡村小学与社区诊所", note: "把钱花在人的身上",
            eff: { livelihood: 18, trust: 14, revenue: -10, prosperity: 8, capitalConc: -6 },
            reactions: {
              citizen: "娃能就近上学、老人看病不折腾了！就是听说隔壁镇招工的厂子越来越少……",
              enterprise: "民生投入短期内带不动商业需求，我们暂缓本地扩招。",
              authority: "民生底线兜住了——但明年财政可能吃紧，还能维持这个力度吗？" } },
          { label: "招商引资大厂换税收与就业", note: "先把经济盘子做大",
            eff: { livelihood: 2, trust: -2, revenue: 20, prosperity: 14, capitalConc: 12 },
            reactions: {
              citizen: "厂子来了！邻居好几个都去面试了，工资比之前高。就是房租好像开始涨了……",
              enterprise: "税收优惠实在，我们落地了，首批招了200多人。",
              authority: "就业数据和财政收入双升，年底好交代。" } },
          { label: "平分到每户小额补贴", note: "雨露均沾",
            eff: { livelihood: 8, trust: 8, revenue: -4, prosperity: 6, capitalConc: 0 },
            reactions: {
              citizen: "钱不多，但觉着被记挂着。",
              enterprise: "雨露均沾，谈不上多满意，也不反对。",
              authority: "稳，但看不出亮点。" } },
        ],
      },
      {
        title: "第 2 年 · 城市中心留白给谁",
        reflection: "城市的中心地段是稀缺资源。它应该产生公共价值，还是市场价值？这两者一定冲突吗？",
        q: "市中心一块空地。开发商想盖综合体，居民想要公园步道，老旧小区也在等改造资金。",
        options: [
          { label: "建公园绿地与步道", note: "留一片能散步的天地",
            eff: { livelihood: 12, trust: 10, revenue: -2, prosperity: 4, capitalConc: -6 },
            reactions: {
              citizen: "晚饭后有地方散步了！老人小孩都喜欢。就是有人说这块地要是招商能赚更多……",
              enterprise: "地拿来做公益了，短期没我们的份。不过员工确实爱去那片公园。",
              authority: "宜居指数上去了——但土地财政少了一块收入。" } },
          { label: "盖商业综合体", note: "招商指标 + 就业 + 消费",
            eff: { livelihood: 0, trust: -2, revenue: 14, prosperity: 10, capitalConc: 10 },
            reactions: {
              citizen: "商场开了，买东西方便了，我表妹还在里面找了份收银的工作。就是东西比网上贵点儿。",
              enterprise: "地标起来了，客流稳定，我们计划再开一家分店。",
              authority: "消费税收和就业都增加了，招商指标好看。" } },
          { label: "改造老旧小区", note: "先把家底修好",
            eff: { livelihood: 10, trust: 10, revenue: -2, prosperity: 6, capitalConc: -2 },
            reactions: {
              citizen: "住了几十年的老楼，终于加了电梯、刷了外墙！像了个家。",
              enterprise: "旧改工程我们接了部分单子，量不大但稳。",
              authority: "民生实事，群众认账。就是花钱多、见效慢。" } },
        ],
      },
      {
        title: "第 3 年 · 发展成果怎么分",
        reflection: "经济增长的果实，会自动流到最需要的人手里吗？如果不会，该用什么样的方式去调节？",
        q: "小镇经济在增长，但物价也跟着涨。低收入家庭和外来务工人员开始感到压力。怎么应对？",
        options: [
          { label: "给低收入家庭定向补贴+技能培训", note: "托底+赋能",
            eff: { livelihood: 6, trust: 12, revenue: -8, prosperity: 16, capitalConc: -8 },
            reactions: {
              citizen: "最难的那几户，这个冬天有着落了！培训完有人换了更好的工作。",
              enterprise: "补贴不直接到我们这儿，但培训后劳动力素质确实提升了。",
              authority: "共富不是口号，是托底+赋能。财政压力大点，但值得。" } },
          { label: "给纳税大户返税+扩产奖励", note: "留住龙头、带动就业",
            eff: { livelihood: 2, trust: -4, revenue: 10, prosperity: 12, capitalConc: 10 },
            reactions: {
              citizen: "大厂又扩了一条生产线，招了不少人。就是感觉政策总向着大企业倾斜……",
              enterprise: "返税让我们敢扩大投资，今年新增岗位300个。",
              authority: "龙头企业稳住了，就业链条也跟着动。就是'嫌贫爱富'的声音不少。" } },
          { label: "普惠性小幅提标（全员受益）", note: "不偏不倚",
            eff: { livelihood: 4, trust: 6, revenue: -4, prosperity: 8, capitalConc: 0 },
            reactions: {
              citizen: "大家都涨了一点，公平。虽然涨幅不大，但至少没被落下。",
              enterprise: "社保缴费基数调了点，成本略有增加，能接受。",
              authority: "不偏不倚，最稳妥的路子。" } },
        ],
      },
      {
        title: "第 4 年 · 空间怎么布局",
        reflection: "住得近，心才近。但 mixing 不同收入群体，是融合还是摩擦？规划者的笔，画的是墙还是桥？",
        q: "新区规划摆上桌面。开发商想做高端封闭社区（地价高、税收高），社工呼吁混合居住防隔离。你拍哪版？",
        options: [
          { label: "限高 + 混合社区配建保障房", note: "让不同收入住得近",
            eff: { livelihood: 2, trust: 12, revenue: -6, prosperity: 14, capitalConc: -10 },
            reactions: {
              citizen: "不同收入住一个小区，孩子一所学校！虽然也有人说'档次混了'。",
              enterprise: "限高+配建保障房压缩了利润空间，高端产品不好做。",
              authority: "社会融合实验——长期看是正资产，短期财政牺牲不小。" } },
          { label: "放任高端社区独立成片", note: "高地价+高税收",
            eff: { livelihood: -4, trust: -6, revenue: 12, prosperity: 8, capitalConc: 16 },
            reactions: {
              citizen: "富人区看着气派……就是那边的小区物业跟我们这边天差地别，心里不是滋味。",
              enterprise: "高端项目利润率高，我们追加投资了。",
              authority: "地价和税收数据漂亮。但'一个镇两个世界'的议论越来越多。" } },
          { label: "分区但不隔离：配套共享", note: "折中方案",
            eff: { livelihood: 4, trust: 8, revenue: 2, prosperity: 10, capitalConc: 2 },
            reactions: {
              citizen: "富的穷的分片建，但学校和公园共用，还行吧。",
              enterprise: "各取所需，不影响我们做不同档次的产品。",
              authority: "兼顾了效率和公平，各方都能接受。" } },
        ],
      },
      {
        title: "第 5 年 · 年终答卷写什么",
        reflection: "GDP 是手段还是目的？人民感受到的幸福和报表上的增速，哪个更该放在第一行？",
        q: "五年届满。要向上汇报、也要向镇民交代。你的头号成绩写什么？",
        options: [
          { label: "民生满意度挂首位，附群众打分", note: "成果回到人身上",
            eff: { livelihood: 8, trust: 16, revenue: -2, prosperity: 8, capitalConc: -2 },
            reactions: {
              citizen: "咱打分？！那可得好好评评——这几年变化确实看得到。",
              enterprise: "民生导向长期利好消费市场，我们看好持续经营环境。",
              authority: "以人民为中心，落到纸面了。就是上级考核里这项权重不高……" } },
          { label: "GDP 与投资额当头号", note: "数字亮眼",
            eff: { livelihood: -2, trust: -6, revenue: 14, prosperity: 10, capitalConc: 10 },
            reactions: {
              citizen: "数字是挺大……但我工资这五年涨了多少？",
              enterprise: "投资环境评级上调，我们正在谈新一轮扩产。",
              authority: "头号政绩亮眼，汇报时有底气。" } },
          { label: "发展与民生双报表并重", note: "两条腿走路",
            eff: { livelihood: 4, trust: 8, revenue: 6, prosperity: 8, capitalConc: 2 },
            reactions: {
              citizen: "两条都报，算实在。至少没只吹数字不管人。",
              enterprise: "均衡发展，不确定性低，适合长期布局。",
              authority: "两条腿走路——最稳妥，也最难被挑出毛病。" } },
        ],
      },
    ];
  }

  /* ========== 构建 DOM ========== */
  buildDom() {
    this.root.innerHTML = `
      <div class="town-lab">
        <div class="town-head">
          <div class="town-title">小镇模拟经营 · 社会发展思辨台</div>
          <div class="town-sub">你是小镇主事。每一个抉择，都在回答：发展的成果，最终归谁？</div>
          <button class="town-back" id="townBack">← 返回菜单</button>
        </div>

        <div class="town-body">
          <div class="town-canvas-wrap">
            <canvas id="townCanvas"></canvas>
            <div class="town-round" id="townRound">准备开始</div>
            <div class="town-legend" id="townLegend"></div>
          </div>

          <div class="town-side">
            <div class="town-metrics" id="townMetrics"></div>
            <div class="town-card" id="townCard">
              <div class="town-card-title" id="townCardTitle"></div>

              <div class="town-reflection" id="townReflection" style="display:none">
                <div class="tr-tag">反思锚点</div>
                <div class="tr-q" id="townReflectionQ"></div>
                <button class="tr-btn" id="townReflectBtn">我想清楚了，开始抉择 →</button>
              </div>

              <div class="town-card-q" id="townCardQ"></div>
              <div class="town-opts" id="townOpts"></div>

              <div class="town-reactions" id="townReactions" style="display:none"></div>
            </div>
          </div>
        </div>

        <div class="town-outcome" id="townOutcome" style="display:none">
          <div class="town-outcome-inner" id="townOutcomeInner"></div>
        </div>
      </div>`;

    this.canvas = this.root.querySelector("#townCanvas");
    this.ctx = this.canvas.getContext("2d");
    this.elRound = this.root.querySelector("#townRound");
    this.elLegend = this.root.querySelector("#townLegend");
    this.elMetrics = this.root.querySelector("#townMetrics");
    this.elCardTitle = this.root.querySelector("#townCardTitle");
    this.elReflection = this.root.querySelector("#townReflection");
    this.elReflectionQ = this.root.querySelector("#townReflectionQ");
    this.elCardQ = this.root.querySelector("#townCardQ");
    this.elOpts = this.root.querySelector("#townOpts");
    this.elReactions = this.root.querySelector("#townReactions");
    this.elOutcome = this.root.querySelector("#townOutcome");
    this.elOutcomeInner = this.root.querySelector("#townOutcomeInner");

    this.root.querySelector("#townBack").addEventListener("click", () => {
      if (this.onExit) this.onExit();
    });
    this.root.querySelector("#townReflectBtn").addEventListener("click", () => {
      this.ackReflected = true;
      this.elReflection.style.display = "none";
      this.elOpts.style.display = "flex";
    });

    this.resize();
    this.built = true;
  }

  resize() {
    if (!this.canvas) return;
    const wrap = this.canvas.parentElement;
    const w = wrap.clientWidth || 640;
    const h = 420;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = w * dpr;
    this.canvas.height = h * dpr;
    this.canvas.style.width = w + "px";
    this.canvas.style.height = h + "px";
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.cw = w; this.ch = h;
  }

  /* ========== 指标条 ========== */
  renderMetrics() {
    const defs = [
      { k: "livelihood",   label: "民生指数", color: "#e8b04b" },
      { k: "trust",        label: "人民信任", color: "#5fb0e8" },
      { k: "prosperity",   label: "繁荣就业", color: "#7ec98a" },
      { k: "revenue",      label: "财政收入", color: "#c98ad6" },
      { k: "capitalConc",  label: "资本集中度", color: "#d9695f" },
    ];
    this.elMetrics.innerHTML = defs.map(d => {
      const v = Math.round(this.disp[d.k]);
      return `<div class="tm-row">
        <span class="tm-label">${d.label}</span>
        <span class="tm-bar"><span class="tm-fill" style="width:${v}%;background:${d.color}"></span></span>
        <span class="tm-val">${v}</span>
      </div>`;
    }).join("");
  }

  /* ========== 渲染决策卡 ========== */
  renderCard() {
    if (this.done) return;
    const r = this.rounds[this.round];
    if (!r) { this.finish(); return; }
    this.elRound.textContent = `回合 ${this.round + 1} / ${this.rounds.length}`;
    this.ackReflected = false;
    this.elReactions.style.display = "none";
    this.elOpts.style.display = "none";
    this.elCardTitle.textContent = r.title;
    this.elCardQ.textContent = r.q;
    this.elReflectionQ.textContent = r.reflection;
    this.elReflection.style.display = "block";
    this.elOpts.innerHTML = "";
    r.options.forEach((opt) => {
      const btn = document.createElement("button");
      btn.className = "town-opt";
      btn.innerHTML = `<span class="to-label">${opt.label}</span><span class="to-note">${opt.note}</span>`;
      btn.addEventListener("click", () => this.choose(opt));
      this.elOpts.appendChild(btn);
    });
  }

  choose(opt) {
    if (this.done || !this.ackReflected) return;
    for (const [k, v] of Object.entries(opt.eff)) {
      this.metrics[k] = Math.max(0, Math.min(100, this.metrics[k] + v));
    }
    this.showReactions(opt);
  }

  /* ========== 民情反馈 ========== */
  showReactions(opt) {
    this.elOpts.style.display = "none";
    const r = opt.reactions;
    this.elReactions.innerHTML = `
      <div class="tr-tag tr-tag-mini">民情反馈</div>
      <div class="react-grid">
        <div class="react-card react-citizen">
          <div class="react-who">👨‍👩‍👧 市民声音</div>
          <div class="react-text">${r.citizen}</div>
        </div>
        <div class="react-card react-enterprise">
          <div class="react-who">🏭 企业回应</div>
          <div class="react-text">${r.enterprise}</div>
        </div>
        <div class="react-card react-authority">
          <div class="react-who">📋 上级视角</div>
          <div class="react-text">${r.authority}</div>
        </div>
      </div>
      <button class="tr-btn tr-btn-next" id="townNextBtn">下一回合 →</button>`;
    this.elReactions.style.display = "block";
    this.root.querySelector("#townNextBtn").addEventListener("click", () => {
      this.round++;
      if (this.round >= this.rounds.length) this.finish();
      else this.renderCard();
    });
  }

  /* ========== 结局 + 复盘回扣剧本 + 重玩对比 ========== */
  finish() {
    this.done = true;
    const m = this.metrics;
    const peopleWin = m.livelihood >= 62 && m.trust >= 58 && m.capitalConc <= 45;
    const moneyWin  = m.capitalConc >= 58 && m.trust <= 48;
    let key = "mid";
    if (peopleWin) key = "people";
    else if (moneyWin) key = "money";

    const score = Math.round((m.livelihood + m.trust + m.prosperity) / 3 - m.capitalConc / 3);
    const snap = { key, metrics: { ...m }, score };

    const outcomes = {
      people: {
        title: "和美小镇 · 人民的小镇",
        cls: "ok",
        body:
          `你反复选择把资源投向民生、信任与共享。小镇长出了学校、诊所、公园，人与人之间有信赖。` +
          `这正是<b>第一幕《为人民服务，还是为人民币服务？》</b>的微观答案——"为人民服务"不是空话，而是每一次把发展成果交到人民手中的具体决定。` +
          `也呼应了<b>第二幕《在岗，就是为人民服务吗？》</b>的核心：当制度以人民为中心、以共同富裕为导向，劳动创造的财富才真正流向劳动者。` +
          `你没有回避发展经济的必要性（建厂带来就业、商业创造岗位），但你始终追问：<b>发展的成果，归根到底归谁？</b>`,
      },
      money: {
        title: "镀金镇 · 增长至上",
        cls: "warn",
        body:
          `资本高度集中、少数主体掌握了大部分资产，民生和信任滞后于数字增长。` +
          `这不代表你做的决定都是"错的"——建厂确实带来了就业，商业确实便利了生活。但<b>第二幕</b>提醒的关键问题是：` +
          `就业和消费的增长，是否必然带来人民的幸福？当生产资料高度集中、剩余价值的分配权不在劳动者手中时，` +
          `"为人民币服务"就会从一句调侃变成系统性的现实——<b>账面镀金，人却远了</b>。` +
          `第一幕那句"为人民服务是最高的人生追求"，正是在这种语境下才显出它的分量：它不是否定经济发展，而是追问经济发展的方向。`,
      },
      mid: {
        title: "前行中的小镇 · 在张力中寻找平衡",
        cls: "mid",
        body:
          `你在发展与民生之间反复权衡，没有走向任何一端。这是大多数真实治理者面对的局面。` +
          `但<b>第二幕</b>提醒我们：平衡的天平不会自动静止。共同富裕需要主动的制度托底，` +
          `而<b>第一幕</b>告诉我们："为人民服务"之所以是"最高"追求，恰恰因为它最容易在日常的权衡中被稀释——每次都觉得"这次先顾发展"，久而久之就滑向了另一边。` +
          `你的小镇证明了<b>取舍是真实的</b>：招商带来就业但也推高房租，民生投入提升幸福感但也消耗财力。` +
          `没有简单的标准答案，但有一个值得反复追问的问题：<b>这笔钱花下去，十年后它在谁的口袋里？</b>`,
      },
    };
    const o = outcomes[key];

    let compareHtml = "";
    if (this.lastRun) {
      compareHtml = this.renderCompare(this.lastRun, snap);
    }
    this.lastRun = snap;

    const metricLine = (mm) =>
      `民生 ${Math.round(mm.livelihood)} · 信任 ${Math.round(mm.trust)} · 繁荣 ${Math.round(mm.prosperity)} · 财政 ${Math.round(mm.revenue)} · 资本集中 ${Math.round(mm.capitalConc)}`;
    const pathName = { people: "民生导向", money: "增长优先", mid: "平衡路线" };

    this.elOutcome.style.display = "flex";
    this.elOutcomeInner.innerHTML = `
      <div class="to-tag to-${o.cls}">${o.title}</div>
      <div class="to-body">
        <p class="to-metrics">${metricLine(m)}</p>
        <p>${o.body}</p>
      </div>
      ${compareHtml}
      <div class="to-actions">
        <button class="town-replay" id="townReplay">↻ 重新经营（可与上次对比）</button>
        <button class="town-clear" id="townClear" style="${this.lastRun ? "" : "display:none"}">清除对比记录</button>
      </div>`;
    this.root.querySelector("#townReplay").addEventListener("click", () => this.replay());
    const clearBtn = this.root.querySelector("#townClear");
    if (clearBtn) clearBtn.addEventListener("click", () => { this.lastRun = null; this.replay(); });
  }

  renderCompare(prev, cur) {
    const defs = [
      { k: "livelihood",   label: "民生" },
      { k: "trust",        label: "信任" },
      { k: "prosperity",   label: "繁荣" },
      { k: "revenue",      label: "财政" },
      { k: "capitalConc",  label: "资本集中" },
    ];
    const pathName = { people: "民生导向", money: "增长优先", mid: "平衡路线" };
    const rows = defs.map(d => {
      const pv = Math.round(prev.metrics[d.k]), cv = Math.round(cur.metrics[d.k]);
      const arrow = cv > pv ? "▲" : (cv < pv ? "▼" : "＝");
      const cls = cv > pv ? "up" : (cv < pv ? "down" : "");
      return `<div class="cmp-row">
        <span class="cmp-label">${d.label}</span>
        <span class="cmp-prev">${pv}</span>
        <span class="cmp-arrow ${cls}">${arrow}</span>
        <span class="cmp-cur">${cv}</span>
      </div>`;
    }).join("");
    return `
      <div class="cmp-wrap">
        <div class="cmp-head">两次经营对比</div>
        <div class="cmp-cols">
          <div class="cmp-col">
            <div class="cmp-col-title">上次 · ${pathName[prev.key]}</div>
            <div class="cmp-score">综合 ${prev.score}</div>
          </div>
          <div class="cmp-col">
            <div class="cmp-col-title">本次 · ${pathName[cur.key]}</div>
            <div class="cmp-score">综合 ${cur.score}</div>
          </div>
        </div>
        <div class="cmp-rows">${rows}</div>
        <div class="cmp-note">同一个小镇，不同的取舍，走向不同的社会。哪一种更接近"为人民服务"？</div>
      </div>`;
  }

  replay() {
    this.metrics = { livelihood: 50, trust: 50, revenue: 50, prosperity: 50, capitalConc: 30 };
    this.disp = { ...this.metrics };
    this.round = 0;
    this.done = false;
    this.elOutcome.style.display = "none";
    this.renderMetrics();
    this.renderCard();
  }

  /* ================================================================
   *  视觉引擎 v3 —— 建筑类型化 / 人物具象化 / 环境细节
   * ================================================================ */

  draw() {
    const ctx = this.ctx;
    const W = this.cw, H = this.ch;
    const m = this.disp;

    // --- 综合氛围 ---
    const warmth = (m.livelihood + m.trust + m.prosperity) / 3; // 0~100
    const greed  = m.capitalConc;                                 // 0~100
    const t = warmth / 100;   // 0暖 1冷→暖(高warmth=暖色)
    const g = greed / 100;

    // ---- 天空渐变（冷暖过渡） ----
    const sky = ctx.createLinearGradient(0, 0, 0, H * 0.72);
    // 高warmth → 暖橙金；低warmth → 冷灰蓝紫
    const sr = 235 - 90 * t, sg = 200 - 70 * t, sb = 165 + 75 * t;
    sky.addColorStop(0, `hsl(${32 + 220 * (1-t)}, ${25 + 15*t}%, ${68 + 12*(1-t)}%)`);
    sky.addColorStop(0.6, `hsl(${38 + 200 * (1-t)}, ${30 + 18*t}%, ${78 + 10*(1-t)}%)`);
    sky.addColorStop(1, `hsl(${28 + 190 * (1-t)}, ${22 + 12*t}%, ${82 + 6*(1-t)}%)`);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    // ---- 云朵（信任高时多且蓬松） ----
    this._drawClouds(ctx, W, H, m.trust, t);

    // ---- 太阳/月亮 ----
    const sunX = W * 0.84, sunY = H * 0.17, sunR = 22;
    const sunGlow = ctx.createRadialGradient(sunX, sunY, sunR * 0.5, sunX, sunY, sunR * 3);
    sunGlow.addColorStop(0, `rgba(255,${220 + 35*t|0},${120 + 100*t|0},${0.35 + 0.15*t})`);
    sunGlow.addColorStop(1, "rgba(255,220,140,0)");
    ctx.fillStyle = sunGlow;
    ctx.fillRect(sunX - sunR * 3, sunY - sunR * 3, sunR * 6, sunR * 6);
    ctx.fillStyle = `rgb(${255},${210 + 30*t|0},${130 + 90*t|0})`;
    ctx.beginPath(); ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2); ctx.fill();

    // ---- 远山 ----
    this._drawMountains(ctx, W, H, t);

    // ---- 地面 ----
    const groundY = H - 56;
    // 草地层
    const grass = ctx.createLinearGradient(0, groundY, 0, H);
    const grHue = 95 + 20 * (1 - t); // 暖时偏黄绿，冷时偏灰绿
    grass.addColorStop(0, `hsl(${grHue}, ${35 + 15*(1-g)}%, ${42 + 10*t}%)`);
    grass.addColorStop(1, `hsl(${grHue}, ${28 + 10*(1-g)}%, ${30 + 5*t}%)`);
    ctx.fillStyle = grass;
    ctx.fillRect(0, groundY, W, H - groundY);

    // 道路
    this._drawRoad(ctx, W, H, groundY, greed);

    const rng = mulberry(20240807);

    // ═══════════════════════════════════════════
    //  建筑层（从远到近）
    // ═══════════════════════════════════════════

    // ---- 1) 远景：工厂（繁荣度高或资本集中度高时出现） ----
    const showFactory = m.prosperity > 52 || greed > 48;
    if (showFactory) {
      const fx = W * (0.08 + rng() * 0.12);
      this._drawFactory(ctx, fx, groundY, rng, m.prosperity, greed);
    }
    if (m.prosperity > 60) {
      const fx2 = W * (0.72 + rng() * 0.16);
      this._drawFactory(ctx, fx2, groundY, mulberry(888), m.prosperity, greed);
    }

    // ---- 2) 写字楼/塔楼（资本越集中越高越多） ----
    const towerN = Math.round(2 + greed / 18);
    for (let i = 0; i < towerN; i++) {
      const tx = W * (0.28 + (i / Math.max(towerN, 1)) * 0.52) + (rng() - 0.5) * 30;
      const th = 55 + greed * 1.0 + rng() * 30;
      this._drawTower(ctx, tx, groundY, th, rng, greed);
    }

    // ---- 3) 商业综合体（收入高时出现） ----
    if (m.revenue > 54) {
      const mx = W * (0.55 + rng() * 0.12);
      this._drawMall(ctx, mx, groundY, rng, m.revenue);
    }

    // ---- 4) 学校（民生 > 52 时出现） ----
    if (m.livelihood > 52) {
      const schX = W * (0.28 + rng() * 0.12);
      this._drawSchool(ctx, schX, groundY, rng, m.livelihood);
    }

    // ---- 5 医院/诊所（民生 > 55 或信任 > 56 时出现） ----
    if (m.livelihood > 55 || m.trust > 56) {
      const hx = W * (0.54 + rng() * 0.10);
      this._drawHospital(ctx, hx, groundY, rng);
    }

    // ---- 6) 住宅楼（始终有，数量随繁荣度变化，均匀分布） ----
    const homeN = 3 + Math.round(m.prosperity / 18);
    for (let i = 0; i < homeN; i++) {
      // 均匀分布：从 8% 到 92%，避开边缘
      const hx = W * (0.08 + (i + 0.5) / homeN * 0.84) + (rng() - 0.5) * 18;
      const hh = 34 + rng() * 26;
      this._drawHome(ctx, hx, groundY, hh, rng, i, warmth);
    }

    // ---- 7) 公园绿地（民生越旺越大越多，但保持克制） ----
    if (m.livelihood > 48) {
      const parkSize = Math.min(0.13, m.livelihood / 420);
      const px = W * (0.68 + rng() * 0.10);
      this._drawPark(ctx, px, groundY - 2, parkSize * W, rng, m.livelihood, m.trust);
    }
    if (m.livelihood > 62) {
      const p2x = W * (0.12 + rng() * 0.08);
      this._drawPark(ctx, p2x, groundY - 2, W * 0.07, mulberry(333), m.livelihood, m.trust);
    }

    // ---- 8) 广告牌（资本集中 > 50 时出现） ----
    if (greed > 50) {
      this._drawBillboard(ctx, W * 0.15, groundY, rng, greed);
      this._drawBillboard(ctx, W * 0.78, groundY, mulberry(777), greed);
    }

    // ---- 9) 贫富隔离墙（资本极高 + 民生偏低） ----
    const divided = greed > 60 && m.livelihood < 54;
    if (divided) {
      this._drawWall(ctx, W * 0.5, groundY, rng);
    }

    // ---- 人物 ----
    this._drawPeople(ctx, W, groundY, m.trust, warmth, greed, m.livelihood, divided);
  }

  /* ---------- 云朵（缩小、更轻盈） ---------- */
  _drawClouds(ctx, W, H, trust, t) {
    const n = 2 + Math.floor(trust / 40); // 信任高云多（阈值提高减少数量）
    const seedArr = [42, 171, 299, 423];
    for (let i = 0; i < n; i++) {
      const rng = mulberry(seedArr[i] || i * 137);
      const cx = W * (0.12 + i * 0.26 + rng() * 0.10);
      const cy = H * (0.06 + rng() * 0.10);
      const alpha = 0.35 + 0.15 * t + rng() * 0.10;
      ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      // 一朵云 = 3-4 个重叠圆（缩小半径）
      const parts = 3 + (rng() > 0.5 ? 1 : 0);
      for (let j = 0; j < parts; j++) {
        const r = 8 + rng() * 14; // 原来是 14+22，现在 8+22
        ctx.beginPath();
        ctx.arc(cx + j * (r * 0.55) + rng() * 6, cy + rng() * 4, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  /* ---------- 远山 ---------- */
  _drawMountains(ctx, W, H, t) {
    const my = H * 0.64;
    ctx.fillStyle = `hsl(${28 + 190*(1-t)}, ${12 + 8*(1-t)}%, ${52 + 12*t}%)`;
    ctx.beginPath();
    ctx.moveTo(0, my);
    const rng = mulberry(999);
    const steps = 18;
    for (let i = 0; i <= steps; i++) {
      const x = W * i / steps;
      const y = my - 10 - Math.sin(i * 0.7 + rng()) * 25 - rng() * 15;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(W, my);
    ctx.closePath();
    ctx.fill();
  }

  /* ---------- 道路 ---------- */
  _drawRoad(ctx, W, H, groundY, greed) {
    // 主路
    const roadH = 18;
    ctx.fillStyle = `hsl(30, ${8 + 6*greed/100}%, ${32 + 8*(1-greed/100)}%)`;
    ctx.fillRect(0, groundY + 8, W, roadH);
    // 路中线
    ctx.strokeStyle = "rgba(240,220,160,0.35)";
    ctx.setLineDash([12, 10]);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, groundY + 8 + roadH / 2);
    ctx.lineTo(W, groundY + 8 + roadH / 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  /* ---------- 工厂：大厂房 + 烟囱 + 可选烟雾 ---------- */
  _drawFactory(ctx, x, baseY, rng, prosperity, greed) {
    const fw = 70 + rng() * 40;
    const fh = 34 + rng() * 16;
    const by = baseY - fh;

    // 厂房体
    ctx.fillStyle = `hsl(210, ${8 + 6*greed/100}%, ${44 + 10*(1-greed/100)}%)`;
    ctx.fillRect(x, by, fw, fh);
    // 屋顶（锯齿形厂房顶）
    ctx.fillStyle = `hsl(210, ${6 + 4*greed/100}%, ${36 + 8*(1-greed/100)}%)`;
    ctx.beginPath();
    ctx.moveTo(x - 4, by);
    for (let i = 0; i <= 4; i++) {
      ctx.lineTo(x - 4 + (i + 0.5) * fw / 4, by - 10 - (i % 2) * 4);
    }
    ctx.lineTo(x + fw + 4, by);
    ctx.closePath();
    ctx.fill();

    // 烟囱
    const sx = x + fw * 0.2;
    const sw = 8, sh = 22 + rng() * 14;
    ctx.fillStyle = `hsl(210, 10%, ${40 + 10*(1-greed/100)}%)`;
    ctx.fillRect(sx, by - sh, sw, sh);
    // 烟囱帽
    ctx.fillStyle = `hsl(210, 12%, ${32 + 8*(1-greed/100)}%)`;
    ctx.fillRect(sx - 2, by - sh - 3, sw + 4, 4);

    // 烟雾（资本高时冒烟）
    if (greed > 46) {
      ctx.fillStyle = `rgba(140,138,132,${0.15 + 0.2 * (greed - 46) / 54})`;
      for (let i = 0; i < 3; i++) {
        const sr = 6 + i * 6 + rng() * 4;
        ctx.beginPath();
        ctx.arc(sx + sw / 2, by - sh - 6 - i * 14, sr, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 门
    ctx.fillStyle = `hsl(210, 8%, ${28 + 8*(1-greed/100)}%)`;
    ctx.fillRect(x + fw * 0.4, by + fh - 18, 16, 18);

    // 厂名招牌区
    ctx.fillStyle = `rgba(200,196,188,0.7)`;
    ctx.fillRect(x + 6, by + 6, fw - 12, 10);
  }

  /* ---------- 写字楼/塔楼 ---------- */
  _drawTower(ctx, x, baseY, h, rng, greed) {
    const tw = 26 + rng() * 18;
    const by = baseY - h;
    const cold = greed > 52;

    // 楼体
    const hue = cold ? 215 : 25;
    const sat = cold ? 12 : 18;
    const lit = cold ? 48 + rng() * 14 : 52 + rng() * 16;
    ctx.fillStyle = `hsl(${hue},${sat}%,${lit}%)`;
    ctx.fillRect(x, by, tw, h);

    // 玻璃反光条
    ctx.fillStyle = `rgba(${cold ? "180,200,220" : "255,245,220"},${cold ? 0.15 : 0.08})`;
    ctx.fillRect(x + tw * 0.2, by + 4, tw * 0.12, h - 8);

    // 屋顶装饰
    ctx.fillStyle = `hsl(${hue},${sat + 4}%,${lit - 10}%)`;
    ctx.beginPath();
    ctx.moveTo(x - 3, by);
    ctx.lineTo(x + tw / 2, by - 8);
    ctx.lineTo(x + tw + 3, by);
    ctx.closePath();
    ctx.fill();

    // 窗户网格
    const cw_ = 5, ch_ = 7, gap = 3;
    ctx.fillStyle = cold ? "rgba(255,210,120,0.85)" : "rgba(255,248,220,0.45)";
    for (let wy = by + 10; wy < baseY - 6; wy += ch_ + gap) {
      for (let wx = x + 4; wx < x + tw - 4; wx += cw_ + gap) {
        if (rng() > 0.25) ctx.fillRect(wx, wy, cw_, ch_);
      }
    }

    // 高资本时顶部加天线/logo
    if (greed > 56) {
      ctx.strokeStyle = `hsl(${hue},${sat}%,${lit - 15}%)`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x + tw / 2, by - 8);
      ctx.lineTo(x + tw / 2, by - 18);
      ctx.stroke();
      // 闪烁灯
      ctx.fillStyle = greed > 70 ? "rgba(255,40,40,0.8)" : "rgba(255,200,80,0.7)";
      ctx.beginPath(); ctx.arc(x + tw / 2, by - 19, 2, 0, Math.PI * 2); ctx.fill();
    }
  }

  /* ---------- 商业综合体 ---------- */
  _drawMall(ctx, x, baseY, rng, revenue) {
    const mw = 56 + rng() * 24;
    const mh = 42 + rng() * 14;
    const by = baseY - mh;

    // 主体
    ctx.fillStyle = "hsl(30, 18%, 58%)";
    ctx.fillRect(x, by, mw, mh);

    // 玻璃幕墙
    ctx.fillStyle = "rgba(180,200,220,0.18)";
    ctx.fillRect(x + 3, by + 4, mw - 6, mh * 0.55);

    // 招牌
    ctx.fillStyle = "hsl(0, 55%, 52%)";
    ctx.fillRect(x + 4, by + 2, mw - 8, 12);
    ctx.fillStyle = "rgba(255,230,180,0.85)";
    ctx.font = "9px sans-serif";
    ctx.fillText("购物中心", x + 8, by + 11);

    // 大门（弧顶）
    ctx.fillStyle = "hsl(30, 14%, 44%)";
    ctx.beginPath();
    ctx.arc(x + mw * 0.5, baseY, 14, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(x + mw * 0.5 - 14, baseY - 14, 28, 14);

    // 入口台阶
    ctx.fillStyle = "hsl(30, 10%, 72%)";
    ctx.fillRect(x + mw * 0.3, baseY - 3, mw * 0.4, 3);
  }

  /* ---------- 学校 ---------- */
  _drawSchool(ctx, x, baseY, rng, livelihood) {
    const sw = 48 + rng() * 16;
    const sh = 36 + rng() * 12;
    const by = baseY - sh;

    // 教学楼（暖色调）
    ctx.fillStyle = `hsl(28, ${30 + 10*livelihood/100}%, ${76 - 8*livelihood/100}%)`;
    ctx.fillRect(x, by, sw, sh);

    // 红瓦屋顶
    ctx.fillStyle = "hsl(2, 55%, 48%)";
    ctx.beginPath();
    ctx.moveTo(x - 5, by);
    ctx.lineTo(x + sw / 2, by - 14);
    ctx.lineTo(x + sw + 5, by);
    ctx.closePath();
    ctx.fill();

    // 窗户
    ctx.fillStyle = "rgba(140,200,235,0.55)";
    for (let wy = by + 8; wy < baseY - 8; wy += 12) {
      for (let wx = x + 6; wx < x + sw - 6; wx += 12) {
        ctx.fillRect(wx, wy, 7, 8);
      }
    }

    // 旗杆 + 国旗
    const poleX = x + sw - 8;
    ctx.strokeStyle = "#aaa"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(poleX, by - 14); ctx.lineTo(poleX, by - 38); ctx.stroke();
    // 旗
    ctx.fillStyle = "hsl(2, 65%, 50%)";
    ctx.beginPath();
    ctx.moveTo(poleX, by - 37);
    ctx.lineTo(poleX + 12, by - 33);
    ctx.lineTo(poleX, by - 28);
    ctx.closePath();
    ctx.fill();

    // 校门
    ctx.fillStyle = "hsl(28, 22%, 58%)";
    ctx.fillRect(x + sw * 0.35, baseY - 14, 14, 14);
  }

  /* ---------- 医院/诊所 ---------- */
  _drawHospital(ctx, x, baseY, rng) {
    const hw = 40 + rng() * 14;
    const hh = 34 + rng() * 10;
    const by = baseY - hh;

    // 主体（白/浅灰）
    ctx.fillStyle = "hsl(0, 4%, 86%)";
    ctx.fillRect(x, by, hw, hh);

    // 屋顶
    ctx.fillStyle = "hsl(0, 3%, 72%)";
    ctx.beginPath();
    ctx.moveTo(x - 4, by);
    ctx.lineTo(x + hw / 2, by - 10);
    ctx.lineTo(x + hw + 4, by);
    ctx.closePath();
    ctx.fill();

    // 红十字（大且醒目）
    ctx.fillStyle = "hsl(2, 62%, 52%)";
    const cx_ = x + hw / 2, cy_ = by + hh * 0.45;
    const crossW = 10, crossT = 3;
    ctx.fillRect(cx_ - crossW / 2, cy_ - crossT, crossW, crossT * 2);
    ctx.fillRect(cx_ - crossT, cy_ - crossW / 2, crossT * 2, crossW);

    // 门
    ctx.fillStyle = "hsl(0, 3%, 66%)";
    ctx.fillRect(x + hw * 0.38, baseY - 14, 12, 14);
  }

  /* ---------- 住宅楼 ---------- */
  _drawHome(ctx, x, baseY, h, rng, idx, warmth) {
    const w = 22 + rng() * 16;
    const by = baseY - h;

    // 楼体颜色随温暖度变化
    const hue = 25 + rng() * 15; // 暖黄到米色
    const sat = 18 + 12 * warmth / 100;
    const lit = 62 + rng() * 16 - 8 * (1 - warmth / 100);
    ctx.fillStyle = `hsl(${hue}, ${sat}%, ${lit}%)`;
    ctx.fillRect(x, by, w, h);

    // 坡屋顶
    const roofH = 8 + h * 0.12;
    ctx.fillStyle = `hsl(${hue + 8}, ${sat + 8}%, ${lit - 18}%)`;
    ctx.beginPath();
    ctx.moveTo(x - 3, by);
    ctx.lineTo(x + w / 2, by - roofH);
    ctx.lineTo(x + w + 3, by);
    ctx.closePath();
    ctx.fill();

    // 窗户（暖光）
    const winOn = warmth > 45;
    ctx.fillStyle = winOn ? "rgba(255,220,140,0.6)" : "rgba(180,195,210,0.4)";
    const cols = Math.max(1, Math.floor(w / 12));
    const rows = Math.max(1, Math.floor(h / 16));
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (rng() > 0.2) {
          ctx.fillRect(
            x + 4 + c * ((w - 8) / Math.max(cols, 1)),
            by + 6 + r * ((h - 8) / Math.max(rows, 1)),
            6, 8
          );
        }
      }
    }

    // 门
    ctx.fillStyle = `hsl(${hue}, ${sat + 6}%, ${lit - 22}%)`;
    ctx.fillRect(x + w / 2 - 4, baseY - 13, 8, 13);

    // 空调外机（小细节）
    if (rng() > 0.5) {
      const acx = x + w + 2;
      const acy = by + h * 0.4;
      ctx.fillStyle = "hsl(210, 8%, 72%)";
      ctx.fillRect(acx, acy, 5, 4);
    }
  }

  /* ---------- 公园绿地 ---------- */
  _drawPark(ctx, x, baseY, width, rng, livelihood, trust) {
    // 草坪基底（压扁：宽>高，更像绿地而非方块）
    const pH = Math.max(16, width * 0.28);
    ctx.fillStyle = `hsl(${100 + 10*(1-livelihood/100)}, ${35 + 12*trust/100}%, ${48 + 8*livelihood/100}%)`;
    this._roundRect(ctx, x - width / 2, baseY - pH, width, pH, 5);
    ctx.fill();

    // 树木（有树冠的树，不是圆球）
    const treeN = 2 + Math.floor(width / 50);
    for (let i = 0; i < treeN; i++) {
      const tx = x - width / 2 + 10 + rng() * (width - 20);
      const ty = baseY - 2;
      const th = 14 + rng() * 12; // 树干高
      const cr = 10 + rng() * 10; // 冠幅

      // 树干
      ctx.fillStyle = "hsl(28, 35%, 38%)";
      ctx.fillRect(tx - 2, ty - th, 4, th);

      // 树冠（多层叠加椭圆）
      const greens = [`hsl(115, 40%, ${35 + 10*rng()}%)`, `hsl(105, 35%, ${40 + 8*rng()}%)`, `hsl(122, 38%, ${32 + 12*rng()}%)`];
      for (let l = 0; l < 3; l++) {
        ctx.fillStyle = greens[l];
        ctx.beginPath();
        ctx.ellipse(tx + (rng() - 0.5) * 6, ty - th - cr * 0.3 + (l - 1) * 3,
                     cr * (1 - l * 0.15), cr * (0.65 - l * 0.1),
                     rng() * 0.4 - 0.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 长椅（信任高时出现）
    if (trust > 50) {
      const bx = x - width * 0.2;
      const by = baseY - 6;
      // 椅腿
      ctx.fillStyle = "hsl(28, 25%, 32%)";
      ctx.fillRect(bx, by - 4, 3, 4);
      ctx.fillRect(bx + 18, by - 4, 3, 4);
      // 椅面
      ctx.fillStyle = "hsl(28, 30%, 48%)";
      ctx.fillRect(bx - 2, by - 7, 25, 4);
    }

    // 小喷泉（民生高时出现）
    if (livelihood > 58) {
      const fx = x;
      const fy = baseY - pH * 0.55;
      // 水池
      ctx.fillStyle = "rgba(140,190,225,0.45)";
      ctx.beginPath(); ctx.ellipse(fx, fy + 4, 14, 6, 0, 0, Math.PI * 2); ctx.fill();
      // 水柱
      ctx.fillStyle = "rgba(160,205,240,0.5)";
      ctx.beginPath(); ctx.ellipse(fx, fy - 4, 3, 5, 0, 0, Math.PI * 2); ctx.fill();
    }
  }

  /* ---------- 广告牌 ---------- */
  _drawBillboard(ctx, x, baseY, rng, greed) {
    const bw = 44 + rng() * 20;
    const bh = 28 + rng() * 12;
    const by = baseY - bh - 20; // 架在高处

    // 支架
    ctx.fillStyle = "hsl(0, 3%, 36%)";
    ctx.fillRect(x + bw * 0.1, by + bh, 4, 20);
    ctx.fillRect(x + bw * 0.85, by + bh, 4, 20);

    // 牌面
    const hue = [0, 45, 200][Math.floor(rng() * 3)]; // 红/黄/蓝随机
    ctx.fillStyle = `hsl(${hue}, ${60 + rng()*20}%, ${52 + rng()*12}%)`;
    ctx.fillRect(x, by, bw, bh);

    // 高光/反光
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    ctx.fillRect(x + 2, by + 2, bw - 4, bh * 0.3);

    // 霓虹边框（资本很高时闪烁感）
    if (greed > 64) {
      ctx.strokeStyle = `hsla(${hue + (rng()>0.5?150:-150)}, 80%, 60%, 0.5)`;
      ctx.lineWidth = 2;
      ctx.strokeRect(x, by, bw, bh);
    }
  }

  /* ---------- 贫富隔离墙 ---------- */
  _drawWall(ctx, x, baseY, rng) {
    const wh = 100 + rng() * 30;
    // 墙体
    ctx.fillStyle = "hsl(30, 6%, 42%)";
    ctx.fillRect(x - 5, baseY - wh, 10, wh);
    // 墙顶铁丝网
    ctx.strokeStyle = "hsl(0, 3%, 36%)";
    ctx.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
      const yy = baseY - wh - 2 + i * 2;
      ctx.beginPath();
      ctx.moveTo(x - 5, yy);
      ctx.quadraticCurveTo(x, yy - 4, x + 5, yy);
      ctx.stroke();
    }
    // 墙右侧：精致小楼
    ctx.fillStyle = "hsl(210, 10%, 62%)";
    for (let i = 0; i < 2; i++) {
      const sx = x + 14 + i * 24, sh = 24 + rng() * 14;
      ctx.fillRect(sx, baseY - sh, 20, sh);
      // 小屋顶
      ctx.fillStyle = "hsl(210, 8%, 50%)";
      ctx.beginPath();
      ctx.moveTo(sx - 2, baseY - sh);
      ctx.lineTo(sx + 10, baseY - sh - 6);
      ctx.lineTo(sx + 22, baseY - sh);
      ctx.closePath();
      ctx.fill();
    }
    // 墙左侧：简陋棚屋
    ctx.fillStyle = "hsl(28, 18%, 44%)";
    for (let i = 0; i < 2; i++) {
      const sx = x - 34 - i * 22, sh = 16 + rng() * 8;
      // 波浪铁皮顶
      ctx.fillStyle = "hsl(35, 20%, 50%)";
      ctx.beginPath();
      ctx.moveTo(sx - 3, baseY - sh);
      for (let p = 0; p <= 4; p++) {
        ctx.lineTo(sx - 3 + p * (18 / 4), baseY - sh - 2 - (p % 2) * 2);
      }
      ctx.lineTo(sx + 17, baseY - sh);
      ctx.closePath();
      ctx.fill();
      // 墙体
      ctx.fillStyle = "hsl(28, 15%, 40%)";
      ctx.fillRect(sx, baseY - sh, 18, sh);
    }
  }

  /* ---------- 人物（可辨人形） ---------- */
  _drawPeople(ctx, W, baseY, trust, warmth, greed, livelihood, divided) {
    const ppl = Math.max(4, Math.round(4 + trust / 8 + warmth / 12));
    const cold = greed > 58 && livelihood < 54;
    const rng = mulberry(20240807);

    for (let i = 0; i < ppl; i++) {
      const x = 24 + rng() * (W - 48);
      const y = baseY - 2;
      const s = 4 + rng() * 2; // 身体缩放
      const dir = rng() > 0.5 ? 1 : -1; // 朝左或朝右

      // 颜色：冷=蓝灰，暖=橙红
      let hue, sat, lit, alpha;
      if (cold) {
        hue = 210 + rng() * 20; sat = 8; lit = 62 + rng() * 14; alpha = 0.8;
      } else {
        hue = 18 + rng() * 18; sat = 50 + 20 * warmth / 100; lit = 55 + 15 * warmth / 100; alpha = 0.88;
      }
      ctx.fillStyle = `hsla(${hue}, ${sat}%, ${lit}%, ${alpha})`;

      // 头
      ctx.beginPath();
      ctx.arc(x, y - s * 2.4, s * 0.6, 0, Math.PI * 2);
      ctx.fill();

      // 身体
      ctx.save();
      ctx.translate(x, y - s * 1.6);
      if (dir < 0) ctx.scale(-1, 1);
      // 躯干
      ctx.fillRect(-s * 0.35, 0, s * 0.7, s * 1.1);
      // 腿（走路姿态）
      const legPhase = (Date.now() / 400 + i * 1.7) % (Math.PI * 2);
      const legSpread = Math.sin(legPhase) * s * 0.25;
      ctx.fillRect(-s * 0.25, s * 1.0, s * 0.2, s * 0.7 + legSpread);
      ctx.fillRect(s * 0.05, s * 1.0, s * 0.2, s * 0.7 - legSpread);
      // 手臂
      const armSwing = Math.sin(legPhase) * s * 0.2;
      ctx.fillRect(-s * 0.45, s * 0.15, s * 0.15, s * 0.6 - armSwing);
      ctx.fillRect(s * 0.3, s * 0.15, s * 0.15, s * 0.6 + armSwing);
      ctx.restore();
    }
  }

  /* 辅助：圆角矩形 */
  _roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }

  /* ========== 主循环 ========== */
  loop() {
    if (!this.running) return;
    let moving = false;
    for (const k of Object.keys(this.disp)) {
      const d = this.metrics[k] - this.disp[k];
      if (Math.abs(d) > 0.3) { this.disp[k] += d * 0.12; moving = true; }
      else this.disp[k] = this.metrics[k];
    }
    this.renderMetrics();
    this.draw();
    this.raf = requestAnimationFrame(() => this.loop());
  }

  /* ========== 生命周期 ========== */
  start() {
    if (!this.built) this.buildDom();
    this.running = true;
    this.round = 0; this.done = false;
    this.metrics = { livelihood: 50, trust: 50, revenue: 50, prosperity: 50, capitalConc: 30 };
    this.disp = { ...this.metrics };
    this.elOutcome.style.display = "none";
    this.renderMetrics();
    this.renderCard();
    this.loop();
    this._onResize = () => this.resize();
    window.addEventListener("resize", this._onResize);
  }

  stop() {
    this.running = false;
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = null;
    if (this._onResize) window.removeEventListener("resize", this._onResize);
  }
}

/* 稳定伪随机（同种子 → 同布局） */
function mulberry(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
