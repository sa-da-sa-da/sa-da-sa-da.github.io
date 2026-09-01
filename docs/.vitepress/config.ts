import { defineConfig } from "vitepress";
import { defineTeekConfig } from "vitepress-theme-teek/config";
import { version } from "vitepress-theme-teek/es/version";
import { Wallpaper } from "./ConfigHyde/Wallaper"; // 导入Wallaper模块
import { Cover } from "./ConfigHyde/Cover"; // 导入Wallaper模块

// 直接设置基础路径为根目录

import { CommentData } from "./ConfigHyde/Comment"; //导入评论配置
import { Nav } from "./ConfigHyde/Nav"; // 导入Nav模块
import { SocialLinks } from "./ConfigHyde/SocialLinks"; //导入社交链接配置

import {
  groupIconMdPlugin,
  groupIconVitePlugin,
} from "vitepress-plugin-group-icons"; // 导入代码组图标插件

import timeline from "vitepress-markdown-timeline"; // 导入时间线插件

import { autoGoogleAd } from "./plugins/auto-google-ad"; // 文章自动广告插件

import type { HeadConfig } from "vitepress"; // 在文件顶部添加类型导入
import HeadData from "./ConfigHyde/Head"; // 导入 HeadData（修改为默认导入方式）

import { createRewrites } from "vitepress-theme-teek/config";
import AutoFrontmatter, { FileInfo } from "vitepress-plugin-auto-frontmatter";
import {
  useTransformByRules,
  type TransformRule,
} from "./theme/composables/useTransform";

const description = [
  "欢迎来到 sakaay-飒龘 当以读书通世事",
  "sakaay-飒龘 当以读书通世事 是一个基于 VitePress 构建的主题，是在默认主题的基础上进行拓展，支持 VitePress 的所有功能、配置",
  "sakaay-飒龘 当以读书通世事 拥有三种典型的知识管理形态：结构化、碎片化、体系化，可以轻松构建一个结构化知识库，适用个人博客、文档站、知识库等场景",
].toString();
const CoverImgList = Cover; // 获取封面列表
// const CoverBgList = Wallpaper; // 获取壁纸列表

const teekConfig = defineTeekConfig({
  // // 首页顶部按 F11 开启壁纸模式
  // 首页顶部按 F11 开启壁纸模式
  wallpaper: {
    enabled: true, // 是否启用壁纸模式
    hideBanner: false, // 开启壁纸模式后，全屏是否显示打字机文案，
    hideMask: true, // 开启壁纸模式后，是否隐藏 Banner 或 bodyBgImage 的遮罩层，则确保 banner.mask 和 bodyBgImage.mask 为 true 才生效
  },

  loading: false, // 启用 Loading 动画，为 false 则关闭 Loading 动画
  // loading: "正在加载中...", // 修改 Loading 文案

  themeEnhance: {
    themeColor: {
      defaultColorName: "ep-blue", //默认主题色为蓝色
    },
  },

  windowTransition: true,

  sidebarTrigger: true, //侧边栏收缩

  // author: { name: "Teeker", link: "https://github.com/Kele-Bingtang" },
  blogger: {
    // 博主信息，显示在首页侧边栏
    avatar: "/img/xyy.webp", //侧边栏个人头像
    shape: "circle-rotate", // 头像风格：square 为方形头像，circle 为圆形头像，circle-rotate 可支持鼠标悬停旋转
    name: "sakaay|飒龘", // 侧边栏个人昵称
    slogan: "当以读书通世事", // 侧边栏个人座右铭
    circleBgImg: "https://img.sakaay.com/d/img/sakaay/14.avif", // 侧边栏个人头像圆形背景图
    circleBgMask: false, // 头像圆形背景图是否显示遮罩层
    color: "#fff",

    // 状态，仅当 shape 为 circle 相关值时有效
    status: {
      icon: "😜", // 状态图标
      size: 24, // 图标大小
      title: "有趣", // 鼠标悬停图标的提示语
    },
  },

  // 分类卡片
  category: {
    enabled: true, // 是否启用分类卡片
    limit: 8, // 一页显示的数量
    autoPage: false, // 是否自动翻页
    pageSpeed: 4000, // 翻页间隔时间，单位：毫秒。autoPage 为 true 时生效
  },
  // 标签卡片
  tag: {
    enabled: true, // 是否启用标签卡片
    limit: 21, // 一页显示的数量
    autoPage: false, // 是否自动翻页
    pageSpeed: 4000, // 翻页间隔时间，单位：毫秒。autoPage 为 true 时生效
  },

  // 精选文章卡片
  topArticle: {
    enabled: true, // 是否启用精选文章卡片
    limit: 5, // 一页显示的数量
    autoPage: false, // 是否自动翻页
    pageSpeed: 4000, // 翻页间隔时间，单位：毫秒。autoPage 为 true 时生效
    dateFormat: "yyyy-MM-dd", // 精选文章的日期格式
    // dateFormat: "yyyy-MM-dd hh:mm:ss", // 精选文章的日期格式
  },

  page: {
    pageSize: 39, //首页 Post 文章列表的分页配置
  },

  // 首页尺寸变大
  themeSize: "large",

  // // 布蒜子统计分析
  // docAnalysis: {
  //   createTime: "2021-10-19",
  //   statistics: {
  //     // provider: "busuanzi",
  //     provider: "vercount",
  //     // provider: "busuanzi",
  //     // url: "//bsz.eryajf.net/jsonp?callback=Busuanzicallback"
  //   },
  //   wordCount: true,
  //   readingTime: true,
  //   // overrideInfo: [
  //   //   { key: "lastActiveTime", value: (_, currentValue) => `${currentValue}前` },
  //   //   { key: "totalPosts", label: "文章总数目" },
  //   // ],
  //   appendInfo: [{ key: "index", label: "序号", value: "One" }],
  // },

  // 布蒜子统计分析
  // docAnalysis: {
  //   createTime: "2025-02-26",
  //   statistics: {
  //     provider: "busuanzi",
  //     url: "https://bszi.eryajf.net/jsonp?callback=BusuanziCallback",
  //     tryRequest: true,
  //     tryCount: 5,
  //     tryIterationTime: 2000,
  //   },
  //   wordCount: true,
  //   readingTime: true,
  // },

  // 风险链接提示页
  riskLink: {
    enabled: true, //是否启用风险链接提示功能
    whitelist: [
      "https://*.sakaay.com/",
      "https://time.sakaay.com/",
      /https:\/\/github.com/,
      /https:\/\/giee.com/,
    ], // 白名单，匹配到的链接不提示风险
    blacklist: [], // 黑名单，匹配到的链接提示风险
  },

  // articleBottomTip: () => {
  //   return {
  //     type: "tip",
  //     title: "声明",
  //     text: `<p>作者：<a href="https://onedayxyy.cn/" target="_blank" rel="noopener noreferrer">One</a></p>
  //            <p style="margin-bottom: 0">链接：可点击右上角分享此页面复制文章链接😜</p>
  //            <p>版权：本博客所有文章除特别声明外，均采用<a href="http://www.suncai.net/PubLicense/CCBY40.html" target="_blank" rel="noopener noreferrer">CCBY-NC-SA4.O</a>许可协议。转载请注明来自<a href="https://onedayxyy.cn/" target="_blank" rel="noopener noreferrer">One Blog</a></p>
  //           `,
  //   };
  // },

  // backTopDone: TkMessage => TkMessage.success("返回顶部"),

  // //右下角回到顶部配置。
  backTop: {
    enabled: true, // 是否启动回到顶部功能
    content: "icon", // 回到顶部按钮的显示内容，可选配置 progress | icon
    done: (TkMessage) => TkMessage.success("返回顶部成功"), // 回到顶部后的回调
  },

  //右下角滚动滚动到评论区配置。
  toComment: {
    enabled: true, // 是否启动滚动到评论区功能
    done: (TkMessage) => TkMessage.success("已抵达评论区"), // 滚动到评论区后的回调
  },

  // 新版代码块配置
  codeBlock: {
    // disabled: false, // 是否禁用新版代码块
    collapseHeight: 700, // 超出高度后自动折叠，设置 true 则默认折叠，false 则默认不折叠
    overlay: true, // 代码块底部是否显示展开/折叠遮罩层
    overlayHeight: 400, // 当出现遮罩层时，指定代码块显示高度，当 overlay 为 true 时生效
    copiedDone: (TkMessage) => TkMessage.success("复制成功！"),
  },

  post: {
    showCapture: false, //关闭自动摘要
  },

  articleShare: { enabled: true },

  articleAnalyze: {
    imageViewer: { hideOnClickModal: true }, // 图片预览是否点击遮罩层关闭}
    showIcon: true, // 作者、日期、分类、标签、字数、阅读时长、浏览量等文章信息的图标是否显示
    // dateFormat: "yyyy-MM-dd hh:mm:ss", // 文章日期格式，首页和文章页解析日期时使用
    dateFormat: "yyyy-MM-dd", // 文章日期格式，首页和文章页解析日期时使用
    showInfo: true, // 是否展示作者、日期、分类、标签、字数、阅读时长、浏览量等文章信息，分别作用于首页和文章页
    showAuthor: true, // 是否展示作者
    showCreateDate: true, // 是否展示创建日期
    showUpdateDate: true, // 是否展示更新日期，是否展示更新时间，仅在文章页显示
    showCategory: true, // 是否展示分类
    showTag: true, // 是否展示标签
    // showTag: ["article"], // 是否展示标签

    // 将文章信息传到一级标题下面
    // teleport: {
    //   selector: "h1",
    //   position: "after",
    //   className: "h1-bottom-info",
    // },
  },

  // 超过半年的文章自动提示文章内容可能已过时
  articleTopTip: (frontmatter) => {
    const tip: Record<string, string> = {
      type: "warning",
      text: "文章发布较早，内容可能过时，阅读注意甄别。",
    };

    // 大于半年，添加提示
    const longTime = 6 * 30 * 24 * 60 * 60 * 1000;
    if (
      frontmatter.date &&
      Date.now() - new Date(frontmatter.date).getTime() > longTime
    )
      return tip;
  },

  // // 评论配置
  // comment: {
  //   provider: "twikoo",
  //   options: CommentData,
  // },
  comment: {
    provider: "render",
    // options: CommentData,
  },

  // // 公告
  // notice: {
  //   enabled: true, // 是否启用公告功能
  //   title: "公告", // 公告标题，支持函数式：需要和国际化搭配使用，根据不同语言环境返回不同标题
  //   initOpen: true,
  //   duration: 4000, // 弹框定时自动关闭，0 不自动消失
  //   mobileMinify: false, // 移动端自动最小化
  //   reopen: true, // 关闭公告弹框后，是否支持重新打开，如果为 false，则代表公告只显示一次
  //   useStorage: true, // 是否使用 localStorage 存储公告状态，如：当打开公告弹框后，下次进来则自动打开弹框
  //   twinkle: false, // 公告图标是否打开闪烁提示
  //   position: "center", // 公告弹框出现位置
  // },

  vitePlugins: {
    permalink: true,
    sidebar: true,

    sidebarOption: {
      initItems: false, //这条命令注释后，才会让文档和目录的样式保持一致
      collapsed: true, //打开侧边栏自动收缩功能
      ignoreList: [/^_.*$/],
      resolveRule: "rewrites",
      checkRewritesPrefix: true,
      ignoreIndexMd: true,
    },

    autoFrontmatter: true, // 自动生成 frontmatter
    // permalinkOption: {
    //   notFoundDelayLoad: 1000, // 1秒后加载
    // },

    // 自动格式formatter插件 添加文章封面图
    autoFrontmatterOption: {
      // exclude: { title: true, date: true }, // 排除自动生成字段
      transform: (frontmatter) => {
        // 如果文件本身存在了 coverImg，则不生成
        if (frontmatter.coverImg) return;

        const list = CoverImgList;

        const coverImg = list[Math.floor(Math.random() * list.length)];

        const transformResult = { ...frontmatter, coverImg };

        return Object.keys(transformResult).length
          ? transformResult
          : undefined;
      },
    },
  },

  markdown: {
    config: (md) => {
      md.use(timeline); //时间线插件
      md.use(groupIconMdPlugin); // 代码组图标插件
      // 文章自动广告：无需手动在 md 中写 <GoogleAd>，自动在文首/文末/长文中间注入
      md.use(autoGoogleAd, {
        adSlot: "2668661755", // 广告单元 ID
        adFormat: "fluid",
        positions: ["top", "bottom"],
        every: 5, // 每隔 5 个标题插入一个中间广告
        maxAds: 3, // 每篇最多 3 个（Google 政策上限）
      });
      // 【AURA Fix-20250830】防 markdown-it-anchor 崩溃：在"anchor" ruler 之前加一层守卫 ruler。
      // 崩溃根因：自定义插件 autoGoogleAd + 特殊 md 结构（原考务助手.md）组合，
      // 让某些 heading_open → inline token 的 children 变成 null（而不是 []），
      // 随后 markdown-it-anchor 的 permalink 阶段对 `children.push/unshift` 抛 null.push。
      // 策略：主动 normalize 所有 heading_open 后紧跟的 inline token.children 为数组（若不是数组）。
      md.core.ruler.before('anchor', 'normalize-heading-inline-children', (state) => {
        const tokens = state.tokens;
        for (let i = 0; i < tokens.length; i++) {
          const t = tokens[i];
          if (t && t.type === 'heading_open') {
            const next = tokens[i + 1];
            if (next && next.type === 'inline' && !Array.isArray(next.children)) {
              (next as any).children = [];
            }
          }
        }
      });
    },
    demo: {
      githubUrl:
        "https://github.com/Kele-Bingtang/vitepress-theme-teek/blob/master/docs",
    },
  },
  siteAnalytics: [
    {
      provider: "baidu",
      options: {
        id: "d5ee872d9aa1ef8021f4a3921b2e9c2a",
      },
    },
    {
      provider: "google",
      options: {
        id: "G-K5GNDW3L7K",
      },
    },
  ],

  // 赞赏在文章下方
  appreciation: {
    position: "doc-after",
    options: {
      // buttonHtml: `<button>测试按钮</button>`,
      icon: "weChatPay", // 赞赏图标，内置 weChatPay 和 alipay
      expandTitle: "打赏支持", // 展开标题，支持 HTML
      collapseTitle: "下次一定", // 折叠标题，支持 HTML
      content: `<img src='/img/alipay/1.png'><img src='/img/alipay/2.png'>`, // 赞赏内容，支持 HTML
      expand: false, // 是否默认展开，默认 false
    },
  },

  // 单文章页banner功能
  articleBanner: {
    enabled: true, // 是否启用单文章页 Banner
    showCategory: true, // 是否展示分类
    showTag: true, // 是否展示标签
    defaultCoverImg: "", // 默认封面图
    defaultCoverBgColor: "", // 默认封面背景色，优先级低于 defaultCoverImg
  },
});

// https://vitepress.dev/reference/site-config
export default defineConfig({
  rewrites: createRewrites({
    srcDir: "docs",
  }),

  extends: teekConfig,
  title: "当以读书通世事", //左上角网站名称
  description: description,

  cleanUrls: true, // 保持开启：其他站内页面 URL 不挂 .html 尾标（诗词页改用外链形式直连 .html，无需关闭此项）

  lastUpdated: true,
  lang: "zh-CN",
  head: HeadData as HeadConfig[],
  markdown: {
    // 开启行号
    lineNumbers: true,
    image: {
      // 默认禁用；设置为 true 可为所有图片启用懒加载。
      lazyLoading: true,
    },
    // 更改容器默认值标题
    container: {
      tipLabel: "提示",
      warningLabel: "警告",
      dangerLabel: "危险",
      infoLabel: "信息",
      detailsLabel: "详细信息",
    },
    // 【AURA Fix-20250830】markdown-it-anchor 默认 getTokensText 未对 heading 的 inline children
    // 做 null/undefined 守卫，考务助手.md + autoGoogleAd 插件组合下会触发 null.filter。
    // 同时 markdown-it-anchor 的 permalink 阶段会直接对 children.push/unshift，在同一场景下抛 null.push。
    // 解决方案（双保险）：
    //   1) 覆盖 getTokensText：显式空值守卫；
    //   2) 关闭 permalink（= false）：不再向标题插入 `¶` 永久链接按钮。
    //      副作用极小：标题仍有 #id（保证侧边栏/锚点跳转正常），只是页面内悬停时不再显示 ¶ 按钮。
    anchor: {
      getTokensText(tokens: any[] | null | undefined): string {
        if (!tokens || !Array.isArray(tokens)) return '';
        return tokens
          .filter((t) => t && (t.type === 'text' || t.type === 'code_inline'))
          .map((t) => (t.content as string) || '')
          .join('');
      },
      permalink: false,
    },
  },
  sitemap: {
    hostname: "https://www.sakaay.com",
    // transformItems: items => {
    //   const permalinkItemBak: typeof items = [];
    //   // 使用永久链接生成 sitemap
    //   const permalinks = (globalThis as any).VITEPRESS_CONFIG.site.themeConfig.permalinks;
    //   items.forEach(item => {
    //     const permalink = permalinks?.map[item.url];
    //     if (permalink) permalinkItemBak.push({ url: permalink, lastmod: item.lastmod });
    //   });
    //   return [...items, ...permalinkItemBak];
    // },
  },
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    // logo: "/teek-logo-mini.svg",
    logo: "https://img.sakaay.com/d/img/favicon.ico", //网站logo
    darkModeSwitchLabel: "主题",
    sidebarMenuLabel: "菜单",
    returnToTopLabel: "返回顶部",
    // lastUpdatedText: "上次更新时间",
    lastUpdated: {
      text: "最后更新于",
      formatOptions: {
        dateStyle: "full",
        timeStyle: "medium",
      },
    },
    outline: {
      level: [2, 4],
      label: "本页导航",
    },
    docFooter: {
      prev: "上一页",
      next: "下一页",
    },

    nav: Nav, // 导航栏配置
    // socialLinks: [{ icon: "github", link: "https://github.com/Kele-Bingtang/vitepress-theme-teek" }],
    socialLinks: SocialLinks, // 社交链接配置

    // search: {
    //   provider: "local",
    // },

    // algolia搜索
    search: {
      provider: "algolia",
      options: {
        appId: "6AC1N60WH4",
        apiKey: "90f7d1ece3094d290fe42fcaf6cdfd3c",
        indexName: "onedayxyy",
        locales: {
          root: {
            placeholder: "搜索文档",
            translations: {
              button: {
                buttonText: "搜索文档",
                buttonAriaLabel: "搜索文档",
              },
              modal: {
                searchBox: {
                  resetButtonTitle: "清除查询条件",
                  resetButtonAriaLabel: "清除查询条件",
                  cancelButtonText: "取消",
                  cancelButtonAriaLabel: "取消",
                },
                startScreen: {
                  recentSearchesTitle: "搜索历史",
                  noRecentSearchesText: "没有搜索历史",
                  saveRecentSearchButtonTitle: "保存至搜索历史",
                  removeRecentSearchButtonTitle: "从搜索历史中移除",
                  favoriteSearchesTitle: "收藏",
                  removeFavoriteSearchButtonTitle: "从收藏中移除",
                },
                errorScreen: {
                  titleText: "无法获取结果",
                  helpText: "你可能需要检查你的网络连接",
                },
                footer: {
                  selectText: "选择",
                  navigateText: "切换",
                  closeText: "关闭",
                  searchByText: "搜索提供者",
                },
                noResultsScreen: {
                  noResultsText: "无法找到相关结果",
                  suggestedQueryText: "你可以尝试查询",
                  reportMissingResultsText: "你认为该查询应该有结果？",
                  reportMissingResultsLinkText: "点击反馈",
                },
              },
            },
          },
        },
      },
    },

    editLink: {
      text: "在 GitHub 上编辑此页",
      // pattern: "https://github.com/Kele-Bingtang/vitepress-theme-teek/edit/master/docs/:path",
      pattern: "https://sakaay.com/teek/teek-one",
    },
  },

  vite: {
    server: {
      // host: "127.0.0.1", // 指定服务器应该监听哪个 IP 地址
      // port: 5173, // 指定开发服务器端口
      // strictPort: true, // 若端口已被占用则会直接退出
      // open: true, // 运行后自动打开网页
    },

    // 构建
    build: {
      chunkSizeWarningLimit: 1500, // 限制警告的块大小
    },

    plugins: [
      // 添加groupIconVitePlugin配置，确保使用本地图标资源
      groupIconVitePlugin({
        // 自定义图标资源路径，使用本地路径
        resourcePath: '/vp-icons.css',
        // 禁用外部资源加载
        external: false
      }),
      
      // 自动注入一级前缀（rewrite模式）
      AutoFrontmatter({
        pattern: "**/*.md",
        // exclude 指定的对象如果在 markdown frontmatter 存在，则忽略该文件。当 include 和 exclude 存在相同文件时，exclude 优先级高
        //exclude: { coverImg: true},
        recoverTransform: true, // false 只添加不存在的字段
        // 返回一个新的 frontmatter 或只返回 undefined，如果返回 {}，则清空 MD 文件本身存在的 frontmatter
        transform: (frontMatter: Record<string, any>, fileInfo: FileInfo) => {
          // 定义需要处理的所有规则（可扩展多个）
          const rules: TransformRule[] = [
            // { folderName: "95.Teek", prefix: "/teek" }, // 添加前缀
            // { folderName: "10.Teek", prefix: "/teek" }, // 添加前缀
            // { folderName: "20.工具资源/01.SSL证书", prefix: "/tool", removeLevel: 1 }, // 移除一层前缀后再添加前缀
            // { folderName: "10.笔记专栏/99.博客搭建", prefix: "/note", clear: true }, // 清空 permalink，优先级最高
            // { folderName: "20.文档", prefix: "/note", clear: true }, // 清空 permalink，优先级最高
            // { folderName: "01.前端/01.vite/", prefix: "/testa/$uuid5/$uuid1/$uuid10/$uuid99", removeLevel: 99}, // 清空前缀并且添加前缀使用随机数
            { folderName: "01.教学", prefix: "/teach/$uuid5", removeLevel: 99 },
            { folderName: "02.创客", prefix: "/steam/$uuid5", removeLevel: 99 },
            // { folderName: "10.运维", prefix: "/linux/$uuid5", removeLevel: 99 }, // 清空前缀并且添加前缀使用随机数
            // { folderName: "20.前端", prefix: "/qianduan/$uuid5", removeLevel: 99 }, // 清空前缀并且添加前缀使用随机数
            // { folderName: "30.编程", prefix: "/code/$uuid5", removeLevel: 99 }, // 清空前缀并且添加前缀使用随机数
            //{ folderName: "35.黑客", prefix: "/hacker/$uuid5", removeLevel: 99 }, // 清空前缀并且添加前缀使用随机数
            //{ folderName: "40.专题", prefix: "/zhuanti/$uuid5", removeLevel: 99 }, // 清空前缀并且添加前缀使用随机数
            { folderName: "50.工具", prefix: "/tools/$uuid5", removeLevel: 99 }, // 清空前缀并且添加前缀使用随机数
            { folderName: "60.生活", prefix: "/life/$uuid5", removeLevel: 99 }, // 清空前缀并且添加前缀使用随机数
            {
              folderName: "70.精神小屋",
              prefix: "/love/$uuid5",
              removeLevel: 99,
            }, // 清空前缀并且添加前缀使用随机数
            { folderName: "80.娱乐", prefix: "/yule/$uuid5", removeLevel: 99 }, // 清空前缀并且添加前缀使用随机数
            {
              folderName: "85.兴趣",
              prefix: "/xingqu/$uuid5",
              removeLevel: 99,
            }, // 清空前缀并且添加前缀使用随机数
            { folderName: "90.关于", prefix: "/about/$uuid5", removeLevel: 99 }, // 清空前缀并且添加前缀使用随机数
            // { folderName: "100.Teek", prefix: "/teek/$uuid5", removeLevel: 99 }, // 清空前缀并且添加前缀使用随机数
            //{ folderName: "110.hugo-teek", prefix: "/hugo-teek/$uuid5", removeLevel: 99 }, // 清空前缀并且添加前缀使用随机数
            // { folderName: "105.博客搭建", prefix: "/blog/$uuid5", removeLevel: 99}, // 清空前缀并且添加前缀使用随机数
            // { folderName: "40.专题/10.博客搭建/45.静态站点构建器", prefix: "/zhuanti/$uuid5", removeLevel: 99}, // 清空前缀并且添加前缀使用随机数
            // { folderName: "40.专题/10.博客搭建/45.静态站点构建器", prefix: "/zhuanti", clear: true }, // 清空前缀并且添加前缀使用随机数
          ];
          // 应用规则转换
          return useTransformByRules(frontMatter, fileInfo, rules);

          /*            // 如果文件本身存在了 coverImg，则不生成
                      if (frontMatter.coverImg) return; // 随机获取 coverImg
                      const list = [...Wallpaper, ...BlogCover];
                      const coverImg = list[Math.floor(Math.random() * list.length)];
                      const transformResult = { ...frontMatter, coverImg };
                      console.log("transformResult", transformResult)
                      return Object.keys(transformResult).length
                          ? transformResult
                          : undefined;*/
        },
      }),
    ],
  },

  // GitHub Pages基础路径配置
  base: "/",

  transformHtml: (code, id, context) => {
    if (context.page !== "404.md") return code;
    return code.replace("404 | ", "");
  },
});