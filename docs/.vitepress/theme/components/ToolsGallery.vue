<script setup lang="ts">
import { ref, computed } from 'vue';
import AdPopup from './AdPopup.vue';

interface CardItem {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  cover: string;
  desc: string;
  tags: string[];
  playUrl: string;
  zipUrl?: string;
  type: 'lab' | 'tool';
}

const categories = [
  { key: '全部', label: '全部' },
  { key: '地理', label: '地理' },
  { key: '化学', label: '化学' },
  { key: '物理', label: '物理' },
  { key: '生物', label: '生物' },
  { key: '数学', label: '数学' },
  { key: '信息技术/数学', label: '信息技术/数学' },
  { key: '信息技术', label: '信息技术' },
  { key: '思想政治', label: '思想政治' },
  { key: '英语', label: '英语' },
  { key: '工具', label: '工具' },
];

const categoryColors: Record<string, string> = {
  '地理': '#4f46e5',
  '化学': '#7c3aed',
  '物理': '#2563eb',
  '生物': '#16a34a',
  '数学': '#dc2626',
  '信息技术/数学': '#0891b2',
  '信息技术': '#0891b2',
  '思想政治': '#c2410c',
  '英语': '#db2777',
  '工具': '#4b5563',
};

const items: CardItem[] = [
  {
    id: 'geo-terrain-lab',
    title: '3D 地形实验室',
    subtitle: '八年级 · 3D互动',
    category: '地理',
    cover: '/lab/geo-terrain-lab/cover.jpg',
    desc: '通过时间轴展示桂林峰林从峰丛期→峰林期→孤峰期的地貌演化过程；解析等高线疏密反映坡度陡缓、河流流向沿 V 谷下切；演示降雨引发的地表/地下双层汇流...',
    tags: ['3D地形', '等高线', '喀斯特', '汇流'],
    playUrl: '/lab/geo-terrain-lab/index.html',
    type: 'lab',
  },
  {
    id: 'geo-glacier-cave',
    title: '溶洞探秘',
    subtitle: '七年级 · 3D沉浸',
    category: '地理',
    cover: '/lab/geo-glacier-cave/cover.jpg',
    desc: '全景天穹视角沉浸式体验地下喀斯特溶洞；分阶段讲解钟乳石、石笋、石柱、地下河、溶蚀作用等喀斯特地貌成因，建立「滴水穿石」的地质时间尺度概念。',
    tags: ['溶洞', '喀斯特', '钟乳石', '沉浸漫游'],
    playUrl: '/lab/geo-glacier-cave/index.html',
    type: 'lab',
  },
  {
    id: 'geo-glacier-lab',
    title: '冰川作用实验室',
    subtitle: '八年级 · 3D互动',
    category: '地理',
    cover: '/lab/geo-glacier-lab/cover.jpg',
    desc: '对比冰川刨蚀形成的 U 形谷与流水下切的 V 形谷；理解冰斗、角峰、刃脊、冰碛（终碛垄与侧碛垄）等冰川地貌的成因与分布；体会冰川在山谷中的侵蚀与堆积...',
    tags: ['冰川', 'U形谷', '冰斗', '冰碛'],
    playUrl: '/lab/geo-glacier-lab/index.html',
    type: 'lab',
  },
  {
    id: 'chem-molecule',
    title: '3D 分子结构实验室',
    subtitle: '高一 · 3D互动',
    category: '化学',
    cover: '/lab/chem-molecule/cover.jpg',
    desc: '通过球棍模型直观展示 NaCl 离子晶体、NaHCO₃ 碳酸氢钠、NH₄Cl 氯化铵、Na₂CO₃ 碳酸钠四种典型分子/晶体的原子排列；理解离子键与共价键、配位数与晶...',
    tags: ['分子', '晶体', '球棍模型', '离子反应'],
    playUrl: '/lab/chem-molecule/index.html',
    type: 'lab',
  },
  {
    id: 'phy-physics',
    title: '3D 力学实验室',
    subtitle: '高一 · 3D互动',
    category: '物理',
    cover: '/lab/phy-physics/cover.jpg',
    desc: '通过对比不同摆长的单摆周期，理解 T=2π√(L/g) 公式；展示简谐振动的位移-时间正弦曲线；抛体运动展示角度 vs 射程关系；用铁球摆+绳+平衡位置摆动...',
    tags: ['单摆', '简谐振动', '抛体运动', '力学'],
    playUrl: '/lab/phy-physics/index.html',
    type: 'lab',
  },
  {
    id: 'bio-dna',
    title: '3D DNA 实验室',
    subtitle: '高一 · 3D互动',
    category: '生物',
    cover: '/lab/bio-dna/cover.jpg',
    desc: '展示 DNA 双螺旋三维结构，观察碱基互补配对（A-T、C-G）；理解磷酸-脱氧核糖骨架与碱基对的空间排布；演示孟德尔分离定律的遗传规律动画...',
    tags: ['DNA', '双螺旋', '碱基配对', '遗传'],
    playUrl: '/lab/bio-dna/index.html',
    type: 'lab',
  },
  {
    id: 'math-math',
    title: '3D 数学实验室',
    subtitle: '高一 · 3D互动',
    category: '数学',
    cover: '/lab/math-math/cover.jpg',
    desc: '可视化常见函数曲线（幂函数、指数函数、对数函数、三角函数）在三维空间中的形态；演示黄金分割优选法的迭代逼近过程；理解数学之美与几何直观...',
    tags: ['函数曲线', '优选法', '3D可视化', '数学'],
    playUrl: '/lab/math-math/index.html',
    type: 'lab',
  },
  {
    id: 'conv-conv',
    title: '卷积运算可视化实验室',
    subtitle: '高中 · 数学可视化',
    category: '信息技术/数学',
    cover: '/lab/conv-conv/cover.jpg',
    desc: '通过 3D 动画直观展示卷积运算的「翻转-平移-积分」全过程；观察两个信号 f 与 g 在时域中的交互与面积累积；理解卷积核在信号处理中的核心作用...',
    tags: ['卷积', '信号处理', '数学可视化', '翻转平移'],
    playUrl: '/lab/conv-conv/index.html',
    type: 'lab',
  },
  {
    id: 'conv-filter',
    title: '图像卷积滤镜实验室',
    subtitle: '高中 · 图像处理',
    category: '信息技术',
    cover: '/lab/conv-filter/cover.jpg',
    desc: '实时演示图像卷积处理效果：模糊、锐化、边缘检测、浮雕等经典滤镜；观察卷积核矩阵对像素邻域的加权运算过程；理解计算机视觉中特征提取的基本原理...',
    tags: ['图像处理', '卷积核', '边缘检测', '滤镜'],
    playUrl: '/lab/conv-filter/index.html',
    type: 'lab',
  },
  {
    id: 'eng-sentence',
    title: '句型建构实验室',
    subtitle: '初中 · 互动课件',
    category: '英语',
    cover: '/lab/eng-sentence/cover.jpg',
    desc: '通过词块拖拽组句的方式学习英语句型结构；涵盖常见时态、从句、被动语态等语法点；即时反馈与解析，帮助学生建立英语语法的系统化认知...',
    tags: ['句型', '语法', '词块组句', '互动'],
    playUrl: '/lab/eng-sentence/index.html',
    type: 'lab',
  },
  {
    id: 'poli-town',
    title: '小镇模拟经营',
    subtitle: '高中 · 社会发展思辨',
    category: '思想政治',
    cover: '/lab/poli-town/cover.jpg',
    desc: '以模拟经营游戏形式探讨社会发展中的资源配置、环境保护、民生福祉等议题；通过决策与后果的关联，培养思辨能力与社会责任感；理解可持续发展的多维内涵...',
    tags: ['模拟经营', '社会发展', '思辨', '可持续发展'],
    playUrl: '/lab/poli-town/index.html',
    type: 'lab',
  },
  {
    id: 'random-roll-call',
    title: '随机点名工具',
    subtitle: '课堂 · 实用工具',
    category: '工具',
    cover: '',
    desc: '名单本地缓存（localStorage）、支持分组、批量导入导出、可自定义字号/配色/抽取人数与是否重复抽取。适用于课堂随机提问与互动环节。',
    tags: ['点名', '随机抽取', '课堂互动', '本地存储'],
    playUrl: '/random-roll-call.html',
    type: 'tool',
  },
  {
    id: 'class-workbench',
    title: '班主任管理工具',
    subtitle: '班级 · 管理工具',
    category: '工具',
    cover: '',
    desc: '一站式班级管理平台：学生档案库、考勤请假、智能成绩分析、日常班务、家校沟通、文案素材、待办备忘录，支持 Excel 导入导出与数据备份。',
    tags: ['班级管理', '学生档案', '成绩分析', '家校沟通'],
    playUrl: '/class-workbench.html',
    type: 'tool',
  },
  {
    id: 'laoban-workbench',
    title: '班主任工作台',
    subtitle: '班级 · 离线工作台',
    category: '工具',
    cover: '',
    desc: '班主任日常管理的一站式离线工作台，涵盖班级事务、学生管理、日程安排等模块，数据本地存储、离线可用，为班主任减负增效。',
    tags: ['班主任', '工作台', '离线可用', '班级事务'],
    playUrl: '/laoban.html',
    type: 'tool',
  },
  {
    id: 'seat-map',
    title: '智能教室排座系统',
    subtitle: '教室 · 智能排座',
    category: '工具',
    cover: '',
    desc: '可视化班级座位编排工具：自定义教室布局、多维度排座规则（身高/视力/性别/成绩）、VIP 座位、一键智能生成座次表，支持 PDF 导出打印。',
    tags: ['智能排座', '教室布局', 'PDF导出', 'VIP座位'],
    playUrl: '/seat-map/seat-map.html',
    type: 'tool',
  },
  {
    id: 'class-call',
    title: '课堂点名工具',
    subtitle: '课堂 · 互动工具',
    category: '工具',
    cover: '',
    desc: '五大创意点名模式：命运卡牌、深海寻宝、魔法转盘、扭蛋机、盲盒开箱；XP 成长体系、答题评价、点名记录留存，让点名变成课堂趣味互动环节。',
    tags: ['五大模式', '创意点名', 'XP成长', '趣味互动'],
    playUrl: '/seat-map/class-call.html',
    type: 'tool',
  },
];

const activeCategory = ref('全部');

const filteredItems = computed(() => {
  if (activeCategory.value === '全部') return items;
  return items.filter(item => item.category === activeCategory.value);
});

const getCategoryColor = (cat: string) => categoryColors[cat] || '#4f46e5';
</script>

<template>
  <div class="tools-gallery">
    <!-- 分类标签栏 -->
    <div class="filter-bar">
      <button
        v-for="cat in categories"
        :key="cat.key"
        class="filter-btn"
        :class="{ active: activeCategory === cat.key }"
        @click="activeCategory = cat.key"
      >
        {{ cat.label }}
      </button>
    </div>

    <!-- 卡片网格 -->
    <div class="cards-grid">
      <div
        v-for="item in filteredItems"
        :key="item.id"
        class="card"
      >
        <!-- 封面区域 -->
        <div class="card-cover-wrap">
          <img
            v-if="item.cover"
            :src="item.cover"
            :alt="item.title"
            class="card-cover"
            loading="lazy"
          />
          <div v-else class="card-cover-placeholder">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M9.53 16.122a3 3 0 0 0-5.78 1.128 2.25 2.25 0 0 1-2.4 2.245 4.5 4.5 0 0 0 8.4-2.245c0-.399-.078-.78-.22-1.128Zm0 0a15.998 15.998 0 0 0 3.388-1.62m-5.048 4.025a3 3 0 0 1-4.293 0l1.414-1.415a.75.75 0 0 1 1.06 1.06l-1.414 1.415Zm5.048-4.025A15.998 15.998 0 0 1 16.122 9.53m-1.62 3.388a3 3 0 0 0 1.128-5.78 2.25 2.25 0 0 1 2.245-2.4 4.5 4.5 0 0 0-2.245 8.4c.399 0 .78-.078 1.128-.22Zm0 0a15.998 15.998 0 0 0-1.62-3.388m4.025 5.048a3 3 0 0 1 0 4.293l-1.415-1.414a.75.75 0 0 1-1.06-1.06l1.415 1.414Zm-4.025-5.048a15.998 15.998 0 0 1 3.388 1.62M6.75 15.75l-1.5-1.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
            <span>{{ item.title }}</span>
          </div>
          <!-- 学科标签 -->
          <span
            class="category-badge"
            :style="{ backgroundColor: getCategoryColor(item.category) }"
          >
            {{ item.category }}
          </span>
        </div>

        <!-- 内容区域 -->
        <div class="card-body">
          <h3 class="card-title">{{ item.title }}</h3>
          <p class="card-subtitle">{{ item.subtitle }}</p>
          <p class="card-desc">{{ item.desc }}</p>

          <!-- 标签 -->
          <div class="card-tags">
            <span v-for="tag in item.tags" :key="tag" class="tag">{{ tag }}</span>
          </div>

          <!-- 按钮 -->
          <div class="card-actions">
            <a :href="item.playUrl" target="_blank" class="btn btn-primary">
              <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                <path d="M8 5v14l11-7z" />
              </svg>
              在线试玩
            </a>
            <a
              v-if="item.zipUrl"
              :href="item.zipUrl"
              class="btn btn-secondary"
              download
            >
              下载 ZIP
            </a>
          </div>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-if="filteredItems.length === 0" class="empty-state">
      该分类下暂无内容
    </div>

    <!-- 广告弹窗 -->
    <AdPopup />
  </div>
</template>

<style scoped>
.tools-gallery {
  --primary: #4f46e5;
  --primary-hover: #4338ca;
  --bg: #f8f7fc;
  --card-bg: #ffffff;
  --text: #1f2937;
  --text-secondary: #6b7280;
  --border: #e5e7eb;
  --tag-bg: #eef2ff;
  --tag-text: #4f46e5;
  --shadow: 0 1px 3px rgba(0, 0, 0, 0.08), 0 4px 12px rgba(0, 0, 0, 0.05);
  --shadow-hover: 0 4px 6px rgba(0, 0, 0, 0.05), 0 10px 24px rgba(0, 0, 0, 0.08);
  --radius: 16px;
  --radius-sm: 10px;
}

/* 分类筛选栏 */
.filter-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 24px;
  padding: 4px;
}

.filter-btn {
  padding: 6px 16px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: var(--card-bg);
  color: var(--text-secondary);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.filter-btn:hover {
  border-color: #c7c3f7;
  color: var(--primary);
  background: #fafaff;
}

.filter-btn.active {
  background: var(--primary);
  color: #fff;
  border-color: var(--primary);
  font-weight: 500;
}

/* 卡片网格 */
.cards-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}

@media (max-width: 1024px) {
  .cards-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 640px) {
  .cards-grid {
    grid-template-columns: 1fr;
  }
}

/* 卡片 */
.card {
  background: var(--card-bg);
  border-radius: var(--radius);
  overflow: hidden;
  box-shadow: var(--shadow);
  transition: transform 0.25s ease, box-shadow 0.25s ease;
  display: flex;
  flex-direction: column;
}

.card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-hover);
}

/* 封面 */
.card-cover-wrap {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 10;
  overflow: hidden;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
}

.card-cover {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.4s ease;
}

.card:hover .card-cover {
  transform: scale(1.05);
}

.card-cover-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: rgba(255, 255, 255, 0.7);
  background: linear-gradient(135deg, #312e81 0%, #4c1d95 100%);
}

.card-cover-placeholder svg {
  width: 48px;
  height: 48px;
  opacity: 0.6;
}

.card-cover-placeholder span {
  font-size: 14px;
  opacity: 0.8;
}

/* 学科标签 */
.category-badge {
  position: absolute;
  top: 12px;
  left: 12px;
  padding: 4px 10px;
  border-radius: 6px;
  color: #fff;
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.5px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
}

/* 卡片内容 */
.card-body {
  padding: 16px;
  display: flex;
  flex-direction: column;
  flex: 1;
  gap: 8px;
}

.card-title {
  font-size: 17px;
  font-weight: 600;
  color: var(--text);
  margin: 0;
  line-height: 1.4;
}

.card-subtitle {
  font-size: 12px;
  color: var(--text-secondary);
  margin: 0;
}

.card-desc {
  font-size: 13px;
  line-height: 1.7;
  color: #4b5563;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  flex: 1;
}

/* 标签 */
.card-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 4px;
}

.tag {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 999px;
  background: var(--tag-bg);
  color: var(--tag-text);
  font-size: 11px;
  font-weight: 500;
  border: 1px solid #e0e7ff;
}

/* 按钮 */
.card-actions {
  display: flex;
  gap: 10px;
  margin-top: 10px;
}

.btn {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 0;
  border-radius: var(--radius-sm);
  font-size: 13px;
  font-weight: 500;
  text-decoration: none;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
}

.btn-primary {
  background: var(--primary);
  color: #fff;
}

.btn-primary:hover {
  background: var(--primary-hover);
}

.btn-secondary {
  background: #fff;
  color: var(--text);
  border: 1px solid var(--border);
}

.btn-secondary:hover {
  background: #f9fafb;
  border-color: #d1d5db;
}

.btn-disabled {
  opacity: 0.4;
  cursor: not-allowed;
  pointer-events: none;
}

/* 空状态 */
.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: var(--text-secondary);
  font-size: 15px;
}
</style>
