async(page)=>{
 await page.bringToFront();page.setDefaultTimeout(20000);
 const check=(ok,message)=>{if(!ok)throw new Error(message);};
 await page.setViewportSize({width:1440,height:1000});await page.emulateMedia({reducedMotion:'reduce'});await page.goto('http://127.0.0.1:4300/');
 check(await page.locator('#welcome h1').textContent()==='Hệ thống thực nghiệm và trực quan hóa quá trình học của mô hình hồi quy','Exact full project title');
 check(await page.locator('.intro-meta>span').count()===3,'All three illustrations retained');
 check(await page.getByRole('heading',{name:'Đăng nhập',exact:true}).count()===1,'Short login heading');
 check(!await page.locator('.auth-card').textContent().then(t=>t.includes('YOUR NEXT DISCOVERY')),'Old auth subtitle removed');
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.locator('.spatial-host[data-meteor-active=true]').waitFor();await page.waitForTimeout(350);await page.screenshot({path:'output/playwright/planet-meteor-welcome.png'});
 await page.emulateMedia({reducedMotion:'reduce'});await page.waitForFunction(()=>document.querySelector('.spatial-host')?.dataset.meteorActive==='false');
 await page.locator('.guest-button').click();await page.waitForFunction(()=>!document.querySelector('#algorithms').hidden&&document.querySelector('.experience').getAttribute('aria-busy')==='false');
 const canvas=page.locator('app-algorithm-sphere canvas');await canvas.waitFor();
 check(await canvas.getAttribute('data-continent-count')==='4','Four terrain meshes');
 const landmarks=await canvas.evaluate(el=>JSON.parse(el.dataset.landmarks));
 const visible=landmarks.filter(p=>p.front&&p.u>0&&p.u<1&&p.v>0&&p.v<1);check(visible.length>0&&visible.length<4,'Atlas spans front and back');
 for(const p of visible){const box=await canvas.boundingBox();await page.mouse.move(box.x+p.u*box.width,box.y+p.v*box.height);check(await canvas.getAttribute('data-hovered-algorithm')===p.id,'Land center raycasts to '+p.id);}
 await page.mouse.move(10,10);await page.emulateMedia({reducedMotion:'no-preference'});
 const before=await canvas.getAttribute('data-pulse-phase');await page.waitForTimeout(260);check(await canvas.getAttribute('data-pulse-phase')!==before,'One-second continent pulse is running');
 await page.screenshot({path:'output/playwright/planet-selection.png'});
 await page.getByRole('button',{name:'Khám phá Linear',exact:true}).click();
 await page.waitForFunction(()=>Number(document.querySelector('.planet-cinema canvas')?.dataset.cinemaProgress)>.95);
 const flight=page.locator('.planet-cinema canvas');
 const distance=Number(await flight.getAttribute('data-camera-distance'));await page.waitForTimeout(200);
 check(Number(await flight.getAttribute('data-camera-distance'))<distance,'Camera moves in 3D toward terrain');
 const glow=await flight.evaluate(el=>JSON.parse(el.dataset.continentGlow).find(c=>c.id==='linear').intensity);check(glow===.55,'Selected continent has steady emission');
 check(await page.locator('.algorithm-flight-cover').count()===0,'No expanding color disk');
 await page.screenshot({path:'output/playwright/planet-flight-closeup.png'});
 await page.waitForFunction(()=>Number(document.querySelector('.planet-cinema canvas')?.dataset.cameraDistance)<.25);
 check(Number(await page.locator('.planet-cinema').evaluate(el=>el.style.getPropertyValue('--arrival-glow')))>.1,'Arrival light increases near terrain');
 check(Number(await flight.getAttribute('data-camera-distance'))<.45,'Deep surface approach before light handoff');
 await page.waitForFunction(()=>!document.querySelector('#lab')?.hidden&&document.querySelector('.experience').getAttribute('aria-busy')==='false');
 await page.locator('#lab .change-algorithm').click();await page.locator('.planet-cinema').waitFor();await page.waitForFunction(()=>document.querySelector('.experience').getAttribute('aria-busy')==='false');
 check(await page.locator('.planet-cinema').count()===0,'Canvas reattached after reverse');
 check(await canvas.count()===1,'Single sphere canvas restored');
 await page.emulateMedia({reducedMotion:'reduce'});const pulse=await canvas.getAttribute('data-pulse-phase');await page.waitForTimeout(250);check(await canvas.getAttribute('data-pulse-phase')===pulse,'Reduced motion freezes continent pulse');
 return {suite:'planet',passed:['full title','three illustrations','short auth title','shooting star','meteor reduced motion','stable seeded atlas across hemispheres','visible terrain hover','deep approach and soft arrival light','continent pulse','actual camera approach','steady selected land','no color disk','reverse and canvas ownership','reduced pulse']};
}
