async(page)=>{
 const check=(ok,message)=>{if(!ok)throw new Error(message);};page.setDefaultTimeout(20000);
 const portal=page.locator('.regression-card-glow');
 const light=async selector=>{
  await page.emulateMedia({reducedMotion:'no-preference'});
  const card=page.locator(selector).first();await card.scrollIntoViewIfNeeded();const box=await card.boundingBox();
  await page.mouse.move(box.x+8,Math.max(10,box.y+30));
  await page.waitForFunction(()=>Number(document.querySelector('.regression-card-glow')?.style.opacity)>.5);
  await page.waitForFunction(selector=>!!document.querySelector(selector)?.getAttribute('data-card-glow'),selector);
  return card;
 };
 const wait=async id=>page.waitForFunction(id=>document.querySelector('#'+id)?.hidden===false&&!document.querySelector('.experience').dataset.transition,id);
 await page.setViewportSize({width:1440,height:1000});await page.emulateMedia({reducedMotion:'reduce'});await page.goto('http://127.0.0.1:4300/');
 await portal.waitFor({state:'attached'});await light('.auth-card');
 check(await portal.getAttribute('data-glow-screen')==='welcome','Welcome glow active');
 check(await portal.evaluate(el=>getComputedStyle(el).pointerEvents)==='none','Glow must not capture input');
 await page.screenshot({path:'output/playwright/card-glow-welcome.png'});
 const before=await portal.evaluate(el=>Number(el.style.opacity));await page.locator('.experience').dispatchEvent('pointerleave');await page.waitForTimeout(350);
 const after=await portal.evaluate(el=>Number(el.style.opacity));check(after>0&&after<before,'Glow fades gradually after leaving');
 await page.emulateMedia({reducedMotion:'reduce'});await page.locator('.guest-button').click();await wait('algorithms');await light('.algorithm-card');
 const cards=page.locator('.algorithm-card');const a=await cards.nth(0).boundingBox(),b=await cards.nth(1).boundingBox();
 await page.mouse.move((a.x+a.width+b.x)/2,a.y+35);await page.waitForTimeout(180);
 for(let i=0;i<2;i++){
  const id=await cards.nth(i).getAttribute('data-card-glow');
  check(await page.locator(`.regression-card-glow__card[data-for="${id}"]`).count()===1,'Neighbor cards share spotlight');
 }
 await page.screenshot({path:'output/playwright/card-glow-algorithms.png'});
 await page.emulateMedia({reducedMotion:'reduce'});await page.getByRole('button',{name:'Khám phá Ridge',exact:true}).click();await wait('lab');await light('#lab app-data-panel .card');
 check(await page.locator('#lab [data-card-glow]').count()>=5,'Lab panels covered');
 await page.getByRole('button',{name:'Step',exact:true}).click();await page.waitForFunction(()=>document.querySelector('[role=progressbar]').getAttribute('aria-valuenow')==='1');
 await page.screenshot({path:'output/playwright/card-glow-lab.png'});
 // Check theme mapping through the existing theme control.
 await page.locator('#lab app-header button').click();await light('#lab app-results-panel .card');
 await page.waitForFunction(()=>document.querySelector('.regression-card-glow')?.getAttribute('data-theme')==='light');
 await page.screenshot({path:'output/playwright/card-glow-light.png'});await page.locator('#lab app-header button').click();
 await page.emulateMedia({reducedMotion:'reduce'});await page.getByRole('button',{name:'Học từng bước và ghi chú',exact:false}).click();await wait('learning');await light('#learning .lesson');
 check(await page.locator('#learning [data-card-glow]').count()>=9,'Learning model, six stages and notes covered');
 const panel=page.locator('#learning .lesson');await panel.evaluate(el=>el.scrollTop=el.scrollHeight);await page.waitForTimeout(150);
 check(await portal.getAttribute('data-glow-screen')==='learning','Only current page glow');
 const stage=page.locator('.stage-toggle').nth(5);await stage.focus();await page.keyboard.press('Enter');
 await page.waitForFunction(()=>document.querySelectorAll('.stage-toggle')[5].getAttribute('aria-expanded')==='true');
 check(await page.locator('.stage-result').count()===1,'Keyboard works with glow layer');
 check(await page.locator('#lab [role=progressbar]').getAttribute('aria-valuenow')==='1','Decorative glow does not train');
 await page.screenshot({path:'output/playwright/card-glow-learning.png'});
 await page.emulateMedia({reducedMotion:'reduce'});check(await portal.evaluate(el=>getComputedStyle(el).display)==='none','Reduced motion disables dynamic glow');
 const context=await page.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'no-preference'});
 const mobile=await context.newPage();await mobile.goto('http://127.0.0.1:4300/');await mobile.locator('.regression-card-glow').waitFor({state:'attached'});
 check(await mobile.locator('.regression-card-glow').evaluate(el=>getComputedStyle(el).display)==='none','Touch uses static borders');
 check(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'No mobile horizontal overflow');await context.close();
 return {suite:'card-glow',passed:['welcome panel','neighboring algorithm cards','lab panels','learning stages and notes','slow fade out','click-through controls','light and dark themes','keyboard works','no training side effect','reduced motion','touch fallback','mobile no overflow']};
}
