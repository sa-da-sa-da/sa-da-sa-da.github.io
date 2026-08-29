// 卷积可视化实验室 · 信号数据层
// 两个信号 f、g 的定义与采样。g 故意做成「非对称」，翻转 g(τ)→g(−τ) 才看得清。
export const DOMAIN = { min: -6, max: 6, N: 220 };
export const SCALE_V = 2.2;        // 函数值 → 世界 Y 的缩放
export const WIDTH = 11;            // 世界 X 跨度
export const RESULT_OFFSET = -3.2; // 卷积结果曲线所在的 Y 基准

// 输入信号 f(τ)：一个高斯包络
export function fx(x) {
  return Math.exp(-Math.pow((x + 2) / 1.6, 2));
}

// 核 g(τ)：单边指数（非对称），翻转前后形状明显不同
export function gx(x) {
  // 仅在 x∈[-1, 3] 有值，向右衰减
  if (x < -1) return 0;
  if (x > 3) return 0;
  return Math.exp(-(x + 1) * 0.9);
}

export const dx = (DOMAIN.max - DOMAIN.min) / (DOMAIN.N - 1);

// 采样成数组
export function sample(fn) {
  const a = new Float32Array(DOMAIN.N);
  for (let i = 0; i < DOMAIN.N; i++) {
    const x = DOMAIN.min + i * dx;
    a[i] = fn(x);
  }
  return a;
}

// 世界坐标映射
export function worldX(x) {
  return ((x - DOMAIN.min) / (DOMAIN.max - DOMAIN.min)) * WIDTH - WIDTH / 2;
}

// 给定平移量 T，计算 g 翻转并平移后的取值 g(T - τ)
export function gShift(tau, T) {
  return gx(T - tau);
}

// 数值积分：当前 T 处的卷积值 (f*g)(T) = ∫ f(τ)·g(T−τ) dτ
export function convAt(T) {
  let acc = 0;
  for (let i = 0; i < DOMAIN.N; i++) {
    const tau = DOMAIN.min + i * dx;
    acc += fx(tau) * gx(T - tau) * dx;
  }
  return acc;
}
