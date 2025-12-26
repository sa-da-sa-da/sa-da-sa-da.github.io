// 底部信息配置
import { version } from "vitepress-theme-teek/es/version"; // 导入版本号

export const FooterInfo = {
  topMessage: [
    `<span><img alt="VitePress" src="./img/animals.png"><span/>`,
  
    `<a target="_blank" href="https://vitepress.dev/" title="本站框架基于 VitePress_v1.6.3" ><img alt="VitePress" src="https://img.shields.io/badge/Frame-VitePress-4868C2?logo=vitepress&amp;logoColor=fff" ></a>

    <a target="_blank" href="http://creativecommons.org/licenses/by-nc-sa/4.0/" title="本站内容采用 CC BY-NC-SA 4.0 国际许可协议进行许可"><img alt="Copyright" src="https://img.shields.io/badge/Copyright-BY--NC--SA%204.0-d42328?logo=coursera&amp;logoColor=fff"></a>
    
    <a target="_blank" href="https://twikoo.js.org/" title="本站评论系统使用 Twikoo" ><img alt="Twikoo" src="https://img.shields.io/badge/Comments-Twikoo-0072F9"></a>
    
    <a target="_blank" href="https://www.algolia.com/" title="本站搜索服务使用 Algolia"><img alt="Algolia" src="https://img.shields.io/badge/Search-Algolia-3095FA?logo=Algolia"></a>

    <a target="_blank" href="https://51.la/" title="本站统计服务使用 51.LA"><img alt="51.LA" src="https://img.shields.io/badge/51.LA-000000?logo=51.LA&label=Count&color=%23FF6A00"></a>
    
    <a target="_blank" href="https://nginx.org/" title="本站Nginx反向代理服务 Nginx"><img alt="Nginx" src="https://img.shields.io/badge/Nginx-Proxy?logo=Nginx&label=Proxy"></a>

   `
  ],
  theme: {
    name: `Theme By Teek@${version}-2025.10.19`,
  },
  bottomMessage: [
    `<script id="LA-DATA-WIDGET" crossorigin="anonymous" charset="UTF-8" src="https://v6-widget.51.la/v6/3LmZHLhDZIDpMaT0/quote.js?theme=#1690FF,#333333,#999999,#007BFF,#FFFFFF,#1690FF,12&f=12&display=0,0,1,1,1,1,1,1"></script>`,
    // `<span id="runtime"></span>(●'◡'●)`,
    "初闻不知曲中意，再听已是曲中人",
  ],
  copyright: {
    createYear: 2021,
    suffix: "sakaay|飒龘 当以读书通世事",
  },
  icpRecord: {
    name: "豫ICP备2024096633号-1",
    link: "http://beian.miit.gov.cn/",
  },
  // 网络安全备案信息配置
  securityRecord: {
    name: "豫公网安备41010702003985号",
    link: "https://beian.mps.gov.cn/#/query/webSearch?code=41010702003985",
  },
  customHtml: `<a href="/privacy" class="privacy-link">隐私政策</a>`, // 搭配 ./theme/composables/useRuntime.ts
};
