/** Deadline-based cap: skips surplus display refreshes without accumulating a catch-up burst. */
export class FrameBudget {
  private next = 0;
  private previous = 0;
  readonly interval: number;
  constructor(readonly fps = 60) { this.interval = 1000 / fps; }
  take(now: number): number | null {
    if (this.next && now + .1 < this.next) return null;
    const delta = this.previous ? Math.min(80, now - this.previous) : this.interval;
    this.previous = now;
    this.next = this.next ? this.next + Math.max(1, Math.floor((now - this.next) / this.interval) + 1) * this.interval : now + this.interval;
    return delta;
  }
  reset() { this.next = 0; this.previous = 0; }
}

/** CPU submission duration, not GPU execution time. Useful when checking the real render cadence. */
export function recordRender(canvas: HTMLCanvasElement, started: number) {
  canvas.dataset['frameCap'] = '60';
  canvas.dataset['renderCount'] = String(Number(canvas.dataset['renderCount'] ?? 0) + 1);
  canvas.dataset['renderCpuMs'] = (performance.now() - started).toFixed(3);
}
