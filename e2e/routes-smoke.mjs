// Run after npm run build. This catches a missing root route even when compilation succeeds.
import assert from 'node:assert/strict';
import { AngularAppEngine } from '../dist/Hoiquy3d/server/server.mjs';
const engine = new AngularAppEngine({ allowedHosts: ['localhost'] });
for (const path of ['/', '/account']) {
  const response = await engine.handle(new Request(`http://localhost:4200${path}`));
  assert.equal(response?.status, 200, `${path} must be served by Angular`);
  assert.match(await response.text(), /<app-root/);
  console.log(`PASS ${path}: HTTP 200 with Angular shell`);
}
