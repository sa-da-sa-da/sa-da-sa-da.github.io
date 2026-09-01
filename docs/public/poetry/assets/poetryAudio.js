/**
 * 诗词朗读控件 + Vite modulepreload 兼容层
 *
 * 状态机：idle（朗读）→ loading（缓冲中）→ playing（暂停）→ ended（重播）
 *         任意一步出错 → error（音频不可用），再次点击会重新加载并重试
 *
 * 用法：
 *   createPoetryAudio({ button: "#autumn-audio", src: "xxx.mp3", title: "天净沙·秋思" })
 *   createPoetryAudio({ button, src, title, autoplay: true })  // 需要进页面即朗读时才传 autoplay
 */

/* ---------- Vite modulepreload polyfill（老浏览器用 fetch 预热模块） ---------- */
(function () {
  const relList = document.createElement("link").relList;
  if (relList && relList.supports && relList.supports("modulepreload")) return;

  for (const link of document.querySelectorAll('link[rel="modulepreload"]')) preload(link);

  new MutationObserver((records) => {
    for (const record of records) {
      if (record.type !== "childList") continue;
      for (const node of record.addedNodes) {
        if (node.tagName === "LINK" && node.rel === "modulepreload") preload(node);
      }
    }
  }).observe(document, { childList: true, subtree: true });

  function toFetchOptions(link) {
    const options = {};
    if (link.integrity) options.integrity = link.integrity;
    if (link.referrerPolicy) options.referrerPolicy = link.referrerPolicy;
    if (link.crossOrigin === "use-credentials") options.credentials = "include";
    else if (link.crossOrigin === "anonymous") options.credentials = "omit";
    else options.credentials = "same-origin";
    return options;
  }

  function preload(link) {
    if (link.ep) return;
    link.ep = true;
    fetch(link.href, toFetchOptions(link));
  }
})();

/* ---------- 朗读控件 ---------- */
const STATE_LABEL = {
  idle: "朗读",
  loading: "缓冲中",
  playing: "暂停",
  ended: "重播",
  error: "音频不可用",
};

const HAVE_FUTURE_DATA = 3; // HTMLMediaElement.readyState：已有可播放数据

function createPoetryAudio({ button, src, title, autoplay = false } = {}) {
  const control = typeof button === "string" ? document.querySelector(button) : button;
  if (!control || !src) return null;

  const audio = new Audio(src);
  audio.preload = autoplay ? "auto" : "metadata";
  audio.autoplay = autoplay;
  audio.setAttribute("playsinline", "");
  audio.hidden = true;
  document.body.append(audio);

  let state = "idle";
  let wantsPlayback = false; // 用户意图：是否希望处于播放状态
  let pending = null; // 进行中的 play() Promise，防止并发

  function render(next) {
    const isPlaying = next === "playing";
    state = next;
    control.dataset.audioState = next;
    control.classList.toggle("is-playing", isPlaying);
    control.classList.toggle("has-error", next === "error");
    control.setAttribute("aria-pressed", String(isPlaying));
    control.textContent = STATE_LABEL[next] || STATE_LABEL.idle;
    control.setAttribute("aria-label", isPlaying ? `暂停朗读《${title}》` : `播放朗读《${title}》`);
    control.title = next === "error"
      ? `暂时无法加载《${title}》朗读音频，点击重试`
      : `${title} · 语音朗读`;
  }

  function play() {
    if (pending) return pending;

    wantsPlayback = true;
    if (audio.readyState < HAVE_FUTURE_DATA) render("loading");

    const request = audio.play();
    pending = request;

    const settle = () => { if (pending === request) pending = null; };
    request.then(settle, (error) => {
      settle();
      switch (error && error.name) {
        case "AbortError": // 被 pause()/load() 打断，属于正常中断，不是故障
          render(wantsPlayback ? (audio.paused ? "loading" : "playing") : "idle");
          break;
        case "NotAllowedError": // 浏览器拦截自动播放，等用户点击
          wantsPlayback = false;
          render("idle");
          break;
        default:
          wantsPlayback = false;
          render("error");
      }
    });

    return request;
  }

  function pause() {
    wantsPlayback = false;
    audio.pause();
  }

  control.addEventListener("click", () => {
    if (state === "error") {
      audio.load(); // 重新加载资源，下面紧接着发起播放
    } else if (!audio.paused) {
      pause();
      return;
    }
    if (audio.ended) audio.currentTime = 0; // 播完后再点 = 重播
    play();
  });

  audio.addEventListener("playing", () => render("playing"));
  audio.addEventListener("waiting", () => { if (wantsPlayback) render("loading"); });
  audio.addEventListener("canplay", () => { if (state === "loading" && !wantsPlayback) render("idle"); });
  audio.addEventListener("pause", () => { if (!audio.ended) render("idle"); });
  audio.addEventListener("ended", () => { wantsPlayback = false; render("ended"); });
  audio.addEventListener("error", () => { wantsPlayback = false; render("error"); });

  render("idle");
  if (autoplay) play();

  return {
    play,
    pause,
    get state() { return state; },
    destroy() {
      pause();
      audio.removeAttribute("src");
      audio.load();
      audio.remove();
    },
  };
}

export { createPoetryAudio as s };
