import { TestBed } from '@angular/core/testing';
import { signal, computed } from '@angular/core';
import { vi, beforeEach, afterEach, describe, it, expect } from 'vitest';
import { ExperimentsStore } from './experiments-store';
import { AuthSession } from './auth-session';
import { LabStore } from './lab-store';
import { experimentDb } from '../core/storage/experiment-db';
import { SavedExperiment } from '../core/models/experiment';


describe('manual bulk synchronization', () => {
 let store: ExperimentsStore, lab: LabStore, scope: ReturnType<typeof signal<string>>;
 let disk: Map<string, SavedExperiment>;
 const settle = async () => { TestBed.tick(); await new Promise(resolve => setTimeout(resolve, 0)); };
 beforeEach(async () => {
  disk = new Map(); scope = signal('person-a');
  vi.spyOn(experimentDb, 'all').mockImplementation(async () => [...disk.values()]);
  vi.spyOn(experimentDb, 'putMany').mockImplementation(async rows => { for (const row of rows) disk.set(row.id, structuredClone(row)); });
  vi.spyOn(experimentDb, 'remove').mockImplementation(async id => { disk.delete(id); });
  vi.stubGlobal('fetch', vi.fn(async (_url, options) => {
   const rows = JSON.parse(String(options?.body)) as SavedExperiment[];
   return new Response(JSON.stringify({ success: true, count: rows.length, items: rows.map(e => ({ id: e.id, syncVersion: 1 })) }));
  }));
  const auth = { scope, authenticated: computed(() => scope() !== 'guest'), user: computed(() => ({ userId: scope() })),
   ensure: async () => ({ userId: scope() }), api: (url: string, options?: RequestInit) => fetch(url, options) };
  TestBed.configureTestingModule({ providers: [{ provide: AuthSession, useValue: auth }] });
  store = TestBed.inject(ExperimentsStore); lab = TestBed.inject(LabStore); await settle();
  store.online.set(true); lab.history.set([{ iteration: 2, w: [1, 2], b: .5, trainLoss: .1, testLoss: .2 }]);
 });
 afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });
 it('never sends on load, save, delete, or reconnect', async () => {
  const a = store.save('A')!; store.save('B'); store.remove(a.id);
  window.dispatchEvent(new Event('offline')); window.dispatchEvent(new Event('online')); await settle();
  expect(fetch).not.toHaveBeenCalled(); expect(store.pendingCount()).toBe(1);
 });
 it('sends only the clicked experiment with cookies and a direct array', async () => {
  const a = store.save('A')!, b = store.save('B')!; await settle(); await store.sync(a.id);
  expect(fetch).toHaveBeenCalledTimes(1);
  const [url, options] = vi.mocked(fetch).mock.calls[0];
  expect(url).toBe('/api/v1/experiments/bulk');
  expect(options).toMatchObject({ method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' } });
  expect(JSON.parse(String(options?.body))).toEqual([expect.objectContaining({ id: a.id, algorithm: a.algorithm, w: a.w })]);
  expect(disk.get(a.id)).toMatchObject({ synced: true, serverVersion: 1 });
  expect(disk.get(b.id)).toEqual(b);
 });
 it('sends all pending active records of the current account in one array', async () => {
  const a = store.save('A')!, b = store.save('B')!, deleted = store.save('Deleted')!;
  store.remove(deleted.id); await settle();
  disk.set('foreign', { ...a, id: 'foreign', scopeId: 'person-b' });
  await store.sync();
  const rows = JSON.parse(String(vi.mocked(fetch).mock.calls[0][1]?.body)) as SavedExperiment[];
  expect(rows.map(e => e.id).sort()).toEqual([a.id, b.id].sort());
  await store.sync(); expect(fetch).toHaveBeenCalledTimes(1); expect(store.pendingCount()).toBe(0);
 });
 it('acknowledges only returned IDs that were sent', async () => {
  const a = store.save('A')!, b = store.save('B')!; await settle();
  vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ success: true, items: [{ id: b.id, syncVersion: 2 }] })));
  await store.sync(a.id); expect(disk.get(a.id)?.synced).toBe(false); expect(disk.get(b.id)?.synced).toBe(false);
 });
 it('keeps newer changes pending and does not automatically send another request', async () => {
  const a = store.save('A')!; await settle();
  let finish!: (response: Response) => void;
  vi.mocked(fetch).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  const running = store.sync(a.id); await settle();
  // Simulate a local edit while the snapshot is in flight.
  const all = (store as unknown as { all: ReturnType<typeof signal<SavedExperiment[]>> }).all;
  all.update(rows => rows.map(e => e.id === a.id ? { ...e, name: 'Edited', mutationId: 'new-edit', synced: false } : e));
  const b = store.save('B')!;
  finish(new Response(JSON.stringify({ success: true, items: [{ id: a.id, syncVersion: 3 }] })));
  await running; await settle();
  expect(disk.get(a.id)).toMatchObject({ name: 'Edited', synced: false, serverVersion: 3 });
  expect(disk.get(b.id)?.synced).toBe(false); expect(fetch).toHaveBeenCalledTimes(1);
 });
 it('keeps data on failure and retries with the same ID only after another click', async () => {
  const a = store.save('A')!; await settle();
  vi.mocked(fetch).mockRejectedValueOnce(new TypeError('Offline'));
  await store.sync(); expect(disk.get(a.id)?.synced).toBe(false);
  window.dispatchEvent(new Event('online')); await settle(); expect(fetch).toHaveBeenCalledTimes(1);
  await store.sync(); expect(disk.get(a.id)?.synced).toBe(true);
  expect(JSON.parse(String(vi.mocked(fetch).mock.calls[1][1]?.body))[0].id).toBe(a.id);
 });
 it('does not acknowledge a response after switching accounts', async () => {
  const a = store.save('A')!; await settle(); let finish!: (response: Response) => void;
  vi.mocked(fetch).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  const running = store.sync(); await settle(); scope.set('person-b'); await settle();
  finish(new Response(JSON.stringify({ success: true, items: [{ id: a.id, syncVersion: 1 }] })));
  await running; expect(disk.get(a.id)?.synced).toBe(false); expect(store.list()).toEqual([]);
 });
});
