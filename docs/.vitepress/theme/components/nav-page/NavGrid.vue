<script setup>
import navData from '../../data/apps.json'

const openLink = (url) => {
  window.open(url, '_blank')
}

// 判断是否为图片路径 (简单判断：包含 / 或 . 即视为图片)
const isImage = (str) => {
  return str.includes('/') || str.includes('.')
}
</script>

<template>
  <div class="nav-container">
    <div v-for="(section, index) in navData" :key="index" class="nav-section">
      <h2 class="section-title">{{ section.title }}</h2>
      <div class="grid-box">
        <div 
          v-for="(item, idx) in section.items" 
          :key="idx" 
          class="nav-card"
          @click="openLink(item.url)"
        >
          <div class="icon-box">
            <img v-if="isImage(item.icon)" :src="item.icon" :alt="item.name" class="img-icon" />
            <span v-else class="text-icon">{{ item.icon }}</span>
          </div>

          <div class="details">
            <div class="name">{{ item.name }}</div>
            <div class="desc">{{ item.desc }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.nav-container {
  width: 100%; max-width: 900px; margin: 40px auto; padding-bottom: 50px;
}

.section-title {
  color: rgba(255, 255, 255, 0.9); font-size: 1.2rem; font-weight: 600;
  margin-bottom: 15px; margin-top: 30px;
  text-shadow: 0 2px 4px rgba(0,0,0,0.5);
  border-left: 4px solid #3b82f6; padding-left: 10px;
}

.grid-box {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 15px;
}

.nav-card {
  background: rgba(40, 44, 52, 0.6);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px; padding: 12px;
  display: flex; align-items: center;
  cursor: pointer; transition: all 0.3s ease;
  text-decoration: none;
}
.nav-card:hover {
  background: rgba(40, 44, 52, 0.9); transform: translateY(-3px);
  box-shadow: 0 5px 15px rgba(0,0,0,0.3); border-color: rgba(255,255,255,0.3);
}

/* 👇 新增图标样式控制 */
.icon-box {
  width: 40px; height: 40px; /* 固定图标容器大小 */
  margin-right: 12px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0; /* 防止被挤压 */
}

.img-icon {
  width: 100%; height: 100%;
  object-fit: contain; /* 保持图片比例 */
  border-radius: 6px;
}

.text-icon {
  font-size: 1.8rem;
  line-height: 1;
}
/* 👆 新增结束 */

.details { display: flex; flex-direction: column; overflow: hidden; }
.name { color: #fff; font-weight: 600; font-size: 1rem; }
.desc {
  color: rgba(255, 255, 255, 0.6); font-size: 0.8rem; margin-top: 2px;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
</style>