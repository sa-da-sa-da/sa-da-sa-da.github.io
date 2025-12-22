<template>
  <div class="product-detail">
    <div class="product-main">
      <div class="product-images">
        <div class="main-image">
          <img :src="product.image" :alt="product.name" loading="lazy" />
        </div>
      </div>
      <div class="product-info">
        <h1 class="product-name">{{ product.name }}</h1>
        <p class="product-price">¥{{ product.price }}</p>
        <div class="product-description">
          <h3>产品描述</h3>
          <p>{{ product.description }}</p>
        </div>
        <div class="product-actions">
          <button class="add-to-cart" @click="addToCart">加入购物车</button>
          <button class="buy-now" @click="buyNow">立即购买</button>
        </div>
      </div>
    </div>
    
    <div class="product-details">
      <div class="details-section">
        <h2>产品详情</h2>
        <ul>
          <li v-for="(detail, index) in product.details" :key="index">{{ detail }}</li>
        </ul>
      </div>
      
      <div class="specifications-section">
        <h2>产品规格</h2>
        <table class="specifications-table">
          <tr v-for="(value, key) in product.specifications" :key="key">
            <th>{{ key }}</th>
            <td>{{ value }}</td>
          </tr>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Product } from '../data/products'

interface Props {
  product: Product
}

const props = defineProps<Props>()

// 模拟加入购物车功能
const addToCart = () => {
  alert(`已将 ${props.product.name} 加入购物车`)
}

// 模拟立即购买功能
const buyNow = () => {
  alert(`正在购买 ${props.product.name}`)
}
</script>

<style scoped>
.product-detail {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
}

.product-main {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 40px;
  margin-bottom: 40px;
}

.product-images {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.main-image {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
}

.main-image img {
  width: 100%;
  height: auto;
  display: block;
}

.product-info {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.product-name {
  font-size: 28px;
  font-weight: 700;
  margin: 0;
  color: #1f2937;
}

.product-price {
  font-size: 32px;
  font-weight: 700;
  color: #ef4444;
  margin: 0;
}

.product-description {
  background-color: #f9fafb;
  padding: 16px;
  border-radius: 8px;
}

.product-description h3 {
  margin: 0 0 8px 0;
  font-size: 18px;
  font-weight: 600;
}

.product-description p {
  margin: 0;
  color: #6b7280;
  line-height: 1.6;
}

.product-actions {
  display: flex;
  gap: 16px;
  margin-top: 24px;
}

.add-to-cart, .buy-now {
  flex: 1;
  padding: 16px 24px;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.add-to-cart {
  background-color: #f59e0b;
  color: white;
}

.add-to-cart:hover {
  background-color: #d97706;
}

.buy-now {
  background-color: #ef4444;
  color: white;
}

.buy-now:hover {
  background-color: #dc2626;
}

.product-details {
  background-color: #f9fafb;
  padding: 24px;
  border-radius: 8px;
}

.details-section, .specifications-section {
  margin-bottom: 32px;
}

.details-section h2, .specifications-section h2 {
  font-size: 24px;
  font-weight: 600;
  margin: 0 0 16px 0;
  color: #1f2937;
}

.details-section ul {
  list-style-type: disc;
  padding-left: 24px;
  margin: 0;
}

.details-section li {
  margin-bottom: 8px;
  color: #4b5563;
  line-height: 1.6;
}

.specifications-table {
  width: 100%;
  border-collapse: collapse;
}

.specifications-table th, .specifications-table td {
  padding: 12px 16px;
  text-align: left;
  border-bottom: 1px solid #e5e7eb;
}

.specifications-table th {
  background-color: #f3f4f6;
  font-weight: 600;
  color: #374151;
  width: 200px;
}

.specifications-table td {
  color: #4b5563;
}
</style>
