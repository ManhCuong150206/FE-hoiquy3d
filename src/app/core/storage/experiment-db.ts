import { DBSchema, IDBPDatabase, openDB } from 'idb';
import { SavedExperiment } from '../models/experiment';

interface LabDB extends DBSchema {
    experiments: {
        key: string;
        value: SavedExperiment;
        indexes: { 'by-created': number };
    };
}

let dbPromise: Promise<IDBPDatabase<LabDB>> | null = null;

// Chỉ gọi trong trình duyệt (IndexedDB không tồn tại khi SSR).
function db() {
    dbPromise ??= openDB<LabDB>('hoiquy3d', 1, {
        upgrade(d) {
            const store = d.createObjectStore('experiments', { keyPath: 'id' });
            store.createIndex('by-created', 'createdAt');
        },
    });
    return dbPromise;
}

export const experimentDb = {
    async all(): Promise<SavedExperiment[]> {
        return (await db()).getAllFromIndex('experiments', 'by-created');
    },
    async put(e: SavedExperiment): Promise<void> {
        await (await db()).put('experiments', e);
    },
    async putMany(items: SavedExperiment[]): Promise<void> {
        const tx = (await db()).transaction('experiments', 'readwrite');
        await Promise.all([...items.map((e) => tx.store.put(e)), tx.done]);
    },
    async remove(id: string): Promise<void> {
        await (await db()).delete('experiments', id);
    },
};