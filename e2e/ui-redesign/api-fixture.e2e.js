async(page)=>{
 let user=null;
 const account={_id:'ui-test-account',displayName:'Member',email:'demo@example.com',role:'user',status:'active'};
 await page.route('**/api/v1/auth/**',async route=>{
  const request=route.request(),path=new URL(request.url()).pathname.split('/').pop();
  if(request.method()==='POST'&&request.headers()['x-requested-with']!=='XMLHttpRequest')return route.fulfill({status:403,json:{message:'Missing CSRF header'}});
  if(path==='logout'){user=null;return route.fulfill({json:{success:true}});}
  if(path==='login'){user=account;return route.fulfill({json:user});}
  if(path==='register')return route.fulfill({status:201,json:account});
  if(path==='me')return route.fulfill(user?{json:user}:{status:401,json:{message:'Vui lòng đăng nhập'}});
  return route.fulfill({status:404,json:{message:'Unknown auth endpoint'}});
 });
 await page.route('**/api/v1/sync/changes',route=>route.fulfill({json:{changes:{experiments:[],datasets:[],trainingRuns:[]}}}));
 const versions = new Map();
 await page.route('**/api/v1/experiments/bulk', route => {
  const request = route.request();
  if (!user) return route.fulfill({ status: 401, json: { message: 'Login required' } });
  if (request.method() !== 'POST' || request.headers()['x-requested-with'] !== 'XMLHttpRequest') {
   return route.fulfill({ status: 403, json: { message: 'Expected POST with CSRF header' } });
  }
  const rows = request.postDataJSON();
  if (!Array.isArray(rows) || !rows.length || rows.some(row => !row || typeof row.id !== 'string' || !row.id)) {
   return route.fulfill({ status: 400, json: { message: 'Expected experiment array with IDs' } });
  }
  const items = [];
  const conflicts = [];
  for (const row of rows) {
   const existing = versions.get(row.id);
   const currentVersion = existing?.syncVersion ?? 0;
   if (existing?.mutationId === row.lastMutationId && row.expectedVersion === currentVersion - 1) {
    items.push({ id: row.id, syncVersion: currentVersion });
   } else if (row.expectedVersion !== currentVersion) {
    conflicts.push({ id: row.id, syncVersion: existing?.syncVersion ?? null });
   } else {
    const syncVersion = currentVersion + 1;
    versions.set(row.id, { syncVersion, mutationId: row.lastMutationId });
    items.push({ id: row.id, syncVersion });
   }
  }
  return route.fulfill({
   status: conflicts.length ? 409 : 200,
   json: { success: !conflicts.length, count: items.length, items, conflicts },
  });
 });
 return {fixture:'UI API simulation only; no live database writes'};
}
