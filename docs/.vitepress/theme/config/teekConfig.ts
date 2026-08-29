import type { TeekConfig } from "vitepress-theme-teek/config";
import { version } from "vitepress-theme-teek/es/version";

import { FooterInfo } from "../../ConfigHyde/FooterInfo"; //导入底部信息配置
import { FriendLink } from "../../ConfigHyde/FriendLink"; // 导入FriendLink模块
import { HitokotoDate } from "../../ConfigHyde/HitokotoDate"; // 导入HitokotoData模块
import { Wallpaper } from "../../ConfigHyde/Wallaper"; // 导入Wallaper模块
import { Cover } from "../../ConfigHyde/Cover"; // 导入Wallaper模块
import { SocialDate } from "../../ConfigHyde/SocialDate"; // 导入SocialDate社交信息模块


// 文档配置
export const teekDocConfig: TeekConfig = {
  // 文档风格，footer简洁版
  footerInfo: {
    theme: {
      name: `Theme By sakaay@${version}`,
    },
    copyright: {
      createYear: 2025,
      suffix: "sakaay",
    },
  },  

  //选择第三个选项：全部站看，侧边栏和内容区域宽度都可以调整
  themeEnhance: {
    layoutSwitch: {
      defaultMode: "bothWidthAdjustable",
    },
  },
};

// 博客基础配置
const teekBlogCommonConfig: TeekConfig = {

  //选择第三个选项：全部站看，侧边栏和内容区域宽度都可以调整
  themeEnhance: {
    layoutSwitch: {
      defaultMode: "bothWidthAdjustable",
    },
  },


  teekHome: true,
  vpHome: false,

  banner: {
    enabled: true,
    name: "sakaay 当以读书通世事 🎉", // Banner 标题，默认读取 vitepress 的 title 属性
    bgStyle: "fullImg", // Banner 背景风格：pure 为纯色背景，partImg 为局部图片背景，fullImg 为全屏图片背景
    pureBgColor: "#28282d", // Banner 背景色，bgStyle 为 pure 时生效
    imgSrc: Wallpaper, // Banner 图片链接。bgStyle 为 partImg 或 fullImg 时生效
    imgInterval: 15000, // 当多张图片时（imgSrc 为数组），设置切换时间，单位：毫秒
    imgShuffle: true, // 图片是否随机切换，为 false 时按顺序切换，bgStyle 为 partImg 或 fullImg 时生效
    imgWaves: true, // 是否开启 Banner 图片波浪纹，bgStyle 为 fullImg 时生效
    mask: false, // Banner 图片遮罩，bgStyle 为 partImg 或 fullImg 时生效
    maskBg: "rgba(0, 0, 0, 0.4)", // Banner 遮罩颜色，如果为数字，则是 rgba(0, 0, 0, ${maskBg})，如果为字符串，则作为背景色。bgStyle 为 partImg 或 fullImg 且 mask 为 true 时生效
    textColor: "#ffffff", // Banner 字体颜色，bgStyle 为 pure 时为 '#000000'，其他为 '#ffffff'
    titleFontSize: "3.2rem", // 标题字体大小
    descFontSize: "1.4rem", // 描述字体大小
    descStyle: "types", // 描述信息风格：default 为纯文字渲染风格（如果 description 为数组，则取第一个），types 为文字打印风格，switch 为文字切换风格
    description: HitokotoDate, // 描述信息
    switchTime: 4000, // 描述信息切换间隔时间，单位：毫秒。descStyle 为 switch 时生效
    switchShuffle: true, // 描述信息是否随机切换，为 false 时按顺序切换。descStyle 为 switch 时生效
    typesInTime: 200, // 输出一个文字的时间，单位：毫秒。descStyle 为 types 时生效
    typesOutTime: 100, // 删除一个文字的时间，单位：毫秒。descStyle 为 types 时生效
    typesNextTime: 800, // 打字与删字的间隔时间，单位：毫秒。descStyle 为 types 时生效
    typesShuffle: false, // 描述信息是否随机打字，为 false 时按顺序打字，descStyle 为 types 时生效
  },  

  // // 首页顶部按 F11 开启壁纸模式
  // wallpaper: {
  //   enabled: true, // 是否启用壁纸模式
  //   hideBanner: true, // 开启壁纸模式后，全屏是否显示打字机文案，
  //   hideMask: true, // 开启壁纸模式后，是否隐藏 Banner 或 bodyBgImage 的遮罩层，则确保 banner.mask 和 bodyBgImage.mask 为 true 才生效
  //   // hideWaves: true, // 开启壁纸模式后，是否隐藏 Banner 波浪组件，仅 banner.bgStyle = 'fullImg' 生效
  // },
  // footerInfo: {
  //   customHtml: `<span id="runtime"></span>`, // 需要搭配 .vitepress/theme/helper/useRuntime.ts 使用
  // },
  
  footerInfo: FooterInfo, // 底部信息配置 
  friendLink: FriendLink, // 友链配置
  social: SocialDate, //社交信息配置
   
  


  
  // docAnalysis: {
  //   createTime: "2025-03-23",
  //   statistics: {
  //     // provider: "busuanzi",
  //     provider: "vercount",
  //     // url: "//bsz.eryajf.net/jsonp?callback=Busuanzicallback"
  //   },
  // },
  // friendLink: {
  //   list: [
  //     {
  //       name: "Teeker",
  //       desc: "朝圣的使徒，正在走向编程的至高殿堂！",
  //       avatar: "https://testingcf.jsdelivr.net/gh/Kele-Bingtang/static/user/avatar2.png",
  //       link: "http://notes.teek.top/",
  //     },
  //     {
  //       name: "vuepress-theme-vdoing",
  //       desc: "🚀一款简洁高效的VuePress 知识管理&博客 主题",
  //       avatar: "https://doc.xugaoyi.com/img/logo.png",
  //       link: "https://doc.xugaoyi.com/",
  //     },
  //     {
  //       name: "One",
  //       desc: "明心静性，爱自己",
  //       avatar: "https://onedayxyy.cn/img/xyy-touxiang.png",
  //       link: "https://onedayxyy.cn/",
  //     },
  //     {
  //       name: "Hyde Blog",
  //       desc: "人心中的成见是一座大山",
  //       avatar: "https://teek.seasir.top/avatar/avatar.webp",
  //       link: "https://teek.seasir.top/",
  //     },
  //     {
  //       name: "二丫讲梵",
  //       desc: "💻学习📝记录🔗分享",
  //       avatar: "https://wiki.eryajf.net/img/logo.png",
  //       link: " https://wiki.eryajf.net/",
  //     },
  //     {
  //       name: "粥里有勺糖",
  //       desc: "简约风的 VitePress 博客主题",
  //       avatar: "https://theme.sugarat.top/logo.png",
  //       link: "https://theme.sugarat.top/",
  //     },
  //     {
  //       name: "VitePress 快速上手中文教程",
  //       desc: "如果你也想搭建它，那跟我一起做吧",
  //       avatar: "https://avatars.githubusercontent.com/u/90893790?v=4",
  //       link: "https://vitepress.yiov.top/",
  //     },
  //     {
  //       name: "友人A",
  //       desc: "おとといは兎をみたの，昨日は鹿，今日はあなた",
  //       avatar: "http://niubin.site/logo.jpg",
  //       link: "http://niubin.site/",
  //     },
  //   ],
  //   autoScroll: true,
  // },
  // social: [
  //   {
  //     icon: "mdi:github",
  //     name: "GitHub",
  //     link: "https://github.com/kele-bingtang",
  //   },
  //   {
  //     icon: "simple-icons:gitee",
  //     name: "Gitee",
  //     link: "https://gitee.com/kele-bingtang",
  //   },
  // ],
};

// 博客默认配置
export const teekBlogConfig: TeekConfig = {
  ...teekBlogCommonConfig,
  banner: {
    name: "🎉 sakaay",
    description: "故事由我书写，旅程由你见证，传奇由她聆听 —— 来自 Young Kbt",
    bgStyle: "partImg",
  },
};

// 博客小图配置
export const teekBlogParkConfig: TeekConfig = {
  ...teekBlogCommonConfig,
  banner: {
    name: "🎉 sakaay",
    bgStyle: "partImg",
    imgSrc: ["/blog/bg1.webp", "/blog/bg2.webp", "/blog/bg3.webp"],
    description: [
      "故事由我书写，旅程由你见证，传奇由她聆听 —— 来自 Young Kbt",
      "积跬步以至千里，致敬每个爱学习的你 —— 来自 Evan Xu",
      "这一生波澜壮阔或是不惊都没问题 —— 来自 Weibw",
    ],
    descStyle: "switch",
  },
};

// 博客大图配置
export const teekBlogFullConfig: TeekConfig = {
  ...teekBlogCommonConfig,
  post: {
    coverImgMode: "full",
  },
  banner: {
    name: "🎉 sakaay",
    bgStyle: "fullImg",
    imgSrc: ["/blog/bg1.webp", "/blog/bg2.webp", "/blog/bg3.webp"],
    description: [
      "故事由我书写，旅程由你见证，传奇由她聆听 —— 来自 Young Kbt",
      "积跬步以至千里，致敬每个爱学习的你 —— 来自 Evan Xu",
      "这一生波澜壮阔或是不惊都没问题 —— 来自 Weibw",
    ],
    descStyle: "types",
  },
  comment: {
    provider: "giscus",
    options: {
      repo: "Kele-Bingtang/vitepress-theme-teek",
      repoId: "R_kgDONpVfBA",
      category: "Announcements",
      categoryId: "DIC_kwDONpVfBM4Cm3v9",
    },
  },
};

// 博客全图配置
export const teekBlogBodyConfig: TeekConfig = {
  ...teekBlogCommonConfig,
  pageStyle: "segment-nav",
  bodyBgImg: {
    imgSrc: ["/blog/bg1.webp", "/blog/bg2.webp", "/blog/bg3.webp"],
  },
  themeEnhance: {
    layoutSwitch: {
      defaultMode: "original",
    },
  },
};

// 博客卡片配置
export const teekBlogCardConfig: TeekConfig = {
  ...teekBlogCommonConfig,
  post: {
    postStyle: "card",
  },
  homeCardListPosition: "left",

};
