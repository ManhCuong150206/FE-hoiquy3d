import { gaussian, mulberry32 } from './prng';

export function makeLinearData(n: number, d: number, noise: number, seed: number) {
  const rand = mulberry32(seed);
  const trueW = Array.from({ length: d }, () => (rand() * 2 - 1) * 2);
  const trueB = rand() * 2 - 1;
  const X: number[][] = [];
  const y: number[] = [];
  for (let i = 0; i < n; i++) {
    const row = Array.from({ length: d }, () => gaussian(rand));
    X.push(row);
    y.push(trueB + row.reduce((s, x, j) => s + x * trueW[j], 0) + noise * gaussian(rand));
  }
  return { X, y, trueW, trueB };
}

// Trộn rồi chia train/test theo tỉ lệ, có seed
export function trainTestSplit(X: number[][], y: number[], ratio: number, seed: number) {
  const rand = mulberry32(seed);
  const idx = X.map((_, i) => i);
  for (let i = idx.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  const cut = Math.floor(idx.length * ratio);
  const pick = (ids: number[]) => ({ X: ids.map((i) => X[i]), y: ids.map((i) => y[i]) });
  return { train: pick(idx.slice(0, cut)), test: pick(idx.slice(cut)) };
}