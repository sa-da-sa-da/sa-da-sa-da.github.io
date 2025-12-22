---
title: 产品详情
description: 校园文创产品详情
date: 2025-12-23
---

<script setup>
import { onMounted, ref } from 'vue'
import { useData } from 'vitepress'
import { products } from '../../.vitepress/theme/data/products'

const { params } = useData()
const product = ref(null)

onMounted(() => {
  // 根据id查找产品
  const id = params.value.id
  product.value = products.find(p => p.id === id)
})
</script>

<template v-if="product">
  <h1>{{ product.name }}</h1>
  
  ## 产品详情
  
  <ProductDetail :product="product" />
</template>

<template v-else>
  <h1>产品未找到</h1>
  <p>抱歉，您访问的产品不存在。</p>
</template>
