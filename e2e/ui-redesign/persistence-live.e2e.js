async(page)=>{
 let stage='main';try{
 const check=(ok,message)=>{if(!ok)throw new Error(message);};page.setDefaultTimeout(25000);
 const idle=id=>page.waitForFunction(id=>document.querySelector('#'+id)?.hidden===false&&document.querySelector('.experience').getAttribute('aria-busy')==='false',id);
 const email='learner-'+Date.now()+'@example.com',password='Test-password-42!';
 await page.context().setOffline(false);await page.context().clearCookies();await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:1440,height:1000});await page.goto('http://127.0.0.1:4300/');
 await page.locator('#entry-email').fill(email);await page.locator('#entry-password').fill(password);await page.locator('.auth-submit').click();
 await page.locator('app-entry-form [role=alert]').filter({hasText:'không đúng'}).waitFor();check(await page.locator('#algorithms').isHidden(),'Failed login stays on welcome');
 await page.locator('.switch-auth button').click();await page.locator('#display-name').fill('Live integration member');
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
 const server=await response.json();check(JSON.stringify(server.w)===JSON.stringify(saved.w),'Coefficients round trip');
 check(JSON.stringify(server.csvData)===JSON.stringify(saved.csvData),'Exact processed CSV and provenance round trip');
 check(server.train.mse===saved.train.mse&&server.iterations===saved.iterations,'Metrics and iteration round trip');
 // Remove only this local record, keeping the live MongoDB copy intact.
 await page.evaluate(async id=>{const db=await new Promise((resolve,reject)=>{const r=indexedDB.open('hoiquy3d',1);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});await new Promise((resolve,reject)=>{const tx=db.transaction('experiments','readwrite');tx.objectStore('experiments').delete(id);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});db.close();},saved.id);
 await page.reload();await page.locator('#entry-email').fill(email);await page.locator('#entry-password').fill(password);await page.locator('.auth-submit').click();await idle('algorithms');await page.getByRole('button',{name:'Khám phá Linear',exact:true}).click();await idle('lab');
 const item=page.locator('app-experiments-panel li').filter({hasText:'Live CSV round trip'});await item.waitFor();await item.getByRole('button',{name:'Áp dụng',exact:true}).click();
 await page.waitForFunction(()=>document.querySelector('#lab [role=progressbar]').getAttribute('aria-valuenow')==='1');
 check(await page.evaluate(expected=>{const s=window.ng.getComponent(document.querySelector('#lab app-viewport3d')).store;return JSON.stringify(s.latest().w)===JSON.stringify(expected.w)&&JSON.stringify(s.trainX())===JSON.stringify(expected.csvData.trainX)&&JSON.stringify(s.testY())===JSON.stringify(expected.csvData.testY);},saved),'Restores weights, iteration and original CSV split after local loss');
 const newer=await page.request.post('http://127.0.0.1:4300/api/v1/experiments/bulk',{data:[{...saved,mutationId:'other-device-update',serverVersion:1,name:'Server version'}]});check(newer.ok(),'Simulated second device update');
 await item.getByRole('button',{name:'Xoá',exact:true}).click();await page.getByRole('button',{name:'Dùng bản máy chủ',exact:true}).waitFor();
 check((await (await page.request.get('http://127.0.0.1:4300/api/v1/experiments/'+saved.id)).json()).name==='Server version','Conflict does not overwrite server');
 await page.getByRole('button',{name:'Dùng bản máy chủ',exact:true}).click();const current=page.locator('app-experiments-panel li').filter({hasText:'Server version'});await current.waitFor();
 await page.context().setOffline(true);await current.getByRole('button',{name:'Xoá',exact:true}).click();await current.waitFor({state:'detached'});check(await current.count()===0,'Offline deletion removes visible row');
 await page.context().setOffline(false);await page.waitForFunction(()=>window.ng.getComponent(document.querySelector('app-experiments-panel')).exp.pendingCount()===0);
 const all=await (await page.request.get('http://127.0.0.1:4300/api/v1/experiments?includeDeleted=true')).json();check(all.items.find(e=>e.clientId===saved.id)?.deletedAt,'Offline deletion persisted as server tombstone');
 const other=await page.context().browser().newContext();try{
  await other.request.post('http://127.0.0.1:4300/api/v1/auth/register',{data:{email:'other-'+Date.now()+'@example.com',password,displayName:'Other account'}});
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
  stage='offline-save';await tab.getByLabel('Tên lần chạy',{exact:true}).fill('Offline guest trial');await tab.getByRole('button',{name:'Lưu',exact:true}).click();
  await tab.waitForFunction(()=>window.ng.getComponent(document.querySelector('app-experiments-panel')).exp.list().some(e=>e.name==='Offline guest trial'&&e.scopeId.startsWith('offline-guest-')&&!e.synced));
  stage='offline-migrate';await offlineContext.setOffline(false);await tab.waitForFunction(()=>window.ng.getComponent(document.querySelector('app-experiments-panel')).exp.list().some(e=>e.name==='Offline guest trial'&&!e.scopeId.startsWith('offline-guest-')&&e.synced));
  check((await (await offlineContext.request.get('http://127.0.0.1:4300/api/v1/experiments')).json()).items.some(e=>e.name==='Offline guest trial'),'Offline Guest queue migrates to its real session');
  stage='offline-logout';await tab.locator('#lab .change-algorithm').click();await tab.waitForFunction(()=>!document.querySelector('#algorithms').hidden&&document.querySelector('.experience').getAttribute('aria-busy')==='false');
  await offlineContext.setOffline(true);await tab.getByRole('button',{name:'Đăng xuất',exact:true}).click();await tab.locator('.session-error').filter({hasText:'Cần có mạng'}).waitFor();
  check(await tab.locator('#algorithms').isVisible(),'Offline logout never falsely reports session revoked');await offlineContext.setOffline(false);
 }catch(error){const state=await tab.evaluate(()=>{const s=window.ng.getComponent(document.querySelector('app-experiments-panel'))?.exp;return {scope:s?.auth.scope(),loaded:s?.loadedScope,list:s?.list().map(e=>({id:e.id,scope:e.scopeId,synced:e.synced})),syncing:s?.syncing(),error:s?.syncError()};}).catch(()=>null);throw new Error(error.message+' '+JSON.stringify(state));}finally{await offlineContext.close();}

 return {suite:'persistence-live',passed:['failed login blocks navigation','real registration and cookie session','credentials cleared','CSV/coefficient/metric MongoDB round trip','pull after deleting local cache','restored model and CSV split','version conflict blocks overwrite','explicit server conflict resolution','offline delete reaches MongoDB','account isolation','session revocation on logout','offline Guest migration to real session','offline logout reports revocation unavailable']};
}catch(error){throw new Error('Live stage '+stage+': '+error.message);}
}
