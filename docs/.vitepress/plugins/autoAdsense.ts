import type { Plugin } from 'vite';
import type { TransformResult } from 'vite';

// 定义插件选项接口
interface AutoAdsenseOptions {
  minParagraphs?: number;      // 插入广告的最小段落数
  adComponent?: string;       // 广告组件标签名
  maxAds?: number;            // 最大广告数量
}

// 默认配置
const defaultOptions: AutoAdsenseOptions = {
  minParagraphs: 10,          // 至少10个段落才插入广告
  adComponent: '<Adsense />', // 默认使用Adsense组件
  maxAds: 4                   // 最多插入4个广告
};

/**
 * VitePress 自动插入广告插件
 * 功能：在长文章中自动插入指定数量的广告组件
 */
export function autoAdsense(options: AutoAdsenseOptions = {}): Plugin {
  // 合并配置
  const config = { ...defaultOptions, ...options };
  
  return {
    name: 'vitepress-auto-adsense',
    apply: 'build',
    
    transformIndexHtml(html: string): string | TransformResult {
      // 只处理包含文章内容的页面
      if (!html.includes('<main class')) {
        return html;
      }
      
      // 查找文章主内容区域
      const mainContentMatch = html.match(/(<main[^>]*>)([\s\S]*?)(<\/main>)/i);
      if (!mainContentMatch) {
        return html;
      }
      
      const [, mainStart, mainContent, mainEnd] = mainContentMatch;
      
      // 分割内容为段落
      const paragraphs = mainContent.split(/(<p[^>]*>.*?<\/p>)/gi).filter(Boolean);
      
      // 计算段落数（只计算真正的段落标签）
      const actualParagraphs = paragraphs.filter(p => p.startsWith('<p'));
      
      // 如果段落数不足，不插入广告
      if (actualParagraphs.length < config.minParagraphs) {
        return html;
      }
      
      // 计算需要插入的广告数量
      const adCount = Math.min(
        config.maxAds,
        Math.floor(actualParagraphs.length / 5) // 每5个段落插入一个广告
      );
      
      if (adCount === 0) {
        return html;
      }
      
      // 计算插入位置
      const insertionPoints: number[] = [];
      for (let i = 1; i <= adCount; i++) {
        const position = Math.floor((actualParagraphs.length / (adCount + 1)) * i);
        insertionPoints.push(position * 2 - 1); // 考虑段落标签和内容的交替排列
      }
      
      // 插入广告
      let modifiedContent = paragraphs;
      let insertionOffset = 0;
      
      insertionPoints.forEach(position => {
        const insertIndex = position + insertionOffset;
        if (insertIndex < modifiedContent.length) {
          // 在段落之间插入广告组件
          modifiedContent.splice(insertIndex, 0, config.adComponent);
          insertionOffset++;
        }
      });
      
      // 重新组合内容
      const newHtml = html.replace(
        /(<main[^>]*>)([\s\S]*?)(<\/main>)/i,
        `${mainStart}${modifiedContent.join('')}${mainEnd}`
      );
      
      return newHtml;
    }
  };
}
