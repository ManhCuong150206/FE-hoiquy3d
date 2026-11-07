import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, computed, effect, inject, signal, untracked, DestroyRef } from '@angular/core';
import { ALGORITHM_LABELS, SavedExperiment } from '../core/models/experiment';
import { experimentDb } from '../core/storage/experiment-db';
import { LabStore } from './lab-store';
import { AuthSession, apiMessage } from './auth-session';
const SYNC_URL = '/api/v1/sync/batch';
interface SyncResult {
    operationId: string; idempotencyKey: string; entityType: string; entityClientId: string;
    status: 'applied' | 'duplicate' | 'conflict' | 'error'; serverVersion?: number;
    error?: string; conflict?: { reason: string; serverData: unknown };
}
function operation(e: SavedExperiment) {
    const { synced, scopeId, serverVersion, mutationId, deletedAt, ...snapshot } = e;
    return {
        operationId: mutationId ?? e.id, idempotencyKey: mutationId ?? e.id,
        entityType: 'experiment', entityClientId: e.id,
        action: deletedAt ? 'delete' : serverVersion ? 'update' : 'create', clientVersion: serverVersion ?? 0,
        payload: deletedAt ? {} : {
            name: e.name, status: 'completed',
            algorithm: { type: e.algorithm, version: '1.0.0', config: { snapshot } }
        },
    };
}
function newId() { return globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`; }
function fromServer(value: unknown, scopeId: string): SavedExperiment | null {
    if (!value || typeof value !== 'object') return null; const r = value as Record<string, unknown>;
    // The API permits algorithm.config; top-level snapshot fields are discarded.
    if (r['ownerId'] && r['ownerId'] !== scopeId) return null;
    const algorithm = r['algorithm'] as { type?: string; config?: { snapshot?: Record<string, unknown> } };
    const snapshot = algorithm?.config?.snapshot ?? r;
    const type = typeof r['algorithm'] === 'string' ? r['algorithm'] : algorithm?.type;
    if (typeof r['clientId'] !== 'string' || !['linear', 'polynomial', 'ridge', 'lasso'].includes(type ?? '')) return null;
    if (!r['deletedAt'] && (!Array.isArray(snapshot['w']) || !snapshot['train'] || !snapshot['test'] || !snapshot['dataSource'])) return null;
    const date = typeof snapshot['createdAt'] === 'number' ? snapshot['createdAt'] : new Date(String(r['createdAt'])).getTime();
    const result = {
        ...snapshot, id: r['clientId'], name: r['name'], algorithm: type, createdAt: date, scopeId, synced: true,
        serverVersion: r['syncVersion'], deletedAt: r['deletedAt'] ? new Date(String(r['deletedAt'])).getTime() : undefined
    } as unknown as SavedExperiment;
    for (const key of ['train', 'test'] as const) if (result[key]?.r2 === null) result[key] = { ...result[key], r2: NaN };
    return result;
}
@Injectable({ providedIn: 'root' })
export class ExperimentsStore {
    private isBrowser = isPlatformBrowser(inject(PLATFORM_ID)); private lab = inject(LabStore); private auth = inject(AuthSession);
    private all = signal<SavedExperiment[]>([]); list = computed(() => this.canPersist() ? this.all().filter(e => e.scopeId === this.auth.scope() && !e.deletedAt) : []);
    online = signal(true); syncing = signal(false); syncError = signal<string | null>(null);
    conflict = signal<{ id: string; server: SavedExperiment | null } | null>(null);
    readonly canPersist = computed(() => this.auth.authenticated());
    pendingCount = computed(() => this.canPersist() ? this.all().filter(e => e.scopeId === this.auth.scope() && !e.synced).length : 0); canSave = computed(() => this.canPersist() && this.lab.latest() !== null);
    private syncAgain = false;
    private loadedScope = ''; private revision = 0; private scopeLoad: Promise<void> = Promise.resolve(); private writes = Promise.resolve();
    constructor() {
        effect(() => { this.auth.scope(); this.auth.user(); if (this.isBrowser) untracked(() => { this.scopeLoad = this.loadScope(); }); });
        if (!this.isBrowser) return; this.online.set(navigator.onLine);
        const on = () => { this.online.set(true); void this.sync(); }, off = () => this.online.set(false);
        window.addEventListener('online', on); window.addEventListener('offline', off);
        inject(DestroyRef).onDestroy(() => { window.removeEventListener('online', on); window.removeEventListener('offline', off); });
    }
    private persist() { const scope = this.auth.scope(), records = this.all(); this.writes = this.writes.catch(() => { }).then(async () => { if (this.canPersist() && this.auth.scope() === scope) await experimentDb.putMany(records); }); return this.writes; }
    private async loadScope() {
        const scope = this.auth.scope(), rev = ++this.revision; this.loadedScope = ''; this.all.set([]); this.conflict.set(null);
        this.syncError.set(null); if (!this.canPersist()) { this.loadedScope = scope; return; }
        try {
            const stored = await experimentDb.all(); if (rev !== this.revision || scope !== this.auth.scope() || !this.canPersist()) return;
            const records = stored.filter(e => e.scopeId === scope);
            this.all.set(records.sort((a, c) => c.createdAt - a.createdAt)); this.loadedScope = scope;
        } catch { if (rev === this.revision) { this.loadedScope = scope; this.syncError.set('Không truy cập được IndexedDB. Dữ liệu mới chỉ giữ trong bộ nhớ.'); } }
        if (rev === this.revision && this.canPersist()) void this.sync();
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
        this.all.update(list => [exp, ...list]); void this.persist().catch(() => this.syncError.set('Không lưu được xuống IndexedDB; dữ liệu hiện chỉ ở bộ nhớ.'));
        void this.sync(); return exp;
    }
    remove(id: string) { if (!this.canPersist() || this.loadedScope !== this.auth.scope()) return; this.all.update(list => list.map(e => e.id === id ? { ...e, deletedAt: Date.now(), synced: false, mutationId: newId() } : e)); void this.persist().catch(() => { }); void this.sync(); }
    private async readRemote(scope: string) {
        const records: SavedExperiment[] = [];
        if (scope !== this.auth.scope() || !this.canPersist()) throw new Error('Phiên làm việc đã thay đổi.');
        const res = await this.auth.api('/api/v1/sync/changes');
        if (!res.ok) throw new Error(apiMessage(await res.json().catch(() => null), 'Không đọc được thí nghiệm từ máy chủ.'));
        const data = await res.json() as { changes?: { experiments?: unknown[] } };
        if (!Array.isArray(data.changes?.experiments)) throw new Error('Phản hồi danh sách không hợp lệ.');
        for (const value of data.changes.experiments) { const record = fromServer(value, scope); if (record) records.push(record); }
        return records;
    }
    async resolveConflict(copy: boolean) {
        if (!this.canPersist() || this.loadedScope !== this.auth.scope()) return; const scope = this.auth.scope(); const conflict = this.conflict(); if (!conflict) return; const local = this.all().find(e => e.id === conflict.id); if (!local) return;
        const remote = conflict.server; this.all.update(list => list.filter(e => e.id !== local.id).concat(remote ? [remote] : [], copy ? [{ ...local, id: newId(), mutationId: newId(), serverVersion: 0, synced: false, deletedAt: undefined, name: local.name.slice(0, 109) + ' (bản sao)' }] : []));
        await experimentDb.remove(local.id).catch(() => { }); if (scope !== this.auth.scope() || !this.canPersist()) return; await this.persist(); this.conflict.set(null); void this.sync();
    }
    async sync() {
        if (!this.isBrowser || !this.online() || !this.canPersist() || this.conflict()) return;
        if (this.syncing()) { this.syncAgain = true; return; }
        this.syncing.set(true); this.syncError.set(null); const scope = this.auth.scope();
        try {
            const user = await this.auth.ensure(); if (!user || user.userId !== scope || scope !== this.auth.scope() || !this.canPersist()) return;
            // Wait for the current account's records before consuming its queue.
            while (true) {
                const loading = this.scopeLoad; await loading; await this.writes; if (scope !== this.auth.scope()) return;
                if (loading !== this.scopeLoad) continue; if (this.loadedScope === scope) break; this.scopeLoad = this.loadScope();
            }

            while (true) {
                if (scope !== this.auth.scope()) return; const pending = this.all().filter(e => !e.synced); if (!pending.length) break;
                const batch: SavedExperiment[] = []; let bytes = 0; for (const item of pending) { const size = new TextEncoder().encode(JSON.stringify(item)).byteLength; if (batch.length && (bytes + size > 8 * 1024 * 1024 || batch.length >= 50)) break; batch.push(item); bytes += size; }
                const res = await this.auth.api(SYNC_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ operations: batch.map(operation) }) });
                const ack = await res.json() as { results?: SyncResult[] };
                if (!res.ok) throw new Error(apiMessage(ack, `Đồng bộ thất bại (HTTP ${res.status}).`));
                if (scope !== this.auth.scope()) return;
                const results = Array.isArray(ack.results) ? ack.results : [];
                const match = (e: SavedExperiment) => results.find(a => a.entityType === 'experiment' && a.entityClientId === e.id && a.operationId === (e.mutationId ?? e.id) && a.idempotencyKey === (e.mutationId ?? e.id));
                const accepted = (e: SavedExperiment, a: SyncResult | undefined) => !!a && ['applied', 'duplicate'].includes(a.status)
                    && ((Number.isInteger(a.serverVersion) && (a.serverVersion ?? 0) > 0) || (!!e.deletedAt && a.serverVersion === undefined));
                this.all.update(list => list.map(e => {
                    const a = match(e);
                    if (accepted(e, a)) return { ...e, synced: true, serverVersion: a!.serverVersion ?? e.serverVersion };
                    // Conflict keys are remembered by the backend. Rotate every
                    // rejected conflict key so reload cannot mistake it for success.
                    return a?.status === 'conflict' ? { ...e, mutationId: newId() } : e;
                }));
                await this.persist();
                if (scope !== this.auth.scope()) return;
                const rejected = batch.find(e => !accepted(e, match(e)));
                if (rejected) {
                    const result = match(rejected);
                    if (result?.status === 'conflict') {
                        this.conflict.set({ id: rejected.id, server: fromServer(result.conflict?.serverData, scope) });
                    }
                    throw new Error(result?.error ?? result?.conflict?.reason ?? 'Máy chủ chưa xác nhận đủ từng thí nghiệm. Dữ liệu còn chờ đồng bộ.');
                }
            }
            const remote = await this.readRemote(scope); if (scope !== this.auth.scope()) return;
            this.all.update(list => { const merged = new Map(list.map(e => [e.id, e])); for (const record of remote) { const local = merged.get(record.id); if (!local || local.synced && (record.serverVersion ?? 0) >= (local.serverVersion ?? 0)) merged.set(record.id, record); } return [...merged.values()].sort((a, b) => b.createdAt - a.createdAt); }); await this.persist();
        } catch (error) { if (scope === this.auth.scope() && this.canPersist()) this.syncError.set(error instanceof Error ? error.message : 'Chưa đồng bộ được. Dữ liệu vẫn được giữ cục bộ.'); }
        finally { this.syncing.set(false); if (this.syncAgain) { this.syncAgain = false; void this.sync(); } }
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
