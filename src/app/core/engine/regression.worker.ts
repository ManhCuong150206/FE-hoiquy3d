/// <reference lib="webworker" />
import { gdStep } from './linear';
import { mse, predict } from './metrics';
import { lassoStep } from './lasso';
import { polynomialFeatures } from './polynomial';

interface WorkerState {
  Xtr: number[][]; ytr: number[]; Xte: number[][]; yte: number[];
  w: number[]; b: number; i: number; prev: number;
  lr: number; maxIter: number; tol: number; speed: number;
  algorithm: 'linear' | 'polynomial' | 'ridge' | 'lasso';
  lambda: number; degree: number;
}

let s: WorkerState | null = null;
let timer: ReturnType<typeof setTimeout> | undefined;


addEventListener('message', ({ data }) => {
  switch (data.type) {
    case 'init': {
      clearTimeout(timer);

      const algorithm = data.algorithm as WorkerState['algorithm'];
      const degree = Math.max(1, Math.floor(Number(data.degree) || 2));

      const Xtr = algorithm === 'polynomial'
        ? polynomialFeatures(data.Xtr, degree)
        : data.Xtr;

      const Xte = algorithm === 'polynomial'
        ? polynomialFeatures(data.Xte, degree)
        : data.Xte;

      s = {
        Xtr,
        ytr: data.ytr,
        Xte,
        yte: data.yte,

        w: new Array<number>(Xtr[0]?.length ?? 0).fill(0),
        b: 0,
        i: 0,
        prev: Infinity,

        lr: data.lr,
        maxIter: data.maxIter,
        tol: data.tol,
        speed: data.speed,

        algorithm,
        degree,
        lambda: data.lambda,
      };

      report(false);
      break;
    }

    case 'play':
      loop();
      break;

    case 'pause':
      clearTimeout(timer);
      break;

    case 'step':
      tick();
      break;

    case 'speed':
      if (s) s.speed = data.speed;
      break;
  }
});


function report(done: boolean) {
  if (!s) return;
  postMessage({
    type: 'step', iteration: s.i, w: s.w, b: s.b, done,
    trainLoss: mse(s.ytr, predict(s.Xtr, s.w, s.b)),
    testLoss: mse(s.yte, predict(s.Xte, s.w, s.b)),
  });
}

function tick(): boolean {
  if (!s) return false;

  let r: { w: number[]; b: number };

  if (s.algorithm === 'lasso') {
    // Lasso Regression (L1)
    r = lassoStep(
      s.Xtr,
      s.ytr,
      s.w,
      s.b,
      s.lr,
      s.lambda
    );
  } else {
    // Linear hoặc Ridge
    const lambda = s.algorithm === 'ridge'
      ? s.lambda
      : 0;

    r = gdStep(
      s.Xtr,
      s.ytr,
      s.w,
      s.b,
      s.lr,
      lambda
    );
  }

  s.w = r.w;
  s.b = r.b;
  s.i++;
  const loss = mse(s.ytr, predict(s.Xtr, s.w, s.b));
  if (!Number.isFinite(loss)) {
    postMessage({ type: 'error', message: 'Loss phân kỳ (vô hạn). Hãy giảm learning rate rồi chạy lại.' });
    return false;
  }
  const done = s.i >= s.maxIter || Math.abs(s.prev - loss) < s.tol;
  s.prev = loss;
  report(done);
  return !done;
}

function loop() {
  if (!s) return;
  if (tick()) timer = setTimeout(loop, 16 / s.speed);
}