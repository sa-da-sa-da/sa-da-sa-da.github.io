<h1 align="center">sakaay 站点</h1>

<div align="center">

当以读书通世事 · 高中信息技术教师的多元工作记录站

</div>

## 项目结构

| 目录 | 说明 |
| --- | --- |
| `hugo/` | **主站**：Hugo 站点（自建主题 `hugo-sakaay`），部署目标 |
| `docs/` | legacy：原 VitePress + teek 主题站点；同时作为 Hugo 的静态资源来源（`hugo.toml` 挂载 `../docs/public`） |
| `.github/workflows/deploy-hugo-pages.yml` | 主流水线：推送 `main`/`master` 自动构建并发布 Hugo 站到 GitHub Pages |
| `.github/workflows/deploy-gh-pages.yml` | legacy 流水线：VitePress，已改为仅手动触发（回退用） |

## 本地开发（Hugo 主站）

```bash
# 首次：安装 hugo 目录下的依赖（hugo-extended 二进制）
pnpm --dir hugo install

# 本地预览 http://localhost:1313
pnpm dev

# 生产构建（产物 hugo/public）
pnpm build

# 构建 + 部署前校验（会剔除超出平台单文件体积限制的资源）
pnpm build:deploy

# 从 docs/ 重新迁移内容到 hugo/content（幂等）
pnpm migrate
```

> 站点构建依赖 `docs/public` 下的静态资源，因此 `docs/` 目录不可删除。

## 部署

1. **GitHub Pages（主站）**：推送到 `main` 后由 `deploy-hugo-pages.yml` 自动构建部署（需在仓库 Settings → Pages 中将 Source 设为 GitHub Actions）。
2. **EdgeOne Makers**：项目 `sakaayhugo`，构建配置见 `hugo/README.md` 的「部署」章节（注意平台单文件 25MiB 上限，`pnpm build:deploy` 会自动处理）。

## legacy：VitePress 站点

如需回退到 VitePress 版本，可在 Actions 页手动触发 `Deploy VitePress (legacy, manual only)`：

```bash
pnpm install         # 根目录依赖（VitePress）
pnpm docs:dev        # 本地预览
pnpm docs:build      # 产物 docs/.vitepress/dist
```

## License

[MIT](./LICENSE)

