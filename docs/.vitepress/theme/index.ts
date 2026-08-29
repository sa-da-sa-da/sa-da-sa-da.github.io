// 组件导入
import Teek from "vitepress-theme-teek";
import TeekLayoutProvider from "./components/TeekLayoutProvider.vue";
import { defineComponent, h, onMounted } from "vue";
import { useData } from "vitepress";
// import notice from "./components/notice.vue";
// import MNavLinks from "./components/MNavLinks.vue"; // 引入导航组件
import confetti from "./components/Confetti.vue"; //导入五彩纸屑组件
// import NavIcon from "./components/NavIcon.vue"; //导入导航栏图标
// 导入产品展示组件
import ProductGrid from "./components/ProductGrid.vue";
import ProductDetail from "./components/ProductDetail.vue";

import NavLayout from './layouts/NavLayout.vue'; // 引入导航布局组件
// 导入导航页相关组件
import { NavPage } from './components/nav-page/index';
import NavGrid from './components/nav-page/NavGrid.vue';


// Teek 在线主题包引用（需安装 Teek 在线版本）
import "vitepress-theme-teek/index.css"; // 引入主题样式
import "vitepress-theme-teek/theme-chalk/tk-code-block-mobile.css"; // 引入移动端代码块样式

import "vitepress-theme-teek/theme-chalk/tk-sidebar.css"; // 引入侧边栏样式

import "vitepress-theme-teek/theme-chalk/tk-nav.css"; // 引入导航栏样式

import "vitepress-theme-teek/theme-chalk/tk-aside.css"; // 文章目录样式
import "vitepress-theme-teek/theme-chalk/tk-doc-h1-gradient.css"; // 文档以及标题样式
import "vitepress-theme-teek/theme-chalk/tk-table.css"; // 表格样式
import "vitepress-theme-teek/theme-chalk/tk-mark.css"; // 文章 mark 标签样式
import "vitepress-theme-teek/theme-chalk/tk-blockquote.css"; //引用样式
import "vitepress-theme-teek/theme-chalk/tk-home-card-hover.css"; // 首页卡片悬停效果

import "vitepress-theme-teek/theme-chalk/tk-index-rainbow.css"; // Vitepress 首页彩虹渐变样式
import "vitepress-theme-teek/theme-chalk/tk-doc-fade-in.css"; // 文档淡入效果样式
import "vitepress-theme-teek/theme-chalk/tk-banner-desc-gradient.css"; // Banner 描述渐变样式

// 主题增强样式
import "vitepress-theme-teek/theme-chalk/tk-nav-blur.css"; // 导航栏毛玻璃样式
// import "vitepress-theme-teek/theme-chalk/tk-container.css"; // Markdown 容器样式
// import "vitepress-theme-teek/theme-chalk/tk-container-left.css"; // Markdown 容器左框样式
// import "vitepress-theme-teek/theme-chalk/tk-container-flow.css"; // Markdown 容器流体样式
import "vitepress-theme-teek/tk-plus/banner-full-img-scale.scss"; // Banner 全屏图片放大样式

import "./styles/code-bg.scss";
import "./styles/iframe.scss";
import "./style/index.scss"; // 引入One全局样式

// import "virtual:group-icons.css"; //代码组图标样式
import "vitepress-markdown-timeline/dist/theme/index.css"; // 引入时间线样式

//切换进度条
import { NProgress } from "nprogress-v2/dist/index.js"; // 进度条组件
import "nprogress-v2/dist/index.css"; // 进度条样式

import "vitepress-theme-teek/tk-plus/fade-up-animation.scss";// 首次加载的动画效果


import SLink from "./components/SLink/index.vue"; //友链

// 导入情侣相册组件
import CoupleAlbum from './components/CoupleAlbum/CoupleAlbum.vue'
import PhotoCard from './components/CoupleAlbum/PhotoCard.vue'
import ThreeDModelViewer from './components/ThreeDModelViewer.vue'
import MultipleChoiceQuestion from './components/MultipleChoiceQuestion.vue'
import FillInTheBlank from './components/FillInTheBlank.vue'
import PythonEditor from './components/PythonEditor.vue'
import ToolsGallery from './components/ToolsGallery.vue'
import AdPopup from './components/AdPopup.vue'

// 引入复制事件（复制后弹窗提示）
import { useCopyEvent } from "./composables/useCopyEvent.ts";


import "./components/guangbiaoTX/guangbiaoTX.scss"; // ⬅️ 鼠标拖尾样式scss
import { useGuangbiaoTX } from "./components/guangbiaoTX/useGuangbiaoTX"; // ⬅️ 导入鼠标拖尾星星动画ts
// import "./style/sidebar-icon.scss";
import { initImageViewer } from "./style/dd-image/dd-image.ts" // 引入图片查看器功能（替换原版

import EmojiShiroki from "./components/EmojiShiroki/index.vue"; // 引入EmojiShiroki组件

// 全局谷歌广告导入
const loadGoogleAds = () => {
  if (typeof window !== 'undefined') {
    try {
      // 检查脚本是否已加载，避免重复加载
      if (!window.adsbygoogle) {
        // 检查是否已有脚本标签
        let scriptTag = document.getElementById('google-adsense-script');
        if (!scriptTag) {
          scriptTag = document.createElement('script');
          scriptTag.id = 'google-adsense-script';
          scriptTag.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2897720906666216';
          scriptTag.async = true;
          scriptTag.crossOrigin = 'anonymous';
          
          // 添加错误处理
          scriptTag.onerror = (error) => {
            console.warn('Google AdSense 脚本加载失败:', error);
          };
          
          // 添加加载成功回调
          scriptTag.onload = () => {
            console.log('Google AdSense 脚本加载成功');
            // 脚本加载完成后，为已存在的广告单元触发刷新
            setTimeout(() => {
              refreshExistingAds();
            }, 200);
          };
          
          document.head.appendChild(scriptTag);
        }
      } else {
        // 如果脚本已加载，刷新现有广告
        refreshExistingAds();
      }
    } catch (error) {
      console.error('加载 Google AdSense 时出错:', error);
    }
  }
};

// 刷新页面上已存在的广告单元
const refreshExistingAds = () => {
  if (typeof window !== 'undefined' && window.adsbygoogle) {
    try {
      // 获取所有广告容器
      const adContainers = document.querySelectorAll('.adsbygoogle[data-ad-slot]');
      if (adContainers.length > 0) {
        // 延迟一点时间，确保DOM完全就绪
        setTimeout(() => {
          // 检查每个广告容器的宽度
          adContainers.forEach((container) => {
            if (container.clientWidth > 0) {
              (window.adsbygoogle = window.adsbygoogle || []).push({});
            }
          });
        }, 100);
      }
    } catch (error) {
      console.warn('刷新广告时出错:', error);
    }
  }
};

import DefaultTheme from 'vitepress/theme';
import { h } from 'vue';
// 导入 GoogleAd 组件
import GoogleAd from './components/GoogleAd.vue';

export default {
  extends: Teek,
  async enhanceApp({ app, router }) {
    // 注册组件
    // app.component("MNavLinks", MNavLinks); // 注册导航组件
    app.component("confetti", confetti); // 注册五彩纸屑组件

    app.component('CoupleAlbum', CoupleAlbum) // 注册情侣相册组件
    app.component('PhotoCard', PhotoCard)
    
    // app.component("NavIcon", NavIcon); //导航栏图标

    // 注册全局组件
    app.component("friend-link", SLink);
    
    // 注册3D模型查看器组件
    app.component('ThreeDModelViewer', ThreeDModelViewer);
    app.component('MultipleChoiceQuestion', MultipleChoiceQuestion);
    app.component('FillInTheBlank', FillInTheBlank);
    app.component('PythonEditor', PythonEditor);
    app.component('ToolsGallery', ToolsGallery); // 注册工具展示组件
    app.component('AdPopup', AdPopup); // 注册广告弹窗组件
    app.component('GoogleAd', GoogleAd); // 注册GoogleAd组件

    app.component("emoji-Shiroki", EmojiShiroki); // ◀️ 注入 Emoji 表情库组件布局
    app.component("NavLayout", NavLayout); // 注册导航布局组件
    
    // 注册导航页组件
    app.component('NavPage', NavPage);
    app.component('NavGrid', NavGrid);
    
    // 注册产品展示组件
    app.component('ProductGrid', ProductGrid);
    app.component('ProductDetail', ProductDetail);


    // 非SSR环境下配置路由进度条
    // @ts-expect-error
    if (!import.meta.env.SSR) {
      NProgress.configure({ showSpinner: false });
      router.onBeforeRouteChange = () => NProgress.start();
      router.onAfterRouteChange = () => {
        setTimeout(() => {
          NProgress.done();
          // 页面切换时加载谷歌广告
          loadGoogleAds();
        }, 100);
      };

    // 🔽 鼠标拖尾星星动画
    if (typeof window !== "undefined") {
      useGuangbiaoTX();
      // 初始加载谷歌广告
      loadGoogleAds();
    }  

    // 🔽 替换原版图片查看器
    initImageViewer();

    }
      // 不蒜子环境下配置路由进度条
    // if (inBrowser) {
    //   NProgress.configure({ showSpinner: false });
    //   router.onBeforeRouteChange = () => {
    //     NProgress.start(); // 开始进度条
    //   };
    //   router.onAfterRouteChanged = () => {
    //     NProgress.done(); // 停止进度条
    //   };
    // },  
    
  },
  Layout: defineComponent({
    name: "LayoutProvider",
    setup() {
      if (typeof window !== 'undefined') {
            // 监听复制事件
            useCopyEvent();
            // 布局加载时也加载谷歌广告
            loadGoogleAds();
          }

      const props: Record<string, any> = {};
      const { frontmatter, page } = useData();

      // 添加自定义 class 逻辑
      if (frontmatter.value?.layoutClass) {
        props.class = frontmatter.value.layoutClass;
      }


    

      // 对于其他所有页面，包括导航页面，都使用默认布局
      return () => h(TeekLayoutProvider, props);
    },
  }),
};