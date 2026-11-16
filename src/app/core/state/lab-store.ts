import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, computed, inject, signal, DestroyRef } from '@angular/core';
import { mae, mse, predict, r2, rmse } from '../engine/metrics';
import { polynomialFeatures } from '../engine/polynomial';
import { makeSyntheticData, trainTestSplit } from '../engine/synthetic';
import { Algorithm, MetricSet, SavedExperiment, SyntheticKind, SyntheticConfig } from '../models/experiment';
import { learningSplit, Trial, compareTrials, testSignature } from '../engine/experiment-workflow';
import { DatasetProvenance, LearningSnapshot, Step } from '../models/training-step';
import type { PreparedSplit } from '../engine/csv';
import { modelPredictions } from '../engine/model-view';
export type { Step } from '../models/training-step';

@Injectable({ providedIn: 'root' })
export class LabStore {
    private isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
    private worker?: Worker;
    private initialized = false;
    private runId = 0;
    private requestId = 0;
    private phaseTimer?: ReturnType<typeof setTimeout>;
    private committing = false;
    private singleIteration = false;
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
    // Visual sticking threshold as a fraction of train-y population standard deviation.
    stickEpsilon = signal(0.3);
    stickThreshold = computed(() => {
        const y = this.trainY();
        if (!y.length) return 0;
        let mean = 0, sumSquares = 0;
        y.forEach((value, i) => {
            const delta = value - mean;
            mean += delta / (i + 1);
            sumSquares += delta * (value - mean);
        });
        return Math.sqrt(Math.max(0, sumSquares / y.length)) * this.stickEpsilon();
    });
    speed = signal(1);
    degree = signal(2);   // Polynomial
    lambda = signal(0.1); // Ridge / Lasso

    // ----- cấu hình dữ liệu tổng hợp -----
    syntheticKind = signal<SyntheticKind>('linear');
    appliedSynthetic = signal<SyntheticConfig | null>(null);
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
    validationX = signal<number[][]>([]);
    validationY = signal<number[]>([]);
    readonly hasValidation = computed(() => this.validationY().length > 0);
    readonly assessmentLabel = computed(() => this.hasValidation() ? 'Validation' : 'Test · bản cũ');
    computeMs = signal(0);
    timingMode = signal<'normal' | 'learn' | 'mixed'>('normal');
    setupMs = signal(0);
    stopReason = signal<string | null>(null);
    hypothesis = signal('');
    conclusion = signal('');
    trials = signal<Trial[]>([]);
    baselineId = signal<number | null>(null);
    datasetRevision = signal(0);
    finalTest = signal<MetricSet | null>(null);
    testWasOpened = signal(false);
    private exposedTests = new Set<string>();
    private currentTestKey = '';
    private trialSequence = 0;
    private lastRecorded = '';
    readonly evaluation = computed(() => {
        const s = this.latest();
        if (!s) return null;
        return { train: this.evaluateRows(this.trainX(), this.trainY()),
            validation: this.hasValidation() ? this.evaluateRows(this.validationX(), this.validationY()) : null };
    });
    readonly reasonLabel = computed(() => ({ 'max-iterations': 'Đạt số vòng lặp tối đa', converged: 'Thay đổi hàm mục tiêu dưới ngưỡng dừng',
        error: 'Lỗi tính toán; giữ mô hình hữu hạn cuối', stopped: 'Người dùng dừng' }[this.stopReason() ?? ''] ?? 'Chưa kết thúc / đang tạm dừng'));
    private evaluateRows(X: number[][], y: number[]): MetricSet {
        const s = this.latest()!;
        const p = modelPredictions(X, s.w, s.b, this.algorithm(), this.degree());
        return { mse: mse(y, p), rmse: rmse(y, p), mae: mae(y, p), r2: r2(y, p) };
    }
    recordTrial() {
        const metrics = this.evaluation();
        if (!metrics || this.iteration() < 1 || this.busy() || this.status() === 'running' || this.auto()) return null;
        const key = `${this.runId}:${this.iteration()}`;
        if (key === this.lastRecorded) {
            this.trials.update(rows => rows.map((r, i) => i === 0 ? { ...r, conclusion: this.conclusion(), testExposed: r.testExposed || this.testWasOpened() } : r));
            return this.trials()[0];
        }
        this.lastRecorded = key;
        const row: Trial = { id: ++this.trialSequence, dataset: this.datasetRevision(), algorithm: this.algorithm(),
            learningRate: this.learningRate(), maxIterations: this.maxIterations(), degree: this.degree(), lambda: this.lambda(),
            iterations: this.iteration(), computeMs: this.computeMs(), setupMs: this.setupMs(), reason: this.reasonLabel(), mode: this.timingMode(),
            hypothesis: this.hypothesis() || (this.trials().some(r => r.dataset === this.datasetRevision()) ? '' : 'Chạy cấu hình ban đầu để có mốc so sánh.'), conclusion: this.conclusion(), train: { ...metrics.train },
            validation: metrics.validation ? { ...metrics.validation } : null, testExposed: this.testWasOpened() };
        this.trials.update(rows => [row, ...rows].slice(0, 30));
        if (this.baselineId() === null) this.baselineId.set(row.id);
        return row;
    }
    readonly comparison = computed(() => {
        const latest = this.trials()[0];
        return latest ? compareTrials(latest, this.trials().find(r => r.id === this.baselineId())) : 'Chạy cấu hình ban đầu, tạm dừng hoặc chờ kết thúc rồi ghi nhận lần thử.';
    });
    evaluateFinalTest() {
        if (!this.hasValidation() || !this.latest() || !this.iteration() || this.status() === 'running' || this.auto() || this.busy()) return;
        this.finalTest.set(this.evaluateRows(this.testX(), this.testY()));
        this.testWasOpened.set(true);
        this.exposedTests.add(this.currentTestKey);
        this.recordTrial();
    }
    private newDataset() {
        this.hypothesis.set(''); this.conclusion.set('');
        this.datasetRevision.update(v => v + 1); this.finalTest.set(null);
        this.currentTestKey = testSignature(this.testX(), this.testY());
        this.testWasOpened.set(this.exposedTests.has(this.currentTestKey));
    }

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
        for (const r of [...this.trainX(), ...this.validationX(), ...this.testX()]) for (const v of r.slice(0, 2)) m = Math.max(m, Math.abs(v));
        for (const v of [...this.trainY(), ...this.validationY(), ...this.testY()]) m = Math.max(m, Math.abs(v));
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
    generateData(withValidation = true) {
        if (!Number.isInteger(this.sampleCount()) || this.sampleCount() < 10 || this.sampleCount() > 10000 ||
            !Number.isInteger(this.featureCount()) || this.featureCount() < 1 || this.featureCount() > 5 ||
            !Number.isSafeInteger(this.seed()) || !Number.isFinite(this.noise()) || this.noise() < 0 || this.noise() > 50 ||
            !Number.isFinite(this.trainRatio()) || this.trainRatio() < .5 || this.trainRatio() > .95) {
            this.errorMsg.set('Dữ liệu chưa được thay: cần 10–10.000 mẫu, 1–5 đặc trưng, nhiễu 0–50, seed nguyên và phần phát triển 50–95%.'); return;
        }
        this.appliedSynthetic.set({ kind: this.syntheticKind(), version: 1, sampleCount: this.sampleCount(),
            featureCount: this.featureCount(), noise: this.noise(), seed: this.seed(), trainRatio: this.trainRatio() });
        const { X, y } = makeSyntheticData(
            this.sampleCount(), this.featureCount(), this.noise() / 50, this.seed(), this.syntheticKind(),
        );
        const partition = withValidation ? learningSplit(X, y, this.trainRatio(), this.seed() + 1) : { ...trainTestSplit(X, y, this.trainRatio(), this.seed() + 1), validation: undefined };
        const { train, test } = partition;
        this.validationX.set(partition.validation?.X ?? []);
        this.validationY.set(partition.validation?.y ?? []);
        this.trainX.set(train.X);
        this.trainY.set(train.y);
        this.testX.set(test.X);
        this.testY.set(test.y);
        this.trainIndices.set(train.indices);
        this.provenance.set(null);
        this.selectedSample.set(0);
        this.dataSource.set('synthetic');
        this.csvName.set(null);
        this.newDataset();
        this.initWorker();
    }

    /** Nạp dữ liệu đã dựng từ CSV (đã xử lý thiếu / chuẩn hoá) và chia train/test. */
    loadDataset(X: number[][], y: number[], name: string, provenance?: DatasetProvenance, split?: PreparedSplit) {
        this.appliedSynthetic.set(null);
        const pick = (indices: number[]) => ({ X: indices.map(i => X[i]), y: indices.map(i => y[i]), indices });
        const partition = split ? { train: pick(split.trainIndices), test: pick(split.testIndices), validation: pick(split.validationIndices ?? []) }
            : learningSplit(X, y, this.trainRatio(), this.seed() + 1);
        const { train, test, validation } = partition;
        this.validationX.set(validation.X); this.validationY.set(validation.y);
        this.trainX.set(train.X);
        this.trainY.set(train.y);
        this.testX.set(test.X);
        this.testY.set(test.y);
        this.trainIndices.set(train.indices);
        this.provenance.set(provenance ?? null);
        this.selectedSample.set(0);
        this.dataSource.set('csv');
        this.csvName.set(name);
        this.newDataset();
        this.initWorker();
    }

    /**
     * Khôi phục cấu hình từ một thí nghiệm đã lưu.
     * Synthetic tái lập bằng seed; CSV mới khôi phục split đã lưu.
     * Bản ghi CSV cũ chưa có snapshot chỉ áp dụng cấu hình lên dữ liệu hiện có.
     */
    applyConfig(c: SavedExperiment) {
        if (c.dataSource === 'synthetic' && c.synthetic && c.synthetic.version !== 1) throw new Error('Phiên bản bộ sinh dữ liệu chưa được hỗ trợ.');
        this.algorithm.set(c.algorithm);
        this.degree.set(c.degree ?? 2);
        this.lambda.set(c.lambda ?? 0.1);
        this.learningRate.set(c.learningRate);
        this.maxIterations.set(c.maxIterations);
        if (c.dataSource === 'synthetic') {
            const saved = c.synthetic;
            this.syntheticKind.set(saved?.kind ?? 'linear');
            this.sampleCount.set(saved?.sampleCount ?? c.sampleCount);
            this.featureCount.set(saved?.featureCount ?? c.featureCount);
            this.noise.set(saved?.noise ?? c.noise);
            this.seed.set(saved?.seed ?? c.seed);
            this.trainRatio.set(saved?.trainRatio ?? c.trainRatio);
            this.generateData(c.learningReport?.protocol === 'train-validation-test-v1');
        } else if(c.csvData) {
            const data=structuredClone(c.csvData);
            this.trainX.set(data.trainX);this.trainY.set(data.trainY);this.testX.set(data.testX);this.testY.set(data.testY);
            this.trainIndices.set(data.trainIndices);this.provenance.set(data.provenance??null);this.selectedSample.set(0);
            this.validationX.set(data.validationX ?? []); this.validationY.set(data.validationY ?? []); this.newDataset();
            this.dataSource.set('csv');this.csvName.set(c.csvName);this.appliedSynthetic.set(null);
        } else { this.reset(); return; }
        this.initWorker({iteration:c.iterations,w:[...c.w],b:c.b,trainLoss:c.train.mse,testLoss:c.test.mse});
        if (c.learningReport?.finalTestViewed) { this.testWasOpened.set(true); this.exposedTests.add(this.currentTestKey); }
    }

    /** Logout/identity boundary: remove the previous user's dataset and model from live memory. */
    resetSession() {
        this.exposedTests.clear();
        this.trials.set([]); this.baselineId.set(null); this.trialSequence = 0; this.lastRecorded = '';
        this.hypothesis.set(''); this.conclusion.set('');
        this.pausePresentation();this.mode.set('normal');this.algorithm.set('linear');this.degree.set(2);this.lambda.set(.1);
        this.learningRate.set(.01);this.maxIterations.set(1000);this.syntheticKind.set('linear');this.sampleCount.set(500);
        this.featureCount.set(2);this.noise.set(8);this.seed.set(42);this.trainRatio.set(.8);this.generateData();
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
        this.stopReason.set('stopped');
    }

    reset() {
        this.send({ type: 'pause' });
        this.initWorker();
    }

    setLearningRate(v: number) { this.pause(); this.recordTrial(); this.learningRate.set(v); this.reset(); }
    setMaxIterations(v: number) { this.pause(); this.recordTrial(); this.maxIterations.set(v); this.reset(); }
    setSpeed(v: number) { this.speed.set(v); this.send({ type: 'speed', speed: v }); }
    setAlgorithm(a: Algorithm) { this.pause(); this.recordTrial(); this.algorithm.set(a); this.reset(); }
    setDegree(v: number) { this.pause(); this.recordTrial(); this.degree.set(v); this.reset(); }
    setLambda(v: number) { this.pause(); this.recordTrial(); this.lambda.set(v); this.reset(); }

    selectSample(index: number) {
        if (Number.isInteger(index) && index >= 0 && index < this.trainX().length) this.selectedSample.set(index);
    }
    setMode(mode: 'normal' | 'learn') {
        if (mode === this.mode()) return;
        this.timingMode.set(this.iteration() > 0 || this.snapshot() ? 'mixed' : mode);
        // A newer page selection supersedes a pending pause acknowledgement.
        // requestId below ensures only the latest mode change can finish switching.
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
    /** Runs/resumes the current teaching iteration and stops on its F acknowledgement. */
    playIteration() {
        if (this.mode() !== 'learn' || this.switching() || this.busy() || this.lrError() || this.status() === 'error' || this.status() === 'done') return;
        if (!this.initialized) this.initWorker();
        this.singleIteration = true; this.auto.set(true); this.expanded.set(true);
        if (!this.snapshot() || this.phase() === 5) this.prepare(); else this.schedulePhase();
    }
    pausePresentation() { this.singleIteration = false; this.auto.set(false); clearTimeout(this.phaseTimer); }
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
        this.worker = new Worker(new URL('../engine/regression.worker', import.meta.url));
        this.worker.onmessage = ({ data }) => {
            if (data.runId !== this.runId) return;
            if (typeof data.computeMs === 'number' && Number.isFinite(data.computeMs)) this.computeMs.set(data.computeMs);
            if (typeof data.setupMs === 'number' && Number.isFinite(data.setupMs)) this.setupMs.set(data.setupMs);
            if (data.stopReason === 'max-iterations' || data.stopReason === 'converged') this.stopReason.set(data.stopReason);
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
                if (data.iteration !== this.iteration()) this.finalTest.set(null);
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
                    if (this.singleIteration || data.done) this.pausePresentation(); else this.schedulePhase();
                }
                if (data.done) this.recordTrial();
            } else if (data.type === 'error') {
                this.pausePresentation(); this.busy.set(false); this.committing = false; this.switching.set(false);
                this.errorMsg.set(data.message);
                this.status.set('error');
                this.stopReason.set('error');
            }
        };
        this.worker.onerror = () => {
            this.pausePresentation(); this.busy.set(false); this.switching.set(false);
            this.errorMsg.set('Không khởi chạy được worker. Hãy tải lại trang.'); this.status.set('error');
        };
    }

    private initWorker(initial?:Step) {
        this.pausePresentation(); this.runId++;
        this.snapshot.set(null); this.phase.set(0); this.busy.set(false);
        this.switching.set(false); this.committing = false;
        this.ensureWorker();
        this.history.set([]);
        this.iteration.set(0);
        this.errorMsg.set(null);
        this.status.set('idle');
        this.computeMs.set(0); this.setupMs.set(0); this.stopReason.set(null); this.finalTest.set(null);
        this.timingMode.set(this.mode());
        this.send({
            type: 'init', initial,
            Xtr: this.trainX(), ytr: this.trainY(), Xte: this.hasValidation() ? this.validationX() : this.testX(), yte: this.hasValidation() ? this.validationY() : this.testY(),
            lr: this.learningRate(), maxIter: this.maxIterations(),
            tol: this.tolerance(), speed: this.speed(),
            algorithm: this.algorithm(),
            degree: this.degree(),
            lambda: this.lambda(),
        });
        this.initialized = true;

    }
}
