async (page) => {
  const check = (value, message) => { if (!value) throw new Error(message); };
  page.setDefaultTimeout(20000);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('http://127.0.0.1:4300/');
  await page.getByRole('button', { name: 'Khám phá Ridge', exact: true }).click();
  await page.getByRole('button', { name: 'Học từng bước và ghi chú', exact: false }).click();
  const viewport = page.locator('#learning app-viewport3d');
  await viewport.scrollIntoViewIfNeeded();
  await page.waitForFunction(() => window.ng?.getComponent(document.querySelector('#learning app-viewport3d'))?.lessonTrace?.visible);
  const state = () => page.evaluate(() => {
    const v = window.ng.getComponent(document.querySelector('#learning app-viewport3d'));
    const trace = v.lessonTrace.geometry.attributes.position;
    const s = v.shownModel(), row = v.store.selectedX(), scale = v.store.dataScale();
    const expected = (s.b + s.w.reduce((total, w, i) => total + w * (i === 0 ? 0 : row[i]), 0)) * scale;
    return { phase: v.shownPhase(), iteration: v.store.iteration(), y: trace.getY(40), expected,
      target: v.surfaceMotion?.traceTo[40], moving: !!v.surfaceMotion,
      points: Array.from(v.pointMeshes[0].instanceMatrix.array).filter((_, i) => i % 16 >= 12 && i % 16 <= 14).join(','), visible: v.lessonTrace.visible };
  });
  const initial = await state();
  const next = page.locator('.run-iteration');
  await next.click();
  for (let phase = 0; phase < 4; phase++) {
    if (phase) await next.click();
    await page.waitForFunction(phase => document.querySelector('#learning .lesson-illustration')?.getAttribute('data-view-phase') === String(phase), phase);
    check((await state()).iteration === initial.iteration, 'A-D do not commit training');
  }
  await page.screenshot({ path: 'output/playwright/lesson-trace-before.png' });
  await next.click();
  await page.waitForFunction(() => {
    const v = window.ng.getComponent(document.querySelector('#learning app-viewport3d'));
    return v.shownPhase() === 4 && !!v.surfaceMotion;
  });
  const moving = await state();
  check(Math.abs(moving.target - moving.expected) < 1e-6, 'Animation targets the computed model');
  check(Math.abs(moving.y - moving.target) > 1e-7, 'Trace interpolates instead of jumping');
  await page.waitForFunction(() => !window.ng.getComponent(document.querySelector('#learning app-viewport3d')).surfaceMotion);
  const after = await state();
  check(Math.abs(after.y - after.expected) < 1e-6, 'Trace settles on exact prediction');
  check(after.points === initial.points, 'Actual sample coordinates never move');
  check(after.iteration === initial.iteration, 'E is only a preview');
  await page.screenshot({ path: 'output/playwright/lesson-trace-after.png' });
  await next.click();
  await page.waitForFunction(iteration => window.ng.getComponent(document.querySelector('#learning app-viewport3d')).store.iteration() === iteration + 1, initial.iteration);
  await page.locator('.stage-toggle').nth(0).click();
  await page.waitForFunction(() => !window.ng.getComponent(document.querySelector('#learning app-viewport3d')).surfaceMotion);
  const review = await state();
  check(review.iteration === initial.iteration + 1, 'Review does not retrain');
  check(Math.abs(review.y - review.expected) < 1e-6, 'Review restores the before trace');
  return { suite: 'lesson-trace', passed: ['real model prediction', 'E smooth motion', 'fixed data points', 'F commit only', 'review without training'] };
}
