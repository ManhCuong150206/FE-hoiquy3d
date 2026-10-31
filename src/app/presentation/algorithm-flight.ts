import type { gsap } from 'gsap';
import type { AlgorithmSphere } from '../features/algorithm-sphere/algorithm-sphere';
import { Algorithm } from '../core/models/experiment';
export interface FlightPoint {x:number;y:number}
export function curvedFlight(a:FlightPoint,b:FlightPoint,t:number):FlightPoint {
  const u=1-t,control={x:(a.x+b.x)/2,y:Math.min(a.y,b.y)-65};
  return {x:u*u*a.x+2*u*t*control.x+t*t*b.x,y:u*u*a.y+2*u*t*control.y+t*t*b.y};
}
/** Radius reaches every viewport corner, even after a resize or off-center landing. */
export function viewportRadius(point:FlightPoint,width:number,height:number):number {
  return Math.hypot(Math.max(Math.abs(point.x),Math.abs(width-point.x)),Math.max(Math.abs(point.y),Math.abs(height-point.y)))+2;
}
export function removeFlightCover(){if(typeof document!=='undefined')document.querySelector('.algorithm-flight-cover')?.remove();}
export function prepareFlightCover(algorithm:string):HTMLElement {
  const cover=document.querySelector<HTMLElement>('.algorithm-flight-cover')??document.createElement('div');
  cover.className='algorithm-flight-cover';cover.dataset['algorithm']=algorithm;cover.setAttribute('aria-hidden','true');
  cover.style.setProperty('--flight-color',getComputedStyle(document.documentElement).getPropertyValue('--color-'+algorithm).trim()||'#35e6ff');
  cover.style.cssText+=';position:fixed;inset:0;width:100vw;height:100vh;border-radius:0;transform:none;opacity:1;';
  document.body.appendChild(cover);return cover;
}
/** Owns ephemeral visual copies only. Domain/model changes remain in App. */
export class AlgorithmFlight {
  private revision=0;
  private timeline?: gsap.core.Timeline;
  private finish?: ()=>void;
  private hiddenCard?: HTMLElement;
  cancel(){this.revision++;this.finish?.();}
  restore(){this.cancel();removeFlightCover();if(this.hiddenCard)this.hiddenCard.style.removeProperty('visibility');this.hiddenCard=undefined;}
  async run(host:HTMLElement,sphere:AlgorithmSphere|undefined,algorithm:Algorithm,back:boolean):Promise<boolean>{
    this.cancel();const revision=this.revision;
    const card=host.querySelector<HTMLElement>(`.algorithm-card[data-algorithm="${algorithm}"]`);
    if(!card||!sphere||!sphere.beginJourney(algorithm,back)) {this.restore();return false;}
    const {gsap:engine}=await import('gsap');if(revision!==this.revision||matchMedia('(prefers-reduced-motion: reduce)').matches){sphere.restoreJourney();return false;}engine.ticker.fps(60);
    const rect=card.getBoundingClientRect(),center=()=>{const b=card.getBoundingClientRect();return {x:b.left+b.width/2,y:b.top+b.height/2};};
    const orb=host.querySelector<HTMLElement>('.sphere-container');
    if(!back&&orb){const box=orb.getBoundingClientRect();if(box.top<0||box.bottom>innerHeight)orb.scrollIntoView({block:'center',behavior:'smooth'});}
    const portal=document.createElement('div');portal.className='algorithm-flight-layer';portal.setAttribute('aria-hidden','true');portal.dataset['algorithm']=algorithm;portal.dataset['direction']=back?'out':'in';
    const star=document.createElement('div');star.className='algorithm-flight-star';
    const clone=card.cloneNode(true) as HTMLElement;clone.removeAttribute('id');clone.removeAttribute('data-card-glow');clone.style.visibility='visible';clone.classList.add('algorithm-flight-card');clone.setAttribute('aria-hidden','true');clone.tabIndex=-1;
    clone.style.cssText+=`;position:fixed;left:${rect.left}px;top:${rect.top}px;width:${rect.width}px;height:${rect.height}px;margin:0;pointer-events:none;transform-origin:center;`;
    portal.style.setProperty('--flight-color',getComputedStyle(card).getPropertyValue('--card-accent').trim()||getComputedStyle(document.documentElement).getPropertyValue('--color-'+algorithm).trim());
    portal.append(clone,star);document.body.appendChild(portal);card.style.visibility='hidden';this.hiddenCard=card;
    host.dataset['flight']=back?'return':'depart';
    const others=Array.from(host.querySelectorAll<HTMLElement>('.algorithm-card')).filter(el=>el!==card);
    const state={align:back?1:0,zoom:back?1:0,t:0,cover:back?1:0};let origin=center();
    const cover=prepareFlightCover(algorithm);
    let landing=sphere.journeyAnchor()??center();
    const sizeCover=()=>{
      const radius=viewportRadius(landing,innerWidth,innerHeight);
      cover.style.inset='auto';cover.style.left=(landing.x-radius)+'px';cover.style.top=(landing.y-radius)+'px';
      cover.style.width=cover.style.height=(radius*2)+'px';cover.style.borderRadius='50%';
    };
    const updateCover=()=>{
      cover.style.transform=`scale(${state.cover})`;
      cover.dataset['coverage']=state.cover>=.999?'full':'partial';
    };
    sizeCover();updateCover();
    const resized=()=>{sizeCover();updateCover();};window.addEventListener('resize',resized);
    const locate=(point:FlightPoint)=>{star.style.transform=`translate3d(${point.x-18}px,${point.y-18}px,0)`;};
    const updateSphere=()=>sphere.setJourney(state.align,state.zoom);
    return await new Promise<boolean>(resolve=>{
      let completed=false;
      const cleanup=()=>{
        if(completed)return;completed=true;this.timeline?.kill();this.timeline=undefined;
        portal.remove();window.removeEventListener('resize',resized);if(back)removeFlightCover();delete host.dataset['flight'];engine.set(others,{clearProps:'opacity'});
        if(back){card.style.removeProperty('visibility');this.hiddenCard=undefined;sphere.restoreJourney();}
        document.removeEventListener('visibilitychange',skip);media.removeEventListener('change',skip);canvas?.removeEventListener('webglcontextlost',lost);this.finish=undefined;resolve(true);
      };
      const media=matchMedia('(prefers-reduced-motion: reduce)');
      const canvas=host.querySelector('app-algorithm-sphere canvas');
      const lost=()=>cleanup();canvas?.addEventListener('webglcontextlost',lost);
      const skip=()=>{if(document.hidden||media.matches){if(!back){sphere.setJourney(1,1);state.cover=1;updateCover();}cleanup();}};
      this.finish=cleanup;document.addEventListener('visibilitychange',skip);media.addEventListener('change',skip);
      const timeline=engine.timeline({onComplete:cleanup});this.timeline=timeline;
      if(!back){
        locate(origin);engine.set(star,{opacity:0,scale:.7});
        timeline.call(()=>{portal.dataset['phase']='gather';},[],0)
          .to(others,{opacity:.35,duration:.25},0)
          .to(clone,{scale:.04,opacity:0,duration:.35,ease:'power2.inOut'},0)
          .to(star,{opacity:1,scale:1,duration:.18},.2)
          .to(state,{align:1,duration:.45,ease:'power2.inOut',onUpdate:updateSphere},0)
          .call(()=>{portal.dataset['phase']='fly';},[],.45)
          .to(state,{t:1,duration:.65,ease:'power2.inOut',onUpdate:()=>{const end=sphere.journeyAnchor();if(end)locate(curvedFlight(origin,end,state.t));}},.45)
          .call(()=>{portal.dataset['phase']='zoom';landing=sphere.journeyAnchor()??landing;sizeCover();updateCover();},[],1.1)
          .to(star,{opacity:0,scale:.2,duration:.18},1.05)
          .to(state,{zoom:1,duration:.55,ease:'power2.in',onUpdate:updateSphere},1.1)
          .to(state,{cover:1,duration:.45,ease:'power2.inOut',onUpdate:updateCover},1.2);
      }else{
        engine.set(clone,{scale:.04,opacity:0});engine.set(star,{opacity:0});
        timeline.call(()=>{portal.dataset['phase']='pullback';},[],0)
          .to(state,{zoom:0,duration:.5,ease:'power2.out',onUpdate:updateSphere},0)
          .to(state,{cover:0,duration:.5,ease:'power2.inOut',onUpdate:updateCover},0)
          .call(()=>{origin=sphere.journeyAnchor()??center();locate(origin);portal.dataset['phase']='return-star';const box=card.getBoundingClientRect();if(box.bottom>innerHeight||box.top<0)card.scrollIntoView({block:'center',behavior:'smooth'});},[],.5)
          .to(star,{opacity:1,scale:1,duration:.12},.5)
          .to(state,{t:1,duration:.7,ease:'power2.inOut',onUpdate:()=>locate(curvedFlight(origin,center(),state.t))},.55)
          .call(()=>{portal.dataset['phase']='restore-card';const box=card.getBoundingClientRect();clone.style.left=box.left+'px';clone.style.top=box.top+'px';},[],1.25)
          .to(star,{opacity:0,scale:.3,duration:.18},1.25)
          .to(clone,{scale:1,opacity:1,duration:.4,ease:'power2.out'},1.25)
          .to(state,{align:0,duration:.35,ease:'power2.inOut',onUpdate:updateSphere},1.3);
      }
    });
  }
}
