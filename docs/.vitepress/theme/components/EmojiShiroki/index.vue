<script setup lang="ts" name="EmojiShiroki">
import { ref, computed } from "vue";
import type { CSSProperties } from "vue";
import { useData, Content } from "vitepress";
// 🗂️ Emoji 数据
import { emojis } from "./emojis";

// 🧩 组件定义
defineOptions({ name: "EmojiShiroki" });

function createNamespace(block: string) {
  const b = () => `tk-${block}`;
  const e = (el: string) => `tk-${block}__${el}`;
  const is = (state: string, truthy: boolean) => (truthy ? "is-" + state : "");
  return { b, e, is };
}
const ns = createNamespace("emoji-lib");
const { frontmatter } = useData();

const keyword = ref("");
const active = ref(0);

const list = computed(() => {
  const kw = keyword.value.trim().toLowerCase();
  const source = kw ? emojis.flatMap(c => c.items) : emojis[active.value].items;
  if (!kw) return source;
  return source.filter(it => [it.name, ...(it.tags || [])].join(" ").toLowerCase().includes(kw));
});

function showToast(msg: string, kind: "success" | "error" = "success") {
  let container = document.getElementById("tk-toast-br");
  if (!container) {
    container = document.createElement("div");
    container.id = "tk-toast-br";
    container.style.position = "fixed";
    container.style.bottom = "16px";
    container.style.right = "16px";
    container.style.display = "grid";
    container.style.gap = "8px";
    container.style.zIndex = "9999";
    container.style.pointerEvents = "none";
    document.body.appendChild(container);
  }
  const div = document.createElement("div");
  div.textContent = msg;
  div.style.padding = "8px 12px";
  div.style.borderRadius = "10px";
  div.style.fontSize = "12px";
  div.style.color = kind === "success" ? "#0b3" : "#fff";
  div.style.background = kind === "success" ? "rgba(16,180,80,.12)" : "rgba(240,80,80,.85)";
  div.style.border = "1px solid " + (kind === "success" ? "rgba(16,180,80,.35)" : "rgba(240,80,80,.9)");
  div.style.boxShadow = "0 6px 16px rgba(0,0,0,.08)";
  div.style.pointerEvents = "none";
  div.style.transition = "opacity .25s ease, transform .25s ease";
  div.style.opacity = "0";
  div.style.transform = "translateY(8px)";
  container.appendChild(div);
  requestAnimationFrame(() => {
    div.style.opacity = "1";
    div.style.transform = "translateY(0)";
  });
  setTimeout(() => {
    div.style.transition = "opacity 1.2s ease, transform 1.2s ease";
    div.style.opacity = "0";
    div.style.transform = "translateY(-28px)";
    setTimeout(() => container && container.removeChild(div), 1250);
  }, 1500);
}

// 📋 复制表情并提示
const copy = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
    showToast("✅ 已复制", "success");
  } catch {
    showToast("❌ 复制失败", "error");
  }
};

const hueOf = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h % 360;
};
const topbarStyle = (name: string, char: string): CSSProperties => {
  const h = hueOf(name + char);
  const c = `hsla(${h}, 85%, 55%, 1)`;
  return {
    "--tk-topbar-color": c,
  } as CSSProperties;
};
</script>

<template>
  <div :class="ns.b()">
    <h1 :class="ns.e('title')">{{ frontmatter.title }}</h1>

    <div :class="ns.e('searchbar')">
      <input :class="ns.e('search')" type="text" v-model="keyword" placeholder="搜索名称或标签" />
    </div>
    <div :class="ns.e('toolbar')">
      <div :class="ns.e('tabs')">
        <button v-for="(c, idx) in emojis" :key="c.name" :class="[ns.e('tab'), ns.is('active', idx===active)]" @click="active=idx">
          <span>{{ c.icon }} {{ c.name }}</span>
        </button>
      </div>
    </div>

    <div :class="ns.e('grid')">
      <button v-for="it in list" :key="it.char+it.name" :class="ns.e('item')" @click="copy(it.char)" :title="it.name">
        <div :class="ns.e('topbar')" :style="topbarStyle(it.name, it.char)"></div>
        <div :class="ns.e('content')">
          <span :class="ns.e('char')">{{ it.char }}</span>
          <span :class="ns.e('name')">{{ it.name }}</span>
        </div>
      </button>
    </div>

    <div :class="ns.e('md')">
      <Content />
    </div>
  </div>
</template>

<style scoped>
.tk-emoji-lib { display: grid; justify-items: center; align-content: center; gap: 24px; padding: 24px 24px 56px; min-height: 70vh; width: 100%; }
.tk-emoji-lib__title { font-size: 1.6rem; font-weight: 600; margin: 0; }
.tk-emoji-lib__searchbar { width: 100%; max-width: 900px; display: grid; justify-items: center; }
.tk-emoji-lib__toolbar { width: 100%; max-width: 900px; display: grid; grid-template-columns: 1fr; gap: 12px; align-items: center; margin-top: 8px; }
.tk-emoji-lib__tabs { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; }
.tk-emoji-lib__tab { height: 36px; padding: 0 12px; border-radius: 8px; border: 1px solid var(--vp-c-divider); background: var(--vp-c-bg-soft); color: var(--vp-c-text); position: relative; overflow: hidden; white-space: nowrap; min-width: max-content; flex: 0 0 auto; }
.tk-emoji-lib__tab::after { content: ""; position: absolute; top: 0; left: -50%; width: 50%; height: 100%; background: linear-gradient(90deg, transparent, rgba(255,255,255,.45), transparent); transform: translateX(-100%); pointer-events: none; }
.tk-emoji-lib__tab:hover::after { animation: sweep 1s ease; }
.tk-emoji-lib__tab.is-active { background: linear-gradient(135deg, var(--vp-c-brand-1), #2f78ff); color: #fff; border-color: transparent; }
.tk-emoji-lib__search { height: 44px; width: min(480px, 90vw); border-radius: 999px; border: 1px solid rgba(0,0,0,.12); background: linear-gradient(180deg, var(--vp-c-bg), var(--vp-c-bg-soft)); color: var(--vp-c-text); padding: 0 18px; box-shadow: 0 6px 16px rgba(0,0,0,.06); transition: box-shadow .2s ease, border-color .2s ease, background .2s ease; }
.tk-emoji-lib__search:focus { outline: none; border-color: var(--vp-c-brand-1); box-shadow: 0 8px 20px rgba(0,0,0,.08), 0 0 0 3px rgba(47,120,255,.15); }
.tk-emoji-lib__grid { width: 100%; max-width: 900px; display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 12px; }
.tk-emoji-lib__item { display: grid; justify-items: center; gap: 0; padding: 12px; min-height: 120px; border-radius: 14px; border: 1px solid rgba(47,120,255,.25); background: var(--vp-c-bg); box-shadow: 0 6px 16px rgba(0,0,0,.06); position: relative; overflow: hidden; transition: box-shadow .2s ease, border-color .2s ease, transform .12s ease; }
.tk-emoji-lib__content { display: grid; justify-items: center; align-content: center; gap: 6px; height: 100%; }
.tk-emoji-lib__item:hover { box-shadow: 0 10px 24px rgba(47,120,255,.25); border-color: rgba(47,120,255,.35); }
.tk-emoji-lib__item::after { content: ""; position: absolute; top: 0; left: -50%; width: 50%; height: 12px; background: linear-gradient(90deg, transparent, rgba(255,255,255,.7), transparent); transform: translateX(-100%); pointer-events: none; }
.tk-emoji-lib__item:hover::after { animation: sweep 1.2s ease; }
.tk-emoji-lib__topbar { position: absolute; top: 0; left: 0; right: 0; height: 10px; border-top-left-radius: 14px; border-top-right-radius: 14px; background: var(--tk-topbar-color); }
.tk-emoji-lib__char { font-size: 28px; }
.tk-emoji-lib__name { font-size: 12px; opacity: .8; }
.tk-emoji-lib__md { width: 100%; max-width: 900px; }
@keyframes sweep { 0% { transform: translateX(-100%);} 100% { transform: translateX(250%);} }
</style>