async(page)=>{
 const idle=id=>page.waitForFunction(id=>!document.querySelector('#'+id)?.hidden&&document.querySelector('.experience')?.getAttribute('aria-busy')==='false',id);
 await page.setViewportSize({width:1440,height:1000});await page.emulateMedia({reducedMotion:'no-preference'});
 await page.goto('http://127.0.0.1:4300');await idle('algorithms');
 if(await page.evaluate(()=>document.documentElement.dataset.theme!=='light'))await page.locator('#algorithms .theme-toggle').click();
 await page.waitForFunction(()=>!document.querySelector('.theme-wave'));
 await page.locator('#algorithm-planet-slot canvas').waitFor();
 await page.screenshot({path:'output/playwright/pearl-galaxy.png'});
 await page.evaluate(()=>{
  window.pearlSamples=[];window.pearlSampling=true;
  const sample=()=>{if(!window.pearlSampling)return;
   const el=document.querySelector('.planet-cinema');
   if(el)window.pearlSamples.push(getComputedStyle(el).backgroundColor);
   requestAnimationFrame(sample);
  };sample();
 });
 await page.getByRole('button',{name:'Khám phá Linear',exact:true}).click();
 await page.locator('.planet-cinema').waitFor();
 await page.screenshot({path:'output/playwright/pearl-enter.png'});
 await idle('lab');
 await page.locator('#lab .change-algorithm').click();
 await page.locator('.planet-cinema').waitFor();
 await page.screenshot({path:'output/playwright/pearl-return.png'});
 await idle('algorithms');
 const samples=await page.evaluate(()=>{window.pearlSampling=false;return window.pearlSamples;});
 if(samples.length<2||samples.some(c=>!/^rgba?\(244, 246, 250[,)]/.test(c)))throw Error('Unexpected cinema colors: '+JSON.stringify([...new Set(samples)]));
 if(await page.evaluate(()=>document.documentElement.dataset.theme)!=='light')throw Error('Theme lost');
 return {passed:true,cinemaFrames:samples.length,colors:[...new Set(samples)].slice(0,5),directions:['enter','return']};
}
