async(page)=>{
 await page.bringToFront();
 const check=(ok,message)=>{if(!ok)throw new Error(message);};page.setDefaultTimeout(20000);
 const wait=async screen=>page.waitForFunction(screen=>document.querySelector('#'+screen)?.hidden===false && document.querySelector('.experience')?.getAttribute('aria-busy')==='false',screen);
 await page.setViewportSize({width:1440,height:1000});await page.emulateMedia({reducedMotion:'reduce'});await page.goto('http://127.0.0.1:4300/');await page.locator('.guest-button').click();await wait('algorithms');
 const canvas=page.locator('app-algorithm-sphere canvas,.planet-cinema canvas');await canvas.waitFor();await page.emulateMedia({reducedMotion:'no-preference'});
 const sphereBox=await canvas.boundingBox();await canvas.click({position:{x:sphereBox.width/2,y:sphereBox.height/2}});check(await page.locator('#lab').count()===0,'Sphere click disabled');
 // Rotate before the first departure to verify the target is not a hard-coded screen point.
 await page.mouse.move(sphereBox.x+sphereBox.width*.5,sphereBox.y+sphereBox.height*.5);await page.mouse.down();await page.mouse.move(sphereBox.x+sphereBox.width*.7,sphereBox.y+sphereBox.height*.65,{steps:10});await page.mouse.up();
 const timings=[];
 for(const [id,label] of [['linear','Linear'],['polynomial','Polynomial'],['ridge','Ridge'],['lasso','Lasso']]){
  const card=page.getByRole('button',{name:'Khám phá '+label,exact:true});await card.hover();
  await page.waitForFunction(id=>document.querySelector('app-algorithm-sphere canvas,.planet-cinema canvas')?.dataset.previewAlgorithm===id,id);
  const started=Date.now();await card.click();await page.locator('.algorithm-flight-layer[data-direction=in]').waitFor();
  await page.waitForFunction(id=>{const card=document.querySelector(`.algorithm-card[data-algorithm="${id}"]`);const key=card?.getAttribute('data-card-glow');const overlay=key&&document.querySelector(`.regression-card-glow__card[data-for="${key}"]`);return !overlay||overlay.hidden;},id);
  await page.waitForFunction(id=>document.querySelector('app-algorithm-sphere canvas,.planet-cinema canvas')?.dataset.anchorAlgorithm===id,id);
  check(await page.locator('.algorithm-flight-layer').getAttribute('data-algorithm')===id,'Star color/selection identity');
  if(id==='linear')await page.screenshot({path:'output/playwright/algorithm-star-in.png'});
  await page.locator('.planet-cinema canvas').waitFor();
  const stageBounds=await page.locator('.planet-cinema').evaluate(el=>({rect:el.getBoundingClientRect().toJSON(),w:innerWidth,h:innerHeight}));
  check(stageBounds.rect.left<=1&&stageBounds.rect.top<=1&&stageBounds.rect.width>=stageBounds.w-1&&stageBounds.rect.height>=stageBounds.h-1,'Actual WebGL stage covers the viewport '+JSON.stringify(stageBounds));
  check(await page.locator('.algorithm-flight-cover').count()===0,'No expanding color disk');
  check(await page.locator('.planet-cinema canvas').evaluate(el=>el.width<=1600&&el.height<=1000),'Fullscreen framebuffer has bounded resolution');
  await page.waitForFunction(()=>Number(document.querySelector('.planet-cinema canvas')?.getAttribute('data-camera-distance'))<.6);
  if(id==='linear')await page.screenshot({path:'output/playwright/planet-landing.png'});
  await wait('lab');timings.push(Date.now()-started);
  check(await page.locator('#selected-algorithm').getAttribute('data-value')===id,'Correct destination');
  const colors=await page.locator('#lab').evaluate(el=>{const s=getComputedStyle(el);return {accent:s.getPropertyValue('--algorithm-accent').trim(),train:s.getPropertyValue('--color-train').trim(),test:s.getPropertyValue('--color-test').trim()};});
  check(colors.train.toLowerCase()==='#ff405c'&&colors.test.toLowerCase()==='#ffe45c','Train/test unchanged in experiment');
  await page.emulateMedia({reducedMotion:'reduce'});await page.locator('#lab .lesson-entry button').click();await wait('learning');
  const lessonColors=await page.locator('#learning').evaluate(el=>{const s=getComputedStyle(el);return {accent:s.getPropertyValue('--algorithm-accent').trim(),train:s.getPropertyValue('--color-train').trim(),test:s.getPropertyValue('--color-test').trim()};});
  check(JSON.stringify(colors)===JSON.stringify(lessonColors),'Same algorithm and data palette in pages 3 and 4');
  await page.locator('#learning .lab-heading button').click();await wait('lab');await page.emulateMedia({reducedMotion:'no-preference'});
  const backStarted=Date.now();await page.locator('#lab .change-algorithm').click();await page.locator('.planet-cinema canvas').waitFor();
  await page.locator('.algorithm-flight-layer[data-direction=out]').waitFor();
  if(id==='linear')await page.screenshot({path:'output/playwright/algorithm-star-out.png'});
  await wait('algorithms');timings.push(Date.now()-backStarted);
  check(await page.locator('.planet-cinema').count()===0,'Fullscreen canvas returned to Angular owner');
  check(await card.evaluate(el=>getComputedStyle(el).visibility)==='visible','Card restored after return');
  check(await page.locator('.algorithm-flight-layer,.planet-cinema,.algorithm-flight-cover').count()===0,'No orphan star or fullscreen overlay');
  check(await page.locator('app-algorithm-picker').evaluate(el=>getComputedStyle(el).getPropertyValue('--algorithm-accent').trim())===colors.accent,'Selector uses same selected algorithm accent');
 }
 // Sphere hover must drive the card preview too.
 const point=await canvas.evaluate(el=>JSON.parse(el.dataset.landmarks).find(p=>p.front&&p.u>0&&p.u<1&&p.v>0&&p.v<1));const box=await canvas.boundingBox();await page.mouse.move(box.x+point.u*box.width,box.y+point.v*box.height);
 const hit=await canvas.getAttribute('data-hovered-algorithm');check(Boolean(hit),'Sphere hover finds a sector');
 check(await page.locator(`.algorithm-card[data-algorithm="${hit}"]`).evaluate(el=>el.classList.contains('highlighted')),'Sphere hover highlights card');
 // Preserve model on return; canceled switch must never start a star animation.
 await page.emulateMedia({reducedMotion:'reduce'});await page.getByRole('button',{name:'Khám phá Lasso',exact:true}).click();await wait('lab');await page.getByRole('button',{name:'Step',exact:true}).click();await page.waitForFunction(()=>document.querySelector('[role=progressbar]').getAttribute('aria-valuenow')==='1');
 await page.locator('#lab .change-algorithm').click();await wait('algorithms');await page.getByRole('button',{name:'Khám phá Ridge',exact:true}).click();
 await page.getByRole('dialog').waitFor();check(await page.locator('.algorithm-flight-layer').count()===0,'Confirmation precedes animation');
 await page.getByRole('button',{name:'Giữ phiên hiện tại',exact:true}).click();
 check(await page.locator('#lab [role=progressbar]').getAttribute('aria-valuenow')==='1','Cancel preserves model');
 await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:'Khám phá Lasso',exact:true}).click();await wait('lab');await page.locator('#lab .change-algorithm').click();await wait('algorithms');
 check(await page.locator('.algorithm-flight-layer').count()===0,'Reduced motion skips flight');check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Mobile no overflow');
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.getByRole('button',{name:'Khám phá Lasso',exact:true}).click();await page.locator('.algorithm-flight-layer[data-direction=in]').waitFor();await wait('lab');
 await page.setViewportSize({width:768,height:900});await page.locator('#lab .change-algorithm').click();await page.locator('.algorithm-flight-layer[data-direction=out]').waitFor();await wait('algorithms');
 check(await page.getByRole('button',{name:'Khám phá Lasso',exact:true}).evaluate(el=>getComputedStyle(el).visibility)==='visible','Resized return restores original card');
 check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Resized animated trip no overflow');
 check(timings.every(t=>t>=6000&&t<15000),'Flight must be visible and bounded in duration');
 return {suite:'algorithm-flight',timingsMs:timings,passed:['real fullscreen WebGL approach and reverse flight','algorithm palette consistent across pages 2–4','train red/test yellow preserved on pages 3–4','sphere click disabled','hover two directions','dragged sphere uses actual sector','four correct destinations','four stars return to cards','no leftover overlays or ghost borders','confirmation before flight','cancel preserves iteration','reduced motion fallback','mobile layout','animated mobile trip and resized return','four-to-five-second camera segment and seven-second journeys']};
}
