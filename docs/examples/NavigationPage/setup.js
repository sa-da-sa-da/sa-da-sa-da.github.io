// 组件注册文件
import { defineAsyncComponent } from 'vue'

// 注册自定义标签页组件
export default {
  name: 'NavigationPage',
  components: {
    CustomTabs: defineAsyncComponent(() => import('./CustomTabs.vue')),
    DynamicTabs: defineAsyncComponent(() => import('./DynamicTabs.vue')),
    DraggableTabs: defineAsyncComponent(() => import('./DraggableTabs.vue')),
    CustomNavigation: defineAsyncComponent(() => import('./CustomNavigation.vue'))
  }
}