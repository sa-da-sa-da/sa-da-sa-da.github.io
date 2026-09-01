/**
 * 《将进酒》沉浸式导读页脚本
 * 由构建产物反混淆还原的可读版本，行为与原压缩代码完全一致。
 *
 * 页面结构：正文 HTML 通过模板字符串注入 #app；
 * 交互逻辑：滚动切换章节（背景图交叉淡入淡出 + 章节导航高亮）、
 *           鼠标视差、入场/重播按钮，以及"朗读"音频控件。
 */
import { s as createPoetryAudio } from "./poetryAudio.js";

/* ---------- 环境与常量 ---------- */

// 用户是否开启"减少动态效果"（系统级无障碍设置）
const prefersReducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

// 站内资源根路径
const BASE_PATH = "./";

// 每个场景（由 section 的 data-scene 序号索引）对应的背景图
const imageSrcs = [
  `${BASE_PATH}generated/bring-in-the-wine/hero.avif`,   // 0 · 开篇
  `${BASE_PATH}generated/bring-in-the-wine/river.avif`,  // 1 · 黄河
  `${BASE_PATH}generated/bring-in-the-wine/mirror.avif`, // 2 · 明镜
  `${BASE_PATH}generated/bring-in-the-wine/moon-feast.avif`, // 3 · 对月
  `${BASE_PATH}generated/bring-in-the-wine/banquet.avif`,    // 4 · 宴饮
  `${BASE_PATH}generated/bring-in-the-wine/song.avif`,       // 5 · 长歌
  `${BASE_PATH}generated/bring-in-the-wine/release.avif`,    // 6 · 销愁
];

/* ---------- 页面结构 ---------- */

document.querySelector("#app").innerHTML = `
  <div class="wine-page">
    <div class="wine-stage" aria-hidden="true">
      <div class="wine-backdrop"></div>
      <img class="wine-image wine-image-a" src="${imageSrcs[0]}" alt="" />
      <img class="wine-image wine-image-b" src="${imageSrcs[0]}" alt="" />
      <div class="wine-shade"></div>
    </div>
    <div class="wine-grain" aria-hidden="true"></div>

    <header class="wine-header">
      <a class="wine-mark" href="#opening" aria-label="回到《将进酒》开篇">将</a>
      <div class="wine-meta"><b>李白〔唐代〕</b><span>乐府歌行 · 沉浸式导读</span></div>
      <nav class="wine-switch" aria-label="诗词页面导航">
        <a href="1.html">秋思</a>
        <a href="chibi.html">赤壁</a>
        <a href="chushibiao.html">出师</a>
        <a href="qinyuanchun.html">沁园春</a>
        <a href="shengshengman.html">声声慢</a>
        <a href="wine.html" aria-current="page">将进酒</a>
      </nav>
      <button class="poetry-audio wine-audio" id="wine-audio" type="button" aria-live="polite">朗读</button>
    </header>

    <nav class="wine-chapters" aria-label="章节导航">
      <a href="#opening"><i></i><span>序</span></a>
      <a href="#river"><i></i><span>河</span></a>
      <a href="#mirror"><i></i><span>发</span></a>
      <a href="#moon"><i></i><span>月</span></a>
      <a href="#feast"><i></i><span>饮</span></a>
      <a href="#song"><i></i><span>歌</span></a>
      <a href="#release"><i></i><span>愁</span></a>
      <a href="#reading"><i></i><span>解</span></a>
    </nav>

    <main class="wine-story">
      <section class="wine-section wine-hero" id="opening" data-scene="0">
        <div class="wine-hero-copy">
          <p class="wine-kicker">开元以后 · 一场从黄昏燃至黎明的酒宴</p>
          <h1>将进酒</h1>
          <p class="wine-author">李白 <span>“将”读 qiāng：请、愿之意</span></p>
          <blockquote>君不见黄河之水天上来，<br>奔流到海不复回。</blockquote>
          <p class="wine-intro">先看一条永不回头的河，再看镜中忽然老去的人。李白把生命的短促推到极处，然后举杯，把悲愁烧成最明亮的豪情。</p>
          <button id="wine-enter" type="button">入席，与诗人共饮 <span>↓</span></button>
        </div>
        <div class="wine-scroll"><i></i><span>向下滚动 · 暮色将走向月夜与黎明</span></div>
      </section>

      <section class="wine-section wine-right" id="river" data-scene="1">
        <article class="wine-card">
          <p class="wine-index">01 · 天上来，不复回</p>
          <h2>君不见黄河之水天上来，<br>奔流到海不复回。</h2>
          <p class="wine-literal">你难道没有看见，黄河仿佛从天际奔涌而来，一直流入大海，再也不会返回？</p>
          <div class="wine-flow" aria-label="空间与时间的推进"><span>天上</span><i></i><span>人间</span><i></i><span>大海</span></div>
          <p class="wine-analysis">“天上来”把空间抬到宇宙尺度，“不复回”又把江水变成时间。开篇不是劝酒，而是一记惊雷：生命与河流一样，壮阔，也不可逆。</p>
        </article>
      </section>

      <section class="wine-section" id="mirror" data-scene="2">
        <article class="wine-card wine-mirror-card">
          <p class="wine-index">02 · 一朝一暮，青丝成雪</p>
          <h2>君不见高堂明镜悲白发，<br>朝如青丝暮成雪。</h2>
          <p class="wine-literal">高堂之上，人对明镜悲叹白发：早晨还仿佛满头青丝，傍晚就已雪白。</p>
          <div class="wine-day"><span>朝 · 青丝</span><b></b><span>暮 · 白雪</span></div>
          <p class="wine-analysis">镜头从万里黄河骤然切到一面镜子。真实的衰老并非一日完成，但夸张的“朝—暮”把几十年压成一瞬，让时间突然贴近人的面孔。</p>
        </article>
      </section>

      <section class="wine-section wine-right" id="moon" data-scene="3">
        <article class="wine-card wine-moon-card">
          <p class="wine-index">03 · 悲至极处，转身尽欢</p>
          <h2>人生得意须尽欢，莫使金樽空对月。<br>天生我材必有用，千金散尽还复来。</h2>
          <p class="wine-literal">人生得意时应当尽情欢乐，不要让酒杯空对明月。上天赋予我的才华必有用处，钱财散尽也终会再来。</p>
          <div class="wine-claims"><span><b>须</b>尽欢</span><span><b>莫</b>空杯</span><span><b>必</b>有用</span><span><b>还</b>复来</span></div>
          <p class="wine-analysis">四个斩钉截铁的字把情绪翻转。“得意”并非仕途顺遂，而是对生命价值的主动确认：现实未必接纳我，我仍不撤回对自己的判断。</p>
        </article>
      </section>

      <section class="wine-section" id="feast" data-scene="4">
        <article class="wine-card wine-feast-card">
          <p class="wine-index">04 · 杯莫停</p>
          <h2>烹羊宰牛且为乐，会须一饮三百杯。<br>岑夫子，丹丘生，将进酒，杯莫停。</h2>
          <p class="wine-literal">烹羊宰牛，姑且尽情欢乐；今日痛饮，仿佛要喝上三百杯。岑夫子、丹丘生，请喝酒吧，不要停杯。</p>
          <div class="wine-rhythm"><span>烹</span><span>宰</span><span>饮</span><span>进</span><span>莫停</span></div>
          <p class="wine-analysis">诗从哲理突然进入席间口语。连呼友人姓名，短句与命令式连续落下，读者不再远观李白，而像被他一把拉到桌前。</p>
        </article>
      </section>

      <section class="wine-section wine-right" id="song" data-scene="5">
        <article class="wine-card wine-song-card">
          <p class="wine-index">05 · 且听我歌</p>
          <h2>与君歌一曲，请君为我倾耳听。<br>钟鼓馔玉不足贵，但愿长醉不复醒。<br>古来圣贤皆寂寞，惟有饮者留其名。<br>陈王昔时宴平乐，斗酒十千恣欢谑。</h2>
          <p class="wine-literal">我为诸君唱一曲，请侧耳听：富贵生活不值得珍视，只愿沉醉不醒。古来圣贤多寂寞，反而豪饮者留下名声；陈王曹植当年宴饮平乐观，以昂贵美酒尽情欢乐。</p>
          <div class="wine-balance"><span>钟鼓馔玉<small>权势 · 富贵</small></span><i>≠</i><span>一曲与一杯<small>真性 · 知己</small></span></div>
          <p class="wine-analysis">“长醉”不是简单逃避。它来自清醒：才华与现实错位，圣贤也常寂寞。曹植的典故让李白借古人说自己——被压抑的天才，在酒中守住尊严。</p>
          <p class="wine-variant">版本说明：此处采用通行本“倾耳听”；另有版本作“侧耳听”。</p>
        </article>
      </section>

      <section class="wine-section" id="release" data-scene="6">
        <article class="wine-card wine-release-card">
          <p class="wine-index">06 · 与尔同销万古愁</p>
          <h2>主人何为言少钱，径须沽取对君酌。<br>五花马，千金裘，呼儿将出换美酒，<br>与尔同销万古愁。</h2>
          <p class="wine-literal">主人为何说钱少？只管拿去买酒与你共饮。名贵的五花马、千金裘，都让孩子拿去换酒；我要与你们一同消解这绵延古今的愁。</p>
          <div class="wine-exchange"><span>五花马</span><span>千金裘</span><i>→</i><strong>美酒</strong><i>→</i><b>万古愁</b></div>
          <p class="wine-analysis">昂贵之物被迅速换成酒，不是炫富，而是价值次序的重排：身外之物可以散尽，知己相对与精神自由不可辜负。结尾忽然说“万古愁”，也揭开整夜豪饮的底色。</p>
          <q>豪情不是没有悲愁，<br>而是敢把悲愁举到天地之间。</q>
        </article>
      </section>

      <section class="wine-section wine-reading" id="reading" data-scene="6">
        <div class="wine-reading-panel">
          <div class="wine-reading-title">
            <p class="wine-kicker">读懂《将进酒》</p>
            <h2>一条河，一面镜，<br>一杯酒，万古愁。</h2>
          </div>
          <div class="wine-facts">
            <article><span>体式</span><h3>乐府歌行</h3><p>《将进酒》沿用乐府旧题，本有劝酒之意。李白把宴饮歌改造成关于时间、天才与自由的长歌。</p></article>
            <article><span>结构</span><h3>悲 → 欢 → 愤 → 狂</h3><p>黄河与白发写人生短促；月下举杯陡转昂扬；圣贤寂寞泄出愤懑；散尽千金把全诗推至顶点。</p></article>
            <article><span>语言</span><h3>夸张与跳荡</h3><p>“天上来”“三百杯”“千金散尽”以巨大尺度写情绪；长短句交错，像歌声、呼喊与杯盏声轮番逼近。</p></article>
            <article><span>核心</span><h3>自信与不平</h3><p>“天生我材必有用”不是轻松的成功宣言，而是怀才不遇时仍坚持自我价值，因此格外有力量。</p></article>
          </div>
          <div class="wine-arc" aria-label="情绪推进"><span>黄河 · 时间</span><i></i><span>明镜 · 生命</span><i></i><span>金樽 · 自信</span><i></i><span>万古愁 · 释放</span></div>
          <footer>
            <p>从宇宙尺度落到个人白发，再由一杯酒返回万古：李白用豪饮，完成对有限生命的正面回答。</p>
            <div><a href="1.html">秋思篇</a><a href="chibi.html">赤壁篇</a><button id="wine-replay" type="button">再饮一巡 ↑</button></div>
          </footer>
        </div>
      </section>
    </main>
    <div class="wine-loading"><i></i><span>黄河入画</span></div>
  </div>`;

/* ---------- DOM 引用 ---------- */

const sections = [...document.querySelectorAll(".wine-section")]; // 所有章节
const chapterLinks = [...document.querySelectorAll(".wine-chapters a")]; // 章节导航链接
const imageA = document.querySelector(".wine-image-a"); // 背景图 A（初始显示）
const imageB = document.querySelector(".wine-image-b"); // 背景图 B（备用，交叉淡入）
const stage = document.querySelector(".wine-stage"); // 舞台容器（视差位移目标）
const backdrop = document.querySelector(".wine-backdrop"); // 背景层

/* ---------- 场景切换状态 ---------- */

let currentScene = 0; // 当前展示的场景序号（data-scene）
let visibleImage = imageA; // 正在展示中的图片
let pendingImage = imageB; // 即将淡入的下一张图片
let pointerX = 0; // 指针相对视口中心的横向偏移（-0.5 ~ 0.5）
let pointerY = 0; // 指针相对视口中心的纵向偏移
let switchToken = 0; // 切换令牌：快速连续滚动时，作废过期的 onload 回调

/**
 * 给背景层设置当前场景的图片（叠加一层暗色渐变以保证文字可读）
 */
function setBackdrop(src) {
  backdrop.style.backgroundImage = `linear-gradient(rgba(6,12,14,.38),rgba(6,12,14,.52)),url('${src}')`;
}

/**
 * 切换到指定场景：把待切换图片加载到备用层，
 * 加载完成后让它淡入、旧图淡出，并同步背景层。
 */
function switchScene(index) {
  if (index === currentScene) return; // 场景未变化，跳过

  currentScene = index;
  const src = imageSrcs[index];
  const next = pendingImage;
  const token = ++switchToken;
  let done = false;

  const finish = () => {
    if (done || token !== switchToken) return; // 已被更新的切换请求作废
    done = true;
    next.onload = null;
    next.classList.add("visible"); // 新图淡入
    visibleImage.classList.remove("visible"); // 旧图淡出
    setBackdrop(src);
    [visibleImage, pendingImage] = [next, visibleImage]; // 交换两张图的角色
  };

  next.onload = finish;
  next.src = src;
  if (next.complete) requestAnimationFrame(finish); // 图片命中缓存时立即完成切换
}

/**
 * 滚动监听：找出最接近视口 30% 高度处的章节，
 * 高亮对应章节卡片与导航链接，并切换背景图。
 */
function updateActiveSection() {
  let best = sections[0];
  let bestDistance = Infinity;

  sections.forEach((section) => {
    const distance = Math.abs(section.getBoundingClientRect().top - innerHeight * 0.3);
    if (distance < bestDistance) {
      best = section;
      bestDistance = distance;
    }
  });

  sections.forEach((section) => section.classList.toggle("active", section === best));
  chapterLinks.forEach((link) => link.classList.toggle("active", link.hash === `#${best.id}`));
  switchScene(Number(best.dataset.scene || 0));
}

/* ---------- 初始化 ---------- */

// 优先在浏览器空闲时干活，老浏览器退化为延时调用
const scheduleIdle =
  typeof requestIdleCallback === "function"
    ? (fn) => requestIdleCallback(fn, { timeout: 1000 })
    : (fn) => setTimeout(fn, 200);

// 一张加载完再排下一张：不跟首屏抢带宽，也不会一次性把七张图全塞进内存
function preloadRest() {
  let index = 1;
  const next = () => {
    if (index >= imageSrcs.length) return;
    const img = new Image();
    img.onload = img.onerror = () => scheduleIdle(next);
    img.src = imageSrcs[index++];
  };
  scheduleIdle(next);
}

// 首图加载完成后隐藏加载层；若已命中缓存则立即隐藏
const onHeroReady = () => {
  document.querySelector(".wine-loading")?.classList.add("done");
  preloadRest(); // 让开首屏带宽，再逐张补齐其余场景
};
imageA.addEventListener("load", onHeroReady, { once: true });
if (imageA.complete) onHeroReady();

imageA.classList.add("visible");
setBackdrop(imageSrcs[0]);

/* ---------- 交互 ---------- */

// 滚动时同步章节状态
addEventListener("scroll", updateActiveSection, { passive: true });

// 指针移动产生轻微视差（通过 CSS 变量 --px / --py 位移舞台）
addEventListener(
  "pointermove",
  (event) => {
    if (prefersReducedMotion) return;
    pointerX = event.clientX / innerWidth - 0.5;
    pointerY = event.clientY / innerHeight - 0.5;
    stage.style.setProperty("--px", `${pointerX * -10}px`);
    stage.style.setProperty("--py", `${pointerY * -7}px`);
  },
  { passive: true }
);

// 入场按钮：滚动到第一章节
document.querySelector("#wine-enter").addEventListener("click", () =>
  document.querySelector("#river").scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth" })
);

// 重播按钮：回到页面顶部
document.querySelector("#wine-replay").addEventListener("click", () =>
  scrollTo({ top: 0, behavior: prefersReducedMotion ? "auto" : "smooth" })
);

// 朗读控件
createPoetryAudio({
  button: "#wine-audio",
  src: "audio/qiangjinjiu.mp3",
  title: "将进酒",
});

// 页面初始状态
updateActiveSection();
