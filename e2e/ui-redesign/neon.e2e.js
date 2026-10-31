async(page)=>{
 page.setDefaultTimeout(15000);page.setDefaultNavigationTimeout(30000);
 const check=(ok,message)=>{if(!ok)throw new Error(message);};
 const wait=async id=>page.waitForFunction(id=>Boolean(document.getElementById(id) && !document.getElementById(id).hidden && !document.querySelector('.experience').dataset.transition),id);
 await page.setViewportSize({width:1440,height:1000});await page.emulateMedia({reducedMotion:'no-preference'});await page.goto('http://127.0.0.1:4300/');
 await page.locator('.experience[data-motion=active]').waitFor();
 check(await page.locator('.math-wallpaper').count()===0,'Old photo layer removed');
 check(await page.locator('.starfield-base').evaluate(el=>!getComputedStyle(el).backgroundImage.includes('math-background')),'Universe background replaces formulas');
 check(await page.locator('h1').first().evaluate(el=>getComputedStyle(el).fontFamily.includes('Times New Roman')&&getComputedStyle(el).textShadow!=='none'),'Times New Roman neon heading');
 check(await page.locator('body').evaluate(el=>getComputedStyle(el).fontFamily.includes('Times New Roman')),'Body Times New Roman');
 check(await page.locator('.guest-button').evaluate(el=>getComputedStyle(el).backgroundColor==='rgba(0, 0, 0, 0)'&&getComputedStyle(el).textShadow!=='none'),'Transparent neon glass button');
 await page.locator('.spatial-host[data-star-count="1000"]').waitFor();
 const phase=await page.locator('.spatial-host').getAttribute('data-twinkle-phase');await page.waitForTimeout(300);
 check(await page.locator('.spatial-host').getAttribute('data-twinkle-phase')!==phase,'Star brightness must animate');
 await page.mouse.move(150,350);await page.waitForFunction(()=>document.querySelector('.cursor-glow').style.opacity==='1');
 check(await page.locator('.cursor-ring').evaluate(el=>getComputedStyle(el).display!=='none'),'Cursor ring visible');
 await page.mouse.down();check(await page.locator('.cursor-glow').evaluate(el=>el.classList.contains('rippling')),'Click ripple');await page.mouse.up();
 await page.screenshot({path:'output/playwright/neon-welcome-desktop.png'});
 await page.locator('.guest-button').click();await wait('algorithms');
 await page.getByRole('button',{name:'Khám phá Linear',exact:true}).click();await wait('lab');
 await page.getByRole('button',{name:'Step',exact:true}).click();await page.waitForFunction(()=>document.querySelector('[role=progressbar]').getAttribute('aria-valuenow')==='1');
 for(const [name,color] of [['train','rgb(255, 146, 46)'],['test','rgb(66, 165, 255)']]){
  check(await page.locator('#lab app-viewport3d .dot.'+name).evaluate(el=>getComputedStyle(el).backgroundColor)===color,'Lab point legend '+name);
  check(await page.locator('app-results-panel .series.'+name+' i').evaluate(el=>getComputedStyle(el).backgroundColor)===color,'Chart legend '+name);
 }
 check(await page.locator('#lab .controls').evaluate(el=>{const style=getComputedStyle(el);return style.backgroundColor.includes('0.48')&&style.backdropFilter.includes('blur');}),'Controls medium-transparent liquid');
 check(await page.locator('#lab .iter').evaluate(el=>getComputedStyle(el).fontFamily.includes('Times New Roman')),'Model numbers Times New Roman');
 check(await page.locator('app-results-panel polyline').first().evaluate(el=>getComputedStyle(el).stroke)==='rgb(255, 146, 46)','Train curve orange');
 await page.waitForTimeout(500);
 const labFps=await page.locator('#lab app-viewport3d canvas').evaluate(async el=>{const before=Number(el.dataset.renderCount),start=performance.now();await new Promise(resolve=>setTimeout(resolve,1500));return (Number(el.dataset.renderCount)-before)*1000/(performance.now()-start);});
 check(labFps>0&&labFps<=62,'Lab render must stay within cap');
 await page.screenshot({path:'output/playwright/neon-lab-desktop.png'});
 await page.getByRole('button',{name:'Học từng bước và ghi chú',exact:false}).click();await wait('learning');await page.locator('#learning app-viewport3d canvas').waitFor();
 check(await page.locator('#learning app-viewport3d canvas').evaluate(el=>el.getContext('webgl2').getContextAttributes().alpha),'Learning renderer alpha');
 check(await page.locator('#learning app-viewport3d .host').evaluate(el=>getComputedStyle(el).backgroundColor.includes('0.14')),'Learning viewport transparent');
 check(await page.locator('#learning app-viewport3d .dot.test').evaluate(el=>getComputedStyle(el).backgroundColor)==='rgb(66, 165, 255)','Learning scene shares palette');
 await page.screenshot({path:'output/playwright/neon-learning-desktop.png'});
 const canvas=page.locator('#learning app-viewport3d canvas');const fps=await canvas.evaluate(async el=>{const before=Number(el.dataset.renderCount),start=performance.now();await new Promise(resolve=>setTimeout(resolve,1500));return (Number(el.dataset.renderCount)-before)*1000/(performance.now()-start);});
 check(fps>0&&fps<=62,'Render must remain capped at 60 FPS');
 await page.emulateMedia({reducedMotion:'reduce'});check(await page.locator('.cursor-glow').evaluate(el=>getComputedStyle(el).display)==='none','Reduced motion hides cursor');
 await page.waitForTimeout(200);const ambient=page.locator('app-spatial-backdrop canvas');const count=await ambient.getAttribute('data-render-count');await page.waitForTimeout(300);check(await ambient.getAttribute('data-render-count')===count,'Reduced motion stops star layer');
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(350);check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Mobile no horizontal overflow');
 await page.screenshot({path:'output/playwright/neon-learning-mobile.png'});
 return {suite:'liquid-neon',performance:{labFps,learningFps:fps},passed:['old background removed','universe base','Times titles and body','transparent glass buttons','1000 stars and twinkle animation','visible cursor and click ripple','liquid controls and Times numbers','lab train/test palette','chart palette and orange curve','transparent viewport','learning shared palette','60 FPS cap','reduced motion cursor/stars','mobile no overflow']};
}
