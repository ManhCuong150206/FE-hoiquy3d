async(page)=>{
 const check=(ok,msg)=>{if(!ok)throw Error(msg);};
 const idle=id=>page.waitForFunction(id=>document.querySelector('#'+id)?.hidden===false&&document.querySelector('.experience').getAttribute('aria-busy')==='false',id);
 await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:1440,height:1000});await page.goto('http://127.0.0.1:4300');await idle('algorithms');
 await page.locator('#algorithms .login-button').click();await idle('welcome');await page.getByLabel('Email',{exact:true}).fill('demo@example.com');await page.getByLabel('Mật khẩu',{exact:true}).fill('password123');await page.locator('.auth-submit').click();await idle('algorithms');
 await page.getByRole('button',{name:'Khám phá Linear',exact:true}).click();await idle('lab');
 for(let i=1;i<=2;i++){
  await page.getByRole('button',{name:'Step',exact:true}).click();await page.waitForFunction(n=>document.querySelector('#lab [role=progressbar]').getAttribute('aria-valuenow')===String(n),i);
  await page.getByLabel('Tên lần chạy',{exact:true}).fill('Comparison '+i);await page.getByRole('button',{name:'Lưu',exact:true}).click();await page.locator('app-experiments-panel .name').filter({hasText:'Comparison '+i}).waitFor();
  await page.getByLabel('So sánh Comparison '+i,{exact:true}).check();
 }
 await page.getByRole('button',{name:'Mở bảng so sánh (2)',exact:true}).click();const dialog=page.getByRole('dialog',{name:'So sánh các thí nghiệm'});await dialog.waitFor();
 check(await dialog.evaluate(el=>el.getBoundingClientRect().width>900),'Comparison has enough desktop space');
 check(await dialog.getByRole('columnheader').count()===3,'Both experiments visible');
 await page.screenshot({path:'output/playwright/comparison-wide.png'});
 await page.keyboard.press('Escape');check(!await dialog.isVisible(),'Escape closes dialog');
 await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:'Mở bảng so sánh (2)',exact:true}).click();await dialog.waitFor();
 check(await dialog.evaluate(el=>el.getBoundingClientRect().width<=innerWidth),'Dialog fits mobile');await page.getByRole('button',{name:'Đóng bảng so sánh',exact:true}).click();
 return {suite:'comparison',passed:['two saved runs','wide comparison','keyboard close','mobile fits']};
}
