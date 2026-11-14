async (page) => {
  const check = (value, message) => { if (!value) throw new Error(message); };
  const base = process.env.ACCOUNT_TEST_URL || 'http://127.0.0.1:4300';
  const user = { _id: 'account-check', email: 'check@example.com', displayName: 'Kiểm tra', role: 'user', status: 'active', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' };
  let signedIn = false;
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.route('**/api/v1/**', async route => {
    const request = route.request(), path = new URL(request.url()).pathname;
    let status = 200, data = user;
    if (!signedIn) { status = 401; data = { message: 'Vui lòng đăng nhập' }; }
    else if (path === '/api/v1/users/me' && request.method() === 'POST') {
      const body = request.postDataJSON();
      check(Object.keys(body).join() === 'displayName', 'Only displayName is sent');
      check(request.headers()['x-requested-with'] === 'XMLHttpRequest', 'CSRF header');
      user.displayName = body.displayName;
    } else if (path === '/api/v1/users/me/password') {
      const body = request.postDataJSON();
      check(Object.keys(body).sort().join() === 'currentPassword,newPassword', 'Exact password fields');
      if (body.currentPassword === 'wrongpass') { status = 401; data = { message: 'Mật khẩu không đúng' }; }
    } else if (path === '/api/v1/users/me' && request.method() === 'DELETE') {
      check(request.postDataJSON().password === 'password1', 'DELETE body');
      signedIn = false; data = { success: true };
    }
    await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(data) });
  });
  check((await page.goto(base + '/')).status() === 200, 'Home responds 200');
  await page.locator('#algorithms').waitFor({ state: 'visible' });
  check(await page.getByRole('link', { name: 'cập nhật tk', exact: true }).count() === 0, 'Guest has no account update link');
  await page.goto(base + '/account');
  await page.waitForURL(base + '/');
  await page.locator('#algorithms').waitFor({ state: 'visible' });
  signedIn = true;
  await page.goto(base + '/account');
  await page.getByRole('heading', { name: 'Cập nhật tài khoản', exact: true }).waitFor();
  check(await page.locator('app-header a[href="/account"]').count() === 0, 'Account link is absent from shared header');
  check(await page.locator('.experience').isHidden(), 'Home hidden on account');
  await page.reload();
  await page.getByRole('heading', { name: 'Cập nhật tài khoản', exact: true }).waitFor();
  await page.getByLabel('Tên hiển thị', { exact: true }).fill('Tên mới');
  await page.getByRole('button', { name: 'Lưu', exact: true }).click();
  await page.getByText('Đã lưu tên hiển thị.', { exact: true }).waitFor();
  await page.getByLabel('Mật khẩu hiện tại', { exact: true }).first().fill('wrongpass');
  await page.getByLabel('Mật khẩu mới', { exact: true }).fill('password2');
  await page.getByLabel('Nhập lại mật khẩu mới', { exact: true }).fill('password2');
  await page.getByRole('button', { name: 'Đổi mật khẩu', exact: true }).click();
  await page.getByText('Mật khẩu không đúng. Vui lòng kiểm tra lại.', { exact: true }).waitFor();
  check(new URL(page.url()).pathname === '/account', 'Wrong password preserves account session');
  await page.getByLabel('Mật khẩu hiện tại', { exact: true }).first().fill('password1');
  await page.getByRole('button', { name: 'Đổi mật khẩu', exact: true }).click();
  await page.getByText('Đã đổi mật khẩu. Bạn vẫn đang đăng nhập.', { exact: true }).waitFor();
  const initialTheme = await page.locator('html').getAttribute('data-theme');
  await page.getByRole('button', { name: /Chuyển sang giao diện/ }).click();
  check(await page.locator('html').getAttribute('data-theme') !== initialTheme, 'Shared theme changes');
  await page.setViewportSize({ width: 390, height: 844 });
  check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Mobile has no horizontal overflow');
  await page.getByRole('link', { name: '← Về trang chủ' }).click();
  await page.locator('#algorithms').waitFor({ state: 'visible' });
  await page.locator('#algorithms .account-greeting').filter({ hasText: 'Tên mới' }).waitFor();
  const greeting = await page.locator('#algorithms .account-greeting').boundingBox();
  const accountLink = page.getByRole('link', { name: 'cập nhật tk', exact: true });
  const linkBox = await accountLink.boundingBox();
  check(greeting && linkBox && linkBox.y >= greeting.y + greeting.height, 'Account link sits below the greeting');
  await accountLink.click();
  await page.getByRole('button', { name: 'Xóa tài khoản', exact: true }).click();
  await page.locator('dialog input').fill('password1');
  await page.getByRole('button', { name: 'Xóa vĩnh viễn', exact: true }).click();
  await page.waitForURL(base + '/');
  check(await page.evaluate(() => localStorage.getItem('regression.lastIdentity')) === null, 'Deletion clears identity');
  check(errors.length === 0, 'Browser errors: ' + errors.join('; '));
  return { passed: ['home', 'unauthenticated guard', 'account deep link and reload', 'save name', 'password errors and success', 'theme', 'mobile', 'return home', 'delete'], errors };
}
