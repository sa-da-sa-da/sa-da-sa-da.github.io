// 从主题数据中导入产品数据
import { Product, products } from '../../.vitepress/theme/data/products'

// VitePress 1.6+ 要求 paths 文件导出包含 paths 属性的对象
export default {
  paths: products.map(product => {
    return {
      params: { id: product.id },
      props: { product }
    }
  })
}
