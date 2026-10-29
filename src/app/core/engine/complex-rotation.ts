export interface ComplexNumber {
  readonly real: number;
  readonly imaginary: number;
}

/** Unit complex number for a rotation through `radians`. */
export function unitRotation(radians: number): ComplexNumber {
  return { real: Math.cos(radians), imaginary: Math.sin(radians) };
}

export function multiplyComplex(a: ComplexNumber, b: ComplexNumber): ComplexNumber {
  return {
    real: a.real * b.real - a.imaginary * b.imaginary,
    imaginary: a.real * b.imaginary + a.imaginary * b.real,
  };
}

/** Rotate the vector (x, y) by multiplying x + iy by a unit complex number. */
export function rotatePair(x: number, y: number, rotation: ComplexNumber): [number, number] {
  const result = multiplyComplex({ real: x, imaginary: y }, rotation);
  return [result.real, result.imaginary];
}
