/* 临时验证脚本：自动广告插件（单元测试） */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const MarkdownIt = require('D:/00同步文件/00程序/docs-xx/node_modules/.pnpm/vitepress@1.6.4_@algolia+cl_ec41534e5d1c2572b25d8515f67456a3/node_modules/vitepress/node_modules/markdown-it');
import { autoGoogleAd } from './docs/.vitepress/plugins/auto-google-ad.ts';

const md = new MarkdownIt();
md.use(autoGoogleAd, { adSlot: '2668661755', positions: ['top', 'bottom'], every: 5, maxAds: 3 });

const count = (html) => (html.match(/data-ad-slot="2668661755"/g) || []).length;

// 1) 普通长文（10 个标题）：top + 第5个标题后 + bottom = 3 个
const longDoc = '# 标题一\n\n第一段内容。\n\n' + Array.from({ length: 10 }, (_, i) => `## 小标题${i + 1}\n\n内容段落。`).join('\n\n') + '\n\n结尾内容。';
const h1 = md.render(longDoc, { frontmatter: {} });
console.log('1) 长文广告数:', count(h1), '(期望 3)');

// 2) 手动含 <GoogleAd> 的文章：跳过
const h2 = md.render('# 标题\n\n开头。\n\n<GoogleAd ad-slot="2668661755" />\n\n中间内容。\n\n## 节\n\n内容。\n\n## 节2\n\n内容。\n\n## 节3\n\n内容。\n\n## 节4\n\n内容。\n\n## 节5\n\n内容。\n\n## 节6\n\n内容。', { frontmatter: {} });
console.log('2) 手动广告文章注入数:', count(h2), '(期望 1，仅手动的)');

// 3) frontmatter ad:false：跳过
const h3 = md.render(longDoc, { frontmatter: { ad: false } });
console.log('3) ad:false 注入数:', count(h3), '(期望 0)');

// 4) 短文：只 1 个
const h4 = md.render('# 标题\n\n一句话内容。\n\n## 小标题\n\n再一句话。', { frontmatter: {} });
console.log('4) 短文注入数:', count(h4), '(期望 1)');

// 5) home 页：跳过
const h5 = md.render('# 首页\n\n内容。', { frontmatter: { layout: 'home' } });
console.log('5) home 注入数:', count(h5), '(期望 0)');
