
/**
 * Một bước huấn luyện Lasso Regression.
 * Loss = MSE + lambda * tổng |w[j]|
 *
 * Sử dụng Proximal Gradient Descent (ISTA).
 * Không áp dụng regularization cho intercept b.
 */
export function lassoStep(
    X: number[][],
    y: number[],
    w: number[],
    b: number,
    lr: number,
    lambda: number
): { w: number[]; b: number } {
    const n = X.length;
    const d = w.length;

    const gw = new Array<number>(d).fill(0);
    let gb = 0;

    // Bước 1: Tính gradient của MSE
    for (let i = 0; i < n; i++) {
        let prediction = b;

        for (let j = 0; j < d; j++) {
            prediction += w[j] * X[i][j];
        }

        const error = prediction - y[i];

        for (let j = 0; j < d; j++) {
            gw[j] += error * X[i][j];
        }

        gb += error;
    }

    const k = 2 / n;

    // Bước 2: Gradient Descent cho MSE
    const nextW = w.map((wj, j) => {
        const temp = wj - lr * k * gw[j];

        // Bước 3: Soft-thresholding cho L1
        const threshold = lr * lambda;

        return Math.sign(temp) *
            Math.max(Math.abs(temp) - threshold, 0);
    });

    // Intercept không bị phạt L1
    const nextB = b - lr * k * gb;

    return {
        w: nextW,
        b: nextB,
    };
}
