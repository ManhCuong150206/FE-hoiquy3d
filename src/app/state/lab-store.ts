import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, computed, inject, signal, DestroyRef } from '@angular/core';
import { mae, mse, predict, r2, rmse } from '../core/engine/metrics';
import { polynomialFeatures } from '../core/engine/polynomial';
import { makeLinearData, trainTestSplit } from '../core/engine/synthetic';
import { Algorithm, SavedExperiment } from '../core/models/experiment';
import { DatasetProvenance, LearningSnapshot, Step } from '../core/models/training-step';
import { modelPredictions } from '../core/engine/model-view';
export type { Step } from '../core/models/training-step';

@Injectable({ providedIn: 'root' })
export class LabStore {
    private isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
    private worker?: Worker;
    private initialized = false;
    private runId = 0;
    private requestId = 0;
    private phaseTimer?: ReturnType<typeof setTimeout>;
    private committing = false;
    mode = signal<'normal' | 'learn'>('normal');
    switching = signal(false);
    busy = signal(false);
    expanded = signal(true);
    auto = signal(false);
    phase = signal(0);
    phaseSeconds = signal(1);
    snapshot = signal<LearningSnapshot | null>(null);
    selectedSample = signal(0);
    provenance = signal<DatasetProvenance | null>(null);
    trainIndices = signal<number[]>([]);
    selectedX = computed(() => this.trainX()[this.selectedSample()] ?? []);
    selectedY = computed(() => this.trainY()[this.selectedSample()] ?? 0);
    selectedSource = computed(() => this.provenance()?.rows[this.trainIndices()[this.selectedSample()]] ?? null);
    selectedPrediction = computed(() => {
        const s = this.latest(), row = this.selectedX();
        if (!s || !row.length) return 0;
        return modelPredictions([row], s.w, s.b, this.algorithm(), this.degree())[0];
    });

    // ----- cấu hình thuật toán -----
    algorithm = signal<Algorithm>('linear');
    learningRate = signal(0.01);
    maxIterations = signal(1000);
    tolerance = signal(1e-6);
    speed = signal(1);
    degree = signal(2);   // Polynomial
    lambda = signal(0.1); // Ridge / Lasso

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
            // Polynomial cần biến đổi đặc trưng giống Worker
            const inputX = this.algorithm() === 'polynomial'
                ? polynomialFeatures(X, this.degree())
                : X;

            const p = predict(inputX, s.w, s.b);

            return {
                mse: mse(y, p),
                rmse: rmse(y, p),
                mae: mae(y, p),
                r2: r2(y, p)
            };
        };

        return {
            train: calc(this.trainX(), this.trainY()),
            test: calc(this.testX(), this.testY())
        };
    });


    constructor() {
        inject(DestroyRef).onDestroy(() => { clearTimeout(this.phaseTimer); this.worker?.terminate(); });
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
        this.trainIndices.set(train.indices);
        this.provenance.set(null);
        this.selectedSample.set(0);
        this.dataSource.set('synthetic');
        this.csvName.set(null);
        this.initWorker();
    }

    /** Nạp dữ liệu đã dựng từ CSV (đã xử lý thiếu / chuẩn hoá) và chia train/test. */
    loadDataset(X: number[][], y: number[], name: string, provenance?: DatasetProvenance) {
        const { train, test } = trainTestSplit(X, y, this.trainRatio(), this.seed() + 1);
        this.trainX.set(train.X);
        this.trainY.set(train.y);
        this.testX.set(test.X);
        this.testY.set(test.y);
        this.trainIndices.set(train.indices);
        this.provenance.set(provenance ?? null);
        this.selectedSample.set(0);
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
        this.degree.set(c.degree ?? 2);
        this.lambda.set(c.lambda ?? 0.1);
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
        if (this.switching() || this.busy()) return;
        if (this.lrError() || this.status() === 'error') return;
        if (this.status() === 'done' || !this.initialized) this.initWorker();
        if (this.mode() === 'learn') {
            if (this.status() === 'error') return;
            this.expanded.set(true);
            this.auto.set(true);
            if (!this.snapshot()) this.prepare(); else this.schedulePhase();
            return;
        }
        this.status.set('running');
        this.send({ type: 'play' });

    }

    pause() {
        this.pausePresentation();
        this.send({ type: 'pause' });
        if (this.status() === 'running') this.status.set('paused');
    }

    step() {
        if (this.mode() === 'learn') { this.nextPhase(); return; }
        if (this.switching() || this.busy()) return;
        if (this.lrError() || this.status() === 'running' || this.status() === 'error') return;
        if (this.status() === 'done' || !this.initialized) this.initWorker();
        this.status.set('paused');
        this.send({ type: 'step' });
    }

    stop() {
        this.pausePresentation();
        this.snapshot.set(null);
        // Stop is a cancellation boundary, including in-flight prepare/commit replies.
        this.worker?.terminate(); this.worker = undefined; this.runId++;
        this.busy.set(false); this.switching.set(false); this.committing = false; this.phase.set(0);
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
    setAlgorithm(a: Algorithm) { this.algorithm.set(a); this.reset(); }
    setDegree(v: number) { this.degree.set(v); this.reset(); }
    setLambda(v: number) { this.lambda.set(v); this.reset(); }

    selectSample(index: number) {
        if (Number.isInteger(index) && index >= 0 && index < this.trainX().length) this.selectedSample.set(index);
    }
    setMode(mode: 'normal' | 'learn') {
        if (this.switching() || mode === this.mode()) return;
        this.pausePresentation();
        this.mode.set(mode);
        this.expanded.set(true);
        if (!this.initialized) { this.initWorker(); return; }
        this.switching.set(true);
        this.requestId++;
        // FIFO worker messages make paused an acknowledgement of all preceding updates.
        this.send({ type: 'pause', requestId: this.requestId });
    }
    toggleExpanded() {
        if (this.expanded()) this.pausePresentation();
        this.expanded.update(v => !v);
    }
    setPhaseSeconds(seconds: number) {
        if (!Number.isFinite(seconds) || seconds < .25 || seconds > 10) return;
        this.phaseSeconds.set(seconds);
        this.schedulePhase();
    }
    pausePresentation() { this.auto.set(false); clearTimeout(this.phaseTimer); }
    nextPhase() { this.pausePresentation(); this.advancePhase(); }
    private schedulePhase() {
        clearTimeout(this.phaseTimer);
        if (this.auto() && !this.busy() && !this.switching()) {
            this.phaseTimer = setTimeout(() => this.advancePhase(), this.phaseSeconds() * 1000);
        }
    }
    private prepare() {
        if (this.lrError() || this.status() === 'error' || this.status() === 'done') return;
        this.busy.set(true);
        this.send({ type: 'prepare' });
    }
    private advancePhase() {
        if (this.mode() !== 'learn' || this.busy() || this.switching() || this.status() === 'error') return;
        if (!this.initialized) this.initWorker();
        const p = this.snapshot();
        if (!p) { this.prepare(); return; }
        if (this.phase() < 4) {
            this.phase.update(v => v + 1); this.schedulePhase();
        } else if (this.phase() === 4) {
            this.busy.set(true); this.committing = true;
            this.send({ type: 'commit', iteration: p.after.iteration });
        } else if (!p.done) this.prepare();
    }

    // ===== nội bộ =====
    private send(msg: object) {
        this.worker?.postMessage({ ...msg, runId: this.runId });
    }

    private ensureWorker() {
        if (!this.isBrowser || this.worker || typeof Worker === 'undefined') return;
        this.worker = new Worker(new URL('../core/engine/regression.worker', import.meta.url));
        this.worker.onmessage = ({ data }) => {
            if (data.runId !== this.runId) return;
            if (data.type === 'paused' && this.switching() && data.requestId === this.requestId) {
                this.send({ type: 'discard' });
                this.snapshot.set(null); this.phase.set(0); this.committing = false;
                this.busy.set(false); this.switching.set(false);
                if (this.status() === 'running') this.status.set('paused');
                return;
            }
            if (data.type === 'prepared') {
                if (this.mode() !== 'learn' || this.switching()) return;
                this.snapshot.set(data.snapshot); this.phase.set(0); this.busy.set(false);
                if (data.snapshot) this.schedulePhase(); else this.pausePresentation();
                return;
            }
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
                if (this.committing && this.snapshot()?.after.iteration === data.iteration) {
                    this.committing = false; this.busy.set(false); this.phase.set(5);
                    if (data.done) this.pausePresentation(); else this.schedulePhase();
                }
            } else if (data.type === 'error') {
                this.pausePresentation(); this.busy.set(false); this.committing = false; this.switching.set(false);
                this.errorMsg.set(data.message);
                this.status.set('error');
            }
        };
        this.worker.onerror = () => {
            this.pausePresentation(); this.busy.set(false); this.switching.set(false);
            this.errorMsg.set('Không khởi chạy được worker. Hãy tải lại trang.'); this.status.set('error');
        };
    }

    private initWorker() {
        this.pausePresentation(); this.runId++;
        this.snapshot.set(null); this.phase.set(0); this.busy.set(false);
        this.switching.set(false); this.committing = false;
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
            algorithm: this.algorithm(),
            degree: this.degree(),
            lambda: this.lambda(),
        });
        this.initialized = true;

    }
}
