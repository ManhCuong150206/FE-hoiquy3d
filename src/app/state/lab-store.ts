import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { mae, mse, predict, r2, rmse } from '../core/engine/metrics';
import { makeLinearData, trainTestSplit } from '../core/engine/synthetic';
import { Algorithm, SavedExperiment } from '../core/models/experiment';

export interface Step {
    iteration: number;
    w: number[];
    b: number;
    trainLoss: number;
    testLoss: number;
}

@Injectable({ providedIn: 'root' })
export class LabStore {
    private isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
    private worker?: Worker;
    private initialized = false;

    // ----- cấu hình thuật toán -----
    algorithm = signal<Algorithm>('linear');
    learningRate = signal(0.01);
    maxIterations = signal(1000);
    tolerance = signal(1e-6);
    speed = signal(1);

    // ----- cấu hình dữ liệu tổng hợp -----
    sampleCount = signal(500);
    featureCount = signal(2);
    noise = signal(8); // thanh trượt 0..50 (%)
    seed = signal(42);
    trainRatio = signal(0.8);

    // ----- nguồn dữ liệu -----
    dataSource = signal<'synthetic' | 'csv'>('synthetic');
    csvName = signal<string | null>(null);

    // ----- dữ liệu -----
    trainX = signal<number[][]>([]);
    trainY = signal<number[]>([]);
    testX = signal<number[][]>([]);
    testY = signal<number[]>([]);

    // ----- trạng thái chạy -----
    status = signal<'idle' | 'running' | 'paused' | 'done' | 'error'>('idle');
    iteration = signal(0);
    history = signal<Step[]>([]);
    errorMsg = signal<string | null>(null);

    // ----- giá trị dẫn xuất -----
    latest = computed(() => this.history().at(-1) ?? null);

    // số đặc trưng thực tế của tập dữ liệu đang dùng (synthetic hoặc CSV)
    dataFeatures = computed(() => this.trainX()[0]?.length ?? 0);

    lrError = computed(() => {
        const v = this.learningRate();
        return v > 0 && Number.isFinite(v)
            ? null
            : 'Tốc độ học phải lớn hơn 0. Nếu loss phân kỳ, hãy giảm learning rate rồi chạy lại.';
    });

    // hệ số co dữ liệu để vừa khung nhìn 3D (±4)
    dataScale = computed(() => {
        let m = 1e-9;
        for (const r of [...this.trainX(), ...this.testX()]) for (const v of r) m = Math.max(m, Math.abs(v));
        for (const v of [...this.trainY(), ...this.testY()]) m = Math.max(m, Math.abs(v));
        return 4 / m;
    });

    metrics = computed(() => {
        const s = this.latest();
        if (!s) return null;
        const calc = (X: number[][], y: number[]) => {
            const p = predict(X, s.w, s.b);
            return { mse: mse(y, p), rmse: rmse(y, p), mae: mae(y, p), r2: r2(y, p) };
        };
        return { train: calc(this.trainX(), this.trainY()), test: calc(this.testX(), this.testY()) };
    });

    constructor() {
        this.generateData();
    }

    // ===== dữ liệu =====
    generateData() {
        const { X, y } = makeLinearData(
            this.sampleCount(), this.featureCount(), this.noise() / 50, this.seed(),
        );
        const { train, test } = trainTestSplit(X, y, this.trainRatio(), this.seed() + 1);
        this.trainX.set(train.X);
        this.trainY.set(train.y);
        this.testX.set(test.X);
        this.testY.set(test.y);
        this.dataSource.set('synthetic');
        this.csvName.set(null);
        this.initWorker();
    }

    /** Nạp dữ liệu đã dựng từ CSV (đã xử lý thiếu / chuẩn hoá) và chia train/test. */
    loadDataset(X: number[][], y: number[], name: string) {
        const { train, test } = trainTestSplit(X, y, this.trainRatio(), this.seed() + 1);
        this.trainX.set(train.X);
        this.trainY.set(train.y);
        this.testX.set(test.X);
        this.testY.set(test.y);
        this.dataSource.set('csv');
        this.csvName.set(name);
        this.initWorker();
    }

    /**
     * Khôi phục cấu hình từ một thí nghiệm đã lưu.
     * Dữ liệu synthetic được sinh lại y hệt nhờ seed; dữ liệu CSV không lưu kèm
     * nên chỉ áp dụng thuật toán + tham số huấn luyện lên dữ liệu đang có.
     */
    applyConfig(c: SavedExperiment) {
        this.algorithm.set(c.algorithm);
        this.learningRate.set(c.learningRate);
        this.maxIterations.set(c.maxIterations);
        if (c.dataSource === 'synthetic') {
            this.sampleCount.set(c.sampleCount);
            this.featureCount.set(c.featureCount);
            this.noise.set(c.noise);
            this.seed.set(c.seed);
            this.trainRatio.set(c.trainRatio);
            this.generateData();
        } else {
            this.reset();
        }
    }

    // ===== điều khiển huấn luyện =====
    play() {
        if (this.lrError()) return;
        if (this.status() === 'done' || !this.initialized) this.initWorker();
        this.status.set('running');
        this.send({ type: 'play' });
    }

    pause() {
        this.send({ type: 'pause' });
        if (this.status() === 'running') this.status.set('paused');
    }

    step() {
        if (this.lrError() || this.status() === 'running') return;
        if (this.status() === 'done' || !this.initialized) this.initWorker();
        this.status.set('paused');
        this.send({ type: 'step' });
    }

    stop() {
        this.send({ type: 'pause' });
        this.initialized = false; // lần Play sau sẽ chạy lại từ đầu
        this.status.set('idle');
    }

    reset() {
        this.send({ type: 'pause' });
        this.initWorker();
    }

    setLearningRate(v: number) { this.learningRate.set(v); this.reset(); }
    setMaxIterations(v: number) { this.maxIterations.set(v); this.reset(); }
    setSpeed(v: number) { this.speed.set(v); this.send({ type: 'speed', speed: v }); }

    // ===== nội bộ =====
    private send(msg: unknown) {
        this.worker?.postMessage(msg);
    }

    private ensureWorker() {
        if (!this.isBrowser || this.worker) return;
        this.worker = new Worker(new URL('../core/engine/regression.worker', import.meta.url));
        this.worker.onmessage = ({ data }) => {
            if (data.type === 'step') {
                this.iteration.set(data.iteration);
                this.history.update((h) => {
                    const next = [...h, data as Step];
                    // chỉ giữ tối đa ~2000 điểm lấy mẫu
                    return next.length > 2000
                        ? next.filter((_, i) => i % 2 === 0 || i === next.length - 1)
                        : next;
                });
                if (data.done) this.status.set('done');
            } else if (data.type === 'error') {
                this.errorMsg.set(data.message);
                this.status.set('error');
            }
        };
    }

    private initWorker() {
        this.ensureWorker();
        this.history.set([]);
        this.iteration.set(0);
        this.errorMsg.set(null);
        this.status.set('idle');
        this.send({
            type: 'init',
            Xtr: this.trainX(), ytr: this.trainY(), Xte: this.testX(), yte: this.testY(),
            lr: this.learningRate(), maxIter: this.maxIterations(),
            tol: this.tolerance(), speed: this.speed(),
        });
        this.initialized = true;
    }
}