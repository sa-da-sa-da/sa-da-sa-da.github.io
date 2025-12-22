export interface Product {
  id: string
  name: string
  price: number
  description: string
  images: string[]
  category: string
  details: string[]
  specifications: Record<string, string>
}

export const products: Product[] = [
  {
    id: 'notebook',
    name: '校园主题笔记本',
    price: 29.9,
    description: '采用优质纸张，封面印有校园标志性建筑图案',
    images: [
      "https://img.sakaay.com/d/img/bz/91b05a804e53f49a903a6a68aff89321.avif",
  "https://img.sakaay.com/d/img/bz/9ad9bf725cf51cd9bd2ffaca147054b0.avif",
  "https://img.sakaay.com/d/img/bz/9d083f65bf6443046ed3136b31963d18.avif","https://img.sakaay.com/d/img/bz/91b05a804e53f49a903a6a68aff89321.avif",
  "https://img.sakaay.com/d/img/bz/9ad9bf725cf51cd9bd2ffaca147054b0.avif",
  "https://img.sakaay.com/d/img/bz/9d083f65bf6443046ed3136b31963d18.avif",
    ],
    category: 'stationery',
    details: [
      '尺寸：14cm × 21cm',
      '页数：120页',
      '纸张：80g米黄色道林纸',
      '装订：无线胶装',
      '封面：250g铜版纸，覆亚光膜'
    ],
    specifications: {
      '材质': '纸张',
      '规格': 'A5',
      '颜色': '多种图案',
      '适用场景': '学习、办公、日记'
    }
  },
  {
    id: 'water-bottle',
    name: '校园logo保温杯',
    price: 89.9,
    description: '304不锈钢材质，保温效果好，印有校园logo',
    images: [
      '/img/culture/water-bottle.jpg',
      '/img/culture/water-bottle2.jpg',
      '/img/culture/water-bottle3.jpg'
    ],
    category: 'daily',
    details: [
      '容量：500ml',
      '材质：304不锈钢',
      '保温时间：12小时',
      '颜色：蓝色、粉色、银色',
      '设计：简约时尚，方便携带'
    ],
    specifications: {
      '材质': '304不锈钢',
      '容量': '500ml',
      '保温时长': '12小时',
      '颜色': '蓝、粉、银',
      '适用场景': '日常使用、户外活动'
    }
  },
  {
    id: 'pen',
    name: '定制钢笔',
    price: 69.9,
    description: '金属笔身，可定制姓名，赠送精美礼盒',
    images: [
      '/img/culture/pen.jpg',
      '/img/culture/pen2.jpg',
      '/img/culture/pen3.jpg'
    ],
    category: 'stationery',
    details: [
      '材质：金属笔身',
      '笔尖：0.5mm不锈钢笔尖',
      '墨水：黑色墨水',
      '包装：精美礼盒',
      '特点：可定制姓名或祝福语'
    ],
    specifications: {
      '材质': '金属',
      '笔尖粗细': '0.5mm',
      '墨水颜色': '黑色',
      '包装': '礼盒装',
      '适用场景': '书写、收藏、送礼'
    }
  },
  {
    id: 't-shirt',
    name: '校园文化衫',
    price: 59.9,
    description: '纯棉材质，舒适透气，印有校园文化图案',
    images: [
      '/img/culture/t-shirt.jpg',
      '/img/culture/t-shirt2.jpg',
      '/img/culture/t-shirt3.jpg'
    ],
    category: 'daily',
    details: [
      '材质：100%纯棉',
      '尺码：S、M、L、XL、XXL',
      '颜色：白色、蓝色、灰色',
      '印刷：环保水印，不易褪色',
      '特点：舒适透气，适合日常穿着'
    ],
    specifications: {
      '材质': '100%纯棉',
      '尺码': 'S-XXL',
      '颜色': '白、蓝、灰',
      '适用季节': '四季通用',
      '适用场景': '日常、运动、活动'
    }
  },
  {
    id: 'keychain',
    name: '校园建筑钥匙扣',
    price: 19.9,
    description: '金属材质，立体雕刻校园标志性建筑',
    images: [
      '/img/culture/keychain.jpg',
      '/img/culture/keychain2.jpg',
      '/img/culture/keychain3.jpg'
    ],
    category: 'gift',
    details: [
      '材质：锌合金',
      '尺寸：约5cm × 3cm',
      '工艺：立体雕刻',
      '颜色：金色、银色',
      '包装：OPP袋包装'
    ],
    specifications: {
      '材质': '锌合金',
      '尺寸': '5cm×3cm',
      '工艺': '立体雕刻',
      '颜色': '金、银',
      '适用场景': '钥匙挂件、背包挂件'
    }
  },
  {
    id: 'mug',
    name: '校园风景马克杯',
    price: 39.9,
    description: '陶瓷材质，印有校园四季风景图案',
    images: [
      '/img/culture/mug.jpg',
      '/img/culture/mug2.jpg',
      '/img/culture/mug3.jpg'
    ],
    category: 'daily',
    details: [
      '材质：陶瓷',
      '容量：350ml',
      '尺寸：约8.5cm × 9cm',
      '特点：微波炉和洗碗机适用',
      '包装：彩盒包装'
    ],
    specifications: {
      '材质': '陶瓷',
      '容量': '350ml',
      '适用范围': '微波炉、洗碗机',
      '颜色': '彩色图案',
      '适用场景': '办公室、家庭'
    }
  }
]
