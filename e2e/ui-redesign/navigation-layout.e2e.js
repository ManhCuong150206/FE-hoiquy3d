async(page)=>{
 page.setDefaultTimeout(15000);page.setDefaultNavigationTimeout(30000);
 const check=(ok,message)=>{if(!ok)throw new Error(message);};
 const wait=id=>page.waitForFunction(id=>Boolean(document.getElementById(id)&&!document.getElementById(id).hidden&&!document.querySelector('.experience').dataset.transition),id);
 await page.setViewportSize({width:1920,height:1080});await page.emulateMedia({reducedMotion:'no-preference'});await page.goto('http://127.0.0.1:4300/');
 check(await page.locator('app-welcome-panel .scroll-link').count()===0,'Duplicate explore removed');
 await page.locator('#algorithms .login-button').click();await wait('welcome');
 await page.getByLabel('Email',{exact:true}).fill('demo@example.com');await page.locator('#entry-password').fill('password123');
 await page.locator('.auth-submit').click();await wait('algorithms');
 check(await page.getByRole('button',{name:'Đăng xuất',exact:true}).count()===1,'Member has logout');
 check(await page.locator('#entry-email').inputValue()===''&&await page.locator('#entry-password').inputValue()==='','Login clears credentials');
 await page.getByRole('button',{name:'Khám phá Ridge',exact:true}).click();await wait('lab');
 check(await page.locator('#lab .change-algorithm').count()===1,'Header change algorithm exists');
 check(await page.locator('#lab .algorithm-back,#lab .lab-footer button').count()===0,'No duplicate change algorithm buttons');
 await page.getByRole('button',{name:'Step',exact:true}).click();await page.waitForFunction(()=>document.querySelector('[role=progressbar]').getAttribute('aria-valuenow')==='1');
 const geometry=()=>page.evaluate(()=>{
   const rect=selector=>document.querySelector(selector).getBoundingClientRect();
   const scene=rect('#lab .lab-scene'), setup=rect('#lab .lab-setup'), view=rect('#lab app-viewport3d'),
     run=rect('#lab .controls'), chart=rect('#lab app-results-panel[data-result-view=chart]'),
     sidebar=rect('#lab .lab-sidebar'), overview=rect('#lab .lab-overview'), experiments=rect('#lab app-experiments-panel');
   return {sceneWidth:scene.width,setupWidth:setup.width,sideBySide:Math.abs(scene.top-setup.top)<2,
     settingsBelow:setup.top>=scene.bottom,toolbarBelow:run.top>=view.bottom,
     chartNext:chart.top>=run.bottom&&chart.top-run.bottom<=12.5,experimentsBelow:experiments.top>=Math.max(scene.bottom,sidebar.bottom),
     overviewHeight:overview.height,
     noOverflow:document.documentElement.scrollWidth<=innerWidth};
 });
 for(const theme of ['dark','light']){
   if(await page.evaluate(()=>document.documentElement.dataset.theme)!==theme){
     await page.getByRole('button',{name:'Chuyển sang giao diện sáng'}).click();
     await page.waitForFunction(()=>!document.querySelector('.theme-wave'));
   }
   for(const width of [1440,1024,768,390]){
     await page.setViewportSize({width,height:width===390?844:1000});
     const layout=await geometry();
     check(layout.noOverflow&&layout.toolbarBelow&&layout.chartNext&&layout.experimentsBelow,theme+' '+width+' layout');
     if(width>880)check(layout.overviewHeight<=74,theme+' compact overview');
     check(width>880?layout.sideBySide&&layout.sceneWidth>layout.setupWidth*2:layout.settingsBelow,theme+' '+width+' columns');
     if(width===1440||width===390)await page.screenshot({path:'output/playwright/lab-layout-'+theme+'-'+width+'.png',fullPage:true});
   }
   check(await page.locator('#lab .lab-setup').evaluate(el=>{
     const style=getComputedStyle(el);
     return style.backdropFilter.includes('blur')&&style.backgroundColor.endsWith('0.26)');
   }),theme+' setup uses the existing glass opacity');
 }
 await page.getByRole('tab',{name:'Mô hình',exact:true}).focus();
 await page.keyboard.press('ArrowRight');
 await page.locator('#lab-settings-data').waitFor({state:'visible'});
 await page.getByRole('tab',{name:'Mô hình',exact:true}).click();
 await page.getByLabel('Lambda (λ)',{exact:true}).waitFor({state:'visible'});
 await page.setViewportSize({width:1440,height:1000});
 await page.locator('#lab .change-algorithm').click();await wait('algorithms');await page.getByRole('button',{name:'Đăng xuất',exact:true}).click();await wait('algorithms');
 await page.getByRole('button',{name:'Khám phá Ridge',exact:true}).click();await wait('lab');
 check(await page.locator('#lab [role=progressbar]').getAttribute('aria-valuenow')==='0','Real logout clears private live model');
 return {suite:'navigation-layout',passed:['welcome explore removed','selector logout','entry credentials cleared','only header algorithm navigation','wide 3D on desktop','toolbar below 3D','responsive light and dark layouts','unchanged panel transparency','keyboard settings tabs','mobile no overflow','private live model cleared across logout']};
}
