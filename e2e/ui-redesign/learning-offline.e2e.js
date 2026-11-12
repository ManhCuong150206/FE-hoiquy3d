async (page) => {
 const syncRequests = [];
 page.on('request', request => {
  if (new URL(request.url()).pathname === '/api/v1/experiments/bulk' && request.method() === 'POST') syncRequests.push(request);
 });
 page.setDefaultTimeout(15000); page.setDefaultNavigationTimeout(30000);
 await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:1440,height:1000});await page.goto('http://127.0.0.1:4300/');await page.locator('#algorithms .login-button').click();await page.getByLabel('Email',{exact:true}).fill('demo@example.com');await page.getByLabel('Mật khẩu',{exact:true}).fill('password123');await page.locator('.auth-submit').click();await page.waitForFunction(()=>!document.querySelector('#algorithms').hidden&&document.querySelector('.experience').getAttribute('aria-busy')==='false');await page.getByRole('button',{name:'Khám phá Linear',exact:true}).click();
 let stage='import';try {
 const check=(ok,message)=>{if(!ok)throw new Error(message);};
 await page.getByRole('tab',{name:'Dữ liệu',exact:true}).click();
 await page.locator('app-csv-import input[type=file]').setInputFiles('docs/examples/learning-demo.csv');
 await page.locator('#csv-missing').selectOption('mean');
 await page.getByRole('button',{name:'Dùng dữ liệu này',exact:true}).click();
 stage='navigate';
 await page.getByRole('button',{name:'Học từng bước và ghi chú',exact:false}).click();
 await page.waitForFunction(()=>!document.querySelector('#learning').hidden && !document.querySelector('.experience').dataset.transition);
 await page.locator('.lesson-options>summary').click();
 await page.getByLabel('Thời lượng mỗi pha',{exact:true}).selectOption('0.5');
 await page.locator('.lesson-options>summary').click();
 stage='begin';await page.getByRole('button',{name:'Học từng bước',exact:true}).click();
 const progress=page.locator('#lab [role=progressbar]');
 for(let i=0;i<=5;i++){
  await page.waitForFunction(i=>document.querySelectorAll('app-learning-route li')[i]?.getAttribute('aria-current')==='step',i);
  check(await progress.getAttribute('aria-valuenow')===(i<5?'0':'1'),'Only F commits');
 }
 await page.getByRole('button',{name:'Học từng bước',exact:true}).waitFor();
 await page.getByRole('button',{name:'Về thực nghiệm',exact:false}).click();
 await page.waitForFunction(()=>!document.querySelector('#lab').hidden && !document.querySelector('.experience').dataset.transition);
 stage='offline';await page.context().setOffline(true);
 await page.getByLabel('Tên lần chạy',{exact:true}).fill('E2E CSV offline');
 await page.getByRole('button',{name:'Lưu',exact:true}).click();
 await page.locator('app-experiments-panel .name').filter({hasText:'E2E CSV offline'}).waitFor();
 const saved=await page.evaluate(async()=>{
  const request=indexedDB.open('hoiquy3d',1);
  const db=await new Promise((resolve,reject)=>{request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});
  const query=db.transaction('experiments').objectStore('experiments').getAll();
  const rows=await new Promise((resolve,reject)=>{query.onsuccess=()=>resolve(query.result);query.onerror=()=>reject(query.error);});
  db.close();return rows.find(row=>row.name==='E2E CSV offline');
 });
 check(saved?.dataSource==='csv' && saved?.iterations===1 && saved?.synced===false,'Offline run must be persisted in IndexedDB');
 stage='sync';
 const savedRow = page.locator('app-experiments-panel li').filter({ hasText: 'E2E CSV offline' });
 const syncButton = page.getByRole('button', { name: 'Đồng bộ với máy chủ', exact: true });
 check(await syncButton.isDisabled(), 'Sync is unavailable while offline');
 await page.context().setOffline(false);
 await page.waitForFunction(() => document.querySelector('app-experiments-panel .sync-button')?.disabled === false);
 await page.waitForTimeout(500);
 await savedRow.getByText('Chờ đồng bộ', { exact: true }).waitFor();
 check(syncRequests.length === 0, 'Reconnecting must keep the run local until the user chooses sync');
 await syncButton.click();
 await savedRow.getByText('Đã đồng bộ', { exact: true }).waitFor();
 check(syncRequests.length === 1, 'One user click sends one bulk request');
 const uploaded = syncRequests[0].postDataJSON();
 check(uploaded.some(row => row.id === saved.id && row.dataSource === 'csv' && row.iterations === 1), 'Manual sync sends the saved CSV run');
 await page.getByRole('button',{name:'Stop',exact:true}).click();
 return {suite:'learning/offline',passed:['CSV upload and mean imputation','six phases A-F','no model commit during A-E','one commit at F','offline IndexedDB save','reconnect keeps pending data','manual bulk sync with mocked API','stop']};
 }catch(error){const state=await page.evaluate(()=>({y:scrollY,top:document.querySelector('#learning')?.getBoundingClientRect().top,transition:document.querySelector('.experience')?.dataset.transition}));throw new Error(`Learning stage ${stage}: ${error.message} ${JSON.stringify(state)}`);}
}