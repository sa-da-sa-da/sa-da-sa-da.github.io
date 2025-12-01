<h1 align="center">vitepress-theme-teek</h1>

<div align="center">

[Github](https://github.com/Kele-Bingtang/vitepress-theme-teek) ｜ [Gitee](https://gitee.com/kele-bingtang/vitepress-theme-teek) ｜ [Preview](https://notes.teek.top/) ｜[Docs](http://vp.teek.top/)

✨一个轻量、简洁高效、灵活配置、易于扩展的 VitePress       主题。

</div>

<p align="center">
  <a title="Github release" target="_blank" href="https://github.com/Kele-Bingtang/vitepress-theme-teek/releases">
    <img alt="GitHub release (latest by date)" src="https://img.shields.io/github/v/release/Kele-Bingtang/vitepress-theme-teek?logo=github">
  </a>

  <a title="Npm Version" target="_blank" href="https://www.npmjs.com/package/vitepress-theme-teek">
    <img src="https://img.shields.io/npm/v/vitepress-theme-teek?logo=npm&color=%09%23bf00ff" alt="https://img.shields.io/npm/v/vitepress-theme-teek?color=%09%23bf00ff">
  </a>

  <img src="https://img.shields.io/badge/v18.x-x?logo=node.js&label=node" alt="node version">
  <img src="https://img.shields.io/github/languages/code-size/Kele-Bingtang/vitepress-theme-teek?logo=Visual Studio Code&logoColor=blue" alt="GitHub code size in bytes">

  <a title="GitHub Discussions" target="_blank" href="https://github.com/Kele-Bingtang/vitepress-theme-teek/discussions">
    <img src="https://img.shields.io/github/discussions/Kele-Bingtang/vitepress-theme-teek?color=9cf&logo=github" alt="GitHub Discussions">
  </a>

  <a title="MIT License" target="_blank" href="https://github.com/Kele-Bingtang/vitepress-theme-teek/blob/master/LICENSE">
    <img src="https://img.shields.io/badge/license-MIT-green.svg" alt="MIT License">
  </a>
</p>

## Teek 在线安装

具体信息见如下链接：《[Teek](https://onedayxyy.cn/teek)》

![image-20250702074216619](https://img.onedayxyy.cn/images/image-20250702074216619.png)

## 本地运行

项目拉取

```bash
git clone https://cnb.cool/onedayxyy/vitepress-theme-teek-one-public.git
```

依赖安装（只能用 pnpm 安装依赖）

```bash
pnpm install
```

文档项目启动

```bash
pnpm docs:dev
```

## GitHub Pages 部署

本项目已配置 GitHub Actions 工作流，可以自动构建并部署到 GitHub Pages。

### 部署步骤

1. **推送代码到 GitHub 仓库**
   - 将项目代码推送到您的 GitHub 仓库的 `main` 或 `master` 分支
   - 工作流会自动触发构建和部署过程

2. **配置 GitHub Pages 设置**
   - 在 GitHub 仓库的 "Settings" → "Pages" 中
   - 确保 Source 选择为 "GitHub Actions"

3. **查看部署状态**
   - 在仓库的 "Actions" 标签页中可以查看部署进度
   - 部署成功后，您可以通过 `https://[用户名].github.io/[仓库名]` 访问网站

### 手动触发部署

您也可以在 GitHub 仓库的 "Actions" 标签页中手动触发工作流运行。

## License

[MIT](./LICENSE) License © 2025 [Teeker](https://github.com/Kele-Bingtang)
