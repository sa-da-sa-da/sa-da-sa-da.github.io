/**
 * 天净沙·秋思 —— 沉浸式导读
 *
 * 页面结构分五段：
 *   1. 意象词典：每句诗对应的画面解说，滚动到该章节时显示在右上角提示条
 *   2. 页面模板：一次性写入 #app
 *   3. Three.js 场景：正交相机前两张重叠平面，front 淡入完成画面切换
 *   4. 交互：滚动进度 → 在“章节镜头关键帧”之间插值；指针 → 轻微视差
 *   5. 渲染循环：每帧推进平滑值、镜头插值与淡入进度
 *
 * 关于 three 的导入名：
 *   three.module-B-d26hOE.js 是打包后的 chunk，对外只暴露 S / O / W / a 这类短符号，
 *   只能 `短名 as 可读名`。左侧是 chunk 的导出符号，不能改；右侧是本项目使用的名字。
 *   S=Scene  O=OrthographicCamera  W=WebGLRenderer  a=SRGBColorSpace
 *   T=TextureLoader  P=PlaneGeometry
 *   M=MeshBasicMaterial  b=Mesh  C=Clock  c=MathUtils
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

const ACTIVE_CHAPTER_LINE = 0.28; // 章节顶部越过视口 28% 处即判定为“当前章节”
const POINTER_STRENGTH_X = 0.012; // 鼠标左右移动带来的横向位移系数
const POINTER_STRENGTH_Y = 0.008; // 鼠标上下移动带来的纵向位移系数

const MAX_FRAME_DELTA = 0.04; // 单帧最大时间步（切走标签页再回来时不跳变）
const CROSSFADE_DONE = 0.995; // 淡入到这个比例就认为切换完成

// MathUtils.damp 的 lambda：数值越大越“跟手”。降低动效偏好时用大值，等于几乎瞬间到位
const PROGRESS_SMOOTHING = prefersReducedMotion ? 20 : 4.5; // 滚动进度跟随速度
const CROSSFADE_SPEED = prefersReducedMotion ? 24 : 3.6; // 画面淡入淡出速度

/* ---------- 1. 意象词典：章节 data-key → 提示条内容 ---------- */
const imageryNotes = {
  vine: {
    label: "枯藤 · 老树",
    line: "枯藤老树昏鸦",
    text: "三个衰败意象并列，不用动词，像三次缓慢的凝视。枯藤缠绕老树，时间仿佛停住，荒凉感从触觉与轮廓中生长出来。",
  },
  crow: {
    label: "昏鸦",
    line: "枯藤老树昏鸦",
    text: "“昏”既是黄昏，也是归巢时刻。乌鸦有栖处，而旅人仍在路上，这层对照让孤独更深。",
  },
  bridge: {
    label: "小桥",
    line: "小桥流水人家",
    text: "桥连接两岸，也暗示可以抵达的生活。它并不宏大，只是一处寻常、安稳、近人的归宿。",
  },
  river: {
    label: "流水",
    line: "小桥流水人家",
    text: "静止的桥与流动的水相互映衬。流水柔和，却也不断向远方逝去，暗含旅途与时间。",
  },
  house: {
    label: "人家",
    line: "小桥流水人家",
    text: "炊烟般的温度突然进入画面。别人拥有“家”，恰好照见游子无家可归的处境。温暖不是安慰，而是一记反衬。",
  },
  road: {
    label: "古道",
    line: "古道西风瘦马",
    text: "“古”把眼前道路接入漫长历史：无数离人曾走过。道路既通向远方，也把人推离故乡。",
  },
  wind: {
    label: "西风",
    line: "古道西风瘦马",
    text: "秋日西风看不见，只能从落叶、衣摆与枯枝中被感到。它让画面有了寒意，也让旅途显得更艰难。",
  },
  horse: {
    label: "瘦马",
    line: "古道西风瘦马",
    text: "马的疲惫就是人的疲惫。“瘦”不是装饰性的形容，而是把长期漂泊具象化。",
  },
  sunset: {
    label: "夕阳西下",
    line: "夕阳西下",
    text: "日落把旅人的处境推向临界点：天将黑，路未尽，归宿仍远。时间压力在这一刻突然变得清晰。",
  },
  traveler: {
    label: "断肠人 · 天涯",
    line: "断肠人在天涯",
    text: "前四句一直写景，最后才揭示“谁在看”。所有景物瞬间成为旅人的内心投影；“天涯”既是地理远方，也是精神上的无所归依。",
  },
};

// 章节 id → 使用第几张画面（reading 与 line-5 共用同一张）
const CHAPTER_SCENE_INDEX = {
  opening: 0,
  "line-1": 1,
  "line-2": 2,
  "line-3": 3,
  "line-4": 4,
  "line-5": 5,
  reading: 5,
};

// 每个章节的镜头：zoom 放大量、offsetX / offsetY 画面重心偏移
const cameraKeyframes = [
  { zoom: 1, offsetX: 0, offsetY: 0 },
  { zoom: 1.035, offsetX: 0.015, offsetY: 0 },
  { zoom: 1.025, offsetX: -0.01, offsetY: 0 },
  { zoom: 1.04, offsetX: -0.012, offsetY: 0 },
  { zoom: 1.025, offsetX: -0.018, offsetY: 0 },
  { zoom: 1.04, offsetX: -0.012, offsetY: 0 },
  { zoom: 1, offsetX: 0, offsetY: 0 },
];

/* ---------- 2. 页面模板 ---------- */
document.querySelector("#app").innerHTML = `
  <div class="experience ${isReviewMode ? "review-mode" : ""}">
    <div class="scene-wrap" aria-hidden="true"></div>
    <div class="grain" aria-hidden="true"></div>
    <header class="site-header">
      <a class="seal" href="#opening" aria-label="回到开篇">秋思</a>
      <div class="header-meta"><span>元 · 马致远</span><span>沉浸式诗词导读</span></div>
      <nav class="poem-switch" aria-label="诗词页面导航">
        <a href="1.html" aria-current="page">秋思</a>
        <a href="chibi.html">赤壁</a>
        <a href="chushibiao.html">出师</a>
        <a href="qinyuanchun.html">沁园春</a>
        <a href="shengshengman.html">声声慢</a>
        <a href="wine.html">将进酒</a>
      </nav>
      <button class="poetry-audio autumn-audio" id="autumn-audio" type="button" aria-live="polite">朗读</button>
      <button class="soundless-control" id="focus-scene" type="button">聚焦场景</button>
    </header>

    <aside class="scene-note" id="scene-note" aria-live="polite">
      <span class="scene-note-kicker">画面将随诗句切换</span>
      <strong>枯藤 · 老树 · 昏鸦</strong>
      <p>景物不是背景，而是游子内心的形状。</p>
    </aside>

    <nav class="chapter-nav" aria-label="章节导航">
      <a href="#opening"><span>序</span></a>
      <a href="#line-1"><span>一</span></a>
      <a href="#line-2"><span>二</span></a>
      <a href="#line-3"><span>三</span></a>
      <a href="#line-4"><span>四</span></a>
      <a href="#line-5"><span>五</span></a>
      <a href="#reading"><span>解</span></a>
    </nav>

    <main class="story">
      <section class="chapter hero" id="opening" data-key="vine">
        <div class="copy hero-copy">
          <p class="kicker">越过七百年，走进一场黄昏</p>
          <h1>天净沙<em>·</em>秋思</h1>
          <p class="author">马致远〔元代〕</p>
          <blockquote>
            <span>枯藤老树昏鸦，</span>
            <span>小桥流水人家，</span>
            <span>古道西风瘦马。</span>
            <span>夕阳西下，</span>
            <span>断肠人在天涯。</span>
          </blockquote>
          <button class="enter" id="enter" type="button">循着古道，进入诗中 <i>↓</i></button>
        </div>
        <div class="scroll-mark"><span></span>向下滚动 · 镜头将穿过九组意象</div>
      </section>

      <section class="chapter align-right" id="line-1" data-key="crow">
        <article class="copy card">
          <p class="chapter-number">01 · 凝固的荒凉</p>
          <h2>枯藤老树昏鸦</h2>
          <p class="pinyin">kū téng · lǎo shù · hūn yā</p>
          <p class="translation">枯藤缠着老树，黄昏的乌鸦落在枝头。</p>
          <div class="analysis-grid">
            <div><b>枯</b><span>生命衰退</span></div>
            <div><b>老</b><span>时间积压</span></div>
            <div><b>昏</b><span>暮色将合</span></div>
          </div>
          <p class="commentary">六个字、三个名词组，没有主语，也没有动作。视线像在秋风里停顿三次：从藤，到树，再到鸦。声音短促，画面却被拉得很长。</p>
        </article>
      </section>

      <section class="chapter" id="line-2" data-key="house">
        <article class="copy card warm-card">
          <p class="chapter-number">02 · 可望而不可即的温暖</p>
          <h2>小桥流水人家</h2>
          <p class="pinyin">xiǎo qiáo · liú shuǐ · rén jiā</p>
          <p class="translation">小桥横跨流水，岸边住着寻常人家。</p>
          <p class="commentary">色调忽然柔和起来。“小”“流”“人家”都带着亲近感。但这不是旅人的归宿：他只是路过。别人家的灯火越温暖，他的漂泊就越清楚。</p>
          <div class="contrast"><span>近处：有家可归</span><i>↔</i><span>诗外：仍在天涯</span></div>
        </article>
      </section>

      <section class="chapter align-right" id="line-3" data-key="horse">
        <article class="copy card">
          <p class="chapter-number">03 · 身体承受的漂泊</p>
          <h2>古道西风瘦马</h2>
          <p class="pinyin">gǔ dào · xī fēng · shòu mǎ</p>
          <p class="translation">古老的道路上，西风吹过一匹疲惫的瘦马。</p>
          <p class="commentary">古道把空间拉远，西风让温度下降，瘦马把疲倦落到身体上。诗里还没有写“我”，但人的境况已经借马显现。</p>
          <div class="rhythm"><span>古道</span><span>西风</span><span>瘦马</span></div>
        </article>
      </section>

      <section class="chapter" id="line-4" data-key="sunset">
        <article class="copy card sunset-card">
          <p class="chapter-number">04 · 时间的最后一道门</p>
          <h2>夕阳西下</h2>
          <p class="pinyin">xī yáng xī xià</p>
          <p class="translation">太阳正从西边沉下去。</p>
          <p class="commentary">前三句铺陈九种意象，这一句突然缩短。日落让一切获得同一个倒计时：天将黑，而旅程并未结束。巨大的夕阳不是浪漫布景，而是迫近的夜。</p>
          <div class="timebar"><span></span><small>黄昏 → 入夜</small></div>
        </article>
      </section>

      <section class="chapter align-right" id="line-5" data-key="traveler">
        <article class="copy card final-line-card">
          <p class="chapter-number">05 · 景物终于显露它的主人</p>
          <h2>断肠人在天涯</h2>
          <p class="pinyin">duàn cháng rén · zài tiān yá</p>
          <p class="translation">极度伤心的旅人，仍漂泊在遥远的天涯。</p>
          <p class="commentary">直到结尾，“人”才出现。读者这才明白：枯藤、昏鸦、流水、瘦马和夕阳，都是从他的眼睛里看见的。先让我们进入景，再让景刺入心。</p>
          <q>不是秋天使人断肠，<br>是断肠人看见了这样的秋天。</q>
        </article>
      </section>

      <section class="chapter reading" id="reading" data-key="traveler">
        <article class="reading-panel">
          <div class="reading-heading">
            <p class="kicker">读懂这首小令</p>
            <h2>二十八个字，<br>如何抵达“天涯”？</h2>
          </div>
          <div class="reading-content">
            <div class="fact"><span>曲牌</span><p><b>“天净沙”</b>是曲牌名，规定了句式与节奏；<b>“秋思”</b>才是题目。</p></div>
            <div class="fact"><span>结构</span><p>前三句是九个意象的蒙太奇；第四句锁定黄昏；第五句揭出人物与情感。</p></div>
            <div class="fact"><span>手法</span><p>白描、名词并置、动静结合、冷暖对照、以乐景衬哀情、情景交融。</p></div>
            <div class="fact"><span>核心</span><p>“家”与“天涯”的距离，是全篇最深的张力：看得见归宿，却无法抵达。</p></div>
          </div>
          <div class="emotion-arc" aria-label="情绪递进：萧瑟、温暖反衬、疲惫、迫近、断肠">
            <span style="--w:18%">萧瑟</span><span style="--w:22%">温暖反衬</span><span style="--w:20%">疲惫</span><span style="--w:16%">夜色迫近</span><span style="--w:24%">断肠</span>
          </div>
          <footer>
            <p>“秋思之祖”——周德清《中原音韵》</p>
            <button id="replay" type="button">再走一遍古道 ↑</button>
          </footer>
        </article>
      </section>
    </main>
    <div class="loading"><span>正在点亮秋日盒景</span></div>
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
  `${baseUrl}generated/autumn-thoughts/hero.avif`,
  `${baseUrl}generated/autumn-thoughts/line-1.avif`,
  `${baseUrl}generated/autumn-thoughts/line-2.avif`,
  `${baseUrl}generated/autumn-thoughts/line-3.avif`,
  `${baseUrl}generated/autumn-thoughts/line-4.avif`,
  `${baseUrl}generated/autumn-thoughts/line-5.avif`,
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

// 首屏只等第一张：它一就绪就让“正在点亮秋日盒景”的遮罩退场，其余画面后台补齐
createTexture(0, () => {
  document.querySelector(".loading")?.classList.add("done");
  scheduleIdle(preloadNextTexture);
});

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

let viewportScale = 1; // 让画面完整铺满窗口所需的缩放，存在 userData 里供渲染循环取用
let scrollProgress = 0; // 真实滚动进度 0~1
let smoothProgress = 0; // 平滑后的滚动进度，用于镜头插值
let pointerRatioX = 0; // 指针相对窗口中心的横向量，-0.5 ~ 0.5
let pointerRatioY = 0; // 指针相对窗口中心的纵向量，-0.5 ~ 0.5
let isFocusMode = false; // “聚焦场景”开关：隐藏文字，只看画面
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
  stage.style.setProperty("--scene-image", `url('${imageUrls[next]}')`); // 供 CSS 做背景兜底
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

/* ---------- 4. 交互事件 ---------- */
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
});

document.querySelector("#enter").addEventListener("click", () => {
  document.querySelector("#line-1").scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth" });
});

document.querySelector("#replay").addEventListener("click", () => {
  scrollTo({ top: 0, behavior: prefersReducedMotion ? "auto" : "smooth" });
});

// “聚焦场景”：给根节点加 class，由 CSS 压暗文字层，只留画面
document.querySelector("#focus-scene").addEventListener("click", (event) => {
  isFocusMode = !isFocusMode;
  event.currentTarget.classList.toggle("active", isFocusMode);
  document.querySelector(".experience").classList.toggle("focus-scene", isFocusMode);
});

createPoetryAudio({
  button: "#autumn-audio",
  src: "audio/qiusi.mp3",
  title: "天净沙·秋思",
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

  renderer.render(scene, camera);
}

updateScrollProgress();
syncActiveChapter();
resizeToViewport();
requestAnimationFrame(renderFrame);
