import { SavedExperiment } from './experiment';

/** Server payload: local bookkeeping and fields from other data sources stay local. */
export function experimentPayload(e: SavedExperiment) {
    const common = {
        id: e.id, name: e.name, clientCreatedAt: e.createdAt,
        algorithm: e.algorithm, learningRate: e.learningRate, maxIterations: e.maxIterations,
        ...(e.algorithm === 'polynomial' ? { degree: e.degree } : {}),
        ...(['ridge', 'lasso'].includes(e.algorithm) ? { lambda: e.lambda } : {}),
        dataSource: e.dataSource, iterations: e.iterations, w: e.w, b: e.b, train: e.train, test: e.test,
        status: 'completed',
    };
    if (e.dataSource === 'synthetic') return {
        ...common,
        synthetic: e.synthetic ?? {
            kind: 'linear', version: 1, sampleCount: e.sampleCount, featureCount: e.featureCount,
            noise: e.noise, seed: e.seed, trainRatio: e.trainRatio,
        },
    };
    return {
        ...common, sampleCount: e.sampleCount, featureCount: e.featureCount,
        seed: e.seed, trainRatio: e.trainRatio,
        ...(e.csvName ? { csvName: e.csvName } : {}),
        ...(e.csvData ? { csvData: e.csvData } : {}),
    };
}

/** Accept both legacy flat snapshots and compact server records without rewriting storage. */
export function readExperiment(record: SavedExperiment | Record<string, unknown>): SavedExperiment {
    const raw = record as unknown as Record<string, unknown>;
    const algorithm = raw['algorithm'] as SavedExperiment['algorithm'] | {
        type: SavedExperiment['algorithm']; config?: { degree?: number; lambda?: number; snapshot?: SavedExperiment };
    };
    const config = typeof algorithm === 'object' ? algorithm?.config : undefined;
    const snapshot = config?.snapshot ?? record as SavedExperiment;
    const synthetic = snapshot.synthetic;
    const timestamp = raw['clientCreatedAt'] ?? snapshot.createdAt;
    return {
        ...snapshot,
        id: String(raw['clientId'] ?? raw['id']),
        name: typeof raw['name'] === 'string' ? raw['name'] : snapshot.name,
        createdAt: typeof timestamp === 'number' ? timestamp : new Date(String(timestamp)).getTime(),
        algorithm: typeof algorithm === 'string' ? algorithm : algorithm?.type,
        degree: config?.degree ?? snapshot.degree, lambda: config?.lambda ?? snapshot.lambda,
        ...(synthetic ? { sampleCount: synthetic.sampleCount, featureCount: synthetic.featureCount,
            noise: synthetic.noise, seed: synthetic.seed, trainRatio: synthetic.trainRatio } : {}),
        csvName: snapshot.csvName ?? null,
    };
}
