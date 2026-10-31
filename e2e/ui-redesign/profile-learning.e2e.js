async(page)=>{
 page.setDefaultTimeout(20000);await page.bringToFront();await page.setViewportSize({width:1440,height:1000});await page.emulateMedia({reducedMotion:'reduce'});
 await page.goto('http://127.0.0.1:4300/');await page.locator('.guest-button').click();await page.getByRole('button',{name:'Khám phá Linear',exact:true}).click();await page.getByRole('button',{name:'Học từng bước và ghi chú',exact:false}).click();
 await page.locator('app-learning-route').waitFor();await page.locator('.lesson-options>summary').click();await page.getByLabel('Thời lượng mỗi pha',{exact:true}).selectOption('0.5');await page.locator('.lesson-options>summary').click();
 await page.emulateMedia({reducedMotion:'no-preference'});await page.bringToFront();await page.waitForFunction(()=>document.visibilityState==='visible');await page.waitForTimeout(400);
 await page.evaluate(()=>{
  const p={frames:[],headings:[],shifts:[],started:performance.now(),done:false};window.__learningProfile=p;
  const current=()=>document.querySelector('app-learning-route li[aria-current=step]')?.textContent?.trim().charAt(0);
  const observer=new PerformanceObserver(list=>{for(const e of list.getEntries())p.shifts.push({value:e.value,phase:current(),sources:e.sources?.map(s=>({node:s.node?.nodeName,cls:s.node?.className,dy:s.currentRect.y-s.previousRect.y}))});});observer.observe({type:'layout-shift',buffered:false});
  let last=performance.now(),phase;
  const tick=()=>{const now=performance.now(),next=current();p.frames.push(now-last);last=now;
   if(next!==phase){phase=next;const map=document.querySelector('.route-map').getBoundingClientRect();p.headings.push({phase,positions:[...document.querySelectorAll('app-learning-route li')].map(el=>el.getBoundingClientRect().top-map.top)});}
   if(now-p.started<3700)requestAnimationFrame(tick);else{observer.disconnect();p.done=true;}
  };requestAnimationFrame(tick);
 });
 await page.getByRole('button',{name:'Học từng bước',exact:true}).click();await page.waitForFunction(()=>window.__learningProfile?.done);
 return await page.evaluate(()=>{
  const p=window.__learningProfile,stages=p.headings.filter(s=>s.phase&&s.phase!=='F');let movement=0;
  for(let i=1;i<stages.length;i++)for(let j=0;j<6;j++)movement=Math.max(movement,Math.abs(stages[i].positions[j]-stages[i-1].positions[j]));
  const sorted=[...p.frames].sort((a,b)=>a-b);
  return {largestShifts:[...p.shifts].sort((a,b)=>b.value-a.value).slice(0,4),visibility:document.visibilityState,phaseSequence:p.headings.map(s=>s.phase).filter(Boolean),maxHeadingMovementAtoEPx:+movement.toFixed(2),layoutShiftAtoE:+p.shifts.filter(e=>e.phase&&e.phase!=='F').reduce((a,e)=>a+e.value,0).toFixed(5),p95RafGapMs:+sorted[Math.floor(sorted.length*.95)].toFixed(2),gapsOver34Ms:p.frames.filter(v=>v>34).length,iteration:document.querySelector('#lab [role=progressbar]').getAttribute('aria-valuenow')};
 });
}
