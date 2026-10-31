// Lucian UX/UI Prompt #228 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#228
import { Directive, DestroyRef, ElementRef, NgZone, afterNextRender, effect, inject, input } from '@angular/core';
import { FrameBudget } from './frame-budget';

const CARDS='.auth-card,.algorithm-card,.card,.controls,app-header .bar,.route-map>ol>li';
interface GlowCard {element:HTMLElement;overlay:HTMLDivElement;id:string;radius:string;clips:HTMLElement[]}
/** A presentation-only portal: never replaces cards, inputs, canvas or handlers. */
@Directive({selector:'[appCardGlow]'})
export class CardGlow {
  readonly glowScreen=input('welcome');
  readonly glowReduced=input(false);
  private readonly host=inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly destroy=inject(DestroyRef);
  private readonly zone=inject(NgZone);
  private refresh: (()=>void) | undefined;
  constructor(){
    effect(()=>{this.glowScreen();this.glowReduced();this.refresh?.();});
    afterNextRender(()=>this.zone.runOutsideAngular(()=>this.mount()));
  }
  private mount(){
    const portal=document.createElement('div');portal.className='regression-card-glow';portal.setAttribute('aria-hidden','true');document.body.appendChild(portal);
    const reduce=matchMedia('(prefers-reduced-motion: reduce)'),fine=matchMedia('(hover: hover) and (pointer: fine)');
    const budget=new FrameBudget(60);
    let cards:GlowCard[]=[],dirty=true,raf=0,x=-500,y=-500,opacity=0,target=0,last=0,serial=0;
    const enabled=()=>fine.matches&&!reduce.matches&&!this.glowReduced()&&!document.hidden;
    const clear=()=>{for(const card of cards){card.element.removeAttribute('data-card-glow');card.overlay.remove();}cards=[];};
    const scan=()=>{
      clear();const screen=this.host.querySelector<HTMLElement>('#'+this.glowScreen());
      portal.dataset['glowScreen']=this.glowScreen();portal.dataset['theme']=document.documentElement.dataset['theme']??'dark';
      if(!screen || screen.hidden)return;
      for(const element of screen.querySelectorAll<HTMLElement>(CARDS)){
        const overlay=document.createElement('div');overlay.className='regression-card-glow__card';overlay.style.left='0';overlay.style.top='0';
        const id='card-glow-'+serial++;element.dataset['cardGlow']=id;overlay.dataset['for']=id;
        const wash=document.createElement('i'),border=document.createElement('i');wash.className='regression-card-glow__wash';border.className='regression-card-glow__border';overlay.append(wash,border);
        const style=getComputedStyle(element);
        overlay.style.setProperty('--cg-color',style.getPropertyValue('--card-accent').trim()||style.getPropertyValue('--algorithm-accent').trim()||style.getPropertyValue('--accent').trim()||'#A78BFA');
        overlay.style.setProperty('--cg-secondary',style.getPropertyValue('--card-accent').trim()||style.getPropertyValue('--algorithm-accent').trim()||'#35E6FF');
        portal.appendChild(overlay);cards.push({element,overlay,id,radius:style.borderRadius,clips:clippingParents(element)});
      }
      dirty=false;
    };
    const kick=()=>{if(!raf){last=performance.now();raf=requestAnimationFrame(frame);}};
    const hide=()=>{target=0;kick();};
    const reset=()=>{target=opacity=0;portal.style.opacity='0';if(raf)cancelAnimationFrame(raf);raf=0;dirty=true;portal.dataset['enabled']=String(enabled());};
    const frame=(now:number)=>{
      raf=0;if(!enabled()){reset();return;}
      if(budget.take(now)===null){raf=requestAnimationFrame(frame);return;}
      if(dirty)scan();
      opacity=approachGlow(opacity,target,now-last);last=now;
      if(Math.abs(opacity-target)<.005)opacity=target;
      portal.style.opacity=opacity.toFixed(3);portal.dataset['enabled']='true';
      // Batch layout reads before writing overlay positions; update only the visible page.
      const measured=cards.map(card=>({card,rect:card.element.getBoundingClientRect(),clip:visibleClip(card.clips),radius:card.radius}));
      for(const {card,rect,clip,radius} of measured){
        const overlay=card.overlay;
        if(card.element.style.visibility==='hidden'||rect.width<=0||rect.height<=0||clip.right<=clip.left||clip.bottom<=clip.top){overlay.hidden=true;continue;}
        overlay.hidden=false;
        // Translate rather than change top/left: scrolling borders must not cause layout shifts.
        overlay.style.transform=`translate3d(${rect.left}px,${rect.top}px,0)`;
        const width=rect.width+'px',height=rect.height+'px';
        if(overlay.style.width!==width)overlay.style.width=width;
        if(overlay.style.height!==height)overlay.style.height=height;
        if(overlay.style.borderRadius!==radius)overlay.style.borderRadius=radius;
        overlay.style.clipPath=`inset(${Math.max(0,clip.top-rect.top)}px ${Math.max(0,rect.right-clip.right)}px ${Math.max(0,rect.bottom-clip.bottom)}px ${Math.max(0,clip.left-rect.left)}px)`;
        overlay.style.setProperty('--cg-x',(x-rect.left).toFixed(1)+'px');overlay.style.setProperty('--cg-y',(y-rect.top).toFixed(1)+'px');
      }
      if(Math.abs(opacity-target)>.005)raf=requestAnimationFrame(frame);
    };
    const move=(event:PointerEvent)=>{if(!enabled()||event.pointerType==='touch')return;x=event.clientX;y=event.clientY;target=1;kick();};
    const reposition=()=>{if(enabled()&&opacity>0)kick();};
    const restyle=()=>{dirty=true;reposition();};
    const mutation=new MutationObserver(records=>{
      if(records.some(record=>record.type==='attributes'||[...record.addedNodes,...record.removedNodes].some(node=>node instanceof HTMLElement && (node.matches(CARDS)||!!node.querySelector(CARDS)))))dirty=true;
      reposition();
    });
    mutation.observe(this.host,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden','data-algorithm','open','data-flight']});
    const themeObserver=new MutationObserver(restyle);themeObserver.observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
    const resize=new ResizeObserver(restyle);resize.observe(this.host);
    this.host.addEventListener('pointermove',move,{passive:true});this.host.addEventListener('pointerleave',hide);
    window.addEventListener('scroll',reposition,{passive:true,capture:true});window.addEventListener('resize',restyle,{passive:true});
    reduce.addEventListener('change',reset);fine.addEventListener('change',reset);document.addEventListener('visibilitychange',reset);
    this.refresh=()=>{reset();clear();portal.dataset['glowScreen']=this.glowScreen();};reset();
    this.destroy.onDestroy(()=>{if(raf)cancelAnimationFrame(raf);clear();portal.remove();mutation.disconnect();themeObserver.disconnect();resize.disconnect();this.host.removeEventListener('pointermove',move);this.host.removeEventListener('pointerleave',hide);window.removeEventListener('scroll',reposition,true);window.removeEventListener('resize',restyle);reduce.removeEventListener('change',reset);fine.removeEventListener('change',reset);document.removeEventListener('visibilitychange',reset);this.refresh=undefined;});
  }
}
/** Same rise/fall rates as the supplied sample, with bounded frame delta. */
export function approachGlow(current:number,target:number,deltaMs:number):number {
  return current+(target-current)*Math.min(1,Math.max(0,Math.min(.05,deltaMs/1000))*(target?8:2.5));
}
function clippingParents(element:HTMLElement):HTMLElement[]{
  const parents:HTMLElement[]=[];
  for(let parent=element.parentElement;parent;parent=parent.parentElement){
    const style=getComputedStyle(parent);
    if(/auto|scroll|hidden|clip/.test(style.overflowX+' '+style.overflowY))parents.push(parent);
  }
  return parents;
}
function visibleClip(parents:HTMLElement[]){
  let clip={left:0,top:0,right:innerWidth,bottom:innerHeight};
  for(const parent of parents){
    const rect=parent.getBoundingClientRect();let top=rect.top;
    if(parent.classList.contains('lesson'))top+=parent.querySelector<HTMLElement>('.lesson-command')?.offsetHeight??0;
    clip={left:Math.max(clip.left,rect.left),top:Math.max(clip.top,top),right:Math.min(clip.right,rect.right),bottom:Math.min(clip.bottom,rect.bottom)};
  }
  return clip;
}
