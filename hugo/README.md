# docs-xx · Hugo 站点

原 VitePress 站点的 Hugo 版实现，主题为**自建**，位于 `themes/hugo-sakaay/`，支持三栏知识库、目录树、本地搜索、暗色模式与 6 套首页预设。

## 环境

- Hugo Extended ≥ 0.150（本项目用 `hugo-extended@0.166.0`，经 pnpm 安装在 `node_modules/`）
- Node ≥ 18（仅用于运行迁移脚本与调用 Hugo 二进制）
- 原站静态资源 137 MB **不重复拷贝**：通过 `hugo.toml` 的 `[module.mounts]` 挂载 `../docs/public` 到 `static/`

## 常用命令

```bash
pnpm install          # 安装 hugo-extended / js-yaml
pnpm dev              # 本地预览 http://localhost:1313
pnpm build            # 生产构建，产物在 public/
pnpm build:deploy     # 构建 + 部署前产物校验（推荐用于部署）
pnpm check:deploy     # 仅校验产物是否有超过平台限制的单文件
pnpm migrate          # 从 ../docs 重新迁移内容到 content/（幂等，会先清空 content）
```

## 部署（EdgeOne Makers）

已在 EdgeOne Makers 上以独立项目部署：项目名 `sakaayhugo`，部署内容为 `hugo/`（工作区）+ `hugo/public`（产物）。

**平台限制**：EdgeOne Pages 单文件上限 **25MiB**，超限会在构建阶段直接 `Build error`（提示 `Files size limit exceeded`）。当前站点唯一超限的是 43MB 的本地视频 `music/video_《反乌托邦Pt.2》…mp4`，处理方式：

1. `hugo.toml` 的 `../docs/public` 挂载用 `excludeFiles` 排除该文件（源文件保留在 `docs/public`，不影响原 VitePress 站）
2. `scripts/prepare-deploy.mjs` 作为兜底：扫描产物并删除任何超限文件（`pnpm build:deploy` 自动执行）
3. 该片源在播放器里降级为提示文案（视频加载失败时显示「该片源未随站点部署」），本地预览（文件存在）不受影响

> 若要让该片在线可播：压缩到 25MiB 以内，或上传到对象存储 / CDN 后把片单里的「源」改成外链。

## 目录结构

```
hugo/
├── hugo.toml                  # 主配置（含 module.mounts 静态资源挂载）
├── config/_default/
│   ├── menus.toml             # 导航菜单（与 VitePress Nav.ts 一一对应）
│   └── params.toml            # 站点参数（博主卡片、首页、搜索、评论、统计、广告…）
├── content/                   # 由迁移脚本生成（勿手改，改源站或改脚本）
├── data/                      # Hugo 数据：apps.json（导航页）、products.json（文创）
├── static/
│   ├── js/search-worker.js    # FlexSearch Worker
│   └── data/*.json            # 组件运行时数据（工具/娱乐/播放器/相册/朋友圈…）
├── scripts/migrate-content.mjs
└── themes/hugo-sakaay/
    ├── assets/css/            # 设计令牌 + 组件样式（SCSS）
    ├── assets/js/             # 交互脚本（主题/导航/搜索/挂件/文章/组件/Hero）
    ├── layouts/
    │   ├── _default/          # baseof / single / list / page / 归档 / 分类 / 标签 …
    │   ├── partials/          # head / header / footer / 侧栏卡片 / TOC / 评论 …
    │   └── shortcodes/        # mcq / fib / tf / python / ad / 播放器 / 相册 …
    └── theme.toml
```

## 内容迁移说明

`pnpm migrate` 会执行 `scripts/migrate-content.mjs`，完成：

1. `docs/**/*.md` → `content/<section>/**`，目录名去数字前缀，数字前缀转为 `weight` 保持侧边栏排序
2. frontmatter：`permalink → url`（完整保留原 URL）、`author` 对象拍平、原主题专用字段映射（`article/comment/copyright/sidebar/layout/catalogue`）；分类收敛为所属顶层分区（避免出现几十个碎片分类）；失效的外部 AI 生图封面替换为站内封面
3. VitePress 容器 `::: tip|warning|danger|info|details|center|navCard` → HTML 容器 / 导航卡片
4. Obsidian 风格围栏提示块 ```` ```{Note} ```` → 自定义容器
5. Vue 组件 → 语义化 HTML + JSON：
   - `MultipleChoiceQuestion` / `TrueOrFalseQuestion` / `FillInTheBlank` → `.sk-question`
   - `PythonEditor` → `.sk-python`、`GoogleAd` → `.ad-block`
   - `ToolsGallery` / `FunGallery` / `MusicPlayer` / `MoviePlayer` / `PdfReader` / `ThreeDModelViewer` / `About` / `ThoughtCards` / `CoupleAlbum` / `Moments` / `Timeline` / `ProductGrid` → `.sk-*`
6. 代码围栏内的内容不参与任何转换（避免改坏示例代码）

> `content/` 是生成物；需要改内容请改 `../docs` 源文件后重跑 `pnpm migrate`，或直接编辑 `content/` 并在下次迁移前注意覆盖风险。

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

## 验证与排障

```bash
# 站点构建是否正常
pnpm build

# FlexSearch 索引质量自检（读 public/search-index.json，对比多种 CJK 编码策略的召回）
node scripts/test-search.mjs
```

浏览器内可在控制台执行 `__search` 查看当前搜索状态（`ready / docs / results`）。

## 部署

构建产物为 `hugo/public/`，可直接静态托管：

```bash
cd hugo && pnpm install && pnpm build
# 产物目录：hugo/public
```

- **EdgeOne Pages / CNB**：构建命令改为 `cd hugo && pnpm install && pnpm build`，产物目录改为 `hugo/public`。
- **GitHub Pages**：已提供 `.github/workflows/deploy-hugo-pages.yml`，**仅手动触发**，不影响现有 VitePress 流水线。验证无误后如需切换主站，再把 push 触发器打开并停用旧工作流。

## 与原站的取舍说明

- **未迁移**：`oh-my-live2d` 看板娘（原站即处于注释状态、未实际启用）、`DynamicWallpaperManager`（原站 import 的模块已不存在，属失效组件）。
- **安全调整**：原 `Timeline.vue` 把管理员密码 `Hg@2025` 明文写在客户端，迁移后不再下发给浏览器（`static/data/timeline.json` 中 `contentPassword` 为空），仅保留本地编辑能力。
- **外链占位图**：原组件用 `trae-api-cn.mchost.guru` 的 AI 生图接口做封面，迁移后改用站内图片，避免外部依赖。
- **`content/`** 由脚本生成，含 `.migrate-manifest.json` 记录生成清单，用于增量清理陈旧文件。
