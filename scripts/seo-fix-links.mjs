/**
 * 修复内容里的死链（一次性，幂等）
 *   node scripts/seo-fix-links.mjs [--dry]
 */
import { readFile, writeFile, unlink } from 'node:fs/promises';

const DRY = process.argv.includes('--dry');
const edits = [];

const REPLACE = [
  // 1) 原始 HTML 里把 Markdown 链接塞进了 href
  [
    'content/exammination/在线练习/第06套在线题目.md',
    '<a href="[#](https://img.sakaay.com/d/img/sakaay/%E8%AF%95%E9%A2%98%E5%9B%BE%E7%89%87/excel/6-excel.xlsx)" target="_blank">',
    '<a href="https://img.sakaay.com/d/img/sakaay/%E8%AF%95%E9%A2%98%E5%9B%BE%E7%89%87/excel/6-excel.xlsx" target="_blank" rel="noopener">',
  ],
  // 2) 区间写法被 Markdown 当成了链接：[M,N](2<=M<=N<=1000)
  [
    'content/exammination/在线练习/第22套在线题目.md',
    '编程找任意一个区间[M,N](2<=M<=N<=1000)',
    '编程找任意一个区间 [M,N]（2<=M<=N<=1000）',
  ],
  // 3) 指向不存在的 twikoo-integration.md
  [
    'content/guide/friends-links.md',
    '[Twikoo 集成教程](./twikoo-integration.md)',
    '[Twikoo 官方文档](https://twikoo.js.org/)',
  ],
  // 4) 同目录相对链接失效（目标页有自定义 url）
  [
    'content/steam/编程系列/Python编程题目示例.md',
    '[Python在线编辑器示例](./Python在线编辑器示例.md)',
    '[Python在线编辑器示例](/steam/gcezx/)',
  ],
  // 5) 指向不存在的本地 PDF，去掉该徽章（保留右侧的在线画廊入口）
  [
    'content/steam/AI系列/01喂饭级教程！解决生图新体验：ComfyUI本地部署Zimage模型.md',
    '[![艺术画廊 PDF](https://img.shields.io/badge/%F0%9F%96%BC%20Art_Gallery-PDF-ff69b4)](assets/Z-Image-Gallery.pdf)&#160;',
    '',
  ],
];

for (const [f, from, to] of REPLACE) {
  const text = await readFile(f, 'utf8');
  if (!text.includes(from)) {
    edits.push([f, '⚠ 未找到待替换文本，跳过']);
    continue;
  }
  edits.push([f, '修复链接']);
  if (!DRY) await writeFile(f, text.replace(from, to), 'utf8');
}

// 6) 两个「目录页」与所属分区页共用同一 URL，导致 sitemap 重复
for (const f of ['content/exammination/excel/目录.md', 'content/exammination/python/目录.md']) {
  edits.push([f, '删除（与分区页 URL 重复，正文为空）']);
  if (!DRY) await unlink(f);
}

console.log(edits.map(([f, c]) => `${f} → ${c}`).join('\n'));
console.log(`\n共 ${edits.length} 项${DRY ? '（dry-run）' : '（已执行）'}`);
