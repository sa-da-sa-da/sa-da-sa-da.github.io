/**
 * 声声慢 —— 沉浸式电影导读
 *
 * 李清照《声声慢》九幕结构：
 *   序（雨幕庭院）→ 叠字 → 乍暖还寒 → 淡酒西风 → 雁过旧识
 *   → 满地黄花 → 守着窗儿 → 梧桐细雨 → 这次第（解读收束）
 *
 * 相比《天净沙·秋思》新增两层"电影感"：
 *   1. 前景雨丝层：Canvas 斜雨，雨量随叙事进度起伏（开篇疏雨 → 黄昏最密 → 余韵渐缓）
 *   2. 氛围雨声：Web Audio 合成的滤波噪声 + LFO 呼吸感，可单独开关
 *
 * 关于 three 的导入名：与 autumn.js 相同，来自打包后的 chunk 短符号。
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

const prefersReducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const isReviewMode = new URLSearchParams(location.search).has("review"); // ?review：截图用的纯净模式
const baseUrl = "./"; // 资源与页面同级，站点整体搬家也不会失效

/* ---------- 可调参数 ---------- */
const IMAGE_ASPECT = 1672 / 941; // 生成图统一尺寸，决定平面的宽高比
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

const RAIN_MAX = 240; // 雨丝池上限（够密又不至于糊成一片）
const RAIN_ALPHA = 0.3; // 雨丝透明度

// MathUtils.damp 的 lambda：数值越大越"跟手"。降低动效偏好时用大值，等于几乎瞬间到位
const PROGRESS_SMOOTHING = prefersReducedMotion ? 20 : 4.5; // 滚动进度跟随速度
const CROSSFADE_SPEED = prefersReducedMotion ? 24 : 3.6; // 画面淡入淡出速度

/* ---------- 1. 意象词典：章节 data-key → 提示条内容 ---------- */
const imageryNotes = {
  opening: {
    label: "雨幕庭院",
    line: "序 · 一场秋雨",
    text: "靖康之变后，李清照南渡，国破、家散、夫亡。词从一场秋雨开始——雨不是背景，而是这场愁的配乐。",
  },
  diedie: {
    label: "十四个叠字",
    line: "寻寻觅觅，冷冷清清，凄凄惨惨戚戚",
    text: "词史上开篇最著名的七组叠字：寻、觅是动作而无结果；冷、清是环境而渗进骨里；凄、惨、戚是心境，一句深过一句。",
  },
  jiangxi: {
    label: "乍暖还寒",
    line: "乍暖还寒时候，最难将息",
    text: "暖与寒反复拉锯，身体和心绪都在这样的天气里失了平衡。“将息”两个字里，藏着多少个夜不能寐的辗转。",
  },
  danjiu: {
    label: "淡酒 · 晚风",
    line: "三杯两盏淡酒，怎敌他、晚来风急",
    text: "不是酒淡，是愁太浓——浓到酒已无味。晚来风急，人近黄昏，两样寒凉一起压下来。",
  },
  yan: {
    label: "旧时相识",
    line: "雁过也，正伤心，却是旧时相识",
    text: "南飞的雁与南渡的人，同一方向。雁曾为她与赵明诚传过家书，如今雁还在，写信的人不在了。",
  },
  huanghua: {
    label: "满地黄花",
    line: "满地黄花堆积，憔悴损，如今有谁堪摘",
    text: "赏菊本是重阳旧事。“憔悴损”说的是花，也是镜中之人——花与人都已不是可以采摘的年纪。",
  },
  chuang: {
    label: "守着窗儿",
    line: "守着窗儿，独自怎生得黑",
    text: "一天之中最慢的是黄昏前的这一刻。等的不是天黑——天黑之后，还有更长的夜。",
  },
  wutong: {
    label: "梧桐细雨",
    line: "梧桐更兼细雨，到黄昏、点点滴滴",
    text: "雨打在梧桐叶上，每一滴都落在心上。闭上眼睛雨声还在——声音的愁比画面的愁更难躲。",
  },
  reading: {
    label: "怎一个愁字了得",
    line: "这次第，怎一个愁字了得",
    text: "不是“愁”字不够重，而是这一整个秋天的重量，一个字根本装不下。",
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
  reading: 8,
};

// 每个章节的镜头：zoom 放大量、offsetX / offsetY 画面重心偏移
const cameraKeyframes = [
  { zoom: 1, offsetX: 0, offsetY: 0 },
  { zoom: 1.035, offsetX: -0.014, offsetY: 0 },
  { zoom: 1.025, offsetX: 0.012, offsetY: 0 },
  { zoom: 1.04, offsetX: -0.012, offsetY: 0 },
  { zoom: 1.03, offsetX: 0.014, offsetY: 0 },
  { zoom: 1.05, offsetX: -0.014, offsetY: 0 },
  { zoom: 1.025, offsetX: 0.01, offsetY: 0 },
  { zoom: 1.04, offsetX: -0.016, offsetY: 0 },
  { zoom: 1, offsetX: 0, offsetY: 0 },
];

/* ---------- 2. 页面模板 ---------- */
document.querySelector("#app").innerHTML = `
  <div class="experience ${isReviewMode ? "review-mode" : ""}">
    <div class="scene-wrap" aria-hidden="true"></div>
    <div class="grain" aria-hidden="true"></div>
    <header class="site-header">
      <a class="seal" href="#opening" aria-label="回到开篇">声声</a>
      <div class="header-meta"><span>宋 · 李清照</span><span>沉浸式诗词导读</span></div>
      <nav class="poem-switch" aria-label="诗词页面导航">
        <a href="1.html">秋思</a>
        <a href="chibi.html">赤壁</a>
        <a href="chushibiao.html">出师</a>
        <a href="qinyuanchun.html">沁园春</a>
        <a href="shengshengman.html" aria-current="page">声声慢</a>
        <a href="wine.html">将进酒</a>
      </nav>
      <button class="poetry-audio ssm-audio" id="ssm-audio" type="button" aria-live="polite">朗读</button>
      <button class="soundless-control" id="rain-sound" type="button">雨声</button>
      <button class="soundless-control" id="focus-scene" type="button">聚焦场景</button>
    </header>

    <aside class="scene-note" id="scene-note" aria-live="polite">
      <span class="scene-note-kicker">序 · 一场秋雨</span>
      <strong>雨幕庭院</strong>
      <p>秋雨不是背景，而是这场愁的配乐。</p>
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
      <a href="#reading"><span>解</span></a>
    </nav>

    <main class="story">
      <section class="chapter hero" id="opening" data-key="opening">
        <div class="copy hero-copy">
          <p class="kicker">越过一千年，走进一场南宋的秋雨</p>
          <h1>声声慢</h1>
          <p class="author">李清照〔宋代〕</p>
          <blockquote>
            <span>寻寻觅觅，冷冷清清，</span>
            <span>凄凄惨惨戚戚。</span>
            <span>乍暖还寒时候，最难将息。</span>
            <span>三杯两盏淡酒，</span>
            <span>怎敌他、晚来风急！</span>
            <span>雁过也，正伤心，</span>
            <span>却是旧时相识。</span>
            <span>满地黄花堆积，</span>
            <span>憔悴损，如今有谁堪摘？</span>
            <span>守着窗儿，独自怎生得黑！</span>
            <span>梧桐更兼细雨，</span>
            <span>到黄昏、点点滴滴。</span>
            <span>这次第，</span>
            <span>怎一个愁字了得！</span>
          </blockquote>
          <button class="enter" id="enter" type="button">撑一把伞，走进词中 <i>↓</i></button>
        </div>
        <div class="scroll-mark"><span></span>向下滚动 · 雨将下满八个黄昏</div>
      </section>

      <section class="chapter align-right" id="line-1" data-key="diedie">
        <article class="copy card">
          <p class="chapter-number">01 · 十四个叠字</p>
          <h2>寻寻觅觅，冷冷清清，<br>凄凄惨惨戚戚</h2>
          <p class="pinyin">xún xún mì mì · lěng lěng qīng qīng · qī qī cǎn cǎn qī qī</p>
          <p class="translation">找了又找，寻了又寻；四周冷冷清清，心绪凄惨悲戚。</p>
          <div class="diedie-show">
            <span>寻寻觅觅<b>寻 · 觅 · 动作无果</b></span>
            <span>冷冷清清<b>冷 · 清 · 环境渗骨</b></span>
            <span>凄凄惨惨戚戚<b>凄 · 惨 · 戚 · 心境渐深</b></span>
          </div>
          <p class="commentary">七组叠字，如雨点接连落地。寻、觅是动作，却没有结果；冷、清是环境，却渗进骨里；凄、惨、戚是心境，一句深过一句。十四个字读完，读者已被拖进她的黄昏。</p>
        </article>
      </section>

      <section class="chapter" id="line-2" data-key="jiangxi">
        <article class="copy card">
          <p class="chapter-number">02 · 最难将息</p>
          <h2>乍暖还寒时候，最难将息</h2>
          <p class="pinyin">zhà nuǎn huán hán shí hòu · zuì nán jiāng xī</p>
          <p class="translation">天气忽暖忽寒的时候，最难调养休息。</p>
          <p class="commentary">国破、夫亡、南渡之后的李清照，写的是气候，更是际遇。暖与寒反复拉锯，身体与心绪都在这样的天气里失了平衡——"将息"两个字，藏着多少夜不能寐的辗转。</p>
          <div class="contrast"><span>乍暖 · 乍寒</span><i>↔</i><span>身与心，都不得安歇</span></div>
        </article>
      </section>

      <section class="chapter align-right" id="line-3" data-key="danjiu">
        <article class="copy card">
          <p class="chapter-number">03 · 三杯两盏</p>
          <h2>三杯两盏淡酒，<br>怎敌他、晚来风急</h2>
          <p class="pinyin">sān bēi liǎng zhǎn dàn jiǔ · zěn dí tā wǎn lái fēng jí</p>
          <p class="translation">几杯淡酒下肚，又怎能抵挡傍晚急骤的风？</p>
          <p class="commentary">愁深，酒淡。不是酒淡，是愁太浓——浓到酒已无味。晚来风急，人近黄昏，两样寒凉一起压下来，杯中酒暖不了身子，更暖不了心。</p>
          <div class="rhythm"><span>三杯两盏</span><span>怎敌</span><span class="wide">晚来风急</span></div>
        </article>
      </section>

      <section class="chapter" id="line-4" data-key="yan">
        <article class="copy card">
          <p class="chapter-number">04 · 旧时相识</p>
          <h2>雁过也，正伤心，<br>却是旧时相识</h2>
          <p class="pinyin">yàn guò yě · zhèng shāng xīn · què shì jiù shí xiāng shí</p>
          <p class="translation">大雁飞过，正在伤心之际，却发现它竟是从前相识的那一只。</p>
          <p class="commentary">南飞的雁，与南渡的人，同一方向。鸿雁传书的年代，雁曾为她与丈夫赵明诚传过家书。如今雁还在，写信的人不在了。“旧时相识”四个字，是一封永远寄不出的信。</p>
          <q class="final-line-card-q">雁犹如此，人何以堪——雁有归期，人无归路。</q>
        </article>
      </section>

      <section class="chapter align-right" id="line-5" data-key="huanghua">
        <article class="copy card">
          <p class="chapter-number">05 · 憔悴损</p>
          <h2>满地黄花堆积，<br>憔悴损，如今有谁堪摘</h2>
          <p class="pinyin">mǎn dì huáng huā duī jī · qiáo cuì sǔn · rú jīn yǒu shuí kān zhāi</p>
          <p class="translation">满地菊花堆积，憔悴凋零，如今还有谁忍心去摘？</p>
          <p class="commentary">赏菊本是重阳旧事，当年“东篱把酒黄昏后”的日子还在眼前。如今花无人赏，人无人伴。“憔悴损”说的是花，也是镜中之人——花与人都已不是可以采摘的年纪。</p>
          <div class="contrast"><span>花：堆积 · 憔悴 · 无人摘</span><i>↔</i><span>人：迟暮 · 孤独 · 无人问</span></div>
        </article>
      </section>

      <section class="chapter" id="line-6" data-key="chuang">
        <article class="copy card">
          <p class="chapter-number">06 · 独自怎生得黑</p>
          <h2>守着窗儿，<br>独自怎生得黑</h2>
          <p class="pinyin">shǒu zhe chuāng ér · dú zì zěn shēng dé hēi</p>
          <p class="translation">独自守着窗子，要怎么捱到天黑？</p>
          <p class="commentary">一天之中最慢的，是黄昏前的这一刻。窗外的天一寸一寸地暗下去，她的时间却一寸一寸地慢下来。守着窗儿，等的不是天黑——天黑之后，还有更长的夜。</p>
          <div class="slowbar"><span></span><small>午后 → 黄昏 → 长夜</small></div>
        </article>
      </section>

      <section class="chapter align-right" id="line-7" data-key="wutong">
        <article class="copy card">
          <p class="chapter-number">07 · 点点滴滴</p>
          <h2>梧桐更兼细雨，<br>到黄昏、点点滴滴</h2>
          <p class="pinyin">wú tóng gèng jiān xì yǔ · dào huáng hūn diǎn diǎn dī dī</p>
          <p class="translation">梧桐叶上又添细雨，到黄昏时分，雨声点点滴滴。</p>
          <p class="commentary">"梧桐一叶落，天下尽知秋。"雨打在梧桐叶上，每一滴都落在心上。声音的愁比画面的愁更难躲——因为闭上眼睛，雨声还在。点点滴滴，是雨，是泪，也是时间本身。</p>
          <div class="rhythm"><span>梧桐</span><span>细雨</span><span>黄昏</span><span class="wide">点点滴滴</span></div>
        </article>
      </section>

      <section class="chapter reading" id="reading" data-key="reading">
        <article class="reading-panel">
          <div class="reading-heading">
            <p class="kicker">读懂这首慢词</p>
            <h2>这次第，<br>怎一个愁字了得</h2>
          </div>
          <div class="reading-content">
            <div class="fact"><span>词牌</span><p><b>“声声慢”</b>原名《胜胜慢》，本为双调九十九字；李清照此作被奉为"千古绝唱"。</p></div>
            <div class="fact"><span>结构</span><p>十四个叠字起势，中段五组转折（怎敌、却是、如今、独自、更兼），把愁一层层加厚。</p></div>
            <div class="fact"><span>手法</span><p>叠字、反问、白描、以景写情、声情并茂——"点点滴滴"四字本身就有雨声。</p></div>
            <div class="fact"><span>核心</span><p>不是“愁”字不够重，而是这一整个秋天的重量，一个字根本装不下。</p></div>
          </div>
          <div class="emotion-arc" aria-label="情绪递进：叠字之痛、寒暖反复、借酒无凭、旧识伤情、黄花迟暮、度日如年、雨打梧桐、愁不可说">
            <span style="--w:13%">叠字之痛</span><span style="--w:12%">寒暖反复</span><span style="--w:13%">借酒无凭</span><span style="--w:12%">旧识伤情</span><span style="--w:13%">黄花迟暮</span><span style="--w:12%">度日如年</span><span style="--w:13%">雨打梧桐</span><span style="--w:12%">愁不可说</span>
          </div>
          <footer>
            <p>背景：靖康之变后南渡，国破 · 家散 · 夫亡，词风由明丽转沉郁</p>
            <button id="replay" type="button">再淋一场秋雨 ↑</button>
          </footer>
        </article>
      </section>
    </main>
    <div class="loading"><span>正在落下一场秋雨</span></div>
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
  `${baseUrl}generated/shengshengman/hero.avif`,
  `${baseUrl}generated/shengshengman/line-1.avif`,
  `${baseUrl}generated/shengshengman/line-2.avif`,
  `${baseUrl}generated/shengshengman/line-3.avif`,
  `${baseUrl}generated/shengshengman/line-4.avif`,
  `${baseUrl}generated/shengshengman/line-5.avif`,
  `${baseUrl}generated/shengshengman/line-6.avif`,
  `${baseUrl}generated/shengshengman/line-7.avif`,
  `${baseUrl}generated/shengshengman/line-8.avif`,
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

// 首屏只等第一张：它一就绪就让"正在落下一场秋雨"的遮罩退场，其余画面后台补齐
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

/* ---------- 4a. 前景雨丝层 ---------- */
const rainLayer = document.createElement("canvas");
rainLayer.className = "rain-layer";
document.querySelector(".experience").append(rainLayer);
const rainContext = rainLayer.getContext("2d");

/** 单滴雨：x / y 归一化位置，len 长度（占屏比例），spd 下落速度 */
function makeRainDrop() {
  return {
    x: Math.random(),
    y: Math.random(),
    len: 0.018 + Math.random() * 0.035,
    spd: 0.55 + Math.random() * 0.85,
  };
}

const rainDrops = [];
for (let i = 0; i < RAIN_MAX; i++) rainDrops.push(makeRainDrop());

/** 雨量随叙事进度起伏：开篇疏雨 → 黄昏最密 → 收尾余韵渐缓 */
function rainIntensityAt(progress) {
  const eased = Math.min(progress * 1.22, 1);
  return 0.28 + 0.72 * Math.sin(Math.PI * Math.min(eased, 1));
}

function resizeRain() {
  const dpr = Math.min(devicePixelRatio || 1, 1.5);
  rainLayer.width = innerWidth * dpr;
  rainLayer.height = innerHeight * dpr;
  rainContext.setTransform(dpr, 0, 0, dpr, 0, 0);
}

/** 画一帧雨丝。intensity 0~1 控制可见雨量与透明度 */
function drawRain(delta, intensity) {
  if (prefersReducedMotion) intensity = 0.4; // 降低动效偏好时只留稀疏静态雨

  const w = innerWidth;
  const h = innerHeight;
  rainContext.clearRect(0, 0, w, h);

  const visible = Math.round(RAIN_MAX * intensity);
  rainContext.strokeStyle = `rgba(196, 212, 224, ${RAIN_ALPHA * (0.55 + 0.45 * intensity)})`;
  rainContext.lineWidth = 1;
  rainContext.beginPath();

  const wind = 0.05; // 斜风角度
  for (let i = 0; i < visible; i++) {
    const drop = rainDrops[i];
    drop.y += drop.spd * delta * 0.55;
    drop.x += wind * delta * 0.35;
    if (drop.y > 1.12) { drop.y = -0.14; drop.x = Math.random(); }
    if (drop.x > 1.05) drop.x = -0.05;

    const x = drop.x * w;
    const y = drop.y * h;
    const len = drop.len * h;
    rainContext.moveTo(x, y);
    rainContext.lineTo(x - len * 0.32, y + len);
  }
  rainContext.stroke();
}

/* ---------- 4b. 氛围雨声（Web Audio 合成） ---------- */
const rainButton = document.querySelector("#rain-sound");
let rainAudio = null; // AudioContext
let rainGainNode = null;
let rainOn = false;

function toggleRainSound() {
  rainOn = !rainOn;

  if (rainOn && !rainAudio) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return; // 老浏览器不支持，直接忽略

    rainAudio = new AudioContext();

    // 白噪声源（两秒循环），滤波后即"沙沙"的雨声
    const bufferLength = rainAudio.sampleRate * 2;
    const buffer = rainAudio.createBuffer(1, bufferLength, rainAudio.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferLength; i++) data[i] = Math.random() * 2 - 1;

    const noise = rainAudio.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;

    const lowpass = rainAudio.createBiquadFilter();
    lowpass.type = "lowpass";
    lowpass.frequency.value = 1500; // 压掉高频毛刺，更像连绵细雨
    lowpass.Q.value = 0.4;

    const highpass = rainAudio.createBiquadFilter();
    highpass.type = "highpass";
    highpass.frequency.value = 280; // 去掉极低频的"轰隆"，保持细密

    rainGainNode = rainAudio.createGain();
    rainGainNode.gain.value = 0;

    // LFO 缓慢起伏，让雨声有一呼一吸的呼吸感
    const lfo = rainAudio.createOscillator();
    lfo.frequency.value = 0.11;
    const lfoAmount = rainAudio.createGain();
    lfoAmount.gain.value = 0.035;
    lfo.connect(lfoAmount);
    lfoAmount.connect(rainGainNode.gain);

    noise.connect(lowpass);
    lowpass.connect(highpass);
    highpass.connect(rainGainNode);
    rainGainNode.connect(rainAudio.destination);

    noise.start();
    lfo.start();
  }

  if (rainAudio) {
    rainAudio.resume();
    const target = rainOn ? 0.15 : 0;
    rainGainNode.gain.linearRampToValueAtTime(target, rainAudio.currentTime + 1.4);
  }

  rainButton.classList.toggle("active", rainOn);
  rainButton.textContent = rainOn ? "雨声 · 止" : "雨声";
  rainButton.setAttribute("aria-pressed", String(rainOn));
}

rainButton.addEventListener("click", toggleRainSound);

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
  resizeRain();
});

document.querySelector("#enter").addEventListener("click", () => {
  document.querySelector("#line-1").scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth" });
});

document.querySelector("#replay").addEventListener("click", () => {
  scrollTo({ top: 0, behavior: prefersReducedMotion ? "auto" : "smooth" });
});

// "聚焦场景"：给根节点加 class，由 CSS 压暗文字层，只留画面与雨
document.querySelector("#focus-scene").addEventListener("click", (event) => {
  isFocusMode = !isFocusMode;
  event.currentTarget.classList.toggle("active", isFocusMode);
  document.querySelector(".experience").classList.toggle("focus-scene", isFocusMode);
});

createPoetryAudio({
  button: "#ssm-audio",
  src: "audio/shengshengman.mp3",
  title: "声声慢",
});

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

  drawRain(delta, rainIntensityAt(smoothProgress));
  renderer.render(scene, camera);
}

updateScrollProgress();
syncActiveChapter();
resizeToViewport();
resizeRain();
requestAnimationFrame(renderFrame);
