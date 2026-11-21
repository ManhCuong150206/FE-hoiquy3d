async (page) => {
  const check = (value, message) => { if (!value) throw new Error(message); };
  page.setDefaultTimeout(20000);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('http://127.0.0.1:4300/');
  await page.getByRole('button', { name: 'Khám phá Ridge', exact: true }).click();
  const experiment = page.locator('#lab app-viewport3d');
  await experiment.scrollIntoViewIfNeeded();
  await page.waitForFunction(() => {
    const element = document.querySelector('#lab app-viewport3d');
    return element && window.ng?.getComponent(element)?.residualSegments;
  });
  const runView = () => experiment.evaluate(element => {
    const view = window.ng.getComponent(element);
    return { visible: view.residualSegments.visible, count: view.residualSegments.geometry.drawRange.count,
      moving: !!view.surfaceTarget, iteration: view.store.iteration() };
  });
  check(!(await runView()).visible, 'Run residuals start hidden');
  const play = page.locator('#lab app-training-controls[data-controls="run"] .play');
  const reveal = page.waitForFunction(() => {
    const view = window.ng.getComponent(document.querySelector('#lab app-viewport3d'));
    return view.residualSegments.visible && view.store.iteration() === 0 ? performance.now() : false;
  });
  await play.click();
  const shownAt = await (await reveal).jsonValue();
  await page.waitForFunction(() => window.ng.getComponent(document.querySelector('#lab app-viewport3d')).surfaceTarget);
  const firstMotionAt = await page.evaluate(() => performance.now());
  check(firstMotionAt - shownAt >= 1000, 'Residuals have at least one second of preview before the model moves');
  await play.click();
  const runCount = (await runView()).count;
  await page.getByRole('button', { name: 'Học từng bước và ghi chú', exact: false }).click();
  const viewport = page.locator('#learning app-viewport3d');
  await viewport.scrollIntoViewIfNeeded();
  await page.waitForFunction(() => window.ng?.getComponent(document.querySelector('#learning app-viewport3d'))?.lessonTrace?.visible);
  const state = () => page.evaluate(() => {
    const v = window.ng.getComponent(document.querySelector('#learning app-viewport3d'));
    const trace = v.lessonTrace.geometry.attributes.position;
    const s = v.visualModel(), row = v.store.selectedX(), scale = v.store.dataScale();
    const expected = (s.b + s.w.reduce((total, w, i) => total + w * (i === 0 ? 0 : row[i]), 0)) * scale;
    return { phase: v.shownPhase(), iteration: v.store.iteration(), y: trace.getY(40), expected,
      segmentCount: v.residualSegments.visible ? v.residualSegments.geometry.drawRange.count : 0, moving: !!v.surfaceTarget,
      points: Array.from(v.pointMeshes[0].instanceMatrix.array).filter((_, i) => i % 16 >= 12 && i % 16 <= 14).join(','), visible: v.lessonTrace.visible };
  });
  const initial = await state();
  const next = page.locator('.run-iteration');
  await next.click();
  for (let phase = 0; phase < 4; phase++) {
    if (phase) await next.click();
    await page.waitForFunction(phase => document.querySelector('#learning .lesson-illustration')?.getAttribute('data-view-phase') === String(phase), phase);
    const stage = await state();
    check(stage.iteration === initial.iteration, 'A-D do not commit training');
    if (phase >= 2) {
      await page.waitForFunction(() => {
        const v = window.ng.getComponent(document.querySelector('#learning app-viewport3d'));
        const snapshot = v.store.snapshot();
        return snapshot?.preview && Math.hypot(...v.visualModel().w.map((w, i) => w - snapshot.before.w[i]))
          > 2 * Math.hypot(...snapshot.after.w.map((w, i) => w - snapshot.before.w[i]));
      });
      await page.waitForFunction(() => !window.ng.getComponent(document.querySelector('#learning app-viewport3d')).surfaceTarget);
      const preview = await state();
      check(Math.abs(preview.y - preview.expected) < 1e-6, 'C and D reach the visual preview for their phase');
      check(Math.abs(preview.y - initial.y) > 1e-7, 'The surface starts moving at C');
    }
    check(stage.segmentCount === (phase === 0 ? 0 : runCount), 'A shows the starting surface; B onward shows every residual');
  }
  await page.screenshot({ path: 'output/playwright/lesson-trace-before.png' });
  await next.click();
  await page.waitForFunction(() => {
    const v = window.ng.getComponent(document.querySelector('#learning app-viewport3d'));
    return v.shownPhase() === 4 && !!v.surfaceTarget;
  });
  await page.waitForFunction(() => !window.ng.getComponent(document.querySelector('#learning app-viewport3d')).surfaceTarget);
  const after = await state();
  check(Math.abs(after.y - after.expected) < 1e-6, 'Trace matches the prediction at the current phase');
  check(after.points === initial.points, 'Actual sample coordinates never move');
  check(after.iteration === initial.iteration, 'E is only a preview');
  await page.screenshot({ path: 'output/playwright/lesson-trace-after.png' });
  await next.click();
  await page.waitForFunction(iteration => window.ng.getComponent(document.querySelector('#learning app-viewport3d')).store.iteration() === iteration + 1, initial.iteration);
  await page.locator('.stage-toggle').nth(0).click();
  await page.waitForFunction(() => window.ng.getComponent(document.querySelector('#learning app-viewport3d')).shownPhase() === 0);
  await page.waitForFunction(() => !window.ng.getComponent(document.querySelector('#learning app-viewport3d')).surfaceTarget);
  const review = await state();
  check(review.iteration === initial.iteration + 1, 'Review does not retrain');
  check(Math.abs(review.y - review.expected) < 1e-6, 'Review restores the before trace');
  return { suite: 'lesson-trace', passed: ['run residual reveal before training', 'surface motion on both pages', 'real model prediction', 'run and lesson residual parity', 'fixed data points', 'F commit only', 'review without training'] };
}
