/**
 * 念奴娇·赤壁怀古 —— 沉浸式导读
 *
 * 页面结构分四段：
 *   1. 页面模板：一次性写入 #app
 *   2. Three.js 场景：正交相机前两张重叠平面，靠 front 淡入完成章节画面切换
 *   3. 交互：滚动进度驱动缩放，指针位置驱动轻微视差
 *   4. 渲染循环：每帧推进平滑值与淡入进度
 *
 * 关于 three 的导入名：
 *   three.module-B-d26hOE.js 是打包后的 chunk，对外只暴露 S / O / W / a 这类短符号，
 *   所以只能 `短名 as 可读名`。左侧是 chunk 的导出符号，不能改；右侧是本项目使用的名字。
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
const baseUrl = "./"; // 资源与页面同级，站点整体搬家也不会失效

/* ---------- 可调参数 ---------- */
const IMAGE_ASPECT = 1672 / 941; // 生成图统一尺寸，决定平面的宽高比
const SAFE_OVERSCAN = 1.02; // 铺满之外再多留一点画面，视差位移时才不会露出背景
const NARROW_BREAKPOINT = 860; // 与《将进酒》一致：窄到这个宽度就整张缩小显示，不再裁切
const MAX_PIXEL_RATIO = 1.5; // 高分屏上限，超过这个值性能换不来画质
const MAX_ANISOTROPY = 4; // 各向异性过滤上限：再高只是白烧 GPU，肉眼几乎看不出差别
const TRANSITION_DEPTH = 0.002; // front 平面比 back 略靠前，避免两层面片 z-fighting

const ACTIVE_SECTION_LINE = 0.3; // 章节顶部越过视口 30% 处即判定为“当前章节”
const ZOOM_AMPLITUDE = 0.025; // 滚动到中段时画面放大的最大幅度
const PARALLAX_STRENGTH_X = 0.012; // 鼠标左右移动带来的横向位移系数
const PARALLAX_STRENGTH_Y = 0.008; // 鼠标上下移动带来的纵向位移系数

const MAX_FRAME_DELTA = 0.04; // 单帧最大时间步（切走标签页再回来时不跳变）
const CROSSFADE_DONE = 0.995; // 淡入到这个比例就认为切换完成

// MathUtils.damp 的 lambda：数值越大越“跟手”。降低动效偏好时用大值，等于几乎瞬间到位
const PROGRESS_SMOOTHING = prefersReducedMotion ? 20 : 4; // 滚动进度跟随速度
const CROSSFADE_SPEED = prefersReducedMotion ? 24 : 3.2; // 画面淡入淡出速度

/* ---------- 1. 页面模板 ---------- */
document.querySelector("#app").innerHTML = `
  <div class="rb-page">
    <div class="rb-scene" aria-hidden="true"></div>
    <div class="rb-veil" aria-hidden="true"></div>
    <div class="rb-grain" aria-hidden="true"></div>

    <header class="rb-header">
      <a class="rb-mark" href="#prologue">赤壁</a>
      <div class="rb-meta"><b>苏轼〔宋代〕</b><span>豪放词 · 沉浸式导读</span></div>
      <nav class="poem-switch" aria-label="诗词页面导航">
        <a href="1.html">秋思</a>
        <a href="chibi.html" aria-current="page">赤壁</a>
        <a href="chushibiao.html">出师</a>
        <a href="qinyuanchun.html">沁园春</a>
        <a href="shengshengman.html">声声慢</a>
        <a href="wine.html">将进酒</a>
      </nav>
      <button class="poetry-audio rb-audio" id="rb-audio" type="button" aria-live="polite">朗读</button>
    </header>

    <nav class="rb-nav" aria-label="章节导航">
      <a href="#prologue"><i></i><span>序</span></a>
      <a href="#river"><i></i><span>江</span></a>
      <a href="#red-cliff"><i></i><span>壁</span></a>
      <a href="#waves"><i></i><span>涛</span></a>
      <a href="#zhou-yu"><i></i><span>瑜</span></a>
      <a href="#fire"><i></i><span>战</span></a>
      <a href="#moon"><i></i><span>月</span></a>
      <a href="#reading"><i></i><span>解</span></a>
    </nav>

    <main class="rb-story">
      <section class="rb-section rb-hero" id="prologue" data-scene="0">
        <div class="rb-hero-copy">
          <p class="rb-kicker">北宋元丰五年 · 黄州赤壁</p>
          <h1><span>念奴娇</span><em>赤壁怀古</em></h1>
          <p class="rb-author">苏轼</p>
          <div class="rb-opening-line">大江东去，浪淘尽，千古风流人物。</div>
          <p class="rb-intro">一场江涛，让眼前的赤壁、八百年前的周瑜，与四十七岁的苏轼同时出现。</p>
          <button id="rb-enter" type="button">顺流而下 <span>↓</span></button>
        </div>
        <div class="rb-scroll"><i></i><span>滚动穿过现实、历史与自我</span></div>
      </section>

      <section class="rb-section rb-right" id="river" data-scene="1">
        <article class="rb-card">
          <p class="rb-index">01 · 以江开篇</p>
          <h2>大江东去，<br>浪淘尽，<br>千古风流人物。</h2>
          <p class="rb-translation">滚滚长江向东奔流，千百年来杰出的英雄人物，都被时间的巨浪淘洗而去。</p>
          <div class="rb-keywords"><span><b>大江</b>空间浩瀚</span><span><b>东去</b>不可逆转</span><span><b>浪淘尽</b>历史无情</span></div>
          <p class="rb-analysis">“大江”不是风景背景，而是时间本身。一个“淘”字，把真实浪涛变成历史力量：英雄曾经耀眼，也终将被带走。</p>
        </article>
      </section>

      <section class="rb-section" id="red-cliff" data-scene="2">
        <article class="rb-card">
          <p class="rb-index">02 · 从眼前故垒进入三国</p>
          <h2>故垒西边，<br>人道是，<br>三国周郎赤壁。</h2>
          <p class="rb-translation">旧营垒的西边，人们传说那里就是三国时周瑜大破曹军的赤壁。</p>
          <p class="rb-analysis">“人道是”非常克制：苏轼并不考证地理真伪。他需要的是一个入口——从眼前残垒，走入集体记忆中的英雄时代。</p>
          <div class="rb-contrast"><span>现实：残破故垒</span><i>→</i><span>想象：周郎赤壁</span></div>
        </article>
      </section>

      <section class="rb-section rb-right" id="waves" data-scene="3">
        <article class="rb-card rb-storm-card">
          <p class="rb-index">03 · 江山如画</p>
          <h2>乱石崩云，<br>惊涛拍岸，<br>卷起千堆雪。</h2>
          <p class="rb-translation">陡峭乱石仿佛刺破云层，惊涛猛烈撞击江岸，卷起无数雪白浪花。</p>
          <div class="rb-verbs"><span>崩</span><span>拍</span><span>卷</span></div>
          <p class="rb-analysis">三个动词连续爆发。石向上“崩云”，浪向前“拍岸”，水花向上“卷雪”，画面在不同方向同时运动，形成豪放词最有力量的声场。</p>
          <q>江山如画，一时多少豪杰！</q>
        </article>
      </section>

      <section class="rb-section" id="zhou-yu" data-scene="4">
        <article class="rb-card rb-zhou-card">
          <p class="rb-index">04 · 苏轼心中的周瑜</p>
          <h2>遥想公瑾当年，<br>小乔初嫁了，<br>雄姿英发。</h2>
          <p class="rb-translation">遥想周瑜当年，小乔刚刚嫁给他；他英姿雄健，才华焕发。</p>
          <p class="rb-analysis">苏轼先写“初嫁”，再写“雄姿”。爱情、青春、功业同时抵达高峰，周瑜因此不只是武将，而是生命圆满的象征。</p>
          <div class="rb-portrait"><span>羽扇</span><span>纶巾</span><span>从容儒将</span></div>
        </article>
      </section>

      <section class="rb-section rb-right" id="fire" data-scene="5">
        <article class="rb-card rb-fire-card">
          <p class="rb-index">05 · 最轻的语气，最大的战果</p>
          <h2>谈笑间，<br>樯橹灰飞烟灭。</h2>
          <p class="rb-translation">就在谈笑之间，曹军的战船已经化为灰烬烟尘。</p>
          <p class="rb-analysis">苏轼省略了战斗的喧嚣，只留下“谈笑”。战火越猛烈，周瑜越显从容；功业越巨大，完成它的姿态越轻。</p>
          <div class="rb-scale"><span>谈笑</span><i></i><span>八十万军的覆灭</span></div>
        </article>
      </section>

      <section class="rb-section" id="moon" data-scene="6">
        <article class="rb-card rb-moon-card">
          <p class="rb-index">06 · 从周瑜回到苏轼</p>
          <h2>故国神游，<br>多情应笑我，<br>早生华发。</h2>
          <p class="rb-translation">我神游于古战场；或许该笑自己如此多情，过早生出了白发。</p>
          <p class="rb-analysis">周瑜二十四岁名满天下，苏轼四十七岁被贬黄州。英雄想象忽然成为一面镜子，照出自己的失意、衰老与未竟之志。</p>
          <q>人间如梦，一樽还酹江月。</q>
          <p class="rb-ending">最后不是消沉，而是释放：把酒洒向江月，将个人得失交给比生命更辽阔的时间。</p>
        </article>
      </section>

      <section class="rb-section rb-reading" id="reading" data-scene="6">
        <div class="rb-reading-panel">
          <div class="rb-reading-title">
            <p class="rb-kicker">读懂《赤壁怀古》</p>
            <h2>豪放，不只是<br>声音洪亮。</h2>
          </div>
          <div class="rb-facts">
            <article><span>词牌</span><h3>念奴娇</h3><p>词牌规定音律和句式；“赤壁怀古”才是题目。上片写江山，下片写周瑜与自己。</p></article>
            <article><span>空间</span><h3>江 · 壁 · 月</h3><p>从奔流大江到壁立赤壁，最终回到月光下的水面，空间由激烈走向澄明。</p></article>
            <article><span>时间</span><h3>千古 · 当年 · 如梦</h3><p>千年历史、周瑜盛年、苏轼此刻层层叠合，个人生命被放入宏大的时间尺度。</p></article>
            <article><span>对照</span><h3>周瑜 · 苏轼</h3><p>青春与华发、得志与被贬、谈笑建功与故国神游；对照产生羡慕，也完成自我超越。</p></article>
          </div>
          <div class="rb-arc">
            <span>大江：历史</span><i></i><span>赤壁：英雄</span><i></i><span>华发：自我</span><i></i><span>江月：超越</span>
          </div>
          <footer><p>不是忘记人生的苦，而是把它放进大江与明月之中。</p><button id="rb-replay" type="button">再临赤壁 ↑</button></footer>
        </div>
      </section>
    </main>
    <div class="rb-loading"><i></i><span>江声渐起</span></div>
  </div>`;

/* ---------- 2. Three.js 场景 ---------- */
const stage = document.querySelector(".rb-scene");

const scene = new Scene();

// 初始视锥是 1:1，真实比例在 resizeToViewport() 里按窗口尺寸重算
const camera = new OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
camera.position.z = 2;

const renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(devicePixelRatio, MAX_PIXEL_RATIO));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = SRGBColorSpace;
stage.append(renderer.domElement);

// 与章节 data-scene 一一对应：0=序 1=江 2=壁 3=涛 4=瑜 5=战 6=月
const imageUrls = [
  `${baseUrl}generated/chibi/hero.avif`,
  `${baseUrl}generated/chibi/river.avif`,
  `${baseUrl}generated/chibi/fortress.avif`,
  `${baseUrl}generated/chibi/waves.avif`,
  `${baseUrl}generated/chibi/zhou-yu.avif`,
  `${baseUrl}generated/chibi/fire.avif`,
  `${baseUrl}generated/chibi/moon.avif`,
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

// 首屏只等第一张：它一就绪就让“江声渐起”的遮罩退场，其余画面后台补齐
createTexture(0, () => {
  document.querySelector(".rb-loading")?.classList.add("done");
  scheduleIdle(preloadNextTexture);
});
setTimeout(() => document.querySelector(".rb-loading")?.classList.add("done"), 8000); // 兜底放行

const geometry = new PlaneGeometry(IMAGE_ASPECT, 1);

// 两层重叠平面：back 显示当前画面，front 叠在上方淡入新画面，
// 淡入结束后把新贴图交给 back，front 透明度归零，等待下一次切换
const backMaterial = new MeshBasicMaterial({ map: textures[0], toneMapped: false });
const frontMaterial = new MeshBasicMaterial({ map: textures[0], toneMapped: false, transparent: true, opacity: 0 });
const backMesh = new Mesh(geometry, backMaterial);
const frontMesh = new Mesh(geometry, frontMaterial);
frontMesh.position.z = TRANSITION_DEPTH;
scene.add(backMesh, frontMesh);

let viewportScale = 1; // 让画面完整铺满窗口所需的缩放
let displayedIndex = 0; // back 正在显示的图
let incomingIndex = 0; // 正准备切过去的图
let crossfade = 1; // 淡入进度 0→1，1 表示切换完成
let idleFrame = 0; // 画面静止时用来隔帧跳过渲染
let lastPointerX = 0; // 上一帧的指针横向比例，用来判断画面是否还需要继续动
let lastPointerY = 0;
let pointerRatioX = 0; // 指针相对窗口中心的横向量，-0.5 ~ 0.5
let pointerRatioY = 0; // 指针相对窗口中心的纵向量，-0.5 ~ 0.5
let scrollProgress = 0; // 真实滚动进度 0~1
let smoothProgress = 0; // 平滑后的滚动进度，用于缩放

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
  stage.style.setProperty("--rb-image", `url('${imageUrls[next]}')`); // 供 CSS 做背景兜底
}

/** 找出离判定线最近的章节，标记为 active，并同步导航高亮与画面 */
function syncActiveSection() {
  const sections = [...document.querySelectorAll(".rb-section")];

  let active = sections[0];
  let shortest = Infinity;
  for (const section of sections) {
    const distance = Math.abs(section.getBoundingClientRect().top - innerHeight * ACTIVE_SECTION_LINE);
    if (distance < shortest) { shortest = distance; active = section; }
  }

  for (const section of sections) section.classList.toggle("active", section === active);

  const activeHash = `#${active.id}`;
  for (const link of document.querySelectorAll(".rb-nav a")) {
    link.classList.toggle("active", link.hash === activeHash);
  }

  requestSceneImage(Number(active.dataset.scene ?? 0));
}

/** 滚动时更新进度，并重新判定当前章节 */
function handleScroll() {
  const scrollable = document.documentElement.scrollHeight - innerHeight;
  scrollProgress = scrollable ? scrollY / scrollable : 0;
  syncActiveSection();
}

/* ---------- 3. 交互事件 ---------- */
addEventListener("scroll", handleScroll, { passive: true });

addEventListener("pointermove", (event) => {
  pointerRatioX = event.clientX / innerWidth - 0.5;
  pointerRatioY = event.clientY / innerHeight - 0.5;
}, { passive: true });

addEventListener("resize", () => {
  renderer.setSize(innerWidth, innerHeight);
  resizeToViewport();
});

document.querySelector("#rb-enter").addEventListener("click", () => {
  document.querySelector("#river").scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth" });
});

document.querySelector("#rb-replay").addEventListener("click", () => {
  scrollTo({ top: 0, behavior: prefersReducedMotion ? "auto" : "smooth" });
});

createPoetryAudio({
  button: "#rb-audio",
  src: "audio/niannujiao.mp3",
  title: "念奴娇·赤壁怀古",
});

/* ---------- 4. 渲染循环 ---------- */
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

  // 滚动进度平滑跟随，用来做“中段略微推近”的呼吸感
  smoothProgress = MathUtils.damp(smoothProgress, scrollProgress, PROGRESS_SMOOTHING, delta);

  const zoom = 1 + Math.sin(smoothProgress * Math.PI) * ZOOM_AMPLITUDE;
  const offsetX = prefersReducedMotion ? 0 : pointerRatioX * PARALLAX_STRENGTH_X;
  const offsetY = prefersReducedMotion ? 0 : pointerRatioY * PARALLAX_STRENGTH_Y;

  const scale = viewportScale * zoom;

  // 画面比视口多出来的那部分，才是可以用来位移的余量，超出就会露出背景
  const slackX = Math.max(0, (IMAGE_ASPECT * scale - (camera.right - camera.left)) / 2);
  const slackY = Math.max(0, (scale - (camera.top - camera.bottom)) / 2);
  const positionX = MathUtils.clamp(offsetX, -slackX, slackX);
  const positionY = MathUtils.clamp(-offsetY, -slackY, slackY); // 纵向取反，画面与鼠标同向移动

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

resizeToViewport();
handleScroll();
requestAnimationFrame(renderFrame);
