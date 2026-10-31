async(page)=>{
 page.setDefaultTimeout(15000);page.setDefaultNavigationTimeout(30000);
 const check=(ok,message)=>{if(!ok)throw new Error(message);};
 const wait=id=>page.waitForFunction(id=>Boolean(document.getElementById(id)&&!document.getElementById(id).hidden&&!document.querySelector('.experience').dataset.transition),id);
 await page.setViewportSize({width:1920,height:1080});await page.emulateMedia({reducedMotion:'no-preference'});await page.goto('http://127.0.0.1:4300/');
 check(await page.locator('app-welcome-panel .scroll-link').count()===0,'Duplicate explore removed');
 await page.getByLabel('Email',{exact:true}).fill('guest@example.com');await page.locator('#entry-password').fill('draft-password');
 await page.locator('.guest-button').click();await wait('algorithms');
 check(await page.getByRole('button',{name:'Đăng xuất',exact:true}).count()===1,'Selector footer logout');
 await page.getByRole('button',{name:'Đăng xuất',exact:true}).click();await wait('welcome');
 check(await page.locator('#entry-email').inputValue()===''&&await page.locator('#entry-password').inputValue()==='','Logout clears entry credentials');
 await page.locator('.guest-button').click();await wait('algorithms');await page.getByRole('button',{name:'Khám phá Ridge',exact:true}).click();await wait('lab');
 check(await page.locator('#lab .change-algorithm').count()===1,'Header change algorithm exists');
 check(await page.locator('#lab .algorithm-back,#lab .lab-footer button').count()===0,'No duplicate change algorithm buttons');
 const sameRow=async()=>page.locator('.controls').evaluate(el=>{const groups=[el.querySelector(':scope > .field'),el.querySelector('.run-controls'),el.querySelector('.iteration-group'),el.querySelector('.parameter-controls')];const y=groups.map(n=>{const r=n.getBoundingClientRect();return r.y+r.height/2;});return Math.max(...y)-Math.min(...y)<10&&el.scrollWidth<=el.clientWidth+1;});
 check(await sameRow(),'1920px controls must remain on one row');await page.screenshot({path:'output/playwright/controls-1920.png'});
 for(const width of [1440,1366]){await page.setViewportSize({width,height:1000});await page.waitForTimeout(150);check(await sameRow(),width+'px controls single row without overflow');}
 await page.setViewportSize({width:1024,height:900});await page.waitForTimeout(100);
 check(await page.locator('.parameter-controls').evaluate(el=>el.getBoundingClientRect().width>el.closest('.controls').getBoundingClientRect().width*.85),'Tablet parameters use full row');
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(150);check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Mobile no overflow');
 await page.setViewportSize({width:1440,height:1000});await page.getByRole('button',{name:'Step',exact:true}).click();await page.waitForFunction(()=>document.querySelector('[role=progressbar]').getAttribute('aria-valuenow')==='1');
 await page.locator('#lab .change-algorithm').click();await wait('algorithms');await page.getByRole('button',{name:'Đăng xuất',exact:true}).click();await wait('welcome');
 await page.locator('.guest-button').click();await wait('algorithms');await page.getByRole('button',{name:'Khám phá Ridge',exact:true}).click();await wait('lab');
 check(await page.locator('#lab [role=progressbar]').getAttribute('aria-valuenow')==='1','Demo logout must not delete current model');
 return {suite:'navigation-layout',passed:['welcome explore removed','selector logout','entry credentials cleared','only header algorithm navigation','1920 single row','1440/1366 single row','tablet balanced parameter row','mobile no overflow','demo model preserved across logout']};
}
