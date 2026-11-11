async(page)=>{
 const check=(ok,msg)=>{if(!ok)throw Error(msg);};
 const idle=id=>page.waitForFunction(id=>document.querySelector('#'+id)?.hidden===false&&document.querySelector('.experience')?.getAttribute('aria-busy')==='false',id);
 await page.emulateMedia({reducedMotion:'reduce'});
 const measurements=[];
 for(const width of [1440,768,390]){
  await page.setViewportSize({width,height:width===390?844:1000});await page.goto('http://127.0.0.1:4300');await idle('algorithms');
  check(await page.locator('#algorithms h1').isVisible(),'Initial screen has visible H1 at '+width);
  await page.locator('#algorithm-planet-slot canvas').waitFor();
  if(width===768)check(await page.evaluate(()=>{const a=document.querySelector('#algorithm-planet-slot .orb-caption').getBoundingClientRect(),b=document.querySelector('.stage-caption').getBoundingClientRect();return a.bottom<=b.top||b.bottom<=a.top||a.right<=b.left||b.right<=a.left;}),'Tablet captions do not overlap');
  await page.screenshot({path:`output/playwright/audit-picker-${width}.png`});
  for(const theme of ['dark','light']){
   if(await page.evaluate(()=>document.documentElement.dataset.theme)!==theme)await page.locator('#algorithms .theme-toggle').click();
   await page.locator('#algorithms .login-button').click();await idle('welcome');
   const layout=await page.evaluate(()=>{const a=document.querySelector('.auth-card').getBoundingClientRect(),i=document.querySelector('.intro-copy').getBoundingClientRect();return {width:innerWidth,scroll:document.documentElement.scrollWidth,authTop:a.top,introTop:i.top};});
   check(layout.scroll<=layout.width,'Login overflow '+width+' '+theme+': '+JSON.stringify(layout));
   if(width===390)check(layout.authTop<layout.introTop,'Mobile form before intro');
   check(await page.locator('#welcome h1').evaluate(el=>getComputedStyle(el).fontFamily.includes('Geist')),'Heading Geist');
   await page.screenshot({path:`output/playwright/audit-login-${width}-${theme}.png`});measurements.push({theme,...layout});
   await page.locator('.guest-button').click();await idle('algorithms');
  }
 }
 await page.setViewportSize({width:1440,height:1000});
 await page.getByRole('button',{name:'Khám phá Linear',exact:true}).click();await idle('lab');
 for(const id of ['learning-rate','max-iterations','iteration-speed','sample-count','noise','train-ratio','seed','feature-count'])check(await page.locator('#'+id).evaluate(el=>el.labels?.length>0),'Linked label '+id);
 const csv='x,y\n'+Array.from({length:20},(_,i)=>`${i},5`).join('\n');
 await page.locator('app-csv-import input[type=file]').setInputFiles({name:'constant.csv',mimeType:'text/csv',buffer:Buffer.from(csv)});
 await page.getByRole('button',{name:'Dùng dữ liệu này',exact:true}).click();await page.getByRole('button',{name:'Step',exact:true}).click();
 await page.waitForFunction(()=>document.querySelector('#lab [role=progressbar]').getAttribute('aria-valuenow')==='1');
 const result=await page.locator('app-results-panel').innerText();check(!result.includes('NaN')&&result.includes('Không xác định')&&result.includes('các giá trị Y bằng nhau'),'Explained constant R2');
 check(await page.locator('app-results-panel .axis-label').count()===4,'Chart axis values');
 await page.locator('app-csv-import input[type=file]').setInputFiles({name:'bad.csv',mimeType:'text/csv',buffer:Buffer.from('invalid')});
 await page.locator('app-csv-import').getByText(/Vẫn giữ tệp trước: “constant.csv”/).waitFor();
 await page.setViewportSize({width:390,height:844});
 await page.waitForFunction(()=>!document.querySelector('.data-disclosure').open);
 check(await page.locator('app-data-panel').evaluate(el=>getComputedStyle(el).order)==='-1','Mobile data before scene');
 check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Lab no overflow');
 await page.setViewportSize({width:1440,height:1000});await page.locator('#lab .lesson-entry button').click();await idle('learning');
 check(await page.locator('.lesson-command').evaluate(el=>{const s=getComputedStyle(el);return s.position==='sticky'&&s.backgroundColor.startsWith('rgb('); }),'Opaque sticky lesson toolbar');
 await page.screenshot({path:'output/playwright/audit-learning.png'});
 return {suite:'audit-fixes',measurements,passed:['same entry on desktop/mobile','responsive login dark/light','mobile form priority','heading font','linked labels','constant R2 explanation','chart axes','CSV rejection feedback','mobile data disclosure','sticky toolbar']};
}
