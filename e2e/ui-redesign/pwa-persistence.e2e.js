async(page)=>{
 let stage="initial app shell";try{
 const check=(ok,message)=>{if(!ok)throw new Error(message);};page.setDefaultTimeout(45000);
 const base='http://127.0.0.1:4400';const name='Production PWA offline '+Date.now();const idle=id=>page.waitForFunction(id=>document.querySelector('#'+id)?.hidden===false&&document.querySelector('.experience').getAttribute('aria-busy')==='false',id);
 await page.context().setOffline(false);await page.emulateMedia({reducedMotion:'reduce'});await page.goto(base);
 await page.waitForFunction(()=>!!navigator.serviceWorker?.controller,null,{timeout:45000});
 await page.waitForFunction(async()=>{const registration=await navigator.serviceWorker.ready;return registration.active?.state==='activated';});
 // All code chunks, including Web Worker, must be cached before this offline reload.
 await page.waitForFunction(async()=>{const manifest=await fetch('/ngsw.json?ngsw-bypass').then(r=>r.json());const required=[...manifest.assetGroups.find(g=>g.name==='app-shell').urls,manifest.index];for(const key of await caches.keys()){if(!key.endsWith(':assets:app-shell:cache'))continue;const cache=await caches.open(key);const paths=new Set((await cache.keys()).map(r=>new URL(r.url).pathname));if(required.every(url=>paths.has(url)))return true;}return false;});
 await page.waitForFunction(async()=>{const state=await fetch('/ngsw/state').then(r=>r.text());return state.includes('Driver state: NORMAL')&&/Clients: [a-f0-9]/.test(state);},null,{timeout:45000});
 stage="offline reload and Guest";await page.context().setOffline(true);await page.reload();await page.locator('.guest-button').click();await idle('algorithms');
 await page.getByRole('button',{name:'Khám phá Linear',exact:true}).click();await idle('lab');
 await page.getByRole('button',{name:'Step',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#lab [role=progressbar]').getAttribute('aria-valuenow')==='1');
 await page.getByLabel('Tên lần chạy',{exact:true}).fill(name);await page.getByRole('button',{name:'Lưu',exact:true}).click();
 const row=page.locator('#lab app-experiments-panel li').filter({hasText:name});await row.waitFor();check(await row.locator('.sync').innerText()==='Chờ đồng bộ','Offline snapshot pending');
 stage='offline restore';await page.reload();await page.locator('.guest-button').click();await idle('algorithms');await page.getByRole('button',{name:'Khám phá Linear',exact:true}).click();await idle('lab');
 const restored=page.locator('#lab app-experiments-panel li').filter({hasText:name});await restored.waitFor();await restored.getByRole('button',{name:'Áp dụng',exact:true}).click();
 await page.waitForFunction(()=>document.querySelector('#lab [role=progressbar]').getAttribute('aria-valuenow')==='1');
 stage='online synchronization';await page.context().setOffline(false);await restored.locator('.sync').filter({hasText:'Đã đồng bộ'}).waitFor();
 const api=await page.request.get(base+'/api/v1/experiments');check(api.ok()&&(api.headers()['content-type']??'').includes('application/json'),'SSR forwards API as JSON');
 const response=await api.json();check(response.items.some(e=>e.name===name&&e.iterations===1&&Array.isArray(e.w)),'Production offline snapshot reaches MongoDB');
 await page.screenshot({path:'output/playwright/pwa-persistence-complete.png'});
 return {suite:'pwa-persistence',passed:['production service worker activated','Worker bundle cached','full app reload offline','offline Guest training','IndexedDB survives offline reload','restore trained iteration offline','real Guest adoption and MongoDB sync','SSR API JSON proxy']};
}catch(error){throw new Error(stage+': '+error.message);}
}
