/**
 * 沁园春·长沙 —— 沉浸式电影导读
 *
 * 毛泽东《沁园春·长沙》九幕结构：
 *   序（独立寒秋）→ 万山红遍 → 百舸争流 → 竞自由 → 谁主沉浮
 *   → 峥嵘岁月 → 同学少年 → 指点江山 → 浪遏飞舟（解读收束）
 *
 * 相比《声声慢》的雨幕，本篇换了一副"秋日湘江"的视听语言：
 *   1. 前景红叶层：Canvas 飘落枫叶，密度随叙事起伏（序章疏落 → 竞自由最盛 → 收尾渐歇）
 *   2. 氛围江风：Web Audio 合成的风声（带通噪声 + LFO 阵风）+ 低频涛声，可单独开关
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

const LEAF_MAX = 46; // 红叶粒子池上限
const LEAF_ALPHA = 0.85; // 红叶不透明度

// MathUtils.damp 的 lambda：数值越大越"跟手"。降低动效偏好时用大值，等于几乎瞬间到位
const PROGRESS_SMOOTHING = prefersReducedMotion ? 20 : 4.5; // 滚动进度跟随速度
const CROSSFADE_SPEED = prefersReducedMotion ? 24 : 3.6; // 画面淡入淡出速度

/* ---------- 1. 意象词典：章节 data-key → 提示条内容 ---------- */
const imageryNotes = {
  opening: {
    label: "独立寒秋",
    line: "序 · 橘子洲头",
    text: "1925 年深秋，作者重游长沙橘子洲。寒秋独立，不是孤寂，是辽阔——一个人与一条江、一片天地相对，气魄自始便大。",
  },
  hongbian: {
    label: "万山红遍",
    line: "看万山红遍，层林尽染",
    text: "一个“看”字领起，江山万里尽收眼底。红与碧、山与江、静与动，色彩铺陈如画幅在眼前徐徐展开。",
  },
  baige: {
    label: "百舸争流",
    line: "漫江碧透，百舸争流",
    text: "江水碧透见底，船只争相竞发。静中有动，画面一下活了起来——这正是青春眼中生机勃勃的世界。",
  },
  jingziyou: {
    label: "万类霜天竞自由",
    line: "鹰击长空，鱼翔浅底",
    text: "鹰击长空用“击”，鱼翔浅底用“翔”，一字千钧。霜天之下，万物各得其所，各竞其自由——这是全词的精神所在。",
  },
  sheifuchen: {
    label: "谁主沉浮",
    line: "怅寥廓，问苍茫大地",
    text: "面对苍茫天地，忽然一问：这大地的兴衰荣辱，究竟由谁主宰？从写景到问天，词意陡然转深。",
  },
  suiyue: {
    label: "峥嵘岁月",
    line: "携来百侣曾游",
    text: "从眼前景转入旧日游。“携来百侣”四个字——他不是一个人在回忆，而是一群人的青春，一段燃烧的岁月。",
  },
  tongxue: {
    label: "同学少年",
    line: "恰同学少年，风华正茂",
    text: "“恰”字重读，像是时光忽然倒流。风华正茂、书生意气、挥斥方遒——最动人的青春宣言：以笔为剑，以梦为马。",
  },
  zhidian: {
    label: "指点江山",
    line: "指点江山，激扬文字",
    text: "指点江山、激扬文字、粪土当年万户侯——少年的狂，是看轻权贵的狂，是胸怀天下的狂。",
  },
  reading: {
    label: "浪遏飞舟",
    line: "到中流击水，浪遏飞舟",
    text: "全词收在激流飞舟上：当年那一群人，曾在中流击水，让浪花都为之让路。一问作结，余响不绝。",
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
  { zoom: 1.045, offsetX: -0.015, offsetY: 0 },
  { zoom: 1.03, offsetX: 0.013, offsetY: 0 },
  { zoom: 1.05, offsetX: -0.013, offsetY: 0 },
  { zoom: 1.035, offsetX: 0.015, offsetY: 0 },
  { zoom: 1.03, offsetX: -0.012, offsetY: 0 },
  { zoom: 1.04, offsetX: 0.012, offsetY: 0 },
  { zoom: 1.05, offsetX: -0.014, offsetY: 0 },
  { zoom: 1, offsetX: 0, offsetY: 0 },
];

/* ---------- 2. 页面模板 ---------- */
document.querySelector("#app").innerHTML = `
  <div class="experience ${isReviewMode ? "review-mode" : ""}">
    <div class="scene-wrap" aria-hidden="true"></div>
    <div class="grain" aria-hidden="true"></div>
    <header class="site-header">
      <a class="seal" href="#opening" aria-label="回到开篇">沁园</a>
      <div class="header-meta"><span>毛泽东</span><span>沉浸式诗词导读</span></div>
      <nav class="poem-switch" aria-label="诗词页面导航">
        <a href="1.html">秋思</a>
        <a href="chibi.html">赤壁</a>
        <a href="chushibiao.html">出师</a>
        <a href="qinyuanchun.html" aria-current="page">沁园春</a>
        <a href="shengshengman.html">声声慢</a>
        <a href="wine.html">将进酒</a>
      </nav>
      <button class="poetry-audio qyc-audio" id="qyc-audio" type="button" aria-live="polite">朗读</button>
      <button class="soundless-control" id="wind-sound" type="button">江风</button>
      <button class="soundless-control" id="focus-scene" type="button">聚焦场景</button>
    </header>

    <aside class="scene-note" id="scene-note" aria-live="polite">
      <span class="scene-note-kicker">序 · 橘子洲头</span>
      <strong>独立寒秋</strong>
      <p>一个人与一条江、一片天地相对。</p>
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
          <p class="kicker">1925 年深秋 · 长沙 · 湘江北去</p>
          <h1>沁园春·<em>长沙</em></h1>
          <p class="author">毛泽东〔一九二五年〕</p>
          <blockquote>
            <span>独立寒秋，湘江北去，橘子洲头。</span>
            <span>看万山红遍，层林尽染；</span>
            <span>漫江碧透，百舸争流。</span>
            <span>鹰击长空，鱼翔浅底，</span>
            <span>万类霜天竞自由。</span>
            <span>怅寥廓，问苍茫大地，</span>
            <span>谁主沉浮？</span>
            <span>携来百侣曾游。</span>
            <span>忆往昔峥嵘岁月稠。</span>
            <span>恰同学少年，风华正茂；</span>
            <span>书生意气，挥斥方遒。</span>
            <span>指点江山，激扬文字，</span>
            <span>粪土当年万户侯。</span>
            <span>曾记否，到中流击水，</span>
            <span>浪遏飞舟？</span>
          </blockquote>
          <button class="enter" id="enter" type="button">站在橘子洲头，看湘江北去 <i>↓</i></button>
        </div>
        <div class="scroll-mark"><span></span>向下滚动 · 一江秋色正在展开</div>
      </section>

      <section class="chapter align-right" id="line-1" data-key="hongbian">
        <article class="copy card">
          <p class="chapter-number">01 · 看万山红遍</p>
          <h2>看万山红遍，层林尽染；<br>漫江碧透，百舸争流</h2>
          <p class="pinyin">kàn wàn shān hóng biàn · céng lín jìn rǎn · màn jiāng bì tòu · bǎi gě zhēng liú</p>
          <p class="translation">看层层山岭红遍，经霜的树林像染过一样；满江碧水清澈见底，无数船只争相竞发。</p>
          <p class="commentary">一个“看”字领起，领出此后七句江山画卷。红与碧两色铺陈，是深秋最浓烈的对撞——山是燃烧的，江是沉静的；静观万物，而万物皆动。</p>
          <div class="contrast"><span>万山红遍 · 层林尽染</span><i>↔</i><span>漫江碧透 · 百舸争流</span></div>
        </article>
      </section>

      <section class="chapter" id="line-2" data-key="baige">
        <article class="copy card">
          <p class="chapter-number">02 · 百舸争流</p>
          <h2>漫江碧透，<br>百舸争流</h2>
          <p class="pinyin">màn jiāng bì tòu · bǎi gě zhēng liú</p>
          <p class="translation">满江碧水清澈见底，无数船只争相竞发。</p>
          <p class="commentary">“碧透”是静到极致的透明，“争流”是动到极致的奔涌。一静一动之间，湘江的生命力扑面而来——秋不是萧瑟的，秋是竞发的。</p>
          <div class="rhythm"><span>漫江</span><span class="wide">碧透</span><span>百舸</span><span class="wide">争流</span></div>
        </article>
      </section>

      <section class="chapter align-right" id="line-3" data-key="jingziyou">
        <article class="copy card">
          <p class="chapter-number">03 · 万类霜天竞自由</p>
          <h2>鹰击长空，鱼翔浅底，<br>万类霜天竞自由</h2>
          <p class="pinyin">yīng jī cháng kōng · yú xiáng qiǎn dǐ · wàn lèi shuāng tiān jìng zì yóu</p>
          <p class="translation">雄鹰在长空搏击，鱼儿在浅底游翔，万物都在秋霜天地中竞相展现自由。</p>
          <p class="commentary">天上地下，一“击”一“翔”，两个动词写尽生命的力量。鹰要搏击，鱼要遨游，草木霜天各竞自由——对自由的礼赞，是这首词最动人的底色。</p>
          <div class="triple">
            <div><b>鹰击长空</b><span>向上 · 搏击</span></div>
            <div><b>鱼翔浅底</b><span>向下 · 游翔</span></div>
            <div><b>竞自由</b><span>万物 · 各得其所</span></div>
          </div>
        </article>
      </section>

      <section class="chapter" id="line-4" data-key="sheifuchen">
        <article class="copy card">
          <p class="chapter-number">04 · 谁主沉浮</p>
          <h2>怅寥廓，问苍茫大地，<br>谁主沉浮？</h2>
          <p class="pinyin">chàng liáo kuò · wèn cāng máng dà dì · shuí zhǔ chén fú</p>
          <p class="translation">面对苍茫辽阔的天地，不禁发问：这世间的兴衰沉浮，由谁来主宰？</p>
          <p class="commentary">视线从万物收回到天地，从天地逼问到自己。一“怅”一“问”，是全词第一次转折——景是别人的景，问是自己的问。答案未说，答案在心里。</p>
          <div class="ask-stair">
            <span>怅寥廓</span>
            <span>问苍茫大地</span>
            <span>谁主沉浮？</span>
          </div>
        </article>
      </section>

      <section class="chapter align-right" id="line-5" data-key="suiyue">
        <article class="copy card">
          <p class="chapter-number">05 · 峥嵘岁月</p>
          <h2>携来百侣曾游，<br>忆往昔峥嵘岁月稠</h2>
          <p class="pinyin">xié lái bǎi lǚ céng yóu · yì wǎng xī zhēng róng suì yuè chóu</p>
          <p class="translation">曾与众多友人结伴来此同游，回想往昔，那是不平凡的岁月，浓密而厚重。</p>
          <p class="commentary">下阕由眼前景转入旧日游。一个人站在橘子洲头，眼前却站着一群当年的自己。“峥嵘”是山的高峻，也是岁月的不平凡——稠，密得像化不开的秋色。</p>
          <div class="timeline">
            <div><b>1913—1918 · 求学长沙</b><span>岳麓山下，湘江之滨，读书、论政、结社</span></div>
            <div><b>1918—1923 · 投身变革</b><span>北上南下，与志同道合者共谋天下事</span></div>
            <div><b>1925 · 重游橘子洲</b><span>旧地重来，昔日少年已成问天之人</span></div>
          </div>
        </article>
      </section>

      <section class="chapter" id="line-6" data-key="tongxue">
        <article class="copy card">
          <p class="chapter-number">06 · 同学少年</p>
          <h2>恰同学少年，风华正茂；<br>书生意气，挥斥方遒</h2>
          <p class="pinyin">qià tóng xué shào nián · fēng huá zhèng mào · shū shēng yì qì · huī chì fāng qiú</p>
          <p class="translation">正当同学少年，风采才华正盛；书生意气风发，挥斥之间强劲有力。</p>
          <p class="commentary">“恰”字如惊堂木一拍，时光倒流回少年。“风华正茂”是外表，“书生意气”是骨子，“挥斥方遒”是手脚——四句连读，一个意气飞扬的少年形象立在眼前。</p>
          <div class="youth-grid">
            <div><b>恰 · 同学少年</b><span>对的人</span></div>
            <div><b>正 · 风华正茂</b><span>对的年纪</span></div>
            <div><b>书生意气</b><span>风骨</span></div>
            <div><b>挥斥方遒</b><span>行动力</span></div>
          </div>
        </article>
      </section>

      <section class="chapter align-right" id="line-7" data-key="zhidian">
        <article class="copy card">
          <p class="chapter-number">07 · 指点江山</p>
          <h2>指点江山，激扬文字，<br>粪土当年万户侯</h2>
          <p class="pinyin">zhǐ diǎn jiāng shān · jī yáng wén zì · fèn tǔ dāng nián wàn hù hóu</p>
          <p class="translation">评点国家大事，以文章激浊扬清，把当时的权贵视如粪土。</p>
          <p class="commentary">三句一个比一个狂，狂得坦荡。“指点江山”用目光，“激扬文字”用笔锋，“粪土万户侯”用心气——天下在我胸中，权贵在我脚下。这是少年最好的样子。</p>
          <q class="final-line-card-q">以手点江山，以笔激文字，以心轻权贵——少年意气，莫过于此。</q>
        </article>
      </section>

      <section class="chapter reading" id="reading" data-key="reading">
        <article class="reading-panel">
          <div class="reading-heading">
            <p class="kicker">读懂这首豪放词</p>
            <h2>曾记否，到中流击水，<br>浪遏飞舟？</h2>
          </div>
          <div class="reading-content">
            <div class="fact"><span>词牌</span><p><b>“沁园春”</b>双调一百十四字，上阕写景下阕忆旧；本篇被视为毛泽东词的代表作之一。</p></div>
            <div class="fact"><span>结构</span><p>上阕一“看”字领七句写景，下阕一“忆”字转青春往事；以“问”起，以“问”收，首尾呼应。</p></div>
            <div class="fact"><span>手法</span><p>动静相衬、色彩对照、动词千钧（击、翔、竞）、以设问作结——秋景壮，词情更壮。</p></div>
            <div class="fact"><span>核心</span><p>秋景非悲秋，而是少年眼中壮阔的天地。问苍茫大地，谁主沉浮——答案不在天上，在胸中。</p></div>
          </div>
          <div class="emotion-arc" aria-label="情绪递进：独立寒秋、万山红遍、百舸争流、竞自由、问天、忆旧、青春意气、中流击水">
            <span style="--w:12%">独立寒秋</span><span style="--w:13%">万山红遍</span><span style="--w:12%">百舸争流</span><span style="--w:13%">竞自由</span><span style="--w:12%">问天</span><span style="--w:13%">忆旧</span><span style="--w:13%">青春意气</span><span style="--w:12%">中流击水</span>
          </div>
          <footer>
            <p>背景：1925 年深秋 · 长沙 · 橘子洲头，离湘赴粤前重游故地</p>
            <button id="replay" type="button">再看一遍湘江秋色 ↑</button>
          </footer>
        </article>
      </section>
    </main>
    <div class="loading"><span>一江秋色正在展开</span></div>
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
  `${baseUrl}generated/qinyuanchun/hero.avif`,
  `${baseUrl}generated/qinyuanchun/line-1.avif`,
  `${baseUrl}generated/qinyuanchun/line-2.avif`,
  `${baseUrl}generated/qinyuanchun/line-3.avif`,
  `${baseUrl}generated/qinyuanchun/line-4.avif`,
  `${baseUrl}generated/qinyuanchun/line-5.avif`,
  `${baseUrl}generated/qinyuanchun/line-6.avif`,
  `${baseUrl}generated/qinyuanchun/line-7.avif`,
  `${baseUrl}generated/qinyuanchun/line-8.avif`,
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

// 首屏只等第一张：它一就绪就让"一江秋色正在展开"的遮罩退场，其余画面后台补齐
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

/* ---------- 4a. 前景红叶层 ---------- */
const leafLayer = document.createElement("canvas");
leafLayer.className = "leaf-layer";
document.querySelector(".experience").append(leafLayer);
const leafContext = leafLayer.getContext("2d");

/** 一片红叶：x / y 归一化位置，size 尺寸（像素），spd 下落速度，sway 摆动幅度，hue 色相 */
function makeLeaf() {
  return {
    x: Math.random(),
    y: Math.random(),
    size: 5 + Math.random() * 8,
    spd: 0.12 + Math.random() * 0.22,
    sway: 0.6 + Math.random() * 1.1,
    phase: Math.random() * Math.PI * 2,
    rot: Math.random() * Math.PI * 2,
    rotSpd: (Math.random() - 0.5) * 1.6,
    hue: 16 + Math.random() * 26, // 16~42：橙红到金褐
  };
}

const leaves = [];
for (let i = 0; i < LEAF_MAX; i++) leaves.push(makeLeaf());

/** 红叶密度随叙事进度起伏：序章疏落 → 竞自由最盛 → 收尾渐歇 */
function leafIntensityAt(progress) {
  const eased = Math.min(progress * 1.22, 1);
  return 0.25 + 0.75 * Math.sin(Math.PI * Math.min(eased, 1));
}

function resizeLeafLayer() {
  const dpr = Math.min(devicePixelRatio || 1, 1.5);
  leafLayer.width = innerWidth * dpr;
  leafLayer.height = innerHeight * dpr;
  leafContext.setTransform(dpr, 0, 0, dpr, 0, 0);
}

/** 画一帧红叶。intensity 0~1 控制可见叶片数 */
function drawLeaves(delta, intensity) {
  if (prefersReducedMotion) intensity = 0.45; // 降低动效偏好时只留稀疏静态叶

  const w = innerWidth;
  const h = innerHeight;
  leafContext.clearRect(0, 0, w, h);

  const visible = Math.round(LEAF_MAX * intensity);
  const wind = 0.09; // 斜向飘动

  for (let i = 0; i < visible; i++) {
    const leaf = leaves[i];
    leaf.phase += delta * (0.8 + leaf.spd * 4);
    leaf.y += leaf.spd * delta;
    leaf.x += wind * delta + Math.sin(leaf.phase) * leaf.sway * delta * 0.09;
    leaf.rot += leaf.rotSpd * delta;
    if (leaf.y > 1.1) { leaf.y = -0.08; leaf.x = Math.random(); }
    if (leaf.x > 1.08) leaf.x = -0.08;

    const x = leaf.x * w;
    const y = leaf.y * h;
    const s = leaf.size;

    leafContext.save();
    leafContext.translate(x, y);
    leafContext.rotate(leaf.rot);
    leafContext.globalAlpha = LEAF_ALPHA * (0.45 + 0.55 * intensity);
    // 简化的枫叶形：三片交叠的椭圆
    leafContext.fillStyle = `hsl(${leaf.hue} 82% 46%)`;
    leafContext.beginPath();
    leafContext.ellipse(0, -s * 0.22, s * 0.5, s * 0.28, 0, 0, Math.PI * 2);
    leafContext.ellipse(s * 0.22, s * 0.22, s * 0.5, s * 0.28, 0, 0, Math.PI * 2);
    leafContext.ellipse(-s * 0.22, s * 0.22, s * 0.5, s * 0.28, 0, 0, Math.PI * 2);
    leafContext.fill();
    // 叶脉
    leafContext.strokeStyle = `hsl(${leaf.hue} 60% 32%)`;
    leafContext.lineWidth = 1;
    leafContext.beginPath();
    leafContext.moveTo(0, -s * 0.42);
    leafContext.lineTo(0, s * 0.42);
    leafContext.stroke();
    leafContext.restore();
  }
}

/* ---------- 4b. 氛围江风（Web Audio 合成） ---------- */
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

    // —— 风声：白噪声 → 带通滤波 → 缓慢 LFO 阵风起伏 ——
    const windLength = windAudio.sampleRate * 2;
    const windBuffer = windAudio.createBuffer(1, windLength, windAudio.sampleRate);
    const windData = windBuffer.getChannelData(0);
    for (let i = 0; i < windLength; i++) windData[i] = Math.random() * 2 - 1;

    const windNoise = windAudio.createBufferSource();
    windNoise.buffer = windBuffer;
    windNoise.loop = true;

    const bandpass = windAudio.createBiquadFilter();
    bandpass.type = "bandpass";
    bandpass.frequency.value = 520;
    bandpass.Q.value = 0.55;

    windGainNode = windAudio.createGain();
    windGainNode.gain.value = 0;

    const gust = windAudio.createOscillator();
    gust.frequency.value = 0.07;
    const gustAmount = windAudio.createGain();
    gustAmount.gain.value = 0.05;
    gust.connect(gustAmount);
    gustAmount.connect(windGainNode.gain);

    windNoise.connect(bandpass);
    bandpass.connect(windGainNode);

    // —— 涛声：另一路噪声 → 低通 → 大幅低频起伏，像江浪推涌 ——
    const waveBuffer = windAudio.createBuffer(1, windLength, windAudio.sampleRate);
    const waveData = waveBuffer.getChannelData(0);
    for (let i = 0; i < windLength; i++) waveData[i] = Math.random() * 2 - 1;

    const waveNoise = windAudio.createBufferSource();
    waveNoise.buffer = waveBuffer;
    waveNoise.loop = true;

    const lowpass = windAudio.createBiquadFilter();
    lowpass.type = "lowpass";
    lowpass.frequency.value = 110;

    const waveGain = windAudio.createGain();
    waveGain.gain.value = 0;

    const waveLfo = windAudio.createOscillator();
    waveLfo.frequency.value = 0.13;
    const waveLfoAmount = windAudio.createGain();
    waveLfoAmount.gain.value = 0.05;
    const waveBase = windAudio.createGain();
    waveBase.gain.value = 0.06;
    waveLfo.connect(waveLfoAmount);
    waveLfoAmount.connect(waveGain.gain);
    waveBase.connect(waveGain.gain);

    waveNoise.connect(lowpass);
    lowpass.connect(waveGain);
    waveGain.connect(windAudio.destination);

    windGainNode.connect(windAudio.destination);

    windNoise.start();
    gust.start();
    waveNoise.start();
    waveLfo.start();
  }

  if (windAudio) {
    windAudio.resume();
    const target = windOn ? 0.12 : 0;
    windGainNode.gain.linearRampToValueAtTime(target, windAudio.currentTime + 1.4);
  }

  windButton.classList.toggle("active", windOn);
  windButton.textContent = windOn ? "江风 · 止" : "江风";
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
  resizeLeafLayer();
});

document.querySelector("#enter").addEventListener("click", () => {
  document.querySelector("#line-1").scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth" });
});

document.querySelector("#replay").addEventListener("click", () => {
  scrollTo({ top: 0, behavior: prefersReducedMotion ? "auto" : "smooth" });
});

// "聚焦场景"：给根节点加 class，由 CSS 压暗文字层，只留画面与红叶
document.querySelector("#focus-scene").addEventListener("click", (event) => {
  isFocusMode = !isFocusMode;
  event.currentTarget.classList.toggle("active", isFocusMode);
  document.querySelector(".experience").classList.toggle("focus-scene", isFocusMode);
});

createPoetryAudio({
  button: "#qyc-audio",
  src: "audio/qinyuanchun.mp3",
  title: "沁园春·长沙",
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

  drawLeaves(delta, leafIntensityAt(smoothProgress));
  renderer.render(scene, camera);
}

updateScrollProgress();
syncActiveChapter();
resizeToViewport();
resizeLeafLayer();
requestAnimationFrame(renderFrame);
