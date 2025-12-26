<script setup lang="ts" name="ArticleListTest">
import { ref, onMounted } from 'vue';
import PostListAdInjector from './PostListAdInjector.vue';

// 模拟文章数据
const articles = ref([
  { id: 1, title: '文章标题 1', content: '这是第一篇文章的内容...' },
  { id: 2, title: '文章标题 2', content: '这是第二篇文章的内容...' },
  { id: 3, title: '文章标题 3', content: '这是第三篇文章的内容...' },
  { id: 4, title: '文章标题 4', content: '这是第四篇文章的内容...' },
  { id: 5, title: '文章标题 5', content: '这是第五篇文章的内容...' },
  { id: 6, title: '文章标题 6', content: '这是第六篇文章的内容...' },
  { id: 7, title: '文章标题 7', content: '这是第七篇文章的内容...' },
  { id: 8, title: '文章标题 8', content: '这是第八篇文章的内容...' },
]);

// 模拟加载更多文章
const loadMoreArticles = () => {
  const startId = articles.value.length + 1;
  for (let i = 0; i < 3; i++) {
    articles.value.push({
      id: startId + i,
      title: `文章标题 ${startId + i}`,
      content: `这是第${startId + i}篇文章的内容...`
    });
  }
};
</script>

<template>
  <div class="article-list-test">
    <h2>文章列表测试</h2>
    
    <!-- 注入广告组件 -->
    <PostListAdInjector :interval="3" />
    
    <div class="tk-home-post-list">
      <div 
        v-for="article in articles" 
        :key="article.id" 
        class="tk-post-item-card"
      >
        <h3>{{ article.title }}</h3>
        <p>{{ article.content }}</p>
      </div>
    </div>
    
    <button @click="loadMoreArticles" class="load-more-btn">加载更多文章</button>
  </div>
</template>

<style>
.article-list-test {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
}

.tk-home-post-list {
  margin-top: 2rem;
}

.tk-post-item-card {
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  border: 1px solid #eaeaea;
  border-radius: 8px;
  background-color: #fff;
}

.load-more-btn {
  margin-top: 2rem;
  padding: 0.75rem 1.5rem;
  background-color: #3498db;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
}

.load-more-btn:hover {
  background-color: #2980b9;
}
</style>
