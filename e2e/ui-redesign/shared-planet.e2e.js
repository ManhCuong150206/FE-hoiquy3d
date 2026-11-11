async(page)=>{
 const check=(ok,msg)=>{if(!ok)throw Error(msg);};
 const idle=id=>page.waitForFunction(id=>document.querySelector('#'+id)?.hidden===false&&document.querySelector('.experience').getAttribute('aria-busy')==='false',id);
 await page.setViewportSize({width:1440,height:1000});await page.emulateMedia({reducedMotion:'no-preference'});await page.goto('http://127.0.0.1:4300');await idle('algorithms');
 await page.locator('#algorithm-planet-slot canvas').waitFor();
 await page.evaluate(()=>{window.__sharedCanvas=document.querySelector('#algorithm-planet-slot canvas');});
 const timings=[];
 for(const theme of ['dark','light']){
  if(await page.evaluate(()=>document.documentElement.dataset.theme)!==theme){await page.locator('#algorithms .theme-toggle').click();await page.waitForFunction(()=>!document.querySelector('.theme-wave'));}
  let started=Date.now();await page.locator('#algorithms .login-button').click();await page.locator('.planet-transfer-stage').waitFor();
  check(await page.locator('app-algorithm-sphere').count()===1,'Only one planet during transfer');await idle('welcome');timings.push(Date.now()-started);
  check(await page.evaluate(()=>document.querySelector('#welcome-planet-slot canvas')===window.__sharedCanvas),'Same canvas moves to login');
  check(await page.locator('#welcome-planet-slot').evaluate(el=>el.previousElementSibling?.classList.contains('hero-description')&&el.nextElementSibling?.classList.contains('hero-mantra')),'Planet between description and illustrations');
  await page.locator('.auth-submit').click();await page.locator('.summary-box').waitFor();check(await page.locator('.planet-transfer-stage').count()===0,'Invalid form does not navigate');
  started=Date.now();await page.locator('.guest-button').click();await page.locator('.planet-transfer-stage').waitFor();await idle('algorithms');timings.push(Date.now()-started);
  check(await page.evaluate(()=>document.querySelector('#algorithm-planet-slot canvas')===window.__sharedCanvas),'Same canvas returns');
  check(await page.locator('.planet-transfer-stage').count()===0,'Transfer cleaned up');
 }
 await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:390,height:844});await page.locator('#algorithms .login-button').click();await idle('welcome');
 check(await page.locator('.planet-transfer-stage').count()===0,'Reduced motion skips transfer');check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Mobile no overflow');
 await page.locator('.guest-button').click();await idle('algorithms');
 return {suite:'shared-planet',timings,passed:['same canvas both directions','dark/light','invalid form','single planet','cleanup','mobile','reduced motion']};
}
