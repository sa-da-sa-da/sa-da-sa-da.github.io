<template>
  <button class="demo-button demo-button-primary">
    Primary Button
  </button>
</template>

<style scoped>
.demo-button {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.demo-button-primary {
  background-color: #3eaf7c;
  color: white;
}

.demo-button-primary:hover {
  background-color: #38a179;
}
</style>