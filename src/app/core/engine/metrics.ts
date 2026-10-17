export function predict(X: number[][], w: number[], b: number) {
  return X.map((row) => row.reduce((s, x, j) => s + x * w[j], b));
}

export function mse(y: number[], p: number[]) {
  return y.reduce((s, v, i) => s + (v - p[i]) ** 2, 0) / y.length;
}

export const rmse = (y: number[], p: number[]) => Math.sqrt(mse(y, p));

export function mae(y: number[], p: number[]) {
  return y.reduce((s, v, i) => s + Math.abs(v - p[i]), 0) / y.length;
}

// R²; nếu y là hằng (ss_tot = 0) thì không xác định → trả NaN
export function r2(y: number[], p: number[]) {
  const mean = y.reduce((s, v) => s + v, 0) / y.length;
  const ssTot = y.reduce((s, v) => s + (v - mean) ** 2, 0);
  const ssRes = y.reduce((s, v, i) => s + (v - p[i]) ** 2, 0);
  return ssTot === 0 ? NaN : 1 - ssRes / ssTot;
}