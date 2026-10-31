async(page)=>{
 const check=(ok,message)=>{if(!ok)throw new Error(message);};page.setDefaultTimeout(20000);
 await page.setViewportSize({width:1440,height:1000});await page.emulateMedia({reducedMotion:'reduce'});
 await page.goto('http://127.0.0.1:4300/');await page.locator('.guest-button').click();
 await page.getByRole('button',{name:'Khám phá Linear',exact:true}).click();
 await page.getByRole('button',{name:'Học từng bước và ghi chú',exact:false}).click();
 await page.locator('app-learning-route').waitFor();
 check(await page.getByRole('button',{name:'Học một bước',exact:true}).count()===0,'Old label removed');
 await page.locator('.lesson-options>summary').click();await page.getByLabel('Thời lượng mỗi pha',{exact:true}).selectOption('0.5');await page.locator('.lesson-options>summary').click();
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.evaluate(()=>{
  window.__learningSmooth=[];window.__learningGeometry=[];let lastPhase;const started=performance.now();
  const sample=()=>{const route=document.querySelector('app-learning-route'),panel=document.querySelector('.lesson');
   const phase=route.querySelector('li[aria-current=step] .stage-toggle strong')?.textContent?.trim();
   if(phase!==lastPhase){lastPhase=phase;const box=route.querySelector('.route-map').getBoundingClientRect();window.__learningGeometry.push({phase,positions:[...route.querySelectorAll('li')].map(el=>el.getBoundingClientRect().top-box.top)});}
   window.__learningSmooth.push({phase:route.querySelector('li[aria-current=step] .stage-toggle strong')?.textContent?.trim(),y:panel.scrollTop,moving:route.hasAttribute('data-scrolling')});
   if(performance.now()-started<3800)requestAnimationFrame(sample);
  };requestAnimationFrame(sample);
 });
 await page.getByRole('button',{name:'Học từng bước',exact:true}).click();
 await page.waitForFunction(()=>document.querySelector('app-learning-route li:nth-child(6)')?.getAttribute('aria-current')==='step');
 await page.getByRole('button',{name:'Học từng bước',exact:true}).waitFor();await page.waitForTimeout(450);
 const trace=await page.evaluate(()=>window.__learningSmooth);
 const moving=trace.filter(s=>s.moving);
 check(new Set(moving.map(s=>Math.round(s.y))).size>5,'Auto scroll must pass through intermediate positions');
 check(['A','B','C','D','E','F'].every(letter=>trace.some(s=>s.phase?.startsWith(letter))),'All six phases must be shown');
 check(await page.locator('#lab [role=progressbar]').getAttribute('aria-valuenow')==='1','Smooth playback must commit exactly once');
 check(await page.locator('app-learning-route').getAttribute('data-scrolling')===null,'Scroll animation settles after F');
 const movement=await page.evaluate(()=>{
  const stages=window.__learningGeometry.filter(s=>s.phase && /^[ABCDE]/.test(s.phase));let max=0;
  for(let i=1;i<stages.length;i++)for(let j=0;j<6;j++)max=Math.max(max,Math.abs(stages[i].positions[j]-stages[i-1].positions[j]));
  return max;
 });
 check(movement<1.5,'A-E must not move stage headings');
 check(await page.locator('.result-details table').count()===0,'Hidden detail table must not be built');
 await page.locator('.result-details summary').click();await page.locator('.result-details table').waitFor();
 await page.screenshot({path:'output/playwright/smooth-learning-desktop.png'});
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.getByRole('button',{name:'Học từng bước',exact:true}).click();
 await page.waitForFunction(()=>document.querySelector('app-learning-route li:nth-child(2)')?.getAttribute('aria-current')==='step');
 check(await page.locator('app-learning-route').getAttribute('data-scrolling')===null,'Reduced motion disables scroll tween');
 check(await page.locator('.stage-result').count()===0,'Playback defers full result DOM');
 await page.waitForFunction(()=>document.querySelector('app-learning-route li:nth-child(6)')?.getAttribute('aria-current')==='step');
 await page.getByRole('button',{name:'Học từng bước',exact:true}).waitFor();
 check(await page.locator('#lab [role=progressbar]').getAttribute('aria-valuenow')==='2','Second playback adds one iteration');
 return {suite:'smooth-learning',passed:['stable A-E headings','detail table lazy creation','new button label','intermediate eased scroll positions','A-F shown','single commit preserved','animation settles at F','reduced motion has no tween or fade','second playback single commit'],samples:trace.length,distinctScrollPositions:new Set(moving.map(s=>Math.round(s.y))).size};
}
