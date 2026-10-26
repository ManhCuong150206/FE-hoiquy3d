import { Algorithm } from './experiment';
export interface Step {
  iteration: number; w: number[]; b: number; trainLoss: number; testLoss: number;
}
export interface GradientTrace {
  gradient: number[]; biasGradient: number; intermediate?: number[];
}
export interface LearningSnapshot extends GradientTrace {
  before: Step; after: Step; algorithm: Algorithm; degree: number; lambda: number;
  lr: number; trainCount: number; penaltyBefore: number; penaltyAfter: number; done: boolean;
}
export interface DatasetProvenance {
  labels: string[]; target: string; standardized: boolean;
  stats: { mean: number; sd: number }[];
  rows: { sourceRow: number; original: string[]; filled: number[] }[];
}
