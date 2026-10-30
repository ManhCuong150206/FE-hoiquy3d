async (page) => {
 page.setDefaultTimeout(15000); page.setDefaultNavigationTimeout(30000);
 const check=(ok,message)=>{if(!ok)throw new Error(message);};
 const progress=page.locator('#lab [role=progressbar]');
 const waitIteration=async n=>page.waitForFunction(n=>Number(document.querySelector('[role=progressbar]').getAttribute('aria-valuenow'))>=n,n);
 for(const [label,id] of [['Linear','linear'],['Polynomial','polynomial'],['Ridge','ridge'],['Lasso','lasso']]){
  await page.getByRole('button',{name:'Khám phá '+label,exact:true}).click();
  await page.waitForFunction(id=>document.querySelector('#selected-algorithm')?.getAttribute('data-value')===id,id);
  await page.waitForFunction(()=>!document.querySelector('#lab').hidden && !document.querySelector('.experience').dataset.transition);
  check(await page.locator('#selected-algorithm').getAttribute('data-value')===id, 'Wrong algorithm '+id);
  await page.getByRole('button',{name:'Step',exact:true}).click();await waitIteration(1);
  check(await page.locator('app-results-panel .losses strong').first().innerText() !== '—','Missing metric');
  await page.getByRole('button',{name:'Reset',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('[role=progressbar]').getAttribute('aria-valuenow')==='0');
  if(id!=='lasso')await page.locator('.change-algorithm').click();
 }
 await page.getByRole('button',{name:'Chạy hoặc tạm dừng'}).click();await waitIteration(5);
 await page.getByRole('button',{name:'Chạy hoặc tạm dừng'}).click();
 await page.waitForTimeout(250);const paused=await progress.getAttribute('aria-valuenow');await page.waitForTimeout(250);
 check(await progress.getAttribute('aria-valuenow')===paused,'Pause must stop iteration');
 await page.locator('.change-algorithm').click();
 await page.getByRole('button',{name:'Khám phá Ridge',exact:true}).click();
 await page.getByRole('dialog').waitFor({state:'visible'});
 await page.getByRole('button',{name:'Giữ phiên hiện tại',exact:true}).click();
 check(await page.locator('#selected-algorithm').getAttribute('data-value')==='lasso','Cancel must preserve algorithm');
 await page.getByRole('button',{name:'Khám phá Ridge',exact:true}).click();
 await page.getByRole('dialog').getByRole('button',{name:'Đổi thuật toán',exact:true}).click();
 await page.waitForFunction(()=>document.querySelector('#lab').dataset.algorithm==='ridge' && !document.querySelector('.experience').dataset.transition);
 await page.getByRole('button',{name:'Step',exact:true}).click();await waitIteration(1);
 await page.locator('#lab-title').focus();
 await page.evaluate(()=>document.querySelector('#lab').scrollIntoView({behavior:'instant'}));
 await page.screenshot({path:'output/playwright/lab-desktop.png'});
 return {suite:'lab',passed:['all four algorithms','step and reset','finite metrics','play and pause','back navigation','cancel change preserves state','confirm change applies selection']};
}