const description = [
  "欢迎来到 vitepress-theme-teek 使用文档",
  "Teek 是一个基于 VitePress 构建的主题，是在默认主题的基础上进行拓展，支持 VitePress 的所有功能、配置",
  "Teek 拥有三种典型的知识管理形态：结构化、碎片化、体系化，可以轻松构建一个结构化知识库，适用个人博客、文档站、知识库等场景",
].toString();

// 导出head.ts
export const HeadData = [

  // 添加 51.la 统计脚本
  // [
  //   "script",
  //   {
  //     charset: "UTF-8",
  //     id: "LA_COLLECT",
  //     src: "//sdk.51.la/js-sdk-pro.min.js",
  //   },
  // ],
  // 初始化统计脚本（已注释）
  // [
  //   "script",
  //   {},
  //   `
  //       // 等待页面加载完成后初始化
  //       window.addEventListener('DOMContentLoaded', () => {
  //         if (typeof LA !== 'undefined') {
  //           LA.init({
  //             id: '3LmZHLhDZIDpMaT0', // 您应用的统计掩码
  //             ck: '3LmZHLhDZIDpMaT0', // 您应用的固定key值
  //             autoTrack: true, //开启事件分析功能
  //             hashMode: true, // 开启单页面应用模式
  //             screenRecord: true, //开启屏幕录制功能,默认为false
  //           });
  //         }
  //       });
  //     `,
  // ],




  ["meta", { name: "referrer", content: "no-referrer-when-downgrade" }], //不蒜子统计
  ["meta", { name: "author", content: "sakaay" }],
  ["meta", { name: "author", content: "s" }],
  ['meta', { property: 'og:description', content: '当以读书通世事' }],

  ['meta', { property: 'og:image', content: 'https://onedayxyy.cn/img/xyy.webp' }],


  [
    "meta",
    {
      name: "viewport",
      content:
        "width=device-width,initial-scale=1,minimum-scale=1.0,maximum-scale=1.0,user-scalable=no",
    },
  ],
  // Google AdSense账户meta标签
  [
    "meta",
    {
      name: "google-adsense-account",
      content: "ca-pub-2897720906666216"
    },
  ],
  [
    "meta",
    {
      name: "description",
      description,
    },
  ],


  ["meta", { name: "keywords", description }],
  ["meta", { name: "baidu-site-verification", content: "codeva-QnY1Xh758j" }], // 百度收录
  [
    "meta",
    { name: "msvalidate.01", content: "48CABE70F538B8D117567176ABF325AF" },
  ], // Bing 收录验证
  ["link", { rel: "icon", href: "/favicon.ico", type: "image/png" }],


  // 阿里在线矢量库
  [
    "link",
    {
      rel: "stylesheet",
      href: "//at.alicdn.com/t/font_2989306_w303erbip9.css",
    },
  ],
  [
    // 阿里图标库symbol 引用
    "script",
    {
      src: "https://at.alicdn.com/t/c/font_4899452_xj7acblxpxj.js",
      media: "print",
      onload: "this.media='all'",
    },
  ],
  // umami统计
  // [
  //   "script",
  //   {
  //     src: "https://umami.onedayxyy.cn/script.js",
  //     "data-website-id": "0d806f5d-cffa-41ec-98bf-862b2273ce4a",
  //     defer: "defer",
  //   },
  // ],
  [
    "noscript",
    {},
    '<meta http-equiv="refresh" content="0; url={https://www.baidu.com/}">',
  ], // 禁用js跳转



  // 免费的音乐播放器（已注释）
  // [
  //   "script",
  //   {
  //     type: "text/javascript",
  //     src: "https://cdn.bootcdn.net/ajax/libs/jquery/3.7.1/jquery.min.js",
  //     // src: "https://myhkw.cn/player/js/jquery.min.js",
  //   },
  // ], 
  // [
  //   "script",
  //   {
  //     type: "text/javascript",
  //     id: "myhk",
  //     src: "https://myhkw.cn/api/player/176458472645",
  //     key: "176458472645",
  //     m: "1",
  //     lr: "r",
  //     defer: "defer",  // 添加defer属性，确保脚本在DOM加载完成后执行
  //   },
  // ],

  // Google广告脚本
  [
    "script",
    {
      async: "async",
      src: "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2897720906666216",
      crossorigin: "anonymous"
    },
  ],
  // Google分析代码
  [
    "script",
    {
      async: "async",
      src: "https://www.googletagmanager.com/gtag/js?id=G-RCSW3T1BEC"
    },
  ],
  [
    "script",
    {},
    `
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', 'G-RCSW3T1BEC');
    `
  ],
  // Usercentrics CMP脚本 - Cookie同意管理
  [
    "script",
    {
      src: "https://web.cmp.usercentrics.eu/modules/autoblocker.js",
      type: "text/javascript",
      async: "async"
    },
  ],
  [
    "script",
    {
      id: "usercentrics-cmp",
      src: "https://web.cmp.usercentrics.eu/ui/loader.js",
      "data-settings-id": "gPyeL7WXPTMoIL",
      type: "text/javascript",
      async: "async"
    },
  ],
  // 阿里图标库symbol 引用
  ["script", { src: "https://at.alicdn.com/t/c/font_4686603_33kna2v5qcm.js", defer: "defer", },],
  // 不再需要全局的vue-3d-loader和Three.js脚本，因为我们使用了专用的Vue组件
  // 阿里 Appflow AI 助手
  [
    "script",
    {
      src: "https://o.alicdn.com/appflow/chatbot/v1/AppflowChatSDK.js",
      defer: "defer",
    },
  ],
  [
    "script",
    {},
    `
      // 等待DOM加载完成，确保SDK已加载
      window.addEventListener('DOMContentLoaded', function() {
        // 添加安全检查，确保SDK已正确加载
        if (window.APPFLOW_CHAT_SDK && typeof window.APPFLOW_CHAT_SDK.init === 'function') {
          try {
            window.APPFLOW_CHAT_SDK.init({
              integrateConfig: {
                integrateId: 'cit-841be9e6dd4048c0b115',
                domain: {
                  requestDomain: 'https://aisakaay.sakaay.com'
                }
              }
            });
          } catch (error) {
            console.warn('AI助手初始化失败:', error);
          }
        } else {
          console.warn('AI助手SDK未正确加载');
          // 设置3秒后重试
          setTimeout(function() {
            if (window.APPFLOW_CHAT_SDK && typeof window.APPFLOW_CHAT_SDK.init === 'function') {
              try {
                window.APPFLOW_CHAT_SDK.init({
                  integrateConfig: {
                    integrateId: 'cit-841be9e6dd4048c0b115',
                    domain: {
                      requestDomain: 'https://aisakaay.sakaay.com'
                    }
                  }
                });
              } catch (retryError) {
                console.warn('AI助手重试初始化失败:', retryError);
              }
            }
          }, 3000);
        }
      });
    `,
  ],
];
