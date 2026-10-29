import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { ALGORITHM_LABELS, SavedExperiment } from '../core/models/experiment';
import { experimentDb } from '../core/storage/experiment-db';
import { LabStore } from './lab-store';

// Endpoint nhận lô thí nghiệm (upsert theo id). Cần backend Express + MongoDB phía server.
const SYNC_URL = '/api/v1/experiments/bulk';

function newId(): string {
    return globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

@Injectable({ providedIn: 'root' })
export class ExperimentsStore {
    private isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
    private lab = inject(LabStore);

    list = signal<SavedExperiment[]>([]); // mới nhất ở đầu
    online = signal(true);
    syncing = signal(false);
    syncError = signal<string | null>(null);

    pendingCount = computed(() => this.list().filter((e) => !e.synced).length);
    canSave = computed(() => this.lab.latest() !== null);

    constructor() {
        if (!this.isBrowser) return;
        this.online.set(navigator.onLine);
        window.addEventListener('online', () => {
            this.online.set(true);
            void this.sync(); // có mạng lại → tự đồng bộ
        });
        window.addEventListener('offline', () => this.online.set(false));
        void this.load();
    }

    // ===== lưu / xoá =====
    save(name: string): SavedExperiment | null {
        const s = this.lab.latest();
        const m = this.lab.metrics();
        if (!s || !m) return null;

        const exp: SavedExperiment = {
            id: newId(),
            name: name.trim() || `${ALGORITHM_LABELS[this.lab.algorithm()]} #${this.list().length + 1}`,
            createdAt: Date.now(),
            algorithm: this.lab.algorithm(),
            learningRate: this.lab.learningRate(),
            maxIterations: this.lab.maxIterations(),
            degree: this.lab.algorithm() === 'polynomial' ? this.lab.degree() : undefined,
            lambda: ['ridge', 'lasso'].includes(this.lab.algorithm()) ? this.lab.lambda() : undefined,
            dataSource: this.lab.dataSource(),
            csvName: this.lab.csvName(),
            sampleCount: this.lab.trainX().length + this.lab.testX().length,
            featureCount: this.lab.dataFeatures(),
            noise: this.lab.noise(),
            seed: this.lab.seed(),
            trainRatio: this.lab.trainRatio(),
            iterations: s.iteration,
            w: [...s.w],
            b: s.b,
            train: m.train,
            test: m.test,
            synced: false,
        };
        this.list.update((l) => [exp, ...l]);
        experimentDb.put(exp).catch(() => { /* IndexedDB bị chặn (vd. chế độ riêng tư): vẫn giữ trong bộ nhớ */ });
        void this.sync();
        return exp;
    }

    remove(id: string) {
        this.list.update((l) => l.filter((e) => e.id !== id));
        experimentDb.remove(id).catch(() => { });
    }

    // ===== đồng bộ lên máy chủ =====
    async sync() {
        if (!this.isBrowser || !this.online() || this.syncing()) return;
        const pending = this.list().filter((e) => !e.synced);
        if (pending.length === 0) return;

        this.syncing.set(true);
        this.syncError.set(null);
        try {
            const res = await fetch(SYNC_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(pending.map(({ synced, ...rest }) => rest)),
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            const done = pending.map((e) => ({ ...e, synced: true }));
            await experimentDb.putMany(done).catch(() => { });
            this.list.update((l) => l.map((e) => done.find((d) => d.id === e.id) ?? e));
        } catch {
            this.syncError.set('Chưa đồng bộ được với máy chủ. Dữ liệu vẫn được giữ trong trình duyệt.');
        } finally {
            this.syncing.set(false);
        }
    }

    // ===== xuất =====
    exportJson() {
        this.download('hoiquy3d-experiments.json', JSON.stringify(this.list(), null, 2), 'application/json');
    }

    exportCsv() {
        const cols = [
            'id', 'name', 'createdAt', 'algorithm', 'learningRate', 'maxIterations', 'degree', 'lambda', 'iterations',
            'dataSource', 'csvName', 'sampleCount', 'featureCount', 'noise', 'seed', 'trainRatio',
            'w', 'b',
            'train_mse', 'train_rmse', 'train_mae', 'train_r2',
            'test_mse', 'test_rmse', 'test_mae', 'test_r2',
        ];
        const esc = (v: unknown) => {
            const s = String(v ?? '');
            return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        };
        const lines = this.list().map((e) => [
            e.id, e.name, new Date(e.createdAt).toISOString(), e.algorithm, e.learningRate, e.maxIterations, e.degree ?? '', e.lambda ?? '', e.iterations,
            e.dataSource, e.csvName, e.sampleCount, e.featureCount, e.noise, e.seed, e.trainRatio,
            e.w.join(' '), e.b,
            e.train.mse, e.train.rmse, e.train.mae, e.train.r2,
            e.test.mse, e.test.rmse, e.test.mae, e.test.r2,
        ].map(esc).join(','));
        // BOM để Excel đọc đúng tiếng Việt
        this.download('hoiquy3d-experiments.csv', '\uFEFF' + [cols.join(','), ...lines].join('\r\n'), 'text/csv;charset=utf-8');
    }

    // ===== nội bộ =====
    private async load() {
        try {
            const items = await experimentDb.all();
            this.list.set(items.sort((a, b) => b.createdAt - a.createdAt));
        } catch {
            /* IndexedDB không dùng được: bắt đầu với danh sách rỗng */
        }
        if (this.online()) void this.sync();
    }

    private download(filename: string, content: string, mime: string) {
        if (!this.isBrowser) return;
        const url = URL.createObjectURL(new Blob([content], { type: mime }));
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }
}