/**
 * 文章自动广告插件（markdown-it）
 *
 * 在构建/开发渲染时自动向文章正文注入 Google AdSense 广告，
 * 无需在每篇文章中手动编写 <GoogleAd>。
 *
 * 用法（config.ts）：
 *   md.use(autoGoogleAd, {
 *     adSlot: "2668661755",
 *     positions: ["top", "bottom"],
 *     every: 5,
 *     maxAds: 3,
 *   });
 *
 * 单篇文章可关闭：frontmatter 中写 `ad: false`
 */
import type MarkdownIt from "markdown-it";

export interface AutoGoogleAdOptions {
  /** 发布者 ID，默认 ca-pub-2897720906666216 */
  adClient?: string;
  /** 广告单元 ID（AdSense 控制台创建，必填） */
  adSlot: string;
  /** 广告格式，默认 fluid */
  adFormat?: string;
  /** 广告布局键，默认 -ii+7-14-2d+99 */
  adLayoutKey?: string;
  /** 自动插入位置，默认 ['top', 'bottom'] */
  positions?: ("top" | "bottom")[];
  /** 长文每隔 N 个标题后插入一个中间广告（0 或 undefined 关闭） */
  every?: number;
  /** 每篇文章最多广告数（Google 政策上限 3），默认 3 */
  maxAds?: number;
  /** 文章已手动包含 GoogleAd / adsbygoogle 时跳过自动注入，默认 true */
  skipIfExisting?: boolean;
  /** 自定义跳过规则：返回 true 则不注入 */
  skip?: (frontmatter: Record<string, any>) => boolean;
  /** 正文 token 少于该数量时只插入 1 个广告，默认 20 */
  minTokensForBoth?: number;
}

const DEFAULT_AD_CLIENT = "ca-pub-2897720906666216";

/** 生成与 GoogleAd.vue 组件一致的广告 HTML（原生 ins，可被全局 adsbygoogle 初始化） */
function adHtml(opts: Required<Pick<AutoGoogleAdOptions, "adSlot">> & AutoGoogleAdOptions): string {
  return [
    '<div class="google-ad-container">',
    '<ins class="adsbygoogle" style="display:block;width:100%;min-width:100px;min-height:60px"',
    ` data-ad-format="${opts.adFormat}"`,
    ` data-ad-layout-key="${opts.adLayoutKey}"`,
    ` data-ad-client="${opts.adClient}"`,
    ` data-ad-slot="${opts.adSlot}"`,
    "></ins>",
    "</div>",
  ].join("");
}

/** 文章是否已手动放置广告（GoogleAd 组件标签或原生 ins） */
function hasManualAd(tokens: any[]): boolean {
  const re = /adsbygoogle|GoogleAd|google-ad-container/i;
  return tokens.some(
    (t) => (t.type === "html_block" || t.type === "html_inline") && re.test(t.content || "")
  );
}

/** 文章顶部插入点：正文以 h1 开头则插在标题之后，否则插在最前 */
function calcTopInsertIndex(tokens: any[], headings: number[]): number {
  if (headings.length > 0 && headings[0] <= 3) return headings[0] + 1;
  return 0;
}

/** 按 maxAds 截断，优先保留首尾广告位 */
function pickTargets(points: number[], maxAds: number): number[] {
  const uniq = [...new Set(points)].sort((a, b) => a - b);
  if (uniq.length <= maxAds) return uniq;
  const first = uniq[0];
  const last = uniq[uniq.length - 1];
  const middle = uniq.slice(1, -1);
  const keepMid = Math.max(0, maxAds - 2);
  return [first, ...middle.slice(0, keepMid), last].slice(0, maxAds);
}

export function autoGoogleAd(md: MarkdownIt, options: AutoGoogleAdOptions): void {
  const opts: Required<
    Pick<AutoGoogleAdOptions, "adClient" | "adFormat" | "adLayoutKey" | "positions" | "every" | "maxAds" | "skipIfExisting" | "minTokensForBoth">
  > & AutoGoogleAdOptions = {
    adClient: DEFAULT_AD_CLIENT,
    adFormat: "fluid",
    adLayoutKey: "-ii+7-14-2d+99",
    positions: ["top", "bottom"],
    every: 0,
    maxAds: 3,
    skipIfExisting: true,
    minTokensForBoth: 20,
    ...options,
  };

  md.core.ruler.after("inline", "auto-google-ad", (state) => {
    const env = state.env as {
      frontmatter?: Record<string, any>;
      pageData?: { frontmatter?: Record<string, any> };
    };
    const fm = env?.frontmatter || env?.pageData?.frontmatter || {};

    // 单篇文章关闭：frontmatter 写 ad: false
    if (fm.ad === false) return;
    // 首页等自定义布局不注入
    if (fm.layout === "home" || fm.home === true) return;
    // 自定义跳过规则
    if (opts.skip && opts.skip(fm)) return;

    const tokens = state.tokens;

    // 已手动放置广告的文章跳过，避免超出政策数量限制
    if (opts.skipIfExisting && hasManualAd(tokens)) return;

    // 收集标题位置
    const headings: number[] = [];
    tokens.forEach((t, i) => {
      if (t.type === "heading_open") headings.push(i);
    });

    // 计算候选插入点
    const points: number[] = [];
    if (opts.positions.includes("top")) points.push(calcTopInsertIndex(tokens, headings));
    if (opts.positions.includes("bottom")) points.push(tokens.length);
    if (opts.every > 0 && headings.length >= opts.every * 2) {
      for (let k = opts.every; k <= headings.length; k += opts.every) {
        points.push(headings[k - 1] + 1); // 第 k 个标题之后
      }
    }

    let targets = pickTargets(points, opts.maxAds);
    // 正文很短时只保留 1 个广告，避免页面拥挤
    if (tokens.length < opts.minTokensForBoth && targets.length > 1) {
      targets = targets.slice(-1);
    }

    // 从后往前插入，保持索引有效
    const ad = adHtml(opts);
    for (let i = targets.length - 1; i >= 0; i--) {
      const adToken = new state.Token("html_block", "", 0);
      adToken.content = ad;
      adToken.map = [0, 0];
      tokens.splice(targets[i], 0, adToken);
    }
  });
}
