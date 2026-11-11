async(page)=>{
 const check=(ok,message)=>{if(!ok)throw new Error(message);};page.setDefaultTimeout(25000);
 const idle=id=>page.waitForFunction(id=>document.querySelector('#'+id)?.hidden===false&&document.querySelector('.experience').getAttribute('aria-busy')==='false',id);
 await page.context().setOffline(false);await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:1440,height:1000});
 await page.goto('http://127.0.0.1:4300/');await page.locator('#algorithms .login-button').click();await page.getByLabel('Email',{exact:true}).fill('demo@example.com');await page.getByLabel('Mật khẩu',{exact:true}).fill('password123');await page.locator('.auth-submit').click();await page.waitForFunction(()=>!document.querySelector('#algorithms').hidden&&document.querySelector('.experience').getAttribute('aria-busy')==='false');await idle('algorithms');
 await page.getByRole('button',{name:'Khám phá Linear',exact:true}).click();await idle('lab');
 await page.waitForFunction(()=>window.ng.getComponent(document.querySelector('#lab app-viewport3d'))?.plane);
 await page.getByLabel('Số đặc trưng',{exact:true}).selectOption('1');await page.getByRole('button',{name:'REGENERATE',exact:true}).click();
 await page.locator('#experiment-stick-epsilon').fill('0');
 await page.evaluate(()=>window.ng.getComponent(document.querySelector('#lab app-viewport3d')).store.selectSample(1));
 await page.waitForTimeout(150);
 const visible=await page.evaluate(()=>{const v=window.ng.getComponent(document.querySelector('#lab app-viewport3d'));return {plane:v.plane.visible,line:v.modelLine.visible,bands:v.bands.map(x=>x.visible)};});
 check(!visible.plane&&visible.line&&visible.bands.every(x=>!x),'1D and zero epsilon survive sample changes');
 await page.locator('#lab .lesson-entry button').click();await idle('learning');
 await page.waitForFunction(()=>window.ng.getComponent(document.querySelector('#learning app-viewport3d'))?.modelLine);
 check(await page.evaluate(()=>{const v=window.ng.getComponent(document.querySelector('#learning app-viewport3d'));return !v.plane.visible&&!v.modelLine.visible&&v.bands.every(x=>!x.visible);}), 'A hides every prediction primitive');
 await page.locator('#learning .lab-heading button').click();await idle('lab');
 for(const [algorithm,profile] of [['Linear','linear'],['Polynomial','curved'],['Ridge','correlated'],['Lasso','sparse']]){
  if(algorithm!=='Linear'){await page.locator('#lab .change-algorithm').click();await idle('algorithms');await page.getByRole('button',{name:'Khám phá '+algorithm,exact:true}).click();
   const dialog=page.getByRole('dialog');if(await dialog.isVisible())await dialog.getByRole('button',{name:'Đổi thuật toán',exact:true}).click();await idle('lab');}
  await page.locator('#synthetic-kind').selectOption(profile);await page.getByLabel('Số đặc trưng',{exact:true}).selectOption('3');await page.getByRole('button',{name:'REGENERATE',exact:true}).click();
  await page.waitForFunction(()=>window.ng.getComponent(document.querySelector('#lab app-viewport3d')).store.latest()?.iteration===0);
  await page.getByRole('button',{name:'Step',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#lab [role=progressbar]').getAttribute('aria-valuenow')==='1');
  check(await page.locator('#selected-algorithm').getAttribute('data-value')===algorithm.toLowerCase(),'Correct algorithm '+algorithm);
  check(await page.locator('.coefficient-row').count()===(algorithm==='Polynomial'?9:3),'Feature coefficient count '+algorithm);
  await page.setViewportSize({width:390,height:844});check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Mobile algorithm layout '+algorithm);await page.setViewportSize({width:1440,height:1000});
 }
 // Save the applied sparse configuration, not an un-applied profile draft.
 await page.evaluate(()=>{const s=window.ng.getComponent(document.querySelector('#lab app-viewport3d')).store;window.__modelDataset=JSON.stringify({X:s.trainX(),y:s.trainY()});});
 await page.locator('#synthetic-kind').selectOption('curved');
 await page.context().setOffline(true);await page.getByLabel('Tên lần chạy',{exact:true}).fill('Integrity sparse profile');await page.getByRole('button',{name:'Lưu',exact:true}).click();
 const saved=page.locator('app-experiments-panel li').filter({hasText:'Integrity sparse profile'}).last();await saved.waitFor();
 await page.waitForFunction(()=>window.ng.getComponent(document.querySelector('app-experiments-panel')).exp.list().some(e=>e.name==='Integrity sparse profile'&&e.synthetic?.kind==='sparse'));
 const persisted=await page.evaluate(async()=>{const db=await new Promise((resolve,reject)=>{const r=indexedDB.open('hoiquy3d',1);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});const all=await new Promise((resolve,reject)=>{const r=db.transaction('experiments').objectStore('experiments').getAll();r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});db.close();return all.find(e=>e.name==='Integrity sparse profile');});
 check(persisted.synthetic.kind==='sparse'&&persisted.synthetic.version===1,'IndexedDB preserves applied profile/version');
 await page.getByRole('button',{name:'REGENERATE',exact:true}).click();await saved.getByRole('button',{name:'Áp dụng',exact:true}).click();
 check(await page.evaluate(()=>{const s=window.ng.getComponent(document.querySelector('#lab app-viewport3d')).store;return JSON.stringify({X:s.trainX(),y:s.trainY()})===window.__modelDataset;}),'Applying saved profile reconstructs identical data');
 let payload=[];const capture=async route=>{payload=route.request().postDataJSON().operations;await route.fallback();};await page.route('**/api/v1/sync/batch',capture);
 await page.context().setOffline(false);await page.waitForFunction(()=>window.ng.getComponent(document.querySelector('app-experiments-panel')).exp.list().some(e=>e.name==='Integrity sparse profile'&&e.synced));
 check(payload.some(e=>e.payload?.algorithm?.config?.snapshot?.synthetic?.kind==='sparse'),'Sync sends generation metadata');await page.unroute('**/api/v1/sync/batch',capture);
 await page.locator('app-csv-import input[type=file]').setInputFiles('docs/examples/learning-demo.csv');await page.locator('#csv-missing').selectOption('mean');await page.getByRole('button',{name:'Dùng dữ liệu này',exact:true}).click();
 check(await page.evaluate(()=>{const s=window.ng.getComponent(document.querySelector('#lab app-viewport3d')).store;const means=s.trainX()[0].map((_,j)=>s.trainX().reduce((a,r)=>a+r[j],0)/s.trainX().length);return s.provenance().fittedOn==='train'&&means.every(v=>Math.abs(v)<1e-10);}), 'CSV training columns centered using train stats');
 await page.locator('#lab .lesson-entry button').click();await idle('learning');
 await page.locator('.lesson-options>summary').click();await page.getByLabel('Thời lượng mỗi pha',{exact:true}).selectOption('0.5');await page.locator('.lesson-options>summary').click();
 await page.getByRole('button',{name:'Học từng bước',exact:true}).click();
 for(let phase=0;phase<6;phase++)await page.waitForFunction(i=>document.querySelector('#learning .lesson-illustration')?.getAttribute('data-view-phase')===String(i),phase);
 await page.waitForFunction(()=>document.querySelector('#lab [role=progressbar]').getAttribute('aria-valuenow')==='1');
 await page.screenshot({path:'output/playwright/model-integrity-learning.png'});
 await page.setViewportSize({width:390,height:844});check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Mobile layout has no horizontal overflow');
 return {suite:'model-integrity',passed:['1D/zero epsilon/sample-change regression','phase A hides line and surface','four algorithms and datasets','coefficient labels and count','applied config instead of draft','IndexedDB profile/version persistence','saved data reconstruction','sync metadata with mock API','train-only CSV centering','CSV A–F iteration','mobile layout']};
}