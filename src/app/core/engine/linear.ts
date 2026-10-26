// Một bước gradient descent cho hồi quy tuyến tính (loss MSE).
// lambda > 0 thì thành Ridge (phạt L2, không phạt intercept). Mặc định 0 = Linear thường.
export function gdStep(X: number[][], y: number[], w: number[], b: number, lr: number, lambda = 0,
  trace?: (value: import('../models/training-step').GradientTrace) => void) {
  const n = X.length;
  const d = w.length;
  const gw = new Array<number>(d).fill(0);
  let gb = 0;
  for (let i = 0; i < n; i++) {
    let pred = b;
    for (let j = 0; j < d; j++) pred += w[j] * X[i][j];
    const err = pred - y[i];
    for (let j = 0; j < d; j++) gw[j] += err * X[i][j];
    gb += err;
  }
  const k = 2 / n;
  trace?.({ gradient: w.map((wj, j) => k * gw[j] + 2 * lambda * wj), biasGradient: k * gb });
  return {
    w: w.map((wj, j) => wj - lr * (k * gw[j] + 2 * lambda * wj)),
    b: b - lr * k * gb,
  };
}
