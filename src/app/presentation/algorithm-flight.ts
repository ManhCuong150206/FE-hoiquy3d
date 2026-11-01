import type { gsap } from 'gsap';
import type { AlgorithmSphere } from '../features/algorithm-sphere/algorithm-sphere';
import { Algorithm } from '../core/models/experiment';
export interface FlightPoint {x:number;y:number}
export function curvedFlight(a:FlightPoint,b:FlightPoint,t:number):FlightPoint {
  const u=1-t,control={x:(a.x+b.x)/2,y:Math.min(a.y,b.y)-65};
  return {x:u*u*a.x+2*u*t*control.x+t*t*b.x,y:u*u*a.y+2*u*t*control.y+t*t*b.y};
}
/** Close the transient WebGL stage, reattaching its canvas to its Angular owner. */
export function closePlanetCinema(){
 if(typeof document==='undefined')return;
 document.querySelector('.algorithm-flight-cover')?.remove();
 document.querySelector('.planet-cinema')?.dispatchEvent(new Event('hoiquy:close-cinema'));
}
/** Owns ephemeral visual copies only. Domain/model changes remain in App. */
export class AlgorithmFlight {
  private revision=0;
  private timeline?: gsap.core.Timeline;
  private finish?: ()=>void;
  private hiddenCard?: HTMLElement;
  private host?:HTMLElement;
  cancel(){this.revision++;this.finish?.();}
  restore(){this.cancel();closePlanetCinema();this.host?.style.removeProperty('opacity');if(this.hiddenCard)this.hiddenCard.style.removeProperty('visibility');this.hiddenCard=undefined;}
  async run(host:HTMLElement,sphere:AlgorithmSphere|undefined,algorithm:Algorithm,back:boolean):Promise<boolean>{
    this.cancel();this.host=host;const revision=this.revision;
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
    const state={align:back?1:0,zoom:back?1:0,t:0,cinema:back?1:0};let origin=center();
    if(back){sphere.beginCinema(true);sphere.refreshCinemaFrame();}
    const locate=(point:FlightPoint)=>{star.style.transform=`translate3d(${point.x-18}px,${point.y-18}px,0)`;};
    const updateSphere=()=>sphere.setJourney(state.align,state.zoom);
    return await new Promise<boolean>(resolve=>{
      let completed=false;
      const cleanup=()=>{
        if(completed)return;completed=true;this.timeline?.kill();this.timeline=undefined;
        portal.remove();delete host.dataset['flight'];engine.set(others,{clearProps:'opacity'});if(back){closePlanetCinema();engine.set(host,{clearProps:'opacity'});}
        if(back){card.style.removeProperty('visibility');this.hiddenCard=undefined;sphere.restoreJourney();}
        document.removeEventListener('visibilitychange',skip);media.removeEventListener('change',skip);canvas?.removeEventListener('webglcontextlost',lost);this.finish=undefined;resolve(true);
      };
      const media=matchMedia('(prefers-reduced-motion: reduce)');
      const canvas=document.querySelector('.planet-cinema canvas')??host.querySelector('app-algorithm-sphere canvas');
      const lost=()=>cleanup();canvas?.addEventListener('webglcontextlost',lost);
      const skip=()=>{if(document.hidden||media.matches){if(!back){sphere.setJourney(1,1);sphere.beginCinema();sphere.setCinema(1);}cleanup();}};
      this.finish=cleanup;document.addEventListener('visibilitychange',skip);media.addEventListener('change',skip);
      const timeline=engine.timeline({onComplete:cleanup});this.timeline=timeline;
      if(!back){
        locate(origin);engine.set(star,{opacity:0,scale:.7});
        timeline.call(()=>{portal.dataset['phase']='gather';},[],0)
          .to(others,{opacity:.35,duration:.3},0)
          .to(clone,{scale:.04,opacity:0,duration:.45,ease:'power2.inOut'},0)
          .to(star,{opacity:1,scale:1,duration:.2},.25)
          .to(state,{align:1,duration:1.1,ease:'power2.inOut',onUpdate:updateSphere},0)
          .call(()=>{portal.dataset['phase']='fly';},[],.95)
          .to(state,{t:1,duration:.9,ease:'power2.inOut',onUpdate:()=>{const end=sphere.journeyAnchor();if(end)locate(curvedFlight(origin,end,state.t));}},.95)
          .to(star,{opacity:0,scale:.25,duration:.2},1.8)
          .call(()=>{portal.dataset['phase']='approach';sphere.beginCinema();},[],1.85)
          .to(host,{opacity:0,duration:.55},1.9)
          .to(state,{cinema:1,duration:.8,ease:'power2.inOut',onUpdate:()=>sphere.setCinema(state.cinema)},1.85)
          .to(state,{zoom:1,duration:4.6,ease:'power2.inOut',onUpdate:updateSphere},2.2);
      }else{
        engine.set(host,{opacity:0});engine.set(clone,{scale:.04,opacity:0});engine.set(star,{opacity:0});
        timeline.call(()=>{portal.dataset['phase']='pullback';},[],0)
          .to(state,{zoom:0,duration:4.6,ease:'power2.inOut',onUpdate:updateSphere},0)
          .to(state,{cinema:0,duration:.85,ease:'power2.inOut',onUpdate:()=>sphere.setCinema(state.cinema)},4.15)
          .to(host,{opacity:1,duration:.6},4.2)
          .call(()=>{sphere.endCinema();origin=sphere.journeyAnchor()??center();locate(origin);portal.dataset['phase']='return-star';const box=card.getBoundingClientRect();if(box.bottom>innerHeight||box.top<0)card.scrollIntoView({block:'center',behavior:'smooth'});},[],5)
          .to(star,{opacity:1,scale:1,duration:.15},5)
          .to(state,{t:1,duration:.9,ease:'power2.inOut',onUpdate:()=>locate(curvedFlight(origin,center(),state.t))},5.05)
          .call(()=>{portal.dataset['phase']='restore-card';const box=card.getBoundingClientRect();clone.style.left=box.left+'px';clone.style.top=box.top+'px';},[],5.95)
          .to(star,{opacity:0,scale:.3,duration:.2},5.95)
          .to(clone,{scale:1,opacity:1,duration:.4,ease:'power2.out'},5.95)
          .to(state,{align:0,duration:.6,ease:'power2.inOut',onUpdate:updateSphere},5.75);
      }
    });
  }
}
