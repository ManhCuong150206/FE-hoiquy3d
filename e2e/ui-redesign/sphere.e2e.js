async(page)=>{
 page.setDefaultTimeout(15000); page.setDefaultNavigationTimeout(30000);
 const check=(ok,message)=>{if(!ok)throw new Error(message);};
 await page.setViewportSize({width:1440,height:1000});await page.emulateMedia({reducedMotion:'no-preference'});
 await page.goto('http://127.0.0.1:4300/');
 await page.getByRole('button',{name:'Tham gia với tư cách Guest',exact:true}).click();
 const canvas=page.locator('app-algorithm-sphere canvas');await canvas.waitFor({state:'visible'});
 const rect=await canvas.boundingBox();await canvas.click({position:{x:rect.width/2,y:rect.height/2}});
 await page.waitForTimeout(250);
 check(await page.locator('#lab').count()===0,'Sphere click must not select');
 await page.getByRole('button',{name:'Khám phá Linear',exact:true}).click();
 await page.locator('#selected-algorithm').waitFor();
 return {suite:'sphere/quality',passed:['sphere click disabled and card selection works']};
}
