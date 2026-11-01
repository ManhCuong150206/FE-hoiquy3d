import { closePlanetCinema } from './algorithm-flight';
import { DestroyRef, Directive, ElementRef, NgZone, afterNextRender, effect, inject, input, signal, untracked } from '@angular/core';
import type { gsap } from 'gsap';

/** Page presentation only. Never calls training or data APIs. */
@Directive({ selector: '[appJourneyMotion]' })
export class JourneyMotion {
  readonly motionEnabled = input(true);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly zone = inject(NgZone);
  private readonly loaded = signal(false);
  private engine?: typeof gsap;
  private timeline?: gsap.core.Timeline;
  private finish?: () => void;
  private releasePlanet?:()=>void;
  private media?: MediaQueryList;
  private destroyed = false;

  constructor() {
    effect(() => { this.motionEnabled(); if (this.loaded()) untracked(() => this.preferenceChanged()); });
    afterNextRender(async () => {
      if (typeof ResizeObserver === 'undefined') return;
      const { gsap: engine } = await import('gsap'); if (this.destroyed) return;
      this.engine = engine; engine.ticker.fps(60);
      this.media = window.matchMedia('(prefers-reduced-motion: reduce)');
      this.media.addEventListener('change', this.preferenceChanged); this.loaded.set(true);
    });
    inject(DestroyRef).onDestroy(() => { this.destroyed = true; this.timeline?.kill();this.releasePlanet?.(); this.media?.removeEventListener('change', this.preferenceChanged);closePlanetCinema(); });
  }

  private preferenceChanged = () => {
    this.host.dataset['motion'] = this.motionEnabled() && !this.media?.matches ? 'active' : 'reduced';
    if (this.host.dataset['motion'] === 'reduced') this.finish?.();
  };

  settle() { this.finish?.(); }

  switchPage(from: HTMLElement | null, target: HTMLElement, algorithm: string, swap: () => void, done: () => void, handoff=false): void {
    this.finish?.();
    const engine = this.engine;
    const veil = this.host.querySelector<HTMLElement>('.scene-wipe');
    const labPanels = () => Array.from(target.querySelectorAll<HTMLElement>('.workspace > app-viewport3d, app-training-controls, .workspace > app-experiments-panel, .workspace > app-data-panel, .workspace > app-results-panel, .lab-heading, app-header, .lesson-entry, .lab-footer'));
    let arrivalItems: HTMLElement[] = [];
    let outgoingItems: Element[] = [];
    const panels = () => Array.from(target.querySelectorAll<HTMLElement>('.welcome-grid > *, .algorithm-copy, .sphere-container, .algorithm-cards, .lab-heading, app-training-controls, .workspace > *, .learning-workspace > *, app-algorithm-notes'));
    let swapped = false;
    const change = () => {
      if (swapped) return; swapped = true;
      if (from && from !== target) from.hidden = true;
      target.hidden = false;
      this.zone.run(swap); window.scrollTo({ top: 0, behavior: 'instant' });
      this.host.dataset['transition'] = 'enter'; target.dataset['entered'] = 'animating';
    };
    const finish = () => {
      this.timeline?.kill(); this.timeline = undefined; change();this.releasePlanet?.();this.releasePlanet=undefined;
      if (engine) {
        engine.set([...(from ? [from] : []), target, ...panels(), ...arrivalItems, ...outgoingItems], { clearProps: 'transform,opacity,visibility,willChange,transformOrigin' });
        if (veil) engine.set(veil, { autoAlpha: 0 });
      }
      delete target.dataset['arrival'];
      delete this.host.dataset['transition']; target.dataset['entered'] = 'complete'; this.finish = undefined;
      const heading = target.querySelector<HTMLElement>('h1,h2'); heading?.setAttribute('tabindex', '-1'); heading?.focus({ preventScroll: true });
      this.zone.run(done);
    };
    this.finish = finish;
    if (!engine || !veil || !this.motionEnabled() || this.media?.matches || from === target) { closePlanetCinema();finish(); return; }
    const sharedPair=from&&((from.id==='welcome'&&target.id==='algorithms')||(from.id==='algorithms'&&target.id==='welcome'));
    const planet=sharedPair?document.querySelector<HTMLElement>('app-algorithm-sphere'):null;
    const destination=target.querySelector<HTMLElement>(target.id==='welcome'?'#welcome-planet-slot':'#algorithm-planet-slot');
    if(planet&&destination){
      const source=planet.getBoundingClientRect();
      if(source.width>0&&source.height>0){
        this.zone.runOutsideAngular(()=>{
          const portal=document.createElement('div');portal.className='planet-transfer-stage';portal.setAttribute('aria-hidden','true');portal.dataset['direction']=target.id==='algorithms'?'to-picker':'to-welcome';
          const start={x:source.left+source.width/2,y:source.top+source.height/2};
          const offscreen=source.bottom<0||source.top>innerHeight;
          if(offscreen)start.y=Math.max(source.height/2+20,Math.min(innerHeight-source.height/2-20,start.y));
          Object.assign(portal.style,{position:'fixed',left:(start.x-source.width/2)+'px',top:(start.y-source.height/2)+'px',width:source.width+'px',height:source.height+'px',transformOrigin:'50% 50%'});
          document.body.appendChild(portal);portal.appendChild(planet);
          let end={...start,height:source.height};const state={t:0};
          const measure=()=>{if(swapped){const rect=destination.getBoundingClientRect();end={x:rect.left+rect.width/2,y:rect.top+rect.height/2,height:rect.height};}};
          const move=()=>{const t=state.t,dx=(end.x-start.x)*t,dy=(end.y-start.y)*t-90*t*(1-t),scale=1+(end.height/source.height-1)*t;portal.style.transform=`translate3d(${dx}px,${dy}px,0) scale(${scale})`;};
          window.addEventListener('resize',measure);window.addEventListener('scroll',measure,{passive:true});
          const arriving=Array.from(target.querySelectorAll<HTMLElement>(target.id==='welcome'?'.intro-copy,.auth-card':'.section-heading,.algorithm-copy,.algorithm-cards,.stage-caption,.section-footer'));
          engine.set(arriving,{opacity:0});
          this.releasePlanet=()=>{
            window.removeEventListener('resize',measure);window.removeEventListener('scroll',measure);
            if(destination.isConnected){destination.appendChild(planet);planet.dispatchEvent(new Event('hoiquy:planet-docked'));}else planet.remove();
            engine.set(arriving,{clearProps:'opacity'});portal.remove();delete this.host.dataset['planetTransfer'];
          };
          this.host.dataset['transition']='exit';this.host.dataset['planetTransfer']='moving';
          const timeline=engine.timeline({onComplete:finish});this.timeline=timeline;
          if(from)timeline.to(from,{opacity:0,duration:.6,ease:'power2.in'},0);
          if(offscreen)timeline.fromTo(portal,{opacity:0},{opacity:1,duration:.3},0);
          timeline.call(()=>{change();measure();},[],.55)
            .fromTo(target,{opacity:0},{opacity:1,duration:.85,ease:'power2.out'},.75)
            .to(arriving,{opacity:1,duration:.75,stagger:.08,ease:'power2.out'},2.6)
            .to(state,{t:1,duration:3.8,ease:'power3.inOut',onUpdate:move},.1)
            .to({}, {duration:.1},3.9);
        });return;
      }
    }
    if(handoff){
      this.zone.runOutsideAngular(()=>{
        this.host.dataset['transition']='exit';
        const reverse=target.id==='algorithms';
        const cinema=document.querySelector<HTMLElement>('.planet-cinema');
        const t=engine.timeline({onComplete:()=>{if(!reverse)closePlanetCinema();finish();}});this.timeline=t;
        if(reverse){
          if(from){
            const outgoing=Array.from(from.querySelectorAll('.workspace > *, app-training-controls'));outgoingItems=outgoing;
            t.to(outgoing,{opacity:0,scale:.985,y:6,duration:.26,ease:'power2.in'},0);
            t.to(from,{opacity:0,duration:.4},0);
            t.call(()=>engine.set(outgoing,{clearProps:'transform,opacity'}),[],.4);
          }
          if(cinema)t.to(cinema,{opacity:1,duration:.45},0);
          t.call(change,[],.4).fromTo(target,{opacity:0},{opacity:1,duration:.1},.4);
        }else{
          // Warmed Angular component hosts keep their layout; animate only their presentation.
          arrivalItems=labPanels();
          engine.set(arrivalItems,{opacity:0,y:14,scale:.96,transformOrigin:'50% 50%',willChange:'transform,opacity'});
          target.dataset['arrival']='camera-handoff';
          t.call(change,[],.02).fromTo(target,{opacity:0},{opacity:1,duration:.35},.04);
          if(cinema)t.to(cinema,{opacity:0,duration:.5,ease:'power2.out'},.04);
          // Explicit order: 3D first, controls next, then supporting panels and chrome.
          // A single small overshoot avoids elastic wobble of text and data.
          arrivalItems.sort((a,b)=>{
            const rank=(el:HTMLElement)=>el.matches('app-viewport3d')?0:el.matches('app-training-controls')?1:el.matches('app-experiments-panel')?2:el.matches('app-data-panel')?3:el.matches('app-results-panel')?4:5;
            return rank(a)-rank(b);
          });
          arrivalItems.forEach((item,index)=>{
            const start=.12+Math.min(index,5)*.09;
            t.to(item,{opacity:1,y:0,scale:1.01,duration:.42,ease:'power2.out'},start)
              .to(item,{scale:1,duration:.2,ease:'power2.inOut'},start+.42);
          });
        }
      });return;
    }
    this.zone.runOutsideAngular(() => {
      this.host.dataset['transition'] = 'exit';
      veil.style.setProperty('--wipe-color', getComputedStyle(document.documentElement).getPropertyValue(`--color-${algorithm}`).trim() || '#35e6ff');
      const timeline = engine.timeline({ onComplete: finish }); this.timeline = timeline;
      if (from) timeline.to(from, { opacity: 0, y: -24, scale: .975, duration: .3, ease: 'power2.in' }, 0);
      timeline.fromTo(veil, { autoAlpha: 0 }, { autoAlpha: .85, duration: .28 }, 0)
        .call(change, [], .3)
        .fromTo(target, { opacity: 0, y: 32, scale: .985 }, { opacity: 1, y: 0, scale: 1, duration: .6, ease: 'power3.out' }, .32)
        .to(veil, { autoAlpha: 0, duration: .42 }, .36)
        .add(() => {
          // Deferred components can arrive after the page swap; animate the stable component hosts.
          const items = panels();
          if (items.length) timeline.fromTo(items, { y: target.id === 'learning' ? 26 : 18, opacity: 0 }, { y: 0, opacity: 1, stagger: .055, duration: .52, ease: 'power3.out' }, .38);
          const sphere = target.querySelector('.sphere-container');
          if (sphere) timeline.fromTo(sphere, { scale: .82, rotationY: -12 }, { scale: 1, rotationY: 0, duration: .85, ease: 'power3.out' }, .36);
          const lesson = target.querySelectorAll('.learning-workspace > *');
          lesson.forEach((item, index) => timeline.fromTo(item, { x: index ? 36 : -36 }, { x: 0, duration: .65, ease: 'power3.out' }, .4));
        }, .33);
    });
  }
}
