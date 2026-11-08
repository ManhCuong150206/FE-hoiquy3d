async(page)=>{
 const check=(value,message)=>{if(!value)throw new Error(message);};
 const idle=id=>page.waitForFunction(id=>document.querySelector('#'+id)?.hidden===false&&document.querySelector('.experience')?.getAttribute('aria-busy')==='false',id);
 page.setDefaultTimeout(20000);
 await page.addInitScript(()=>{
  window.guestWrites=[];
  const set=Storage.prototype.setItem;Storage.prototype.setItem=function(...args){window.guestWrites.push('storage:'+args[0]);return set.apply(this,args);};
  const open=indexedDB.open.bind(indexedDB);indexedDB.open=(...args)=>{window.guestWrites.push('indexedDB:'+args[0]);return open(...args);};
 });
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto('http://127.0.0.1:4300');
 await idle('algorithms');
 await page.locator('#algorithms .login-button').click();await idle('welcome');
 await page.waitForLoadState('networkidle');
 const calls=[];page.on('request',request=>{if(request.url().includes('/api/'))calls.push(request.url());});
 await page.context().setOffline(true);
 await page.getByRole('button',{name:/Tham gia với tư cách Guest/}).click();await idle('algorithms');
 await page.getByRole('button',{name:'Khám phá Linear',exact:true}).click();await idle('lab');
 await page.getByRole('button',{name:'Step',exact:true}).click();
 await page.waitForFunction(()=>document.querySelector('#lab [role=progressbar]')?.getAttribute('aria-valuenow')==='1');
 check(await page.getByRole('button',{name:'Lưu',exact:true}).isDisabled(),'Guest save must be disabled');
 check(await page.getByRole('button',{name:'Đồng bộ với máy chủ',exact:true}).isDisabled(),'Guest sync must be disabled');
 await page.getByRole('button',{name:'Chuyển sang giao diện sáng',exact:true}).click();
 check((await page.evaluate(()=>window.guestWrites)).length===0,'Guest must not open IndexedDB or persist preferences/identity');
 await page.context().setOffline(false);await page.waitForTimeout(200);
 check(calls.length===0,'Guest must not call auth or sync on reconnect');
 await page.locator('#lab .change-algorithm').click();await idle('algorithms');
 await page.context().setOffline(true);await page.locator('#algorithms .login-button').click();await idle('welcome');
 await page.context().setOffline(false);
 return {suite:'guest-memory',passed:['offline Guest entry','training works','save and sync disabled','zero IndexedDB/localStorage writes','zero API calls on reconnect','Guest opens login offline']};
}
