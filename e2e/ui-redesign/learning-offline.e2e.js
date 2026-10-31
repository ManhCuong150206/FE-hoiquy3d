async (page) => {
 page.setDefaultTimeout(15000); page.setDefaultNavigationTimeout(30000);
 let stage='import';try {
 const check=(ok,message)=>{if(!ok)throw new Error(message);};
 await page.locator('app-csv-import input[type=file]').setInputFiles('docs/examples/learning-demo.csv');
 await page.locator('#csv-missing').selectOption('mean');
 await page.getByRole('button',{name:'Dùng dữ liệu này',exact:true}).click();
 await page.locator('#learning-mode').selectOption('learn');
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
 stage='sync';await page.route('**/api/v1/experiments/bulk',route=>route.fulfill({json:{success:true,count:1}}));
 await page.context().setOffline(false);
 await page.locator('app-experiments-panel .sync').filter({hasText:'Đã đồng bộ'}).waitFor();
 await page.locator('#learning-mode').selectOption('normal');
 await page.getByRole('button',{name:'Stop',exact:true}).click();
 return {suite:'learning/offline',passed:['CSV upload and mean imputation','six phases A-F','no model commit during A-E','one commit at F','offline IndexedDB save','online sync UI with mocked API (not MongoDB integration)','stop']};
 }catch(error){const state=await page.evaluate(()=>({y:scrollY,top:document.querySelector('#learning')?.getBoundingClientRect().top,transition:document.querySelector('.experience')?.dataset.transition}));throw new Error(`Learning stage ${stage}: ${error.message} ${JSON.stringify(state)}`);}
}
