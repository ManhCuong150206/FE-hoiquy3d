async(page)=>{
 await page.bringToFront();
 const check=(ok,message)=>{if(!ok)throw new Error(message);};page.setDefaultTimeout(15000);
 const waitScreen=id=>page.waitForFunction(id=>!document.getElementById(id)?.hidden&&document.querySelector('.experience')?.getAttribute('aria-busy')==='false',id);
 const focused=id=>page.waitForFunction(id=>document.activeElement?.id===id,id);
 for(const theme of ['dark','light']){
  await page.emulateMedia({reducedMotion:'no-preference'});await page.setViewportSize({width:1440,height:1000});await page.goto('http://127.0.0.1:4300/');await waitScreen('algorithms');
 await page.waitForLoadState('networkidle');
 if(await page.locator('#algorithms .account-greeting').count()){await page.locator('#algorithms').getByRole('button',{name:'Đăng xuất',exact:true}).click();}
 await page.locator('#algorithms .login-button').click();await waitScreen('welcome');
  await page.evaluate(theme=>document.documentElement.dataset.theme=theme,theme);
  await page.locator('.auth-submit').click();await focused('entry-email');
  check(await page.locator('.summary-box a').count()===2,'Two login errors in '+theme);
  check(await page.locator('#entry-email').getAttribute('aria-describedby')==='entry-email-error','Accessible error hint');
  await page.locator('.summary-box a[href="#entry-password"]').focus();await page.keyboard.press('Enter');await focused('entry-password');
  await page.locator('#entry-email').fill('demo@example.com');
  check(await page.locator('.summary-box a').count()===1,'Summary updates after correction');
  check(await page.locator('.entry-field.is-good').count()===1,'Fixed field has check');
  check(await page.locator('.auth-submit').evaluate(el=>{const node=Array.from(el.childNodes).find(n=>n.nodeType===Node.TEXT_NODE&&n.textContent.trim());const range=document.createRange();range.selectNodeContents(node);const t=range.getBoundingClientRect(),b=el.getBoundingClientRect();return Math.abs((t.left+t.right-b.left-b.right)/2)<2;}),'Submit label centered');
  check(await page.locator('#entry-email').evaluate(el=>getComputedStyle(el).backgroundColor)==='rgb(7, 9, 14)','Dark input keeps silver readable');
  check(await page.locator('.auth-submit').evaluate(el=>getComputedStyle(el).color)==='rgb(215, 224, 238)','Silver login text');
  check(await page.locator('.switch-auth button').evaluate(el=>getComputedStyle(el).color)==='rgb(215, 224, 238)','Silver register text');
  await page.locator('#entry-password').fill('short');await page.locator('.auth-submit').click();await focused('entry-password');
  check(await page.locator('#entry-password-error').textContent()==='Mật khẩu cần ít nhất 8 ký tự.','Password rule unchanged');
  await page.screenshot({path:'output/playwright/entry-validation-'+theme+'.png'});
  const sent=[];const request=req=>{if(req.method()==='POST')sent.push(req.url());};page.on('request',request);
  await page.locator('#entry-password').fill('abcdefgh');await page.locator('.auth-submit').click();await waitScreen('algorithms');
  check(sent.length===1&&sent[0].endsWith('/auth/login'),'One authenticated login request');page.off('request',request);
  check(await page.locator('#entry-email').inputValue()===''&&await page.locator('#entry-password').inputValue()==='','Credentials cleared');
 }
 await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:390,height:844});await page.goto('http://127.0.0.1:4300/');await waitScreen('algorithms');
 await page.waitForLoadState('networkidle');
 if(await page.locator('#algorithms .account-greeting').count()){await page.locator('#algorithms').getByRole('button',{name:'Đăng xuất',exact:true}).click();}
 await page.locator('#algorithms .login-button').click();await waitScreen('welcome');
 await page.locator('.switch-auth button').click();await page.locator('.auth-submit').click();await focused('display-name');
 check(await page.locator('.summary-box a').count()===3,'Registration validates three fields');
 check(await page.locator('.entry-field').first().evaluate(el=>el.getAnimations({subtree:true}).every(a=>a.effect?.getTiming().duration!==400)),'Reduced motion skips shake');
 await page.locator('#display-name').fill('Người thử');await page.locator('#entry-email').fill('demo@example.com');await page.locator('#entry-password').fill('abcdefgh');
 check(await page.locator('.summary-box a').count()===0,'All errors clear when fixed');
 check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Mobile no horizontal overflow');
 await page.screenshot({path:'output/playwright/entry-validation-mobile.png'});
 await page.getByRole('button',{name:/Tham gia với tư cách Guest/}).click();await waitScreen('algorithms');
 check(await page.locator('#entry-email').inputValue()==='','Guest clears form');
 return {suite:'entry-validation',passed:['error summary','first error focus','keyboard jump to error','live correction and checks','centered submit label','silver auth text','dark/light themes','short password blocked','valid authenticated transition','auth request only; credentials cleared','registration validation','reduced motion','mobile layout','guest still works']};
}
