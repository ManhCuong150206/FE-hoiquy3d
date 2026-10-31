async(page)=>{
 page.setDefaultTimeout(15000);page.setDefaultNavigationTimeout(30000);
 const check=(ok,message)=>{if(!ok)throw new Error(message);};
 await page.setViewportSize({width:1440,height:1000});await page.emulateMedia({reducedMotion:'no-preference'});
 for(const mode of ['login','register','guest']){
  await page.goto('http://127.0.0.1:4300/');await page.locator('.experience[data-motion=active]').waitFor();
  if(mode==='guest')await page.getByRole('button',{name:'Tham gia với tư cách Guest',exact:true}).click();
  else {
   if(mode==='register'){await page.getByRole('button',{name:'Đăng ký',exact:true}).click();await page.getByLabel('Tên hiển thị').fill('Demo');}
   await page.getByLabel('Email',{exact:true}).fill('demo@example.com');await page.getByLabel('Mật khẩu',{exact:true}).fill('demo-password');
   await page.locator('form button[type=submit]').click();
  }
  await page.locator('.experience[data-transition=exit]').waitFor();
  await page.waitForFunction(()=>!document.querySelector('#algorithms').hidden && !document.querySelector('.experience').dataset.transition);
  await page.waitForFunction(()=>!document.querySelector('.experience').dataset.transition);
 }
 const canvas=page.locator('app-algorithm-sphere canvas');await canvas.waitFor();
 const bounds=await canvas.boundingBox(),hits=new Map();
 for(const y of [.25,.375,.5,.625,.75])for(const x of [.25,.375,.5,.625,.75]){
  await page.mouse.move(bounds.x+bounds.width*x,bounds.y+bounds.height*y);
  const id=await canvas.getAttribute('data-hovered-algorithm');if(id)hits.set(id,{x:bounds.x+bounds.width*x,y:bounds.y+bounds.height*y});
 }
 check(hits.size===4,'All four colored regions must be visible and hoverable at initial orientation: '+[...hits.keys()]);
 await page.screenshot({path:'output/playwright/sphere-four-colors.png'});
 const point=[...hits.values()][0];await page.mouse.move(point.x,point.y);await page.mouse.down();await page.mouse.move(point.x+75,point.y+45,{steps:12});await page.mouse.up();
 check(Boolean(await canvas.getAttribute('data-rotation')),'Drag must rotate sphere');check(await page.locator('#lab').count()===0,'Drag must not select algorithm');
 await page.getByRole('button',{name:'Khám phá Polynomial',exact:true}).click();await page.locator('.algorithm-flight-layer').waitFor();
 await page.waitForFunction(()=>!document.querySelector('#lab').hidden && !document.querySelector('.experience').dataset.transition);
 await page.waitForFunction(()=>!document.querySelector('.experience').dataset.transition);
 check(await page.locator('#selected-algorithm').getAttribute('data-value')==='polynomial','Selected algorithm mismatch');
 await page.getByRole('button',{name:'Step',exact:true}).click();
 await page.waitForFunction(()=>document.querySelector('[role=progressbar]').getAttribute('aria-valuenow')==='1');
 await page.getByRole('button',{name:'Học từng bước và ghi chú',exact:false}).click();
 await page.waitForFunction(()=>!document.querySelector('#learning').hidden && !document.querySelector('.experience').dataset.transition);
 await page.waitForFunction(()=>!document.querySelector('.experience').dataset.transition);
 await page.locator('#learning app-viewport3d canvas').waitFor();
 check(await page.locator('#learning app-viewport3d canvas').count()===1,'Learning must include real 3D model');
 check(await page.locator('#learning app-learning-walkthrough').count()===1 && await page.locator('#learning app-algorithm-notes').count()===1,'Learning and notes must be on fourth page');
 check(await page.locator('#learning app-learning-route li').count()===6,'Six-phase outline must be visible before training');
 check(await page.locator('#lab app-learning-walkthrough,#lab app-algorithm-notes').count()===0,'Learning must be separated from lab');
 check(await page.locator('#lab [role=progressbar]').getAttribute('aria-valuenow')==='1','Navigation must preserve iteration');
 await page.mouse.move(1405,500);await page.mouse.wheel(0,450);await page.waitForTimeout(650);
 check(await page.locator('#lab [role=progressbar]').getAttribute('aria-valuenow')==='1','Scroll must not train');
 await page.locator('#learning').scrollIntoViewIfNeeded();await page.screenshot({path:'output/playwright/learning-desktop.png'});
 await page.getByRole('button',{name:'Học từng bước',exact:true}).click();
 await page.locator('app-learning-route li[aria-current=step]').waitFor();
 check(await page.locator('#lab [role=progressbar]').getAttribute('aria-valuenow')==='1','Prepare must not commit');
 await page.waitForFunction(()=>document.querySelectorAll('app-learning-route li')[1].getAttribute('aria-current')==='step');
 await page.getByRole('button',{name:'Tạm dừng',exact:true}).click();
 await page.evaluate(()=>document.querySelector('#learning').scrollIntoView({behavior:'instant'}));await page.waitForTimeout(650);await page.screenshot({path:'output/playwright/learning-desktop.png'});
 await page.setViewportSize({width:390,height:844});
 await page.evaluate(()=>document.querySelector('#learning').scrollIntoView({behavior:'instant'}));await page.waitForTimeout(650);
 check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Learning mobile overflow');
 await page.screenshot({path:'output/playwright/learning-mobile.png'});
 return {suite:'cinematic-slides',passed:['login glow transition','registration glow transition','guest glow transition','four initial regions hoverable','drag rotates without selection','selected algorithm cinematic transition','separate learning page with 3D and notes','six phases visible before training','shared model survives navigation','scroll neither navigates nor trains','buttons drive learning phases','learning mobile no overflow']};
}
