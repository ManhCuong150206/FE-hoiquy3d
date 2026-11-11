async(page)=>{
 const check=(ok,message)=>{if(!ok)throw new Error(message);};page.setDefaultTimeout(20000);
 const base='http://127.0.0.1:4300';await page.emulateMedia({reducedMotion:'reduce'});await page.goto(base);
 const idle=id=>page.waitForFunction(id=>document.querySelector('#'+id)?.hidden===false&&document.querySelector('.experience').getAttribute('aria-busy')==='false',id);
 await idle('algorithms');await page.getByRole('button',{name:'Khám phá Linear',exact:true}).click();await idle('lab');
 await page.evaluate(()=>window.ng.getComponent(document.querySelector('app-training-controls')).store.setMaxIterations(1));
 await page.getByRole('button',{name:'Step',exact:true}).click();await page.waitForFunction(()=>window.ng.getComponent(document.querySelector('app-training-controls')).store.status()==='done');
 await page.getByRole('button',{name:'Học từng bước và ghi chú',exact:false}).click();await idle('learning');
 const restart=page.getByRole('button',{name:'Học lại từ đầu',exact:true});check(await restart.isEnabled(),'Completed model exposes an enabled explicit restart');
 check((await page.locator('#lesson-run-status').innerText()).includes('Mô hình đã kết thúc'),'Completed state explains restart');
 const before=await page.evaluate(()=>{const l=window.ng.getComponent(document.querySelector('app-learning-walkthrough')).lab;return {X:l.trainX(),y:l.trainY(),algorithm:l.algorithm()};});
 await page.locator('.lesson-options>summary').click();await page.getByLabel('Thời lượng mỗi pha',{exact:true}).selectOption('0.5');await page.locator('.lesson-options>summary').click();
 await restart.click();await page.waitForFunction(()=>document.querySelector('app-learning-route li:nth-child(1)')?.getAttribute('aria-current')==='step');
 for(let phase=2;phase<=6;phase++)await page.waitForFunction(phase=>document.querySelector(`app-learning-route li:nth-child(${phase})`)?.getAttribute('aria-current')==='step',phase);
 await page.waitForFunction(()=>{const l=window.ng.getComponent(document.querySelector('app-learning-walkthrough')).lab;return l.phase()===5&&!l.auto()&&l.iteration()===1;});
 check(await page.evaluate(expected=>{const l=window.ng.getComponent(document.querySelector('app-learning-walkthrough')).lab;return JSON.stringify(l.trainX())===JSON.stringify(expected.X)&&JSON.stringify(l.trainY())===JSON.stringify(expected.y)&&l.algorithm()===expected.algorithm;},before),'Restart keeps dataset and algorithm');
 await page.waitForTimeout(900);check(await page.locator('#lab [role=progressbar]').getAttribute('aria-valuenow')==='1','Stops after exactly one iteration');
 check(await restart.isEnabled(),'Can restart again after reaching the limit at F');
 await page.evaluate(()=>{const l=window.ng.getComponent(document.querySelector('app-learning-walkthrough')).lab;l.status.set('error');l.errorMsg.set('Simulated recoverable worker error');});
 await restart.click();await page.waitForFunction(()=>window.ng.getComponent(document.querySelector('app-learning-walkthrough')).lab.phase()===1);
 check(await page.locator('#learning [role=alert]').count()===0,'Restart clears the previous error');
 await page.waitForFunction(()=>{const l=window.ng.getComponent(document.querySelector('app-learning-walkthrough')).lab;return l.phase()===5&&!l.auto();});
 await page.screenshot({path:'output/playwright/lesson-restart-fixed.png'});
 return {suite:'lesson-restart',passed:['completed model restart enabled','reason visible','real Worker replays A-F','same dataset and algorithm','exactly one commit','restart available after final F','error restart recovers','error message cleared']};
}