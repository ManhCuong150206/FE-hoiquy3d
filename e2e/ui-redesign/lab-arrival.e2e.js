async(page)=>{
 const check=(ok,message)=>{if(!ok)throw new Error(message);};
 page.setDefaultTimeout(25000);
 const wait=async id=>page.waitForFunction(id=>document.querySelector('#'+id)?.hidden===false&&document.querySelector('.experience')?.getAttribute('aria-busy')==='false',id);
 await page.setViewportSize({width:1440,height:1000});
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto('http://127.0.0.1:4300/');
 await wait('algorithms');
 await page.locator('app-algorithm-sphere canvas').waitFor();
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.evaluate(()=>{
  window.__arrivalSamples=[];window.__sampleArrival=true;
  const tick=()=>{
   const lab=document.querySelector('#lab');
   if(lab?.dataset.arrival){
    const read=selector=>{const el=lab.querySelector(selector);if(!el)return null;const s=getComputedStyle(el);return {opacity:Number(s.opacity),scale:new DOMMatrixReadOnly(s.transform).a};};
    window.__arrivalSamples.push({at:performance.now(),cinema:!!document.querySelector('.planet-cinema'),busy:document.querySelector('.experience').getAttribute('aria-busy'),view:read('.workspace > app-viewport3d'),controls:read('app-training-controls'),results:read('app-results-panel')});
   }
   if(window.__sampleArrival)requestAnimationFrame(tick);
  };requestAnimationFrame(tick);
 });
 await page.getByRole('button',{name:'Khám phá Linear',exact:true}).click();
 await page.waitForFunction(()=>document.querySelector('#lab')?.dataset.arrival==='camera-handoff');
 await page.waitForTimeout(250);await page.screenshot({path:'output/playwright/lab-arrival-mid.png'});
 await wait('lab');
 const samples=await page.evaluate(()=>{window.__sampleArrival=false;return window.__arrivalSamples;});
 check(samples.length>5,'Arrival has observable intermediate frames');
 check(samples.some(s=>s.cinema&&s.view?.opacity>0&&s.view.opacity<1),'Arrival overlaps fullscreen camera fade');
 check(samples.some(s=>s.view?.opacity>.25&&s.controls?.opacity<s.view.opacity),'3D appears before controls');
 check(samples.some(s=>s.controls?.opacity>.25&&s.results?.opacity<s.controls.opacity),'Controls appear before results');
 check(samples.some(s=>s.view?.scale<.99)&&samples.some(s=>s.view?.scale>1.003),'Small scale overshoot is visible');
 check(samples.every(s=>s.busy==='true'),'Controls locked throughout arrival');
 check(await page.locator('#lab [role=progressbar]').getAttribute('aria-valuenow')==='0','Entrance does not train model');
 const clean=()=>page.locator('#lab').evaluate(lab=>!lab.dataset.arrival&&Array.from(lab.querySelectorAll('.workspace > *,app-training-controls,app-header,.lab-heading,.lesson-entry,.lab-footer')).every(el=>!el.style.transform&&!el.style.opacity&&!el.style.willChange));
 check(await clean(),'All temporary arrival styles cleared');
 await page.screenshot({path:'output/playwright/lab-arrival-complete.png'});
 await page.locator('#lab .change-algorithm').click();await wait('algorithms');
 check(await page.locator('.planet-cinema,.algorithm-flight-layer').count()===0,'Reverse returns canvas without leftover overlay');
 await page.getByRole('button',{name:'Khám phá Linear',exact:true}).click();
 await page.waitForFunction(()=>document.querySelector('#lab')?.dataset.arrival==='camera-handoff');
 await page.emulateMedia({reducedMotion:'reduce'});await wait('lab');check(await clean(),'Changing motion preference settles entrance cleanly');
 await page.locator('#lab .change-algorithm').click();await wait('algorithms');
 await page.setViewportSize({width:390,height:844});
 await page.getByRole('button',{name:'Khám phá Ridge',exact:true}).click();await wait('lab');
 check(await clean(),'Reduced motion skips bounce');
 check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Mobile has no horizontal overflow');
 return {suite:'lab-arrival',passed:['camera overlap','3D first','controls before results','subtle overshoot','busy lock','no model mutation','style cleanup','reverse cleanup','motion preference interruption','reduced motion','mobile layout']};
}
