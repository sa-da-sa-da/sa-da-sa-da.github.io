---
title: friends-links
date: '2025-10-22T23:10:31+08:00'
url: /guide/friends-links
categories:
  - 指南
coverImg: http://cdn-hsyq-static.shanhutech.cn/bizhi/staticwp/202503/58027a08072962c94c5b3cc2a5a1e1af--1459684851.jpg
srcDir: guide
---

# 实现友链页面功能

本教程将指导你如何在 VitePress 主题中实现一个功能丰富的友链页面，包括随机访问、申请友链、头像滚动等功能，并集成 Twikoo 评论系统。

## 1. 准备工作

确保你已经完成以下步骤：

1. 安装 VitePress 主题并配置好基础项目。
2. 注册 Twikoo 服务并获取 `envId`（环境 ID）。

## 2. 创建友链组件

在主题的组件目录中创建一个 Vue 文件（如 `SLink/index.vue`），并添加以下代码：

```vue
<template>
  <div class="my-links-container">
    <!-- 页面主标题区域 -->
    <div class="my-links-title">
      <h1>{{ title }}</h1>
    </div>
    <!-- 顶部Banner区域 -->
    <div v-if="bannerShow" class="flink-banner" id="banners">
      <!-- 左上角smallTitle -->
      <div class="icon-heartbeat1 banners-small-title">
        {{ smallTitle }}
      </div>

      <!-- 右上角功能按钮组 -->
      <div v-if="bannerButtonGroupShow" class="banner-button-group">
        <!-- 随机访问按钮 -->
        <button class="banner-button secondary" @click="handleRandomVisit" :disabled="allLinks.length === 0"
          aria-label="随机访问友链">
          <i class="icon-paper-plane" style="font-size: 18px;"></i>
          <span class="banner-button-text">随机访问</span>
        </button>

        <!-- 申请友链按钮 -->
        <a class="banner-button primary" href="#post-comment" :disabled="!shouldShow" aria-label="申请友链">
          <i class="icon-link" style="font-size: 18px;"></i>
          <span class="banner-button-text">申请友链</span>
        </a>
      </div>

      <!-- 两行头像横向无限滚动区域（错位排列） -->
      <div class="tags-group-all" ref="scrollContainer">
        <div class="tags-group-wrapper">
          <!-- 第一行 -->
          <div class="tags-group-row" :class="{ 'offset-start': index % 2 === 0 }" v-for="(row, index) in avatarRows"
            :key="index">
            <div class="tags-group-content">
              <a v-for="(link, linkIndex) in row" :key="linkIndex" class="tags-group-icon" target="_blank"
                :href="link.link" :title="link.name" rel="external nofollow noopener">
                <img :src="link.avatar" :alt="link.name" loading="lazy" :class="{ irregular: link.irregular }">
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
    <!-- 友链分组列表，每个分组包含标题、描述和友链列表 -->
    <div v-for="(group, index) in linksData" :key="index" class="my-links-group">
      <!-- 分组标题容器 -->
      <div class="title-wrapper">
        <h3>{{ group.title }}</h3>
      </div>

      <!-- 分组描述文本 -->
      <p class="group-desc">{{ group.desc }}</p>

      <!-- 友链列表容器 -->
      <div class="links-grid">
        <!-- 每个友链项使用LinkItem子组件展示，通过:data传递友链信息 -->
        <div v-for="link in group.list" :key="link.link" class="links-grid__item">
          <LinkItem :data="link" />
        </div>
      </div>
    </div>

    <!-- 留言/评论区域，默认显示，可通过frontmatter隐藏 -->
    <div v-if="commentShow" class="my-message-section" id="post-comment">
      <div class="title-wrapper">
        <h3>申请友链</h3>
      </div>
      <p>想要和我交换友链？请在评论区按以下格式留言 💞</p>

      <!-- 留言卡片容器 -->
      <div class="message-card">
        <p>留言格式：</p>
        <!-- 示例格式 -->
        <pre>
名称: 时光笔记
链接: https://notes.ksah.cn
头像: https://notes.ksah.cn/logo.png
描述: 干货满满的技术笔记</pre>
        <!-- 评论区插槽 -->
        <!-- 默认为Twikoo评论组件，可通过插槽自定义其他评论系统 -->
        <slot name="comments">
          <Twikoo />
        </slot>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useData } from "vitepress";
import LinkItem from "./LinkItem.vue";
// 导入Twikoo评论组件
import Twikoo from "../Twikoo.vue";
import { computed } from "vue";

// 从页面frontmatter中获取配置数据
const { frontmatter } = useData();

// 从frontmatter中读取links字段，如果未定义则使用空数组
const linksData = computed(() => frontmatter.value.links || []);

// 从frontmatter中读取title字段，默认值为"我的友链"
const title = computed(() => frontmatter.value.title || "我的友链");

// 当frontmatter中comments为false时隐藏，默认显示
const commentShow = computed(() => frontmatter.value.comments !== false);
// 当frontmatter中banner为false时隐藏，默认显示
const bannerShow = computed(() => frontmatter.value.banner !== false);
// 当frontmatter中bannerButtonGroup为false时隐藏，默认显示
const bannerButtonGroupShow = computed(() => frontmatter.value.bannerButtonGroup !== false);
// 可自定义frontmatter中的smallTitle，作为banner的小标题，默认值为"与各位博主一起成长进步"
const smallTitle = computed(() => frontmatter.value.smallTitle || "与各位博主一起成长进步");

const allLinks = computed(() => {
  return linksData.value.reduce((acc, group) => {
    const processedLinks = group.list.map(link => ({
      ...link,
      avatar: link.avatar
    }));
    acc.push(...processedLinks);
    return acc;
  }, []);
});

// 将头像平均分成两行，并复制内容以实现无缝滚动
const avatarRows = computed(() => {
  const avatars = allLinks.value;
  if (avatars.length === 0) return [[], []];

  const mid = Math.ceil(avatars.length / 2);
  const row1 = avatars.slice(0, mid);
  const row2 = avatars.slice(mid);

  // 复制内容以实现无缝滚动
  return [
    [...row1, ...row1], // 第一行复制一份
    [...row2, ...row2]  // 第二行复制一份
  ];
});

// 随机访问友链
const handleRandomVisit = () => {
  if (allLinks.value.length === 0) return;
  const randomIndex = Math.floor(Math.random() * allLinks.value.length);
  const randomLink = allLinks.value[randomIndex];
  window.open(randomLink.link, "_blank");
};
</script>

<style scoped>
/* 字体图标 */
@import url("https://cdn.ksah.cn/fonts/icomoon/font.css");

/* 主容器样式 */
.my-links-container {
  max-width: 1500px;
  margin: 0 auto;
  padding: 40px 10px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen,
    Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif;
}

/* 标题区域样式 */
.my-links-title {
  margin-bottom: 50px;
  padding: 0 10px;
}

/* 主标题样式 */
.my-links-title h1 {
  font-size: 2rem;
  font-weight: 600;
  background: -webkit-linear-gradient(10deg, #bd34fe 5%, #e43498 15%);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
  line-height: 1.2;
  display: inline-block;
}
</style>
```

## 3. 配置友链数据

在页面的 frontmatter 中配置友链数据，例如：

```yaml
---
title: 我的友链
banner: true
bannerButtonGroup: true
smallTitle: 与各位博主一起成长进步
comments: true
links:
  - title: 技术博客
    desc: 分享技术干货
    list:
      - name: 时光笔记
        link: https://notes.ksah.cn
        avatar: https://notes.ksah.cn/logo.png
        descr: 干货满满的技术笔记
  - title: 个人博客
    desc: 记录生活点滴
    list:
      - name: One Blog
        link: https://onedayxyy.cn
        avatar: https://onedayxyy.cn/logo.png
        descr: 记录生活与技术的博客
---
```

## 4. 集成 Twikoo 评论系统

在友链页面的评论区插槽中，默认集成了 Twikoo 评论组件。确保你已经按照 [Twikoo 集成教程](./twikoo-integration.md) 完成了 Twikoo 的配置。

## 5. 测试功能

启动项目并访问友链页面，确保以下功能正常工作：

1. **随机访问**：点击“随机访问”按钮，随机跳转到友链页面。
2. **申请友链**：点击“申请友链”按钮，跳转到评论区。
3. **头像滚动**：确保头像区域实现无缝滚动效果。
4. **评论功能**：确保 Twikoo 评论系统正常加载。

## 6. 常见问题

1. **头像未显示**：检查 `avatar` 链接是否正确，并确保图片资源可访问。
2. **随机访问无效**：检查 `allLinks` 是否为空，并确保 `handleRandomVisit` 逻辑正确。
3. **评论未加载**：检查 Twikoo 的 `envId` 配置是否正确。

## 7. 扩展功能

你可以进一步优化友链页面，例如：

1. **自定义样式**：修改 CSS 文件以适配你的主题风格。
2. **动态加载友链**：通过 API 动态加载友链数据。
3. **更多交互功能**：添加点赞、分享等功能。

---

通过以上步骤，你已经成功实现了一个功能丰富的友链页面。接下来，你可以继续优化其他页面或功能模块。