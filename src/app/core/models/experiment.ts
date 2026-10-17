export type Algorithm = 'linear' | 'polynomial' | 'ridge' | 'lasso';

export const ALGORITHM_LABELS: Record<Algorithm, string> = {
    linear: 'Linear',
    polynomial: 'Polynomial',
    ridge: 'Ridge',
    lasso: 'Lasso',
};

export interface MetricSet {
    mse: number;
    rmse: number;
    mae: number;
    r2: number;
}

/** Một lần chạy được người dùng lưu lại để so sánh / xuất / đồng bộ. */
export interface SavedExperiment {
    id: string;
    name: string;
    createdAt: number; // epoch ms

    // cấu hình thuật toán
    algorithm: Algorithm;
    learningRate: number;
    maxIterations: number;

    // cấu hình dữ liệu
    dataSource: 'synthetic' | 'csv';
    csvName: string | null;
    sampleCount: number;
    featureCount: number;
    noise: number; // thanh trượt 0..50 (%)
    seed: number;
    trainRatio: number;

    // kết quả tại thời điểm lưu
    iterations: number;
    w: number[];
    b: number;
    train: MetricSet;
    test: MetricSet;

    // true khi máy chủ đã nhận bản ghi này
    synced: boolean;
}