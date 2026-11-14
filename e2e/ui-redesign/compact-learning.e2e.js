async (page) => {
  const check = (value, message) => { if (!value) throw new Error(message); };
  page.setDefaultTimeout(20000);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('http://127.0.0.1:4300/');
  await page.getByRole('button', { name: 'Khám phá Ridge', exact: true }).click();
  const guide = page.locator('app-experiment-workflow');
  await guide.waitFor();
  check(await guide.locator('#workflow-content').count() === 0, 'Guidance starts collapsed');
  check((await guide.boundingBox()).height < 125, 'Desktop toolbar stays compact');
  const scene = page.locator('#lab app-viewport3d');
  check((await scene.boundingBox()).y < 450, '3D remains in the first viewport');
  await guide.getByRole('button', { name: '4 · Đánh giá', exact: true }).click();
  check((await guide.locator('#workflow-content').boundingBox()).height <= 310, 'Expanded guidance has bounded height');
  await guide.getByRole('button', { name: 'Thu gọn hướng dẫn', exact: false }).click();
  await page.getByRole('button', { name: 'Step', exact: true }).click();
  await page.waitForFunction(() => document.querySelector('#lab [role=progressbar]')?.getAttribute('aria-valuenow') === '1');
  check(await guide.locator('#workflow-content').count() === 0, 'Metrics update without expanding guidance');
  await page.screenshot({ path: 'output/playwright/compact-lab-desktop.png' });
  await page.getByRole('button', { name: 'Học từng bước và ghi chú', exact: false }).click();
  await page.waitForFunction(() => window.ng?.getComponent(document.querySelector('#learning app-viewport3d'))?.plane);
  const viewState = () => page.evaluate(() => {
    const v = window.ng.getComponent(document.querySelector('#learning app-viewport3d'));
    return { plane: v.plane.visible, iteration: v.store.iteration(), modelIteration: v.shownModel()?.iteration, w: [...v.shownModel().w] };
  });
  check((await viewState()).plane, 'Lesson surface is already visible before starting');
  const committed = (await viewState()).iteration;
  const next = page.locator('.run-iteration');
  await next.click();
  for (let phase = 0; phase < 6; phase++) {
    if (phase) await next.click();
    await page.waitForFunction(phase => document.querySelector('#learning .lesson-illustration')?.getAttribute('data-view-phase') === String(phase), phase);
    const view = await viewState();
    check(view.plane, 'Surface stays visible in phase ' + phase);
    check(view.iteration === committed + Number(phase === 5), 'Only F changes the committed iteration');
    check(view.modelIteration === committed + Number(phase >= 4), 'E previews the proposed surface; F confirms it');
    if (phase === 0 || phase === 4) await page.screenshot({ path: `output/playwright/lesson-surface-${phase === 0 ? 'A' : 'E'}.png` });
  }
  await page.locator('.stage-toggle').nth(0).click();
  await page.waitForFunction(() => document.querySelector('#learning .lesson-illustration')?.getAttribute('data-view-phase') === '0');
  check((await viewState()).plane && (await viewState()).iteration === committed + 1, 'Review keeps the surface visible without retraining');
  await page.getByRole('button', { name: 'Về thực nghiệm', exact: false }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await guide.scrollIntoViewIfNeeded();
  check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'No mobile horizontal overflow');
  check((await guide.boundingBox()).height < 195, 'Mobile toolbar remains compact');
  await page.screenshot({ path: 'output/playwright/compact-lab-mobile.png' });
  return { suite: 'compact-learning', passed: ['compact initial toolbar', 'bounded guide', 'metrics and 3D visible', 'surface visible A-F', 'E preview / F commit', 'review without training', 'mobile layout'] };
}
