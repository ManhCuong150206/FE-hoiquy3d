import type { Algorithm, MetricSet } from '../models/experiment';
import { trainTestSplit } from './synthetic';

/** Session-local identity only, not a security hash or a dataset checksum. */
export function testSignature(X: number[][], y: number[]) {
  const text = JSON.stringify([X, y]);
  let a = 2166136261, b = 5381;
  for (let i = 0; i < text.length; i++) { a = Math.imul(a ^ text.charCodeAt(i), 16777619); b = Math.imul(b, 33) ^ text.charCodeAt(i); }
  return `${text.length}:${a >>> 0}:${b >>> 0}`;
}

/** The old train ratio is the development fraction; 20% of it becomes validation. */
export function learningSplit(X: number[][], y: number[], developmentRatio: number, seed: number) {
  const outer = trainTestSplit(X, y, developmentRatio, seed);
  if (outer.train.X.length < 2 || !outer.test.X.length) throw new Error('Cần ít nhất hai mẫu phát triển và một mẫu test.');
  const inner = trainTestSplit(outer.train.X, outer.train.y, .8, seed + 104729);
  const remap = (part: typeof inner.train) => ({ ...part, indices: part.indices.map(i => outer.train.indices[i]) });
  return { train: remap(inner.train), validation: remap(inner.test), test: outer.test };
}

export interface Trial {
  id: number; dataset: number; algorithm: Algorithm; learningRate: number; maxIterations: number;
  degree: number; lambda: number; iterations: number; computeMs: number; setupMs: number;
  reason: string; mode: 'normal' | 'learn' | 'mixed'; hypothesis: string; conclusion: string;
  train: MetricSet; validation: MetricSet | null; testExposed: boolean;
}

export function compareTrials(current: Trial, baseline: Trial | undefined): string {
  if (!current.validation) return 'Bản dữ liệu cũ chưa có validation riêng. Tạo lại hoặc nhập lại dữ liệu để thử tham số mà không dùng test.';
  if (!baseline || baseline.id === current.id) return 'Đây là mốc so sánh. Giữ nguyên dữ liệu, chỉ đổi một siêu tham số rồi chạy và ghi nhận lần tiếp theo.';
  if (baseline.dataset !== current.dataset || !baseline.validation) return 'Khác dữ liệu hoặc cách chia tập: không so sánh trực tiếp với mốc này.';
  const delta = current.validation.mse - baseline.validation.mse;
  const quality = Math.abs(delta) < 1e-12 ? 'MSE validation không đổi' : `MSE validation ${delta < 0 ? 'giảm' : 'tăng'} ${Math.abs(delta).toPrecision(4)}`;
  const timing = current.mode === baseline.mode && current.mode !== 'mixed'
    ? `Chênh lệch thời gian tính ${ (current.computeMs - baseline.computeMs).toFixed(2) } ms (một lần đo, chưa đủ kết luận hiệu năng).`
    : 'Khác chế độ chạy/học: không kết luận tốc độ từ hai lần này.';
  return `${quality} so với mốc #${baseline.id}. ${timing} Hãy kiểm tra cả đường sai số và điều kiện dừng trước khi kết luận.`;
}
