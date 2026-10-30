import { FrameBudget } from './frame-budget';
describe('FrameBudget', () => {
  it.each([60, 120, 144, 240])('caps a %i Hz display near 60 actual renders per second', hz => {
    const budget = new FrameBudget(); let frames = 0;
    for (let i = 0; i < hz; i++) if (budget.take(1000 + i * 1000 / hz) !== null) frames++;
    expect(frames).toBeGreaterThanOrEqual(59); expect(frames).toBeLessThanOrEqual(61);
  });
  it('coalesces pointer and animation requests at the same timestamp', () => {
    const budget = new FrameBudget(); expect(budget.take(1000)).not.toBeNull();
    expect(budget.take(1000)).toBeNull(); expect(budget.take(1005)).toBeNull(); expect(budget.take(1017)).not.toBeNull();
  });
  it('does not replay missed frames after a long task', () => {
    const budget = new FrameBudget(); budget.take(1000); expect(budget.take(2000)).toBe(80); expect(budget.take(2000)).toBeNull();
    budget.reset(); expect(budget.take(2000)).not.toBeNull();
  });
});
