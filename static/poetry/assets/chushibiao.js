/**
 * 出师表 —— 沉浸式电影导读
 *
 * 诸葛亮《出师表》十四幕结构：
 *   序（一殿烛火）→ 危急存亡 → 开张圣听 → 陟罚臧否 → 良实忠纯
 *   → 将军向宠 → 亲贤远小 → 桓灵之叹 → 臣本布衣 → 三顾草庐
 *   → 二十有一年 → 五月渡泸 → 北定中原 → 临表涕零（解读收束）
 *
 * 长文的处理原则：一章只引一两句，留白多于文字。
 * 视听语言：
 *   1. 前景余烬层：Canvas 上升的烛火光点，随叙事明暗起伏（烛火初燃 → 表文中段最盛 → 临表渐熄）
 *   2. 氛围夜风：Web Audio 合成的穿堂夜风（低通噪声 + 缓慢 LFO）
 */

import { s as createPoetryAudio } from "./poetryAudio.js";
import {
  S as Scene,
  O as OrthographicCamera,
  W as WebGLRenderer,
  a as SRGBColorSpace,
  T as TextureLoader,
  P as PlaneGeometry,
  M as MeshBasicMaterial,
  b as Mesh,
  C as Clock,
  c as MathUtils,
} from "./three.module.js";

// 朗读音频（后期自备）：把音频文件放进 audio/ 目录，路径填在这里即可，朗读按钮会自动出现
// 例：const AUDIO_SRC = "audio/chushibiao.mp3";
const AUDIO_SRC = "";

const AUDIO_TITLE = "出师表";

const prefersReducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const isReviewMode = new URLSearchParams(location.search).has("review"); // ?review：截图用的纯净模式
const baseUrl = "./"; // 资源与页面同级，站点整体搬家也不会失效

/* ---------- 可调参数 ---------- */
const IMAGE_ASPECT = 1536 / 1024; // 生成图统一尺寸，决定平面的宽高比
const SAFE_OVERSCAN = 1.02; // 铺满之外再多留一点画面，视差位移时才不会露出背景
const NARROW_BREAKPOINT = 860; // 与《将进酒》一致：窄到这个宽度就整张缩小显示，不再裁切
const PIXEL_RATIO = isReviewMode ? 1 : 1.5; // 评审模式固定 1，保证截图一致
const MAX_ANISOTROPY = 4; // 各向异性过滤上限：再高只是白烧 GPU，肉眼几乎看不出差别
const TRANSITION_DEPTH = 0.002; // front 平面比 back 略靠前，避免两层面片 z-fighting

const ACTIVE_CHAPTER_LINE = 0.28; // 章节顶部越过视口 28% 处即判定为"当前章节"
const POINTER_STRENGTH_X = 0.012; // 鼠标左右移动带来的横向位移系数
const POINTER_STRENGTH_Y = 0.008; // 鼠标上下移动带来的纵向位移系数

const MAX_FRAME_DELTA = 0.04; // 单帧最大时间步（切走标签页再回来时不跳变）
const CROSSFADE_DONE = 0.995; // 淡入到这个比例就认为切换完成

const EMBER_MAX = 70; // 余烬光点池上限

// MathUtils.damp 的 lambda：数值越大越"跟手"。降低动效偏好时用大值，等于几乎瞬间到位
const PROGRESS_SMOOTHING = prefersReducedMotion ? 20 : 4.5; // 滚动进度跟随速度
const CROSSFADE_SPEED = prefersReducedMotion ? 24 : 3.6; // 画面淡入淡出速度

/* ---------- 1. 意象词典：章节 data-key → 提示条内容 ---------- */
const imageryNotes = {
  opening: {
    label: "一殿烛火",
    line: "序 · 出师之前",
    text: "建兴五年，诸葛亮北驻汉中，出师前上此表。殿中烛火不灭，写的是国事，也是心事。",
  },
  weiji: {
    label: "危急存亡之秋",
    line: "先帝创业未半而中道崩殂",
    text: "开篇如钟。形势先摆在最前，后面每一句劝谏，才落得住分量。",
  },
  shengting: {
    label: "开张圣听",
    line: "诚宜开张圣听",
    text: "一句宜，一句不宜——要他听，又不能说他不肯听。这是臣子最难的分寸。",
  },
  zangpi: {
    label: "陟罚臧否",
    line: "宫中府中，俱为一体",
    text: "一个“一”字是骨：赏罚不因远近而异，丞相把权力交给了规矩。",
  },
  liangshi: {
    label: "志虑忠纯",
    line: "此皆良实，志虑忠纯",
    text: "不空谈用人当贤，而是点名、点人、点事——一份可以照着做的人事安排。",
  },
  xiangchong: {
    label: "行阵和睦",
    line: "将军向宠，性行淑均",
    text: "荐完文臣荐武将，一内一外。“优劣得所”不是人人一样，而是各在其位。",
  },
  qinxian: {
    label: "亲贤远小",
    line: "亲贤臣，远小人",
    text: "两句只换了四个字的位置，兴亡立判——历史被压缩成一副对子。",
  },
  huanling: {
    label: "桓灵之叹",
    line: "未尝不叹息痛恨于桓、灵也",
    text: "叹息的是桓灵，忧的是当下。他不是在讲历史，是请后主别成为历史。",
  },
  buyi: {
    label: "臣本布衣",
    line: "躬耕于南阳",
    text: "位极人臣之时先说自己是布衣——不是自谦，是不忘本。这一句，让“报先帝”有了根。",
  },
  sangu: {
    label: "三顾草庐",
    line: "猥自枉屈，三顾臣于草庐之中",
    text: "一个“枉”字见尊卑，一个“许”字见终身。三顾不是佳话，是一笔还不完的债。",
  },
  nianyi: {
    label: "二十有一年",
    line: "受任于败军之际，奉命于危难之间",
    text: "二十一年压缩成两句。这不是履历，是底气——我说这些话，是因为这二十一年我都在。",
  },
  dulu: {
    label: "五月渡泸",
    line: "深入不毛",
    text: "前半句是苦，后半句是底。两个“已”字，是把后方交代清楚。",
  },
  zhongyuan: {
    label: "北定中原",
    line: "奖率三军，北定中原",
    text: "六个动宾连排，一句接一句不停顿，像战鼓。这是全表最铿锵的一句。",
  },
  tili: {
    label: "临表涕零",
    line: "今当远离，临表涕零",
    text: "九百年后读来仍动容的，不是文采，是一个受托之人把一切都交代清楚的那份心。",
  },
};

// 章节 id → 使用第几张画面
const CHAPTER_SCENE_INDEX = {
  opening: 0,
  "line-1": 1,
  "line-2": 2,
  "line-3": 3,
  "line-4": 4,
  "line-5": 5,
  "line-6": 6,
  "line-7": 7,
  "line-8": 8,
  "line-9": 9,
  "line-10": 10,
  "line-11": 11,
  "line-12": 12,
  reading: 13,
};

// 每个章节的镜头：zoom 放大量、offsetX / offsetY 画面重心偏移
const cameraKeyframes = [
  { zoom: 1, offsetX: 0, offsetY: 0 },
  { zoom: 1.04, offsetX: -0.014, offsetY: 0 },
  { zoom: 1.03, offsetX: 0.012, offsetY: 0 },
  { zoom: 1.045, offsetX: -0.013, offsetY: 0 },
  { zoom: 1.03, offsetX: 0.014, offsetY: 0 },
  { zoom: 1.04, offsetX: -0.012, offsetY: 0 },
  { zoom: 1.025, offsetX: 0.011, offsetY: 0 },
  { zoom: 1.045, offsetX: -0.015, offsetY: 0 },
  { zoom: 1.03, offsetX: 0.013, offsetY: 0 },
  { zoom: 1.04, offsetX: -0.014, offsetY: 0 },
  { zoom: 1.025, offsetX: 0.012, offsetY: 0 },
  { zoom: 1.05, offsetX: -0.013, offsetY: 0 },
  { zoom: 1.04, offsetX: 0.014, offsetY: 0 },
  { zoom: 1, offsetX: 0, offsetY: 0 },
];

/* ---------- 2. 页面模板 ---------- */
document.querySelector("#app").innerHTML = `
  <div class="experience ${isReviewMode ? "review-mode" : ""}">
    <div class="scene-wrap" aria-hidden="true"></div>
    <div class="grain" aria-hidden="true"></div>
    <header class="site-header">
      <a class="seal" href="#opening" aria-label="回到开篇">出师</a>
      <div class="header-meta"><span>诸葛亮</span><span>沉浸式古文导读</span></div>
      <nav class="poem-switch" aria-label="诗词页面导航">
        <a href="1.html">秋思</a>
        <a href="chibi.html">赤壁</a>
        <a href="chushibiao.html" aria-current="page">出师</a>
        <a href="qinyuanchun.html">沁园春</a>
        <a href="shengshengman.html">声声慢</a>
        <a href="wine.html">将进酒</a>
      </nav>
      ${AUDIO_SRC ? `<button class="poetry-audio csb-audio" id="csb-audio" type="button" aria-live="polite">朗读</button>` : ""}
      <button class="soundless-control" id="wind-sound" type="button">夜风</button>
      <button class="soundless-control" id="focus-scene" type="button">聚焦场景</button>
    </header>

    <aside class="scene-note" id="scene-note" aria-live="polite">
      <span class="scene-note-kicker">序 · 出师之前</span>
      <strong>一殿烛火</strong>
      <p>写的是国事，也是心事。</p>
    </aside>

    <nav class="chapter-nav" aria-label="章节导航">
      <a href="#opening"><span>序</span></a>
      <a href="#line-1"><span>一</span></a>
      <a href="#line-2"><span>二</span></a>
      <a href="#line-3"><span>三</span></a>
      <a href="#line-4"><span>四</span></a>
      <a href="#line-5"><span>五</span></a>
      <a href="#line-6"><span>六</span></a>
      <a href="#line-7"><span>七</span></a>
      <a href="#line-8"><span>八</span></a>
      <a href="#line-9"><span>九</span></a>
      <a href="#line-10"><span>十</span></a>
      <a href="#line-11" class="two-chars"><span>十一</span></a>
      <a href="#line-12" class="two-chars"><span>十二</span></a>
      <a href="#reading"><span>解</span></a>
    </nav>

    <main class="story">
      <section class="chapter hero" id="opening" data-key="opening">
        <div class="copy hero-copy">
          <p class="kicker">蜀汉建兴五年 · 北驻汉中 · 出师之前</p>
          <h1>出师<em>表</em></h1>
          <p class="author">诸葛亮〔三国 · 蜀〕</p>
          <blockquote>
            <span>先帝创业未半而中道崩殂，</span>
            <span>今天下三分，益州疲弊，</span>
            <span>此诚危急存亡之秋也。</span>
            <span>亲贤臣，远小人，此先汉所以兴隆也；</span>
            <span>亲小人，远贤臣，此后汉所以倾颓也。</span>
            <span>臣本布衣，躬耕于南阳。</span>
            <span>受任于败军之际，奉命于危难之间，</span>
            <span>尔来二十有一年矣。</span>
            <span>北定中原，庶竭驽钝，攘除奸凶。</span>
            <span>今当远离，临表涕零，不知所言。</span>
          </blockquote>
          <button class="enter" id="enter" type="button">点亮烛火，走进这篇表文 <i>↓</i></button>
        </div>
        <div class="scroll-mark"><span></span>向下滚动 · 一表读完二十一年</div>
      </section>

      <section class="chapter align-right" id="line-1" data-key="weiji">
        <article class="copy card">
          <p class="chapter-number">01 · 危急存亡之秋</p>
          <h2>此诚危急存亡之秋也</h2>
          <p class="quote-line">先帝创业未半而中道崩殂，今天下三分，益州疲弊。</p>
          <p class="translation">先帝开创大业不到一半就中途去世。如今天下三分，益州疲惫困乏，这真是危急存亡的时刻。</p>
          <p class="commentary">开篇如钟。先说“未半”，再说“崩殂”，最后落到“危急存亡之秋”——形势摆在最前，后面的每一句劝谏，才落得住分量。</p>
          <div class="contrast"><span>创业未半 · 中道崩殂</span><i>↔</i><span>天下三分 · 益州疲弊</span></div>
        </article>
      </section>

      <section class="chapter" id="line-2" data-key="shengting">
        <article class="copy card">
          <p class="chapter-number">02 · 开张圣听</p>
          <h2>诚宜开张圣听</h2>
          <p class="quote-line">诚宜开张圣听，以光先帝遗德，恢弘志士之气。</p>
          <p class="translation">实在应当广泛听取臣下的意见，光大先帝留下的美德，振奋志士的勇气。</p>
          <p class="commentary">先立一句“宜”，再破一句“不宜”——要他听，又不能说他不肯听。这不是教训，是把话说得让人听得进去。</p>
          <div class="pair-grid">
            <div><b>宜</b><span>开张圣听 · 纳谏如流</span></div>
            <div><b>不宜</b><span>妄自菲薄 · 塞忠谏之路</span></div>
          </div>
        </article>
      </section>

      <section class="chapter align-right" id="line-3" data-key="zangpi">
        <article class="copy card">
          <p class="chapter-number">03 · 陟罚臧否</p>
          <h2>陟罚臧否，不宜异同</h2>
          <p class="quote-line">宫中府中，俱为一体；陟罚臧否，不宜异同。</p>
          <p class="translation">皇宫与丞相府本是一体，奖惩褒贬，不该有两套标准。</p>
          <p class="commentary">一个“一”字是全句的骨。宫中是你的人，府中是我的人，可要赏要罚时一视同仁——丞相把自己的权力，交还给了规矩。</p>
          <div class="triple">
            <div><b>陟</b><span>升赏 · 有功者</span></div>
            <div><b>罚</b><span>惩处 · 有罪者</span></div>
            <div><b>臧否</b><span>褒贬 · 一视同仁</span></div>
          </div>
        </article>
      </section>

      <section class="chapter" id="line-4" data-key="liangshi">
        <article class="copy card">
          <p class="chapter-number">04 · 志虑忠纯</p>
          <h2>此皆良实，志虑忠纯</h2>
          <p class="quote-line">侍中、侍郎郭攸之、费祎、董允等，此皆良实，志虑忠纯。</p>
          <p class="translation">郭攸之、费祎、董允等人，都是善良诚实、志向心思忠诚纯正的人。</p>
          <p class="commentary">不空谈“用人当贤”，而是点名、点人、点事——一份可以照着执行的人事安排。“先帝简拔以遗陛下”，是给他们背书，也是给后主定心。</p>
          <div class="triple">
            <div><b>郭攸之</b><span>侍中 · 宫中之事</span></div>
            <div><b>费祎</b><span>侍郎 · 悉以咨之</span></div>
            <div><b>董允</b><span>侍郎 · 裨补阙漏</span></div>
          </div>
        </article>
      </section>

      <section class="chapter align-right" id="line-5" data-key="xiangchong">
        <article class="copy card">
          <p class="chapter-number">05 · 行阵和睦</p>
          <h2>性行淑均，晓畅军事</h2>
          <p class="quote-line">将军向宠，性行淑均，晓畅军事……必能使行阵和睦，优劣得所。</p>
          <p class="translation">向宠将军品性善良公正，通晓军事……定能使军队和睦，能力高下各得其所。</p>
          <p class="commentary">荐完文臣再荐武将，一内一外，把朝堂与营帐都安顿好。“优劣得所”四字最难得——不是人人一样，而是各在其位。</p>
          <div class="rhythm"><span>性行淑均</span><span>晓畅军事</span><span>行阵和睦</span><span>优劣得所</span></div>
        </article>
      </section>

      <section class="chapter" id="line-6" data-key="qinxian">
        <article class="copy card">
          <p class="chapter-number">06 · 亲贤远小</p>
          <h2>亲贤臣，远小人</h2>
          <p class="quote-line">亲贤臣，远小人，此先汉所以兴隆也；亲小人，远贤臣，此后汉所以倾颓也。</p>
          <p class="translation">亲近贤臣、疏远小人，这是西汉兴盛的原因；亲近小人、疏远贤臣，这是东汉倾覆的原因。</p>
          <p class="commentary">全表最有名的一句。上下两句只换了四个字的位置，兴亡立判——历史被压缩成一副对子，让人无处可辩。</p>
          <div class="contrast"><span>先汉 · 亲贤远小 · 兴隆</span><i>↔</i><span>后汉 · 亲小远贤 · 倾颓</span></div>
        </article>
      </section>

      <section class="chapter align-right" id="line-7" data-key="huanling">
        <article class="copy card">
          <p class="chapter-number">07 · 桓灵之叹</p>
          <h2>叹息痛恨于桓、灵</h2>
          <p class="quote-line">先帝在时，每与臣论此事，未尝不叹息痛恨于桓、灵也。</p>
          <p class="translation">先帝在世时，每次与我谈论这些事，没有一次不对桓帝、灵帝的作为叹息痛恨。</p>
          <p class="commentary">搬出先帝，是把话说得更重而不显得冒犯。叹息的是桓灵，忧的是当下——他不是在讲历史，是在请后主别成为历史。</p>
          <q class="final-line-card-q">以史为鉴，鉴的从来不是古人，是眼前人。</q>
        </article>
      </section>

      <section class="chapter" id="line-8" data-key="buyi">
        <article class="copy card">
          <p class="chapter-number">08 · 臣本布衣</p>
          <h2>躬耕于南阳</h2>
          <p class="quote-line">臣本布衣，躬耕于南阳，苟全性命于乱世，不求闻达于诸侯。</p>
          <p class="translation">我本是一介平民，在南阳亲自耕种，只想在乱世中保全性命，不希求在诸侯中显达。</p>
          <p class="commentary">全表最柔软的一句。位极人臣之时，先说自己是布衣——不是自谦，是不忘本。正是这一句，让后面的“报先帝”有了根。</p>
          <div class="pair-grid">
            <div><b>苟全性命</b><span>于乱世 · 只求安身</span></div>
            <div><b>不求闻达</b><span>于诸侯 · 无心功名</span></div>
          </div>
        </article>
      </section>

      <section class="chapter align-right" id="line-9" data-key="sangu">
        <article class="copy card">
          <p class="chapter-number">09 · 三顾草庐</p>
          <h2>三顾臣于草庐之中</h2>
          <p class="quote-line">先帝不以臣卑鄙，猥自枉屈，三顾臣于草庐之中，咨臣以当世之事。</p>
          <p class="translation">先帝不嫌我出身低微，委屈自己，三次到草庐来看望我，向我询问当世的大事。</p>
          <p class="commentary">一个“枉”字见尊卑，一个“许”字见终身。三顾不是知遇的佳话，是一笔还不完的债——此后二十一年，他都在还。</p>
          <div class="triple">
            <div><b>三顾</b><span>猥自枉屈</span></div>
            <div><b>一问</b><span>当世之事</span></div>
            <div><b>一诺</b><span>遂许驱驰</span></div>
          </div>
        </article>
      </section>

      <section class="chapter" id="line-10" data-key="nianyi">
        <article class="copy card">
          <p class="chapter-number">10 · 二十有一年</p>
          <h2>尔来二十有一年矣</h2>
          <p class="quote-line">受任于败军之际，奉命于危难之间，尔来二十有一年矣。</p>
          <p class="translation">在军队溃败时接受任命，在危难之中奉行使命，到今天已经二十一年了。</p>
          <p class="commentary">二十一年，压缩成两句。这不是履历，是底气——我说的这些话，是因为这二十一年，我都在。</p>
          <div class="timeline">
            <div><b>207 · 隆中一对</b><span>草庐之中，定三分之策</span></div>
            <div><b>208 · 出使江东</b><span>危难之际，联吴抗曹</span></div>
            <div><b>223 · 白帝受托</b><span>临崩之际，寄臣以大事</span></div>
            <div><b>225 · 五月渡泸</b><span>深入不毛，南方已定</span></div>
            <div><b>227 · 上表北伐</b><span>今当远离，临表涕零</span></div>
          </div>
        </article>
      </section>

      <section class="chapter align-right" id="line-11" data-key="dulu">
        <article class="copy card">
          <p class="chapter-number">11 · 五月渡泸</p>
          <h2>深入不毛</h2>
          <p class="quote-line">故五月渡泸，深入不毛。今南方已定，兵甲已足。</p>
          <p class="translation">所以五月渡过泸水，深入荒芜之地。如今南方已经平定，兵器铠甲已经充足。</p>
          <p class="commentary">前半句是苦，后半句是底。两个“已”字，是把后方交代清楚——我走之后，家里是稳的。</p>
          <div class="contrast"><span>五月渡泸 · 深入不毛</span><i>↔</i><span>南方已定 · 兵甲已足</span></div>
        </article>
      </section>

      <section class="chapter" id="line-12" data-key="zhongyuan">
        <article class="copy card">
          <p class="chapter-number">12 · 北定中原</p>
          <h2>兴复汉室，还于旧都</h2>
          <p class="quote-line">当奖率三军，北定中原，庶竭驽钝，攘除奸凶，兴复汉室，还于旧都。</p>
          <p class="translation">应当激励三军，北上平定中原，尽我平庸的才能，铲除奸凶，复兴汉室，回到旧都。</p>
          <p class="commentary">六个动宾连排，一句接一句不停顿，像战鼓。“驽钝”是自谦，“兴复”是誓言——这是全表最铿锵的一句。</p>
          <div class="rhythm"><span>奖率三军</span><span>北定中原</span><span>庶竭驽钝</span><span>兴复汉室</span></div>
        </article>
      </section>

      <section class="chapter reading" id="reading" data-key="tili">
        <article class="reading-panel">
          <div class="reading-heading">
            <p class="kicker">读懂这篇表文</p>
            <h2>今当远离，<br>临表涕零，不知所言</h2>
          </div>
          <div class="reading-content">
            <div class="fact"><span>文体</span><p><b>“表”</b>是臣子向君主陈情的文书。出师之前上表，既是辞行，也是托付。</p></div>
            <div class="fact"><span>结构</span><p>先陈形势，次荐贤才，继述身世，末明责任——层层推进，环环相扣。</p></div>
            <div class="fact"><span>手法</span><p>一“宜”一“不宜”相对，一兴一衰对照，以先帝为线贯穿全篇，恳切而不失分寸。</p></div>
            <div class="fact"><span>核心</span><p>这不是一篇请战书，是一个受托之人的交代——把国事、人事、心事，一并交代清楚。</p></div>
          </div>
          <div class="emotion-arc" aria-label="情绪递进：危急存亡、开张圣听、举贤任能、亲贤远小、追念先帝、布衣躬耕、三顾知遇、廿年受托、南征既定、北定中原、临表涕零">
            <span style="--w:10%">危急存亡</span><span style="--w:9%">开张圣听</span><span style="--w:9%">举贤任能</span><span style="--w:9%">亲贤远小</span><span style="--w:9%">追念先帝</span><span style="--w:9%">布衣躬耕</span><span style="--w:9%">三顾知遇</span><span style="--w:9%">廿年受托</span><span style="--w:9%">南征既定</span><span style="--w:9%">北定中原</span><span style="--w:9%">临表涕零</span>
          </div>
          <footer>
            <p>背景：蜀汉建兴五年（227 年），诸葛亮率军北驻汉中，出师临行前上此表</p>
            <button id="replay" type="button">再读一遍这篇表文 ↑</button>
          </footer>
        </article>
      </section>
    </main>
    <div class="loading"><span>正在点亮一殿烛火</span></div>
  </div>`;

/* ---------- 3. Three.js 场景 ---------- */
const stage = document.querySelector(".scene-wrap");

const scene = new Scene();

// 初始视锥是 1:1，真实比例在 resizeToViewport() 里按窗口尺寸重算
const camera = new OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
camera.position.z = 2;

const renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(devicePixelRatio, PIXEL_RATIO));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = SRGBColorSpace;
stage.append(renderer.domElement);

const imageUrls = [
  `${baseUrl}generated/chushibiao/hero.avif`,
  `${baseUrl}generated/chushibiao/line-1.avif`,
  `${baseUrl}generated/chushibiao/line-2.avif`,
  `${baseUrl}generated/chushibiao/line-3.avif`,
  `${baseUrl}generated/chushibiao/line-4.avif`,
  `${baseUrl}generated/chushibiao/line-5.avif`,
  `${baseUrl}generated/chushibiao/line-6.avif`,
  `${baseUrl}generated/chushibiao/line-7.avif`,
  `${baseUrl}generated/chushibiao/line-8.avif`,
  `${baseUrl}generated/chushibiao/line-9.avif`,
  `${baseUrl}generated/chushibiao/line-10.avif`,
  `${baseUrl}generated/chushibiao/line-11.avif`,
  `${baseUrl}generated/chushibiao/line-12.avif`,
  `${baseUrl}generated/chushibiao/line-13.avif`,
];

const textureLoader = new TextureLoader();
const textures = new Array(imageUrls.length).fill(null);
let preloadIndex = 1; // 下一张待预加载的画面（第 0 张由首屏立即加载）

// 优先在浏览器空闲时干活，老浏览器退化为延时调用
const scheduleIdle =
  typeof requestIdleCallback === "function"
    ? (fn) => requestIdleCallback(fn, { timeout: 1000 })
    : (fn) => setTimeout(fn, 200);

/** 建一张纹理并登记；加载完成或失败都回调，失败的画面交给 CSS 背景兜底 */
function createTexture(index, onReady) {
  let texture;
  const settle = () => {
    texture.userData.ready = true;
    onReady?.(texture);
  };
  texture = textureLoader.load(imageUrls[index], settle, undefined, settle);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = Math.min(MAX_ANISOTROPY, renderer.capabilities.getMaxAnisotropy());
  textures[index] = texture;
  return texture;
}

/** 一张加载完再排下一张：不跟首屏抢带宽，也不会一次把十几张纹理全塞进显存 */
function preloadNextTexture() {
  while (preloadIndex < imageUrls.length && textures[preloadIndex]) preloadIndex++; // 跳过已提前加载的
  if (preloadIndex >= imageUrls.length) return;
  const index = preloadIndex++;
  createTexture(index, () => scheduleIdle(preloadNextTexture));
}

// 首屏只等第一张：它一就绪就让“正在点亮一殿烛火”的遮罩退场，其余画面后台补齐
createTexture(0, () => {
  document.querySelector(".loading")?.classList.add("done");
  scheduleIdle(preloadNextTexture);
});
setTimeout(() => document.querySelector(".loading")?.classList.add("done"), 8000); // 兜底放行

const geometry = new PlaneGeometry(IMAGE_ASPECT, 1);

// 两层重叠平面：back 显示当前画面，front 叠在上方淡入新画面，
// 淡入结束后把新贴图交给 back，front 透明度归零，等待下一次切换
const backMaterial = new MeshBasicMaterial({ map: textures[0], toneMapped: false });
const frontMaterial = new MeshBasicMaterial({ map: textures[0], toneMapped: false, transparent: true, opacity: 0 });
const backMesh = new Mesh(geometry, backMaterial);
const frontMesh = new Mesh(geometry, frontMaterial);
backMesh.name = "generated-chapter-background";
frontMesh.name = "generated-chapter-transition";
frontMesh.position.z = TRANSITION_DEPTH;
scene.add(backMesh, frontMesh);

let viewportScale = 1; // 让画面完整铺满窗口所需的缩放
let scrollProgress = 0; // 真实滚动进度 0~1
let smoothProgress = 0; // 平滑后的滚动进度，用于镜头插值
let pointerRatioX = 0; // 指针相对窗口中心的横向量，-0.5 ~ 0.5
let pointerRatioY = 0; // 指针相对窗口中心的纵向量，-0.5 ~ 0.5
let isFocusMode = false; // "聚焦场景"开关：隐藏文字，只看画面
let activeNoteKey = null; // 当前提示条显示的意象，用于去重
let displayedIndex = 0; // back 正在显示的图
let incomingIndex = 0; // 正准备切过去的图
let crossfade = 1; // 淡入进度 0→1，1 表示切换完成
let idleFrame = 0; // 画面静止时用来隔帧跳过渲染
let lastPointerX = 0; // 上一帧的指针横向比例，用来判断画面是否还需要继续动
let lastPointerY = 0;

/** 按窗口尺寸重算相机视锥，并让平面完整覆盖视口 */
function resizeToViewport() {
  const viewportAspect = innerWidth / innerHeight;
  camera.left = -viewportAspect / 2;
  camera.right = viewportAspect / 2;
  camera.top = 0.5;
  camera.bottom = -0.5;
  camera.updateProjectionMatrix();

  // 与《将进酒》同一套策略：窄屏才整张缩小完整显示；
  // 其余情况铺满高度，左右多出来的部分裁掉（窗口比图片更宽时才反过来裁上下）
  viewportScale =
    innerWidth <= NARROW_BREAKPOINT
      ? Math.min(1, viewportAspect / IMAGE_ASPECT)
      : (viewportAspect <= IMAGE_ASPECT ? 1 : viewportAspect / IMAGE_ASPECT) * SAFE_OVERSCAN;
  backMesh.userData.fitScale = viewportScale;
  backMesh.scale.setScalar(viewportScale);
  frontMesh.scale.setScalar(viewportScale);
}

/** 请求切换到第 index 张画面（真正的变化在渲染循环里逐步完成） */
function requestSceneImage(index) {
  const next = MathUtils.clamp(index, 0, imageUrls.length - 1);
  if (next === incomingIndex) return;

  // 目标画面还没开始加载：先补上，就绪后由回调重新发起切换
  if (!textures[next]) {
    createTexture(next, () => requestSceneImage(next));
    return;
  }
  // 还在加载途中：保持当前画面，避免切到未就绪的纹理闪黑
  if (!textures[next].userData.ready) return;

  incomingIndex = next;
  frontMaterial.map = textures[next];
  frontMaterial.needsUpdate = true;
  frontMaterial.opacity = 0;
  crossfade = 0;
  // 供 CSS 做背景兜底：必须用绝对 URL，否则会按样式表（assets/）位置解析
  stage.style.setProperty("--scene-image", `url('${new URL(imageUrls[next], location.href).href}')`);
}

/** 滚动进度：整页可滚动距离中的当前位置，0~1 */
function updateScrollProgress() {
  const scrollable = document.documentElement.scrollHeight - innerHeight;
  scrollProgress = scrollable > 0 ? scrollY / scrollable : 0;
}

/** 把某个意象的解说写进右下角提示条，并让它淡入 */
function updateSceneNote(key) {
  const note = imageryNotes[key];
  if (!note) return;

  activeNoteKey = key;
  const panel = document.querySelector("#scene-note");
  panel.innerHTML = `
      <span class="scene-note-kicker">${note.line}</span>
      <strong>${note.label}</strong>
      <p>${note.text}</p>`;
  panel.classList.add("open");
}

/** 找出离判定线最近的章节，标记为 active，并同步导航高亮、画面与提示条 */
function syncActiveChapter() {
  const chapters = [...document.querySelectorAll(".chapter")];

  let active = chapters[0];
  let shortest = Infinity;
  for (const chapter of chapters) {
    const distance = Math.abs(chapter.getBoundingClientRect().top - innerHeight * ACTIVE_CHAPTER_LINE);
    if (distance < shortest) { shortest = distance; active = chapter; }
  }

  for (const chapter of chapters) chapter.classList.toggle("active", chapter === active);

  const activeHash = `#${active.id}`;
  for (const link of document.querySelectorAll(".chapter-nav a")) {
    link.classList.toggle("active", link.getAttribute("href") === activeHash);
  }

  requestSceneImage(CHAPTER_SCENE_INDEX[active.id] ?? 0);

  const noteKey = active.dataset.key;
  if (noteKey && noteKey !== activeNoteKey) updateSceneNote(noteKey);
}

/* ---------- 4a. 前景余烬层（烛火光点） ---------- */
const emberLayer = document.createElement("canvas");
emberLayer.className = "ember-layer";
document.querySelector(".experience").append(emberLayer);
const emberContext = emberLayer.getContext("2d");

/** 一点余烬：x / y 归一化位置，size 半径（像素），rise 上升速度，sway 摇曳幅度，hue 色相 */
function makeEmber() {
  return {
    x: Math.random(),
    y: Math.random(),
    size: 0.9 + Math.random() * 2.1,
    rise: 0.035 + Math.random() * 0.075,
    sway: 0.25 + Math.random() * 0.85,
    phase: Math.random() * Math.PI * 2,
    hue: 24 + Math.random() * 22, // 24~46：暖橙到金黄，像烛火
  };
}

const embers = [];
for (let i = 0; i < EMBER_MAX; i++) embers.push(makeEmber());

/** 余烬明暗随叙事起伏：序章初燃 → 表文中段最盛 → 临表渐熄 */
function emberIntensityAt(progress) {
  const eased = Math.min(progress * 1.16, 1);
  return 0.3 + 0.7 * Math.sin(Math.PI * Math.min(eased, 1));
}

function resizeEmberLayer() {
  const dpr = Math.min(devicePixelRatio || 1, 1.5);
  emberLayer.width = innerWidth * dpr;
  emberLayer.height = innerHeight * dpr;
  emberContext.setTransform(dpr, 0, 0, dpr, 0, 0);
}

/** 画一帧余烬。intensity 0~1 控制可见光点数量与亮度 */
function drawEmbers(delta, intensity) {
  if (prefersReducedMotion) intensity = 0.4; // 降低动效偏好时只留稀疏静态光点

  const w = innerWidth;
  const h = innerHeight;
  emberContext.clearRect(0, 0, w, h);

  const visible = Math.round(EMBER_MAX * intensity);

  for (let i = 0; i < visible; i++) {
    const ember = embers[i];
    ember.phase += delta * (0.5 + ember.rise * 6);
    ember.y -= ember.rise * delta; // 余烬向上飘
    ember.x += Math.sin(ember.phase) * ember.sway * delta * 0.06;
    if (ember.y < -0.05) { ember.y = 1.05; ember.x = Math.random(); }

    const x = ember.x * w + Math.sin(ember.phase) * ember.sway * 6;
    const y = ember.y * h;
    const r = ember.size;
    // 越往上越淡，像烛火燃尽
    const fade = MathUtils.clamp(1 - ember.y * 0.75, 0.1, 1);
    const alpha = 0.55 * intensity * fade;

    // 外圈微光
    emberContext.globalAlpha = alpha * 0.35;
    emberContext.fillStyle = `hsl(${ember.hue} 92% 58%)`;
    emberContext.beginPath();
    emberContext.arc(x, y, r * 2.6, 0, Math.PI * 2);
    emberContext.fill();

    // 内核亮点
    emberContext.globalAlpha = alpha;
    emberContext.fillStyle = `hsl(${ember.hue + 8} 96% 72%)`;
    emberContext.beginPath();
    emberContext.arc(x, y, r, 0, Math.PI * 2);
    emberContext.fill();
  }
  emberContext.globalAlpha = 1;
}

/* ---------- 4b. 氛围夜风（Web Audio 合成） ---------- */
const windButton = document.querySelector("#wind-sound");
let windAudio = null; // AudioContext
let windGainNode = null;
let windOn = false;

function toggleWindSound() {
  windOn = !windOn;

  if (windOn && !windAudio) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return; // 老浏览器不支持，直接忽略

    windAudio = new AudioContext();

    // 穿堂夜风：白噪声 → 低通 + 带通叠加 → 缓慢 LFO 起伏
    const bufferLength = windAudio.sampleRate * 2;
    const buffer = windAudio.createBuffer(1, bufferLength, windAudio.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferLength; i++) data[i] = Math.random() * 2 - 1;

    const noise = windAudio.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;

    const lowpass = windAudio.createBiquadFilter();
    lowpass.type = "lowpass";
    lowpass.frequency.value = 420; // 压成低沉的穿堂声
    lowpass.Q.value = 0.7;

    const bandpass = windAudio.createBiquadFilter();
    bandpass.type = "bandpass";
    bandpass.frequency.value = 260;
    bandpass.Q.value = 0.5;

    windGainNode = windAudio.createGain();
    windGainNode.gain.value = 0;

    const lfo = windAudio.createOscillator();
    lfo.frequency.value = 0.09;
    const lfoAmount = windAudio.createGain();
    lfoAmount.gain.value = 0.045;
    lfo.connect(lfoAmount);
    lfoAmount.connect(windGainNode.gain);

    noise.connect(lowpass);
    lowpass.connect(bandpass);
    bandpass.connect(windGainNode);
    windGainNode.connect(windAudio.destination);

    noise.start();
    lfo.start();
  }

  if (windAudio) {
    windAudio.resume();
    const target = windOn ? 0.13 : 0;
    windGainNode.gain.linearRampToValueAtTime(target, windAudio.currentTime + 1.4);
  }

  windButton.classList.toggle("active", windOn);
  windButton.textContent = windOn ? "夜风 · 止" : "夜风";
  windButton.setAttribute("aria-pressed", String(windOn));
}

windButton.addEventListener("click", toggleWindSound);

/* ---------- 4c. 交互事件 ---------- */
addEventListener("scroll", () => {
  updateScrollProgress();
  syncActiveChapter();
}, { passive: true });

addEventListener("pointermove", (event) => {
  pointerRatioX = event.clientX / innerWidth - 0.5;
  pointerRatioY = event.clientY / innerHeight - 0.5;
}, { passive: true });

addEventListener("resize", () => {
  renderer.setSize(innerWidth, innerHeight);
  resizeToViewport();
  resizeEmberLayer();
});

document.querySelector("#enter").addEventListener("click", () => {
  document.querySelector("#line-1").scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth" });
});

document.querySelector("#replay").addEventListener("click", () => {
  scrollTo({ top: 0, behavior: prefersReducedMotion ? "auto" : "smooth" });
});

// "聚焦场景"：给根节点加 class，由 CSS 压暗文字层，只留画面与余烬
document.querySelector("#focus-scene").addEventListener("click", (event) => {
  isFocusMode = !isFocusMode;
  event.currentTarget.classList.toggle("active", isFocusMode);
  document.querySelector(".experience").classList.toggle("focus-scene", isFocusMode);
});

// 朗读控件：填了 AUDIO_SRC 才会初始化（留空时按钮也不会渲染）
if (AUDIO_SRC) {
  createPoetryAudio({
    button: "#csb-audio",
    src: AUDIO_SRC,
    title: AUDIO_TITLE,
  });
}

/* ---------- 5. 渲染循环 ---------- */
const clock = new Clock();

function renderFrame() {
  requestAnimationFrame(renderFrame);
  const delta = Math.min(clock.getDelta(), MAX_FRAME_DELTA);

  // 没有滚动、没有指针移动、也没有切换过渡时降到 30fps，省 GPU 和电量
  const isBusy =
    Math.abs(smoothProgress - scrollProgress) > 0.0005 ||
    crossfade < CROSSFADE_DONE ||
    Math.abs(pointerRatioX - lastPointerX) > 0.0001 ||
    Math.abs(pointerRatioY - lastPointerY) > 0.0001;
  lastPointerX = pointerRatioX;
  lastPointerY = pointerRatioY;
  if (!isBusy && ++idleFrame % 2) return;

  smoothProgress = MathUtils.damp(smoothProgress, scrollProgress, PROGRESS_SMOOTHING, delta);

  // 把平滑进度映射到关键帧区间，取相邻两帧做插值
  const keyframePosition = smoothProgress * (cameraKeyframes.length - 1);
  const fromIndex = Math.min(cameraKeyframes.length - 2, Math.floor(keyframePosition));
  const blend = MathUtils.smoothstep(keyframePosition - fromIndex, 0, 1);
  const from = cameraKeyframes[fromIndex];
  const to = cameraKeyframes[fromIndex + 1];

  const zoom = MathUtils.lerp(from.zoom, to.zoom, blend);
  const fitScale = Number(backMesh.userData.fitScale ?? 1);
  const pointerOffsetX = prefersReducedMotion ? 0 : pointerRatioX * POINTER_STRENGTH_X;
  const pointerOffsetY = prefersReducedMotion ? 0 : pointerRatioY * POINTER_STRENGTH_Y;

  const scale = fitScale * zoom;

  // 画面比视口多出来的那部分，才是可以用来位移的余量，超出就会露出背景
  const slackX = Math.max(0, (IMAGE_ASPECT * scale - (camera.right - camera.left)) / 2);
  const slackY = Math.max(0, (scale - (camera.top - camera.bottom)) / 2);
  const positionX = MathUtils.clamp(
    MathUtils.lerp(from.offsetX, to.offsetX, blend) + pointerOffsetX,
    -slackX,
    slackX
  );
  const positionY = MathUtils.clamp(
    MathUtils.lerp(from.offsetY, to.offsetY, blend) - pointerOffsetY, // 取反，画面与鼠标同向移动
    -slackY,
    slackY
  );

  backMesh.scale.setScalar(scale);
  frontMesh.scale.setScalar(scale);
  backMesh.position.set(positionX, positionY, 0);
  frontMesh.position.set(positionX, positionY, TRANSITION_DEPTH);

  if (displayedIndex !== incomingIndex) {
    crossfade = MathUtils.damp(crossfade, 1, CROSSFADE_SPEED, delta);
    frontMaterial.opacity = crossfade;

    if (crossfade > CROSSFADE_DONE) {
      displayedIndex = incomingIndex; // 新画面交给 back
      backMaterial.map = textures[displayedIndex];
      backMaterial.needsUpdate = true;
      frontMaterial.opacity = 0; // front 复位，等待下一次切换
      crossfade = 1;
    }
  }

  drawEmbers(delta, emberIntensityAt(smoothProgress));
  renderer.render(scene, camera);
}

updateScrollProgress();
syncActiveChapter();
resizeToViewport();
resizeEmberLayer();
requestAnimationFrame(renderFrame);
