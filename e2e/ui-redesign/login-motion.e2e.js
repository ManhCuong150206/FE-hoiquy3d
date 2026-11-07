async(page)=>{
 const check=(ok,message)=>{if(!ok)throw new Error(message);};
 const idle=id=>page.waitForFunction(id=>document.querySelector('#'+id)?.hidden===false&&document.querySelector('.experience')?.getAttribute('aria-busy')==='false',id);
 await page.emulateMedia({reducedMotion:'no-preference'});await page.setViewportSize({width:1440,height:1000});
 await page.goto('http://127.0.0.1:4301/');await idle('algorithms');
 await page.locator('#algorithm-planet-slot canvas').waitFor();
 // Reproduce signing in after exploring a model anonymously.
 await page.getByRole('button',{name:'Khám phá Linear',exact:true}).click();await idle('lab');
 await page.locator('#lab .change-algorithm').click();await idle('algorithms');
 await page.locator('#algorithms').getByRole('button',{name:'Đăng nhập',exact:true}).click();await idle('welcome');
 await page.getByLabel('Email',{exact:true}).fill('demo@example.com');await page.getByLabel('Mật khẩu',{exact:true}).fill('password123');
 const start=Date.now();await page.locator('.auth-submit').click();
 await page.locator('.planet-transfer-stage[data-direction=to-picker]').waitFor();
 await page.waitForTimeout(900);
 check(await page.locator('.planet-transfer-stage').count()===1,'Login animation was cut short');
 check(await page.locator('.experience').getAttribute('aria-busy')==='true','Transition must stay busy during planet flight');
 await page.screenshot({path:'output/playwright/login-motion-mid.png'});
 await idle('algorithms');
 const duration=Date.now()-start;
 check(duration>=3500&&duration<10000,'Login must play the full transition: '+duration);
 check(await page.locator('#algorithms .account-greeting').textContent()==='Xin chào, Member','Greeting after animated login');
 check(await page.locator('.planet-transfer-stage').count()===0,'Portal cleaned up');
 check(await page.locator('#algorithm-planet-slot canvas').count()===1,'Planet docked');
 return {suite:'login-motion',duration,passed:['full login transition after exploring as guest','greeting','portal cleanup','planet docked']};
}
