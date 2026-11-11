import { experimentPayload as payload, readExperiment } from '../core/models/experiment-payload';
import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, computed, effect, inject, signal, untracked, DestroyRef } from '@angular/core';
import { ALGORITHM_LABELS, SavedExperiment } from '../core/models/experiment';
import { experimentDb } from '../core/storage/experiment-db';
import { LabStore } from './lab-store';
import { AuthSession, apiMessage } from './auth-session';
const SYNC_URL = '/api/v1/experiments/bulk';
function newId() { return globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`; }
// Dịch lỗi IndexedDB sang thông báo dễ hiểu (đầy dung lượng hoặc lỗi chung).
function storageMessage(error: unknown): string {
    const name = (error as { name?: string } | null)?.name;
    if (name === 'QuotaExceededError' || name === 'NS_ERROR_DOM_QUOTA_REACHED') {
        return 'Bộ nhớ trình duyệt đã đầy. Hãy xóa bớt thí nghiệm cũ hoặc xóa dữ liệu trang rồi thử lại.';
    }
    return 'Không lưu được xuống IndexedDB; dữ liệu hiện chỉ ở bộ nhớ.';
}
function storageError(error: unknown): string { return error instanceof Error && error.message ? error.message : storageMessage(error); }
@Injectable({ providedIn: 'root' })
export class ExperimentsStore {
    private isBrowser = isPlatformBrowser(inject(PLATFORM_ID)); private lab = inject(LabStore); private auth = inject(AuthSession);
    private all = signal<SavedExperiment[]>([]); list = computed(() => this.canPersist() ? this.all().filter(e => e.scopeId === this.auth.scope() && !e.deletedAt) : []);
    online = signal(true); syncing = signal(false); syncError = signal<string | null>(null);
    conflict = signal<{ id: string; server: SavedExperiment | null; invalidServer?: boolean } | null>(null);
    readonly canPersist = computed(() => this.auth.authenticated());
    pendingCount = computed(() => this.canPersist() ? this.all().filter(e => e.scopeId === this.auth.scope() && !e.deletedAt && !e.synced).length : 0); canSave = computed(() => this.canPersist() && this.lab.latest() !== null);
    private loadedScope = ''; private revision = 0; private scopeLoad: Promise<void> = Promise.resolve(); private writes = Promise.resolve();
    constructor() {
        effect(() => { this.auth.scope(); this.auth.user(); if (this.isBrowser) untracked(() => { this.scopeLoad = this.loadScope(); }); });
        if (!this.isBrowser) return; this.online.set(navigator.onLine);
        const on = () => { this.online.set(true); }, off = () => this.online.set(false);
        window.addEventListener('online', on); window.addEventListener('offline', off);
        inject(DestroyRef).onDestroy(() => { window.removeEventListener('online', on); window.removeEventListener('offline', off); });
    }
    private persist(removed: string[] = []) {
        if (!this.canPersist()) return Promise.resolve();
        const scope = this.auth.scope(), records = this.all().filter(e => e.scopeId === scope);
        // A queued local write must finish even if a 401 or account switch happens meanwhile.
        this.writes = this.writes.catch(() => { }).then(async () => {
            await experimentDb.putMany(records);
            for (const id of removed) await experimentDb.remove(id);
        }).catch(error => { throw new Error(storageMessage(error)); });
        return this.writes;
    }
    private async loadScope() {
        const scope = this.auth.scope(), rev = ++this.revision; this.loadedScope = ''; this.all.set([]); this.conflict.set(null);
        this.syncError.set(null); if (!this.canPersist()) { this.loadedScope = scope; return; }
        try {
            await this.writes;
            const stored = await experimentDb.all(); if (rev !== this.revision || scope !== this.auth.scope() || !this.canPersist()) return;
            const records = stored.filter(e => e.scopeId === scope).map(readExperiment);
            this.all.set(records.sort((a, c) => c.createdAt - a.createdAt)); this.loadedScope = scope;
        } catch { if (rev === this.revision) { this.loadedScope = scope; this.syncError.set('Không truy cập được IndexedDB. Dữ liệu mới chỉ giữ trong bộ nhớ.'); } }
    }
    save(name: string): SavedExperiment | null {
        if (!this.canPersist()) return null;
        const state = this.lab.latest(), metrics = this.lab.metrics(); if (!state || !metrics) return null;
        if (this.loadedScope !== this.auth.scope()) { this.syncError.set('Đang mở vùng dữ liệu. Vui lòng thử lưu lại.'); return null; }
        const exp: SavedExperiment = {
            id: newId(), scopeId: this.auth.scope(), mutationId: newId(), serverVersion: 0,
            name: name.trim() || `${ALGORITHM_LABELS[this.lab.algorithm()]} #${this.list().length + 1}`, createdAt: Date.now(),
            algorithm: this.lab.algorithm(), learningRate: this.lab.learningRate(), maxIterations: this.lab.maxIterations(),
            degree: this.lab.algorithm() === 'polynomial' ? this.lab.degree() : undefined, lambda: ['ridge', 'lasso'].includes(this.lab.algorithm()) ? this.lab.lambda() : undefined,
            dataSource: this.lab.dataSource(), csvName: this.lab.csvName(), synthetic: this.lab.appliedSynthetic() ?? undefined,
            sampleCount: this.lab.trainX().length + this.lab.testX().length, featureCount: this.lab.dataFeatures(),
            noise: this.lab.appliedSynthetic()?.noise ?? this.lab.noise(), seed: this.lab.appliedSynthetic()?.seed ?? this.lab.seed(), trainRatio: this.lab.appliedSynthetic()?.trainRatio ?? this.lab.trainRatio(),
            iterations: state.iteration, w: [...state.w], b: state.b, train: metrics.train, test: metrics.test, synced: false,
            csvData: this.lab.dataSource() === 'csv' ? structuredClone({ trainX: this.lab.trainX(), trainY: this.lab.trainY(), testX: this.lab.testX(), testY: this.lab.testY(), trainIndices: this.lab.trainIndices(), provenance: this.lab.provenance() ?? undefined }) : undefined
        };
        if (exp.name.length > 120) { this.syncError.set('Tên thí nghiệm tối đa 120 ký tự.'); return null; }
        if (new TextEncoder().encode(JSON.stringify(exp)).byteLength > 8 * 1024 * 1024) { this.syncError.set('Bản lưu vượt 8 MiB. Hãy giảm dữ liệu CSV trước khi lưu; mô hình đang chạy được giữ nguyên.'); return null; }
        this.all.update(list => [exp, ...list]); void this.persist().catch(error => this.syncError.set(storageError(error)));
        return exp;
    }
    remove(id: string) { if (!this.canPersist() || this.loadedScope !== this.auth.scope()) return; this.all.update(list => list.map(e => e.id === id ? { ...e, deletedAt: Date.now(), synced: false, mutationId: newId() } : e)); void this.persist().catch(error => this.syncError.set(storageError(error))); }
    async resolveConflict(copy: boolean) {
        if (!this.canPersist() || this.loadedScope !== this.auth.scope()) return;
        const scope = this.auth.scope(), conflict = this.conflict();
        if (!conflict) return;
        const local = this.all().find(e => e.id === conflict.id);
        if (!local) return;
        const remote = conflict.server?.deletedAt ? null : conflict.server;
        const replacement = copy || conflict.invalidServer ? {
            ...local, id: newId(), mutationId: newId(), serverVersion: 0, synced: false,
            deletedAt: undefined, name: local.name.slice(0, 109) + ' (bản sao)'
        } : null;
        this.all.update(list => list.filter(e => e.id !== local.id).concat(remote ? [remote] : [], replacement ? [replacement] : []));
        try {
            // Persist the copy BEFORE removing the original; a failed write must not lose it.
            await this.persist(remote ? [] : [local.id]);
        } catch {
            if (scope === this.auth.scope()) {
                this.all.update(list => list.filter(e => e.id !== local.id && e.id !== replacement?.id).concat(local));
                this.syncError.set('Không lưu được xuống IndexedDB; dữ liệu hiện chỉ ở bộ nhớ.');
            }
            return;
        }
        if (scope !== this.auth.scope()) return;
        this.conflict.set(null);
        if (conflict.invalidServer) this.syncError.set('Không đọc được bản server. Đã giữ dữ liệu local thành bản sao, chờ đồng bộ.');
    }
    async sync(id?: string) {
        if (!this.isBrowser || !this.online() || !this.canPersist() || this.syncing()) return;
        this.syncing.set(true); this.syncError.set(null);
        const scope = this.auth.scope(), revision = this.revision;
        const active = () => scope === this.auth.scope() && revision === this.revision && this.canPersist();
        try {
            await this.scopeLoad; await this.writes;
            if (!active() || this.loadedScope !== scope) return;
            // Freeze this click's selection; later saves and edits wait for another click.
            const batch = structuredClone(this.all().filter(e => e.scopeId === scope && !e.deletedAt && !e.synced && (id === undefined || e.id === id)));
            if (!batch.length) return;
            const user = await this.auth.ensure();
            if (!user || user.userId !== scope || !active()) return;
            const res = await this.auth.api(SYNC_URL, {
                method: 'POST', credentials: 'include',
                headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
                body: JSON.stringify(batch.map(payload)),
            });
            const ack = await res.json().catch(() => null) as { success?: boolean; items?: { id: string; syncVersion: number }[] } | null;
            if (!res.ok || ack?.success !== true || !Array.isArray(ack.items)) {
                throw new Error(apiMessage(ack, 'Đồng bộ thất bại. Dữ liệu vẫn được giữ cục bộ.'));
            }
            if (!active()) return;
            const sentById = new Map(batch.map(e => [e.id, e]));
            const versions = new Map(ack.items.filter(item => item && typeof item.id === 'string'
                && Number.isInteger(item.syncVersion) && item.syncVersion > 0).map(item => [item.id, item.syncVersion]));
            this.all.update(list => list.map(local => {
                const sent = sentById.get(local.id), version = versions.get(local.id);
                if (local.scopeId !== scope || !sent || version === undefined) return local;
                const unchanged = local.mutationId === sent.mutationId && local.deletedAt === sent.deletedAt
                    && JSON.stringify(payload(local)) === JSON.stringify(payload(sent));
                return { ...local, synced: unchanged, serverVersion: version };
            }));
            await this.persist();
            if (active() && batch.some(e => !versions.has(e.id))) {
                this.syncError.set('Máy chủ chưa xác nhận đủ từng thí nghiệm. Dữ liệu còn chờ đồng bộ.');
            }
        } catch (error) {
            if (active()) this.syncError.set(error instanceof Error ? error.message : 'Chưa đồng bộ được. Dữ liệu vẫn được giữ cục bộ.');
        } finally { this.syncing.set(false); }
    }
    // ===== xuất =====
    exportJson() {
        this.download('hoiquy3d-experiments.json', JSON.stringify(this.list(), null, 2), 'application/json');
    }

    exportCsv() {
        const cols = [
            'id', 'name', 'createdAt', 'algorithm', 'learningRate', 'maxIterations', 'degree', 'lambda', 'iterations',
            'dataSource', 'csvName', 'sampleCount', 'featureCount', 'noise', 'seed', 'trainRatio',
            'synthetic_kind', 'synthetic_version', 'w', 'b',
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
            e.synthetic?.kind ?? (e.dataSource === 'synthetic' ? 'linear' : ''), e.synthetic?.version ?? '',
            e.w.join(' '), e.b,
            e.train.mse, e.train.rmse, e.train.mae, e.train.r2,
            e.test.mse, e.test.rmse, e.test.mae, e.test.r2,
        ].map(esc).join(','));
        // BOM để Excel đọc đúng tiếng Việt
        this.download('hoiquy3d-experiments.csv', '\uFEFF' + [cols.join(','), ...lines].join('\r\n'), 'text/csv;charset=utf-8');
    }

    // ===== nội bộ =====
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