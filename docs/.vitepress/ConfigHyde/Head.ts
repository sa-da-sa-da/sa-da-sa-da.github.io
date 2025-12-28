import { HeadConfig } from 'vitepress'
import { fileURLToPath, URL } from 'node:url'
import { readFile } from 'node:fs/promises'

export async function loadSiteDescription() {
  try {
    const indexFilePath = fileURLToPath(new URL('../../index.md', import.meta.url))
    const content = await readFile(indexFilePath, 'utf8')
    const descriptionMatch = content.match(/^description:\s*(.+)$/m)
    return descriptionMatch ? descriptionMatch[1] : 'SAKAAY-飒龘'
  } catch (error) {
    console.error('Failed to load site description:', error)
    return 'SAKAAY-飒龘'
  }
}

const HeadData: HeadConfig[] = [
  [
    'link',
    {
      rel: 'stylesheet',
      href: 'https://cdn.jsdelivr.net/npm/@shoelace-style/shoelace@2.14.0/cdn/themes/light.css',
    },
  ],
  [
    'script',
    {
      type: 'module',
      src: 'https://cdn.jsdelivr.net/npm/@shoelace-style/shoelace@2.14.0/cdn/shoelace-autoloader.js',
    },
  ],
  [
    'script',
    {
      src: 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js',
    },
  ],
  [
    'script',
    {
      src: 'https://cdn.jsdelivr.net/npm/mermaid@10.6.1/dist/mermaid.min.js',
    },
  ],
  [
    'script',
    {
      src: 'https://cdn.jsdelivr.net/npm/medium-zoom@1.10.0/dist/medium-zoom.min.js',
    },
  ],
  [
    'script',
    {
      src: 'https://cdn.jsdelivr.net/npm/vanilla-lazyload@17.8.3/dist/lazyload.min.js',
    },
  ],
  [
    'script',
    {
      async: true,
      src: 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js',
      'data-ad-client': 'ca-pub-2897720906666216',
    },
  ],
  [
    'script',
    {
      async: true,
      src: 'https://www.googletagmanager.com/gtag/js?id=G-Y0W96Y00VQ',
    },
  ],
  [
    'script',
    {},
    `
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', 'G-Y0W96Y00VQ', { 'anonymize_ip': true });
    `,
  ],
  [
    'script',
    {},
    `
      // 确保DOM加载完成后执行
      document.addEventListener('DOMContentLoaded', function() {
        // 侧边栏广告注入函数
        function injectSidebarAds() {
          try {
            // 查找所有侧边栏元素
            const sidebarElements = document.querySelectorAll('.VPDocAside');
            
            if (sidebarElements.length === 0) {
              console.warn('未找到侧边栏元素，跳过广告注入');
              return;
            }
            
            sidebarElements.forEach(aside => {
              // 检查广告是否已经存在，避免重复添加
              if (aside.querySelector('.nav-aside')) {
                console.log('侧边栏广告已存在，跳过重复添加');
                return;
              }
              
              // 查找插入位置
              const docOutlineElement = aside.querySelector('[aria-labelledby="doc-outline-title"]');
              const spacerElement = aside.querySelector('.spacer');
              
              // 创建广告容器
              const adContainer = document.createElement('div');
              adContainer.className = 'ad-container nav-aside';
              adContainer.style.margin = '20px 0';
              adContainer.style.padding = '10px';
              adContainer.style.backgroundColor = '#f5f5f5';
              adContainer.style.borderRadius = '4px';
              adContainer.style.height = 'auto !important';
              
              // 创建广告元素
              const adElement = document.createElement('ins');
              adElement.className = 'adsbygoogle';
              adElement.style.display = 'block';
              adElement.style.width = '100%';
              adElement.style.height = '600px';
              adElement.setAttribute('data-ad-client', 'ca-pub-2897720906666216');
              adElement.setAttribute('data-ad-slot', '4522753183');
              adElement.setAttribute('data-ad-format', 'auto');
              adElement.setAttribute('data-full-width-responsive', 'true');
              
              // 将广告元素添加到容器中
              adContainer.appendChild(adElement);
              
              // 根据元素存在情况决定广告插入位置
              if (docOutlineElement && spacerElement) {
                // 如果两个元素都存在，将广告插入到docOutlineElement后面和spacerElement前面
                spacerElement.parentNode?.insertBefore(adContainer, spacerElement);
              } else if (docOutlineElement) {
                // 如果只有docOutlineElement存在，将广告插入到它后面
                docOutlineElement.parentNode?.insertBefore(adContainer, docOutlineElement.nextSibling);
              } else if (spacerElement) {
                // 如果只有spacerElement存在，将广告插入到它前面
                spacerElement.parentNode?.insertBefore(adContainer, spacerElement);
              } else {
                // 如果两个元素都不存在，将广告添加到aside元素的末尾
                aside.appendChild(adContainer);
              }
              
              // 安全地初始化侧边栏广告
              if (typeof window !== 'undefined' && window.adsbygoogle && window.adsbygoogle.push) {
                window.adsbygoogle.push({});
              } else {
                // 如果全局广告脚本未加载，使用延迟重试机制
                setTimeout(() => {
                  if (typeof window !== 'undefined' && window.adsbygoogle && window.adsbygoogle.push) {
                    window.adsbygoogle.push({});
                  }
                }, 1000);
              }
            });
          } catch (error) {
            console.warn('侧边栏广告注入时发生错误:', error);
          }
        }
        
        // 延迟执行广告注入，确保页面元素已完全加载
        setTimeout(injectSidebarAds, 500);
      });
    `,
  ],
]

export default HeadData