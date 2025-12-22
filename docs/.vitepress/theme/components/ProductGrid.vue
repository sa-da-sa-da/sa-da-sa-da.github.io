<template>
  <div class="product-grid">
    <div 
      v-for="product in filteredProducts" 
      :key="product.id" 
      class="product-card"
    >
      <div class="product-image">
        <div class="carousel-container">
          <img 
            v-for="(image, index) in product.images" 
            :key="index"
            :src="image" 
            :alt="product.name"
            loading="lazy"
            class="carousel-image"
            :class="{ active: currentImageIndex[product.id] === index }"
          />
          <button 
            class="carousel-button prev"
            @click="prevImage(product.id)"
            aria-label="上一张"
          >
            &lt;
          </button>
          <button 
            class="carousel-button next"
            @click="nextImage(product.id)"
            aria-label="下一张"
          >
            &gt;
          </button>
          <div class="carousel-indicators">
            <span 
              v-for="(image, index) in product.images" 
              :key="index"
              class="indicator"
              :class="{ active: currentImageIndex[product.id] === index }"
              @click="currentImageIndex[product.id] = index"
            ></span>
          </div>
        </div>
      </div>
      <div class="product-info">
        <h3 class="product-name">{{ product.name }}</h3>
        <p class="product-price">¥{{ product.price }}</p>
        <p class="product-description">{{ product.description }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { useData } from 'vitepress'
import type { PropType } from 'vue'

// 导入产品数据和接口
import { Product, products } from '../data/products'

const props = defineProps({
  category: {
    type: String as PropType<string>,
    default: ''
  }
})

const { page } = useData()

// 根据分类过滤产品
const filteredProducts = computed(() => {
  if (!props.category) return products
  return products.filter(product => product.category === props.category)
})

// 跟踪每个产品的当前图片索引
const currentImageIndex = ref<Record<string, number>>({})

// 初始化当前图片索引
onMounted(() => {
  // 为每个产品初始化当前图片索引为0
  products.forEach(product => {
    currentImageIndex.value[product.id] = 0
  })
})

// 上一张图片
const prevImage = (productId: string) => {
  const product = products.find(p => p.id === productId)
  if (!product) return
  
  const currentIndex = currentImageIndex.value[productId] || 0
  currentImageIndex.value[productId] = currentIndex > 0 ? currentIndex - 1 : product.images.length - 1
}

// 下一张图片
const nextImage = (productId: string) => {
  const product = products.find(p => p.id === productId)
  if (!product) return
  
  const currentIndex = currentImageIndex.value[productId] || 0
  currentImageIndex.value[productId] = currentIndex < product.images.length - 1 ? currentIndex + 1 : 0
}
</script>

<style scoped>
.product-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 24px;
  margin: 24px 0;
}

.product-card {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
  background-color: white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.product-image {
  width: 100%;
  height: 200px;
  overflow: hidden;
  position: relative;
}

.carousel-container {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.carousel-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  position: absolute;
  top: 0;
  left: 0;
  opacity: 0;
  transition: opacity 0.5s ease;
}

.carousel-image.active {
  opacity: 1;
  position: relative;
}

.carousel-button {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  background-color: rgba(0, 0, 0, 0.5);
  color: white;
  border: none;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  font-size: 18px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s ease;
  z-index: 10;
}

.product-card:hover .carousel-button {
  opacity: 1;
}

.carousel-button.prev {
  left: 10px;
}

.carousel-button.next {
  right: 10px;
}

.carousel-button:hover {
  background-color: rgba(0, 0, 0, 0.7);
}

.carousel-indicators {
  position: absolute;
  bottom: 10px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 8px;
  z-index: 10;
}

.indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: rgba(255, 255, 255, 0.5);
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.indicator.active {
  background-color: white;
  width: 24px;
  border-radius: 4px;
}

.product-info {
  padding: 16px;
}

.product-name {
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 8px 0;
  color: #1f2937;
}

.product-price {
  font-size: 20px;
  font-weight: 700;
  color: #ef4444;
  margin: 0 0 8px 0;
}

.product-description {
  font-size: 14px;
  color: #6b7280;
  margin: 0;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
