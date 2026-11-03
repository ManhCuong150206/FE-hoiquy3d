async(page)=>{
 let user=null;
 await page.route('**/api/v1/auth/**',async route=>{
  const path=new URL(route.request().url()).pathname.split('/').pop();
  if(path==='logout')user=null;
  else if(path==='guest')user={userId:'ui-test-guest',isAnonymous:true,displayName:'Guest'};
  else if(path==='login'||path==='register')user={userId:'ui-test-account',isAnonymous:false,displayName:'Member',email:'demo@example.com'};
  await route.fulfill({json:{success:true,user}});
 });
 await page.route('**/api/v1/experiments?**',route=>route.fulfill({json:{items:[],total:0,page:1,limit:100,totalPages:0}}));
 await page.route('**/api/v1/experiments/bulk',route=>{const rows=route.request().postDataJSON();return route.fulfill({json:{success:true,count:rows.length,items:rows.map(e=>({id:e.id,mutationId:e.mutationId??e.id,syncVersion:(e.serverVersion??0)+1}))}});});
 return {fixture:'UI API simulation only; live persistence verified separately'};
}