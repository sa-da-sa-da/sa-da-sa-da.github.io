/**
 * 从 data/edu_resources.json 生成两份「给 AI 看」的文件，供 WorkBuddy 学习使用：
 *
 *   static/edu-resources.md  —— 结构化知识库，可直接导入 WorkBuddy 资料库 / 腾讯网盘资料库
 *   static/llms.txt          —— 站点 AI 索引，AI 客户端访问站点时先读它了解有哪些资源
 *
 * 数据只维护一份（JSON）：站点页面 /teach/resources 与这两份文件都由它生成，不会漂移。
 * 用法：node scripts/build-edu-kb.mjs（已串进 pnpm build / build:deploy 的第一步）
 */
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const SITE = 'https://www.sakaay.com';

const data = JSON.parse(await readFile(join(ROOT, 'data', 'edu_resources.json'), 'utf8'));
const abs = (u) => (u.startsWith('/') ? SITE + u : u);

// ---------------------------------------------------------------- 知识库 Markdown
const md = [
  '# 教育教学资源库（WorkBuddy / AI 助教知识库）',
  '',
  `> 复核日期：${data.updated}`,
  '> 数据来源：`data/edu_resources.json`；本文件由 `pnpm edu:kb` 自动生成，请勿直接编辑。',
  `> 页面版：${SITE}/teach/resources/`,
  '',
  '## 这份资料库是做什么的',
  '',
  '本站（sakaay.com）从互联网筛选出的免费教育教学资源索引，面向高中信息技术教师、创客社团与学生。',
  '每条资源都标注了**学段、适用对象、怎么用、标签**，AI 可据此做资源推荐、教案设计、学习路径规划。',
  '',
  '## 在 WorkBuddy 里怎么用',
  '',
  '1. 把 `edu-resources.md` 加入 WorkBuddy 的「资料库」（或腾讯网盘资料库 / ima 知识库），作为长期备课上下文；',
  '2. 需要更新资源时，改 `data/edu_resources.json` 后跑 `pnpm edu:kb`，再把新文件同步进资料库；',
  '3. 推荐提示词（可直接复制）：',
  '   - 「基于资源库，为高一《数据与计算》第 4 章『走进智能时代』设计 2 课时教案，列出用到的资源链接与具体用途。」',
  '   - 「给零基础学生排一条 6 周的 Python + micro:bit 学习路径，只用库内免费资源，写清每周目标与对应链接。」',
  '   - 「筛出适合高中、教师备课、官方免费的资源，输出成表格（名称 / 链接 / 用途）。」',
  '   - 「对照 2025—2028 竞赛白名单，找出信息技术相关且面向普通高中的赛事，并说明备赛资源从哪找。」',
  '   - 「把资源库里 AI 通识类的内容整理成一份家长能读懂的推文大纲，标注每个结论的出处链接。」',
  '',
  `## 筛选口径`,
  '',
  data.note,
  '',
  `共 ${data.groups.length} 组 / ${data.groups.reduce((n, g) => n + g.items.length, 0)} 条资源。`,
  '',
  '---',
  '',
];

for (const [gi, g] of data.groups.entries()) {
  md.push(`## ${gi + 1}. ${g.icon} ${g.title}`, '');
  for (const [ii, it] of g.items.entries()) {
    md.push(`### ${gi + 1}.${ii + 1} ${it.name}`, '');
    md.push(`- 链接：${abs(it.url)}`);
    md.push(`- 适用学段：${it.stage}`);
    md.push(`- 适用对象：${it.audience}`);
    md.push(`- 简介：${it.desc}`);
    md.push(`- 怎么用：${it.use}`);
    md.push(`- 标签：${(it.tags || []).join('、')}`);
    md.push('');
  }
}

md.push(
  '---',
  '',
  '## 引用注意',
  '',
  '- 国家中小学智慧教育平台资源全部免费，但**任何单位及个人不得用于商业行为**（见平台官方说明）。',
  '- 谢作如团队开源课程采用 CC-BY 协议，转载请保留署名。',
  '- 竞赛结果不得作为中小学招生入学依据或高考加分项目，引用白名单时请一并说明。',
  '- 标注「需浏览器」的站点对无头访问有限制，人工浏览器打开正常。',
  ''
);

await writeFile(join(ROOT, 'static', 'edu-resources.md'), md.join('\n'), 'utf8');

// ---------------------------------------------------------------- llms.txt
const llms = [
  '# sakaay.com — 当以读书通世事',
  '',
  '> 高中信息技术教师的教学与创客资源站：信息技术课程、会考题库与在线练习、AI 通识、创客项目、课堂小工具，以及一份可导入 WorkBuddy 资料库的免费教育教学资源库。',
  '',
  '## 主要内容',
  '',
  `- [首页](${SITE}/): 最新文章、分区入口`,
  `- [教育教学资源库](${SITE}/teach/resources/): 按学段与课堂用途整理的免费资源清单（${data.groups.length} 组 / ${data.groups.reduce((n, g) => n + g.items.length, 0)} 条，复核于 ${data.updated}）`,
  `- [网站导航](${SITE}/nav/): 常用站点与自建服务，数据与 nav.sakaay.com 同步`,
  `- [会考在线练习](${SITE}/exammination/online-practice/): 高中信息技术会考分套练习`,
  `- [试题答案](${SITE}/exammination/examination-practice/): 会考复习题答案`,
  `- [全站文章归档](${SITE}/archives/): 按时间浏览全部文章`,
  '',
  '## 课堂工具（可直接打开使用）',
  '',
  `- [创意课堂随机点名器](${SITE}/seat-map/class-call.html): 卡牌 / 寻宝 / 转盘 / 扭蛋 / 盲盒五种抽选玩法`,
  `- [班级座位表智能调整系统](${SITE}/seat-map/seat-map.html): 智能排座、拖拽交换、导出 Word/Excel`,
  `- [随机点名工具](${SITE}/random-roll-call.html): 分组抽选、名单导入、全屏投屏`,
  `- [信息技术会考刷题王](${SITE}/lab/AI/xxhk.html): 1078 道真题按考点练习`,
  `- [高考古诗文背诵 60 篇](${SITE}/lab/AI/poem60.html): 转盘闯关与情境默写`,
  `- [3D DNA 实验室](${SITE}/lab/bio-dna/): 双螺旋与碱基配对交互演示`,
  `- [3D 地形实验室](${SITE}/lab/geo-terrain-lab/): 等高线、分层设色与水系汇流`,
  '',
  '## 给 AI 客户端的资料',
  '',
  `- [教育教学资源库（Markdown 知识库）](${SITE}/edu-resources.md): 建议导入 WorkBuddy 资料库 / 腾讯网盘资料库；含每条资源的学段、用途、标签与推荐提示词`,
  `- [站点地图](${SITE}/sitemap.xml): 全站可索引 URL`,
  '',
  '## 备注',
  '',
  '- 资源库只收录免费、可直接访问、有明确课堂用途的链接；商业与需付费条目不在其中。',
  '- 资源库内容以 `data/edu_resources.json` 为唯一数据源，页面与知识库文件同步生成。',
  '- 本站为个人教学记录站，非官方教育平台；引用官方资源请回到原站核对最新说明。',
  ''
];

await writeFile(join(ROOT, 'static', 'llms.txt'), llms.join('\n'), 'utf8');

console.log(`[edu:kb] 已生成 edu-resources.md 与 llms.txt（${data.groups.length} 组资源）`);
