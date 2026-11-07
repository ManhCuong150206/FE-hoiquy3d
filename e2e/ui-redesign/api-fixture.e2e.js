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
 await page.route('**/api/v1/sync/batch',route=>{
  const rows=route.request().postDataJSON().operations;
  return route.fulfill({json:{success:true,results:rows.map(e=>({operationId:e.operationId,idempotencyKey:e.idempotencyKey,entityType:e.entityType,entityClientId:e.entityClientId,status:'applied',serverVersion:e.clientVersion+1}))}});
 });
 return {fixture:'UI API simulation only; no live database writes'};
}
