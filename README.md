# docs-xx · 站点（Hugo）

**仓库根目录就是 Hugo 工程本身**（`hugo.toml`、`content/`、`themes/` 等都在根）。主题为**自建**，位于 `themes/hugo-sakaay/`，支持三栏知识库、目录树、本地搜索、暗色模式与 6 套首页预设。

## 环境

- Hugo Extended ≥ 0.150（本项目用 **v0.166.0**）
  - 本机已通过 winget 安装（在 PATH 中，`hugo version` 可直接验证）
  - CI / 他人环境：`pnpm install` 会拉取同版本 `hugo-extended`；若网络不通，也可直接用系统 Hugo
- Node ≥ 18（仅用于 `scripts/prepare-deploy.mjs` 与搜索自检脚本）
- 站点静态资源（图片 / 音乐 / 模型等，约 143 MB）全部位于 `static/`，随仓库走，无需外部挂载

## 常用命令

```bash
pnpm install          # 安装 hugo-extended（可选，系统已有 Hugo 时可跳过）
pnpm dev              # 本地预览 http://localhost:1313
pnpm build            # 生产构建，产物在 public/
pnpm build:deploy     # 构建 + 部署前产物校验（推荐用于部署）
pnpm check:deploy     # 仅校验产物是否有超过平台限制的单文件
pnpm new              # 新建内容
```

## 部署（EdgeOne Makers）

已在 EdgeOne Makers 上以独立项目部署：项目名 `sakaayhugo`，部署内容为仓库根（工作区）+ `public`（产物）。

**平台限制**：EdgeOne Pages 单文件上限 **25MiB**，超限会在构建阶段直接 `Build error`（提示 `Files size limit exceeded`）。当前站点唯一超限的是 43MB 的本地视频 `music/video_《反乌托邦Pt.2》…mp4`，处理方式：

1. `hugo.toml` 的 `static` 挂载用 `excludeFiles` 排除该文件（源文件仍在 `static/music/` 下，本地预览不受影响）
2. `scripts/prepare-deploy.mjs` 作为兜底：扫描产物并删除任何超限文件（`pnpm build:deploy` 自动执行）
3. 该片源在播放器里降级为提示文案（视频加载失败时显示「该片源未随站点部署」），本地预览（文件存在）不受影响

> 若要让该片在线可播：压缩到 25MiB 以内，或上传到对象存储 / CDN 后把片单里的「源」改成外链。

## 目录结构

```
.（仓库根 = Hugo 工程根）
├── hugo.toml                  # 主配置（含 module.mounts）
├── config/_default/
│   ├── menus.toml             # 导航菜单
│   └── params.toml            # 站点参数（博主卡片、首页、搜索、评论、统计、广告…）
├── content/                   # 站点内容（唯一内容源，直接编辑这里）
├── data/                      # Hugo 数据：apps.json（导航页）、products.json（文创）
├── static/                    # 静态资源（约 143 MB：img / music / poetry / lab / assets …）
│   ├── js/search-worker.js    # FlexSearch Worker
│   └── data/*.json            # 组件运行时数据（工具/娱乐/播放器/相册/朋友圈…）
├── scripts/
│   ├── prepare-deploy.mjs     # 部署前清理超限文件
│   ├── seo-audit.mjs          # SEO 体检：扫产物里的 h1/标题/描述/重复度
│   ├── seo-fix-content.mjs    # 内容层 SEO 批量修正（幂等）
│   ├── seo-ld-check.mjs       # 校验全站 JSON-LD 是否可解析
│   └── test-search.mjs        # 搜索索引自检
└── themes/hugo-sakaay/
    ├── assets/css/            # 设计令牌 + 组件样式（SCSS）
    ├── assets/js/             # 交互脚本（主题/导航/搜索/挂件/文章/组件/Hero）
    ├── layouts/
    │   ├── _default/          # baseof / single / list / page / 归档 / 分类 / 标签 …
    │   ├── partials/          # head / header / footer / 侧栏卡片 / TOC / 评论 …
    │   └── shortcodes/        # mcq / fib / tf / python / ad / 播放器 / 相册 …
    └── theme.toml
```

## 内容维护

`content/` 是**唯一内容源**，直接编辑即可（改完 `pnpm dev` 实时预览 / `pnpm build` 出产物）。

常用 frontmatter：`title`、`url`（固定链接）、`date`、`categories`、`tags`、`coverImg`、`description`、`weight`（同目录排序）、`draft: true`（隐藏页面）。

新增一组照片墙 / 音乐 / 电影时，用对应 shortcode 在 md 里按行填数据即可，无需改代码：
`{{< gallery >}}`、`{{< music-player >}}`、`{{< vinyl-wall >}}`、`{{< movie-player >}}`、`{{< movie-wall >}}`。

## 功能对照（原站 → Hugo）

| 原功能 | Hugo 实现 |
|---|---|
| Algolia 搜索 | FlexSearch 本地搜索（构建期生成 `/search-index.json`），Algolia 配置保留在 `params.toml[search.algolia]` 可随时切回 |
| 三栏文档布局 | `layouts/_default/single.html` + `partials/sidebar.html` / `toc.html` |
| 分类/标签/归档/清单页 | Hugo taxonomy（`layouts/_default/terms.html`）+ `archives.html` + `article-overview.html` |
| 首页卡片侧栏 | `partials/widgets/*`（博主/公告/日历/时间进度/最新评论/精选/分类/标签/站点统计/公众号） |
| 评论 | Twikoo（`partials/comment.html`） |
| 风险链接提示 / 登录页 / 导航页 / iframe 页 | 独立 layout |
| 广告 | `partials` 内 AdSense 位 + `{{< ad >}}` shortcode |
| 统计 | 百度 / Google / Clarity / 51.LA |
| 暗色模式、主题色 | `.dark-mode` + 涟漪切换动画 |
| 配置切换（首页 6 套预设） | 导航栏调色盘按钮 → 弹层选择 `doc / blog / blog-part / blog-full / blog-body / blog-card`，写入 `localStorage['tk:configStyle']`，首帧前应用；Copy 复制预设配置 JSON。CSS 见 `assets/css/_home-styles.scss` |
| 首页透明导航栏 | Banner 模式（非 doc 预设）下首页导航栏透明浮于壁纸之上（白色文字 + 顶部渐隐遮罩），滚动后恢复实底毛玻璃；文档页与无 JS 环境保持实底降级。见 `_nav.scss`「首页 Banner 模式」段 |
| 独立面板配置（互不影响） | 配置面板内各配置独立持久化：页面最大宽度 `tk:pageWidth` → `--tk-page-max-width`（作用于 `.VPDoc`/`.VPNavBar`）、文档内容最大宽度 `tk:docWidth` → `--tk-doc-max-width`（作用于 `.content-container`）、主题色 `tk:themeColor`（8 色：VitePress 4 色 + ElementPlus 4 色，可恢复默认，令牌已改为 `var()`/`color-mix` 派生）、霓虹灯 `tk:neon`/`tk:neonMode`（辉光/描边）。均由 `style-switch.js` 应用，`head.html` 内联脚本首帧前恢复避免闪烁 |
| 侧栏折叠 | `#sidebarCollapse` 折叠为 64px 轨道（保留按钮，可再次展开），状态持久化 |
| 目录树 | 根节点固定为顶层分区（`.FirstSection`），递归全量渲染所有层级、支持逐组折叠，所有条目任何位置都可见 |
| 无刷新分页 | `assets/js/pagination.js` 拦截分页链接，fetch + 局部替换 `#postGrid` 与分页条，`pushState` 更新地址并支持前进/后退；切换前预热封面图，支持 View Transitions。未启用 JS 时仍走原生跳转 |
| 无刷新站内导航 | `assets/js/navigate.js` 拦截同源站内链接，只替换 `#VPContent` 与 `#page-extras`（顶栏/页脚/搜索弹窗不重建），悬停预取 + 内存缓存，`pushState`/`popstate` 支持前进后退；`assets/js/page.js` 的 `reinitPage()` 负责切换后重绑组件、目录树、评论、Hero 等；任一步失败自动回退整页跳转 |
| 全站导航过渡 | 无刷新导航 + View Transitions 双层保障：即便走了原生跳转也不会白屏闪烁 |
| 移动端 | 底部工具条（首页/目录/本页/搜索/主题）+ 目录抽屉 + 本页导航抽屉，解决窄屏无法进入目录的问题 |
| 照片墙 / 相册 | `{{< gallery >}}` shortcode：md 里每行一个图片地址（`|` 后可加说明文字），渲染瀑布流 + 聚光灯大图（键盘/触摸翻页、缩略图条、原图直链、入场渐显），见 `layouts/shortcodes/gallery.html` 与 `components.js` 的 `renderGalleryWall` |
| Python 在线编辑器 | Pyodide 多源回退（v0.26.2 → v0.25.1 → v0.24.1，jsDelivr 的 pyodide 镜像会下线旧版本导致 404），编辑器内部元素用类名作用域，一页多个编辑器互不干扰 |
| 音乐播放器 | `{{< music-player >}}` shortcode：md 里每行一首歌 `标题 \| 歌手 \| 封面 \| 音源`，渲染**黑胶唱机沉浸界面**（恒定深色场景：左侧歌单侧栏 + 右侧黑胶唱片/唱臂/动态声波/进度/控制），支持播放模式切换、上一首/下一首、进度拖拽、音量/静音、收起歌单，见 `layouts/shortcodes/music-player.html` 与 `components.js` 的 `renderMusicPlayer` |
| 唱片墙（音乐页） | `{{< vinyl-wall >}}` shortcode：同样数据格式渲染黑胶唱片卡片墙，hover 封面旋转；**与同页 `{{< music-player >}}` 页内联动**——点击唱片直接在下方播放器选曲播放（`__mpApi`），无需独立播放器页 |
| 电影播放器 | `{{< movie-player >}}` shortcode：md 里每行一部 `标题 \| 封面 \| 简介 \| 时长 \| 画质 \| 标签(逗号) \| 源`，源填直链或 `bilibili:BV号`；渲染**影院沉浸界面**（深色场景 + 片单侧栏 + 16:9 放映幕布 + 悬停控件条：进度/快进快退/静音/音量/全屏；外链走 iframe）+ 彩色信息徽章 + 标签，见 `components.js` 的 `renderMoviePlayer` |
| 海报墙（电影页） | `{{< movie-wall >}}` shortcode：同样数据格式渲染海报卡片墙，hover 浮起 + 播放键；**与同页 `{{< movie-player >}}` 页内联动**（`__mvApi`），点击海报直接在下方播放器选片 |
| 隐藏页面 | 源 md frontmatter 加 `draft: true` 即不渲染（迁移脚本会透传该字段），不出现在侧栏/搜索/归档；已隐藏：`音乐播放器`、`电影播放器`（播放器均内嵌到对应内容页） |
| Live2D 看板娘 | 原主题中本就未启用（注释状态），未迁移 |

## SEO

模板层已做下列处理（`themes/hugo-sakaay/layouts/partials/head.html` + `seo-description.html`）：

| 项 | 做法 |
|---|---|
| title 唯一且不短 | `页面标题 ｜ 章节 ｜ 站点名`；分区页追加「共 N 篇内容」；首页用 `站点名 - 标语` |
| meta description 每页唯一 | `partials/seo-description.html`：frontmatter → 正文纯文本摘要（150 字截断）→ 标题兜底；过短再补「章节 + 站点描述」语境 |
| h1 唯一 | `single.html` / `list.html` 判定**整篇正文**是否已有 h1（只查前 800 字符会导致一页两个 h1），有则不再重复渲染 |
| 图片 alt | 新增 `layouts/_default/_markup/render-image.html`：Markdown 图片一律输出非空 alt（原文 381 处无 alt），并加 `loading="lazy" decoding="async"`；模板里的菜单图标也补了 alt |
| 结构化数据 | 首页 `WebSite`、文章 `Article`、列表/分类 `CollectionPage` + `ItemList`、面包屑 `BreadcrumbList`（全站 532 个 JSON-LD 块） |
| 其它 | `canonical` / `og:*` / `twitter:*` 全量补齐并带 og:image 兜底；`robots.txt` 增加 `Sitemap:`；图片懒加载 |

体检与修正：

```bash
pnpm build
node scripts/seo-audit.mjs public sitemap seo-report.json   # 输出 h1/标题/描述/重复度报告
node scripts/seo-ld-check.mjs                              # 校验 JSON-LD
node scripts/seo-fix-content.mjs --dry                     # 预览内容层批量修正
```

> 内容层修正脚本会改写 `content/` 下的 frontmatter（目录页改名、重复标题消歧、缺 title 补全、第二个 h1 降级、`<img>` 补 alt），**幂等**，可重复执行。

全站静态体检（死链 / 图片 404 / canonical / alias noindex / 标题与描述长度 / 重复度）：

```bash
pnpm build
pnpm seo:check                       # 输出 JSON 报告
```

### 提交到 Bing 站长工具

**第一次（验证 + 提交 sitemap，约 5 分钟）**

1. 打开 <https://www.bing.com/webmasters>，用 Microsoft / Google 账号登录
2. 「添加网站」→ 输入 `https://www.sakaay.com/`
3. 验证方式选 **「HTML 元标记」**，复制它给的 `content` 值
4. 填到 `config/_default/params.toml`：

   ```toml
   [verification]
     bing = "这里粘贴 content 的值"
   ```

   然后 `pnpm build` + 部署，回到 Bing 点「验证」（模板已在 `head.html` 输出 `msvalidate.01`）
5. 左侧「站点地图」→ 提交 `https://www.sakaay.com/sitemap.xml`
6. 想省事可在 BWT 里「从 Google Search Console 导入」，站点与验证一次带过来

**之后每次更新内容（几秒，无需登录后台）**

```bash
pnpm build:deploy          # 构建 + 部署
pnpm seo:indexnow          # 把 sitemap 全部 URL 推给 Bing（IndexNow）
pnpm seo:indexnow --limit 10   # 或只推最近更新的 10 条
```

IndexNow 协议由 Bing / Yandex / Seznam 共用，提交一次多站生效；密钥在 `data/indexnow.json`，对应校验文件 `static/<key>.txt` 必须能通过 `https://www.sakaay.com/<key>.txt` 访问（已随构建产出）。状态码：200 成功、202 已接收、403 密钥文件不可访问、422 域名不匹配、429 请求过多。

## 验证与排障

```bash
# 站点构建是否正常
pnpm build

# FlexSearch 索引质量自检（读 public/search-index.json，对比多种 CJK 编码策略的召回）
node scripts/test-search.mjs
```

浏览器内可在控制台执行 `__search` 查看当前搜索状态（`ready / docs / results`）。

## 部署

构建产物为 `public/`，可直接静态托管：

```bash
pnpm install && pnpm build
# 产物目录：public
```

- **EdgeOne Pages / CNB**：构建命令 `pnpm install && pnpm build`（建议 `pnpm build:deploy`），产物目录 `public`。流水线见根目录 `.cnb.yml`。
- **GitHub Pages**：`.github/workflows/deploy-hugo-pages.yml`，推送到 `main` 自动构建发布（也可手动触发）。

## 与原站的取舍说明

- **未迁移**：`oh-my-live2d` 看板娘（原站即处于注释状态、未实际启用）、`DynamicWallpaperManager`（原站 import 的模块已不存在，属失效组件）。
- **安全调整**：原 `Timeline.vue` 把管理员密码明文写在客户端，迁移后不再下发给浏览器（`static/data/timeline.json` 中 `contentPassword` 为空），仅保留本地编辑能力。
- **外链占位图**：原组件用 `trae-api-cn.mchost.guru` 的 AI 生图接口做封面，迁移后改用站内图片，避免外部依赖。
- **旧 VitePress 站已整体移除**：原 `docs/`（含 `.vitepress`）已删除，内容以 `content/` 为准；历史版本仍可在 git 记录中找回。
