async(page)=>{
 let stage='main';try{
 const check=(ok,message)=>{if(!ok)throw new Error(message);};page.setDefaultTimeout(25000);
 const idle=id=>page.waitForFunction(id=>document.querySelector('#'+id)?.hidden===false&&document.querySelector('.experience').getAttribute('aria-busy')==='false',id);
 const email='learner-'+Date.now()+'@example.com',password='Test-password-42!';
 await page.context().setOffline(false);await page.context().clearCookies();await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:1440,height:1000});await page.goto('http://127.0.0.1:4300/');
 await page.locator('#entry-email').fill(email);await page.locator('#entry-password').fill(password);await page.locator('.auth-submit').click();
 await page.locator('app-entry-form [role=alert]').filter({hasText:'không đúng'}).waitFor();check(await page.locator('#algorithms').isHidden(),'Failed login stays on welcome');
 await page.locator('.switch-auth button').click();await page.locator('#display-name').fill('Live integration member');
 await page.locator('#entry-email').fill(email);await page.locator('#entry-password').fill(password);await page.locator('.auth-submit').click();
 await page.getByText('Đăng ký thành công. Hãy đăng nhập để lưu thí nghiệm.',{exact:true}).waitFor();
 check(await page.locator('#algorithms').isHidden(),'Registration alone does not create a session');
 await page.locator('#entry-email').fill(email);await page.locator('#entry-password').fill(password);await page.locator('.auth-submit').click();await idle('algorithms');
 check(await page.locator('#entry-password').inputValue()==='','Password cleared after authentication');
 await page.getByRole('button',{name:'Khám phá Linear',exact:true}).click();await idle('lab');
 await page.locator('app-csv-import input[type=file]').setInputFiles('docs/examples/learning-demo.csv');await page.locator('#csv-missing').selectOption('mean');await page.getByRole('button',{name:'Dùng dữ liệu này',exact:true}).click();
 await page.waitForFunction(()=>document.querySelector('#lab [role=progressbar]').getAttribute('aria-valuenow')==='0');
 await page.getByRole('button',{name:'Step',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#lab [role=progressbar]').getAttribute('aria-valuenow')==='1');
 await page.getByLabel('Tên lần chạy',{exact:true}).fill('Live CSV round trip');await page.getByRole('button',{name:'Lưu',exact:true}).click();
 await page.waitForFunction(()=>window.ng.getComponent(document.querySelector('app-experiments-panel')).exp.list().some(e=>e.name==='Live CSV round trip'&&e.synced));
 const saved=await page.evaluate(()=>window.ng.getComponent(document.querySelector('app-experiments-panel')).exp.list().find(e=>e.name==='Live CSV round trip'));
 const response=await page.request.get('http://127.0.0.1:4300/api/v1/experiments/'+saved.id);check(response.ok(),'Read saved record through API');
 const server=(await response.json()).algorithm.config.snapshot;check(JSON.stringify(server.w)===JSON.stringify(saved.w),'Coefficients round trip');
 check(JSON.stringify(server.csvData)===JSON.stringify(saved.csvData),'Exact processed CSV and provenance round trip');
 check(server.train.mse===saved.train.mse&&server.iterations===saved.iterations,'Metrics and iteration round trip');
 // Remove only this local record, keeping the live MongoDB copy intact.
 await page.evaluate(async id=>{const db=await new Promise((resolve,reject)=>{const r=indexedDB.open('hoiquy3d',1);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});await new Promise((resolve,reject)=>{const tx=db.transaction('experiments','readwrite');tx.objectStore('experiments').delete(id);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});db.close();},saved.id);
 await page.reload();await page.getByRole('button',{name:'Tiếp tục khám phá →',exact:true}).click();await idle('algorithms');await page.getByRole('button',{name:'Khám phá Linear',exact:true}).click();await idle('lab');
 const item=page.locator('app-experiments-panel li').filter({hasText:'Live CSV round trip'});await item.waitFor();await item.getByRole('button',{name:'Áp dụng',exact:true}).click();
 await page.waitForFunction(()=>document.querySelector('#lab [role=progressbar]').getAttribute('aria-valuenow')==='1');
 check(await page.evaluate(expected=>{const s=window.ng.getComponent(document.querySelector('#lab app-viewport3d')).store;return JSON.stringify(s.latest().w)===JSON.stringify(expected.w)&&JSON.stringify(s.trainX())===JSON.stringify(expected.csvData.trainX)&&JSON.stringify(s.testY())===JSON.stringify(expected.csvData.testY);},saved),'Restores weights, iteration and original CSV split after local loss');
 const newer=await page.request.patch('http://127.0.0.1:4300/api/v1/experiments/'+saved.id,{headers:{'X-Requested-With':'XMLHttpRequest'},data:{name:'Server version'}});check(newer.ok(),'Simulated second device update');
 await page.getByRole('button',{name:'Đồng bộ với máy chủ',exact:true}).click();const current=page.locator('app-experiments-panel li').filter({hasText:'Server version'});await current.waitFor();
 await page.context().setOffline(true);await current.getByRole('button',{name:'Xoá',exact:true}).click();await current.waitFor({state:'detached'});check(await current.count()===0,'Offline deletion removes visible row');
 await page.context().setOffline(false);await page.waitForFunction(()=>window.ng.getComponent(document.querySelector('app-experiments-panel')).exp.pendingCount()===0);
 const all=await (await page.request.get('http://127.0.0.1:4300/api/v1/sync/changes')).json();check(all.changes.experiments.find(e=>e.clientId===saved.id)?.deletedAt,'Offline deletion persisted as server tombstone');
 const other=await page.context().browser().newContext();try{
  const otherEmail='other-'+Date.now()+'@example.com',headers={'X-Requested-With':'XMLHttpRequest'};
  await other.request.post('http://127.0.0.1:4300/api/v1/auth/register',{headers,data:{email:otherEmail,password,displayName:'Other account'}});
  await other.request.post('http://127.0.0.1:4300/api/v1/auth/login',{headers,data:{email:otherEmail,password}});
  check((await (await other.request.get('http://127.0.0.1:4300/api/v1/experiments?includeDeleted=true')).json()).items.length===0,'Second account cannot pull first account data');
 }finally{await other.close();}
 await page.locator('#lab .change-algorithm').click();await idle('algorithms');await page.getByRole('button',{name:'Đăng xuất',exact:true}).click();await idle('welcome');
 check((await page.request.get('http://127.0.0.1:4300/api/v1/experiments')).status()===401,'Logout revokes real server session');
 await page.screenshot({path:'output/playwright/persistence-live-complete.png'});
 const offlineContext=await page.context().browser().newContext();const tab=await offlineContext.newPage();try{
  stage='offline-open';await tab.emulateMedia({reducedMotion:'reduce'});await tab.goto('http://127.0.0.1:4300/');await tab.waitForLoadState('networkidle');
  stage='offline-guest';await offlineContext.setOffline(true);await tab.locator('.guest-button').click();await tab.waitForFunction(()=>!document.querySelector('#algorithms').hidden);
  stage='offline-lab';await tab.getByRole('button',{name:'Khám phá Linear',exact:true}).click();await tab.waitForFunction(()=>!document.querySelector('#lab')?.hidden&&document.querySelector('.experience').getAttribute('aria-busy')==='false');
  stage='offline-step';await tab.getByRole('button',{name:'Step',exact:true}).click();await tab.waitForFunction(()=>document.querySelector('#lab [role=progressbar]').getAttribute('aria-valuenow')==='1');
  stage='offline-save';check(await tab.getByRole('button',{name:'Lưu',exact:true}).isDisabled(),'Guest never saves snapshots');
  const calls=[];tab.on('request',request=>{if(request.url().includes('/api/'))calls.push(request.url());});
  stage='guest-reconnect';await offlineContext.setOffline(false);await tab.waitForTimeout(200);
  check(calls.length===0,'Guest does not create a session or sync on reconnect');
  check(await tab.evaluate(()=>localStorage.getItem('regression.identity'))===null,'Guest identity is not persisted');
  stage='offline-logout';await tab.locator('#lab .change-algorithm').click();await tab.waitForFunction(()=>!document.querySelector('#algorithms').hidden&&document.querySelector('.experience').getAttribute('aria-busy')==='false');
  await offlineContext.setOffline(true);await tab.getByRole('button',{name:'Đăng xuất',exact:true}).click();await tab.waitForFunction(()=>!document.querySelector('#welcome').hidden);
  check(calls.length===0,'Guest exits offline without logout request');await offlineContext.setOffline(false);
 }catch(error){const state=await tab.evaluate(()=>{const s=window.ng.getComponent(document.querySelector('app-experiments-panel'))?.exp;return {scope:s?.auth.scope(),loaded:s?.loadedScope,list:s?.list().map(e=>({id:e.id,scope:e.scopeId,synced:e.synced})),syncing:s?.syncing(),error:s?.syncError()};}).catch(()=>null);throw new Error(error.message+' '+JSON.stringify(state));}finally{await offlineContext.close();}

 return {suite:'persistence-live',passed:['failed login blocks navigation','registration then explicit login','credentials cleared','CSV/coefficient/metric MongoDB round trip','auth/me restore and pull after deleting local cache','restored model and CSV split','remote update pulled','offline delete reaches MongoDB','account isolation','session revocation on logout','Guest never saves or syncs','Guest exits offline']};
}catch(error){throw new Error('Live stage '+stage+': '+error.message);}
}
