const description = [
  "🌟 解锁编程与教学新维度！sakaay.com 专为高中编程学习者与教育工作者打造，以 AI 赋能教学革新，深耕 Python 编程教学核心场景，提供从课程设计到实操落地的全流程资源支持。",
  "这里不仅有系统的 Vex 系列教程 —— 涵盖 LemLib 入门指南、配置实操、驾驶员控制、PID 整定、角运动等关键知识点，助你轻松攻克机器人编程难点；",
  "更聚焦教育技术融合热点，探讨教学实践中的核心问题，分享实用教学忠告与创新思路。无论是想提升编程技能的学生，还是寻求教学突破的老师，都能在这里找到精准、优质的学习与教学解决方案，开启高效成长之旅！",
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
  ["meta", { property: "og:description", content: "当以读书通世事" }],

  [
    "meta",
    { property: "og:image", content: "https://onedayxyy.cn/img/xyy.webp" },
  ],

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
      content: "ca-pub-2897720906666216",
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
  [
    "script",
    {
      src: "https://cloud.umami.is/script.js",
      "data-website-id": "3905b21b-8371-4d6a-ad60-9ba25a86cbf6",
      defer: "defer",
    },
  ],
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
      crossorigin: "anonymous",
    },
  ],
  // Google Funding Choices 脚本 - 用户数据选择同意
  [
    "script",
    {
      async: "async",
      src: "https://fundingchoicesmessages.google.com/i/pub-2897720906666216?ers=1",
    },
  ],
  [
    "script",
    {},
    `(function() {function signalGooglefcPresent() {if (!window.frames['googlefcPresent']) {if (document.body) {const iframe = document.createElement('iframe'); iframe.style = 'width: 0; height: 0; border: none; z-index: -1000; left: -1000px; top: -1000px;'; iframe.style.display = 'none'; iframe.name = 'googlefcPresent'; document.body.appendChild(iframe);} else {setTimeout(signalGooglefcPresent, 0);}}}signalGooglefcPresent();})();`,
  ],
  // Google分析代码
  [
    "script",
    {
      async: "async",
      src: "https://www.googletagmanager.com/gtag/js?id=G-RCSW3T1BEC",
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
    `,
  ],
  // Usercentrics CMP脚本 - Cookie同意管理
  [
    "script",
    {
      src: "https://web.cmp.usercentrics.eu/modules/autoblocker.js",
      type: "text/javascript",
      async: "async",
    },
  ],
  [
    "script",
    {
      id: "usercentrics-cmp",
      src: "https://web.cmp.usercentrics.eu/ui/loader.js",
      "data-settings-id": "gPyeL7WXPTMoIL",
      type: "text/javascript",
      async: "async",
    },
  ],
  // 阿里图标库symbol 引用
  [
    "script",
    {
      src: "https://at.alicdn.com/t/c/font_4686603_33kna2v5qcm.js",
      defer: "defer",
    },
  ],
  // 不再需要全局的vue-3d-loader和Three.js脚本，因为我们使用了专用的Vue组件
  // 新添加的脚本

  // 阿里 Appflow AI 助手 - 优化版
  [
    "script",
    {
      src: "https://o.alicdn.com/appflow/chatbot/v1/AppflowChatSDK.js",
      defer: "defer",
      // 添加async属性以避免阻塞页面渲染
      async: "async",
    },
  ],
  [
    "script",
    {},
    `
      // 优化的AI助手初始化逻辑 - 减少与浏览器插件冲突
      document.addEventListener('DOMContentLoaded', function() {
        // 检查是否在隐身模式或特殊环境
        const isIncognito = window.sessionStorage === null || typeof localStorage === 'undefined';
        
        // 检查是否有Immersive Translate等翻译插件存在的标志
        const hasTranslationPlugin = window.location.search.includes('translation') || 
                                     navigator.userAgent.includes('Translator') ||
                                     document.querySelector('[data-translation]');
        
        // 如果检测到翻译插件或在特殊环境，延迟初始化或跳过
        if (hasTranslationPlugin || isIncognito) {
          // 延迟更长时间再初始化，减少冲突
          setTimeout(initializeAIAssistant, 5000);
        } else {
          // 正常环境下使用较短延迟
          setTimeout(initializeAIAssistant, 1000);
        }
      });
      
      // 独立的初始化函数，便于管理
      function initializeAIAssistant() {
        // 添加更严格的安全检查
        if (typeof window !== 'undefined' && 
            window.APPFLOW_CHAT_SDK && 
            typeof window.APPFLOW_CHAT_SDK.init === 'function') {
          
          // 创建初始化配置对象
          const aiConfig = {
            integrateConfig: {
              integrateId: 'cit-841be9e6dd4048c0b115',
              domain: {
                requestDomain: 'https://aisakaay.sakaay.com'
              }
            },
            // 禁用部分可能导致冲突的功能
            disableLogReport: true,
            disableAutoTrack: true
          };
          
          // 添加超时处理
          const initPromise = new Promise((resolve, reject) => {
            // 设置初始化超时
            const timeoutId = setTimeout(() => {
              reject(new Error('AI助手初始化超时'));
            }, 10000);
            
            try {
              const result = window.APPFLOW_CHAT_SDK.init(aiConfig);
              clearTimeout(timeoutId);
              resolve(result);
            } catch (error) {
              clearTimeout(timeoutId);
              reject(error);
            }
          });
          
          // 处理初始化结果
          initPromise.then(() => {
            console.debug('AI助手初始化成功');
          }).catch(error => {
            console.warn('AI助手初始化失败:', error.message);
            // 仅在第一次失败后尝试一次重试
            if (!window._aiAssistantRetried) {
              window._aiAssistantRetried = true;
              console.debug('准备重试AI助手初始化...');
              setTimeout(() => {
                try {
                  window.APPFLOW_CHAT_SDK.init(aiConfig);
                  console.debug('AI助手重试初始化成功');
                } catch (retryError) {
                  console.warn('AI助手重试初始化失败:', retryError.message);
                }
              }, 5000);
            }
          });
        } else {
          console.debug('AI助手SDK未正确加载，跳过初始化');
        }
      }
    `,
  ],
];
