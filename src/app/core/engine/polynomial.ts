
/**
 * Polynomial feature expansion.
 *
 * Ví dụ:
 * 1 đặc trưng, degree 2:
 * [x1] -> [x1, x1²]
 *
 * 2 đặc trưng, degree 2:
 * [x1, x2] -> [x1, x2, x1², x1*x2, x2²]
 *
 * Không thêm cột 1 vì intercept b được học riêng.
 */

export function polynomialFeatures(
  X: number[][],
  degree: number
): number[][] {
  if (X.length === 0) return [];

  const d = X[0].length;
  const powers: number[][] = [];

  function generate(
    remaining: number,
    index: number,
    current: number[]
  ): void {
    if (index === d - 1) {
      powers.push([...current, remaining]);
      return;
    }

    for (let p = remaining; p >= 0; p--) {
      generate(
        remaining - p,
        index + 1,
        [...current, p]
      );
    }
  }

  for (let total = 1; total <= degree; total++) {
    generate(total, 0, []);
  }

  return X.map(row =>
    powers.map(exponents =>
      exponents.reduce(
        (value, power, j) =>
          value * Math.pow(row[j], power),
        1
      )
    )
  );
}
