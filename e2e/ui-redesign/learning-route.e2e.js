async(page)=>{
 const check=(ok,message)=>{if(!ok)throw new Error(message);};page.setDefaultTimeout(20000);
 await page.setViewportSize({width:1440,height:1000});await page.emulateMedia({reducedMotion:'reduce'});
 await page.goto('http://127.0.0.1:4300/');await page.locator('.guest-button').click();
 await page.getByRole('button',{name:'Khám phá Linear',exact:true}).click();
 await page.getByRole('button',{name:'Học từng bước và ghi chú',exact:false}).click();
 const route=page.locator('app-learning-route');await route.waitFor();
 const panel=page.locator('app-learning-walkthrough .lesson');const model=page.locator('#learning app-viewport3d');
 const progress=page.locator('#lab [role=progressbar]');
 check(await route.locator('li').count()===6,'Six stops visible before learning');
 check(await page.getByRole('button',{name:'Pha tiếp theo',exact:true}).count()===0,'Next-phase button removed');
 check(await page.locator('.lesson-options').getAttribute('open')===null,'Options initially collapsed');
 await page.locator('.lesson-options>summary').click();
 await page.getByLabel('Thời lượng mỗi pha',{exact:true}).selectOption('0.5');
 await page.locator('.lesson-options>summary').click();
 await page.getByRole('button',{name:'Học từng bước',exact:true}).click();
 for(let i=0;i<6;i++){
  await page.waitForFunction(i=>document.querySelectorAll('app-learning-route li')[i]?.getAttribute('aria-current')==='step',i);
  await page.waitForFunction(i=>document.querySelector('#learning .lesson-illustration')?.getAttribute('data-view-phase')===String(i),i);
  check(await progress.getAttribute('aria-valuenow')===(i<5?'0':'1'),'Only F commits one update');
 }
 await page.getByRole('button',{name:'Học từng bước',exact:true}).waitFor();await page.waitForTimeout(1300);
 check(await progress.getAttribute('aria-valuenow')==='1','Must stop after one iteration');
 for(let i=0;i<6;i++){
  const button=route.locator('.stage-toggle').nth(i);
  if(await button.getAttribute('aria-expanded')!=='true')await button.click();
  await page.waitForFunction(i=>document.querySelector('#learning .lesson-illustration')?.getAttribute('data-view-phase')===String(i),i);
  await route.locator('.result-summary').waitFor();
  check(await progress.getAttribute('aria-valuenow')==='1','Review never commits');
  check(await route.locator('.stage-result').count()===1,'Only one stop expanded');
 }
 await page.emulateMedia({reducedMotion:'no-preference'});
 await panel.evaluate(el=>{el.scrollTop=0;});await page.waitForTimeout(150);
 const before=await panel.evaluate(el=>el.scrollTop);const box=await panel.boundingBox();
 await page.mouse.move(box.x+box.width*.6,box.y+box.height*.5);await page.mouse.wheel(0,360);await page.waitForTimeout(250);
 check(await panel.evaluate(el=>el.scrollTop)>before,'Desktop lesson scrolls independently');
 check(await model.isVisible(),'Model stays alongside reading panel');
 await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));
 await panel.evaluate(el=>{el.scrollTop=el.scrollHeight;});
 const edge=await panel.boundingBox();await page.mouse.move(edge.x+edge.width*.6,edge.y+edge.height*.7);
 await page.mouse.wheel(0,600);await page.waitForTimeout(250);
 check(await page.evaluate(()=>scrollY)>0,'Scroll at panel end must continue into page');
 await page.screenshot({path:'output/playwright/single-iteration-desktop.png'});
 await page.getByRole('button',{name:'Đến ghi chú',exact:false}).click();
 await page.waitForFunction(()=>document.activeElement?.id==='learning-notes');
 check(await page.locator('#learning-notes').isVisible(),'Notes can be reached directly');
 // Resume a paused run; completion must still add exactly one iteration.
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.getByRole('button',{name:'Học từng bước',exact:true}).click();
 await page.waitForFunction(()=>document.querySelectorAll('app-learning-route li')[1]?.getAttribute('aria-current')==='step');
 await page.getByRole('button',{name:'Tạm dừng',exact:true}).click();await page.waitForTimeout(800);
 check(await progress.getAttribute('aria-valuenow')==='1','Pause must not commit');
 await page.getByRole('button',{name:'Tiếp tục học',exact:true}).click();
 await page.waitForFunction(()=>document.querySelectorAll('app-learning-route li')[5]?.getAttribute('aria-current')==='step');
 await page.getByRole('button',{name:'Học từng bước',exact:true}).waitFor();
 check(await progress.getAttribute('aria-valuenow')==='2','Resuming adds exactly one iteration');
 await page.setViewportSize({width:390,height:844});
 check(await panel.evaluate(el=>getComputedStyle(el).maxHeight)==='none','Mobile uses page scroll');
 for(let i=0;i<6;i++){
  const b=route.locator('.stage-toggle').nth(i);if(await b.getAttribute('aria-expanded')!=='true')await b.click();
  await route.locator('.result-summary').waitFor();await route.locator('.result-details summary').click();
  check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'No overflow with details');
 }
 await page.screenshot({path:'output/playwright/single-iteration-mobile.png'});
 return {suite:'learning-route',passed:['six stages before running','next button removed','options collapsed','A-F one iteration and stop','review illustrates each phase','review never commits','one result open','desktop independent scroll','3D stays visible','scroll chains to page at panel end','notes shortcut','pause resumes same iteration','mobile page scroll','all six tables fit mobile']};
}
