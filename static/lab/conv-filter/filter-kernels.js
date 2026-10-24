// 图像卷积滤镜核库（Lab B 用）
// 每个核：{ id, name, size(3|5), normalize, offset, gray, sep?, data: number[size][size] }
// - normalize: 卷积前权重和归一（模糊类用）
// - offset: 卷积后整体平移（边缘类用 128 把负响应居中到灰）
// - gray: 仅对亮度做卷积并输出灰度（边缘/浮雕更直观）
// - sep: 可分离形式 [横, 纵] 一维核（性能优化；用户改动网格后失效）

function mk(size, fill) {
  return Array.from({ length: size }, () => Array.from({ length: size }, () => fill));
}

export const PRESETS = [
  {
    id: "identity", name: "原图（单位核）", size: 3, normalize: false, offset: 0, gray: false,
    data: [[0, 0, 0], [0, 1, 0], [0, 0, 0]],
  },
  {
    id: "box3", name: "均值模糊 3×3", size: 3, normalize: true, offset: 0, gray: false,
    sep: [1, 1, 1],
    data: [[1, 1, 1], [1, 1, 1], [1, 1, 1]],
  },
  {
    id: "box5", name: "均值模糊 5×5", size: 5, normalize: true, offset: 0, gray: false,
    sep: [1, 1, 1, 1, 1],
    data: mk(5, 1),
  },
  {
    id: "gauss3", name: "高斯模糊 3×3", size: 3, normalize: true, offset: 0, gray: false,
    sep: [1, 2, 1],
    data: [[1, 2, 1], [2, 4, 2], [1, 2, 1]],
  },
  {
    id: "gauss5", name: "高斯模糊 5×5", size: 5, normalize: true, offset: 0, gray: false,
    sep: [1, 4, 6, 4, 1],
    data: [
      [1, 4, 6, 4, 1],
      [4, 16, 24, 16, 4],
      [6, 24, 36, 24, 6],
      [4, 16, 24, 16, 4],
      [1, 4, 6, 4, 1],
    ],
  },
  {
    id: "sharpen", name: "锐化（强化高频）", size: 3, normalize: false, offset: 0, gray: false,
    data: [[0, -1, 0], [-1, 5, -1], [0, -1, 0]],
  },
  {
    id: "sobelX", name: "Sobel 边缘 · 横向", size: 3, normalize: false, offset: 128, gray: true,
    data: [[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]],
  },
  {
    id: "sobelY", name: "Sobel 边缘 · 纵向", size: 3, normalize: false, offset: 128, gray: true,
    data: [[-1, -2, -1], [0, 0, 0], [1, 2, 1]],
  },
  {
    id: "laplacian", name: "拉普拉斯（二阶导）", size: 3, normalize: false, offset: 128, gray: true,
    data: [[0, 1, 0], [1, -4, 1], [0, 1, 0]],
  },
  {
    id: "emboss", name: "浮雕", size: 3, normalize: false, offset: 128, gray: true,
    data: [[-2, -1, 0], [-1, 1, 1], [0, 1, 2]],
  },
];

export function clonePreset(p) {
  return {
    id: p.id, name: p.name, size: p.size, normalize: p.normalize,
    offset: p.offset, gray: !!p.gray,
    sep: p.sep ? p.sep.slice() : null,
    data: p.data.map((row) => row.slice()),
  };
}

export function kernelSum(k) {
  let s = 0;
  for (const row of k.data) for (const v of row) s += v;
  return s;
}
