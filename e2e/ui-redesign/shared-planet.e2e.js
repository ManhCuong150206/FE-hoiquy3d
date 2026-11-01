async(page)=>{
 await page.bringToFront();page.setDefaultTimeout(20000);
 const check=(ok,message)=>{if(!ok)throw new Error(message);};
 const wait=id=>page.waitForFunction(id=>!document.getElementById(id)?.hidden&&document.querySelector('.experience')?.getAttribute('aria-busy')==='false',id);
 const timings=[];
 for(const mode of ['guest','login','register']){
  await page.setViewportSize({width:1440,height:1000});await page.emulateMedia({reducedMotion:'no-preference'});await page.goto('http://127.0.0.1:4300/');
  const canvas=page.locator('#welcome-planet-slot app-algorithm-sphere canvas');await canvas.waitFor();
  check(await page.locator('#welcome-planet-slot').evaluate(el=>el.previousElementSibling?.matches('h1')&&el.nextElementSibling?.classList.contains('intro-meta')),'Planet between project title and three illustrations');
  check(Number(await canvas.getAttribute('data-island-count'))>=40,'More island clusters');
  await page.evaluate(()=>{window.__sharedPlanet=document.querySelector('app-algorithm-sphere');window.__sharedCanvas=document.querySelector('app-algorithm-sphere canvas');});
  if(mode==='register')await page.locator('.switch-auth button').click();
  if(mode!=='guest'){
   if(mode==='register')await page.getByLabel('Tên hiển thị').fill('Demo');
   await page.getByLabel('Email',{exact:true}).fill('demo@example.com');await page.getByLabel('Mật khẩu',{exact:true}).fill('abcdefgh');
  }
  await page.screenshot({path:'output/playwright/shared-planet-welcome-'+mode+'.png'});
  const started=Date.now();await page.locator(mode==='guest'?'.guest-button':'.auth-submit').click();
  await page.locator('.planet-transfer-stage[data-direction=to-picker]').waitFor();
  check(await page.locator('app-algorithm-sphere').count()===1,'No duplicate planet during transfer');
  await page.waitForTimeout(1200);await page.screenshot({path:'output/playwright/shared-planet-transfer-'+mode+'.png'});
  await wait('algorithms');timings.push(Date.now()-started);
  check(await page.evaluate(()=>window.__sharedPlanet===document.querySelector('#algorithm-planet-slot app-algorithm-sphere')&&window.__sharedCanvas===document.querySelector('#algorithm-planet-slot canvas')),'Same component and canvas arrive on page 2');
  check(await page.locator('.planet-transfer-stage').count()===0,'No orphan transfer layer');
  const back=Date.now();await page.getByRole('button',{name:'Đăng xuất',exact:true}).click();await page.locator('.planet-transfer-stage[data-direction=to-welcome]').waitFor();await wait('welcome');timings.push(Date.now()-back);
  check(await page.evaluate(()=>window.__sharedCanvas===document.querySelector('#welcome-planet-slot canvas')),'Same canvas returns after logout');
 }
 await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:390,height:844});await page.goto('http://127.0.0.1:4300/');await page.locator('#welcome-planet-slot app-algorithm-sphere').waitFor();
 await page.locator('.auth-submit').click();await page.locator('.summary-box').waitFor();check(await page.locator('.planet-transfer-stage').count()===0,'Invalid form does not move planet');
 await page.locator('.guest-button').click();await wait('algorithms');await page.locator('#algorithm-planet-slot canvas').waitFor();
 check(await page.locator('.planet-transfer-stage').count()===0,'Reduced motion docks instantly');
 await page.getByRole('button',{name:'Đăng xuất',exact:true}).click();await wait('welcome');
 await page.emulateMedia({reducedMotion:'no-preference'});await page.locator('.guest-button').click();await page.locator('.planet-transfer-stage').waitFor();await page.setViewportSize({width:768,height:900});await wait('algorithms');
 check(await page.locator('#algorithm-planet-slot canvas').count()===1,'Resize docks to correct slot');
 check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Mobile/tablet has no horizontal overflow');
 check(timings.every(ms=>ms>=3700&&ms<9000),'Transfer stays close to four seconds');
 return {suite:'shared-planet',timingsMs:timings,passed:['planet between title and illustrations','larger archipelagos','one component and WebGL canvas','guest transition','login transition','registration transition','logout reverse','no orphan layer','invalid form stays','reduced motion','mobile and resize','four-second timing']};
}
