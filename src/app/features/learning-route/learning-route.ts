// Lucian UX/UI Prompt #318 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#318
import { NgTemplateOutlet } from '@angular/common';
import { afterNextRender, afterRenderEffect, Component, DestroyRef, ElementRef, Injector, effect, inject, input, output, signal, TemplateRef, viewChild, viewChildren } from '@angular/core';
import { FrameBudget } from '../../presentation/frame-budget';

@Component({imports: [NgTemplateOutlet], selector: 'app-learning-route', templateUrl: './learning-route.html', styleUrl: './learning-route.css'})
export class LearningRoute {
  readonly active = input(true);
  readonly phase = input<number | null>(null);
  readonly resultTemplate = input<TemplateRef<{phase:number}> | null>(null);
  readonly cycle = input<unknown>(null);
  readonly browsed = output<void>();
  readonly locked = input(false);
  readonly phaseDuration = input(1);
  readonly summaries = input<readonly string[]>([]);
  readonly phaseViewed = output<number | null>();
  readonly selected = signal<number | null>(null);
  readonly titles = ['A · Đầu vào', 'B · Dự đoán', 'C · Sai số', 'D · Loss', 'E · Hệ số', 'F · Đánh giá'];
  readonly descriptions = [
    'Đọc đặc trưng và giá trị thật của mẫu đang theo dõi.',
    'Kết hợp đặc trưng với trọng số và bias để dự đoán.',
    'So sánh dự đoán với giá trị thật: residual = ŷ − y.',
    'Tổng hợp sai số trên train và phần phạt nếu có.',
    'Quan sát gradient và các hệ số mới được đề xuất.',
    'Pha F áp dụng một cập nhật, rồi đánh giá train/test.',
  ];
  readonly points = signal<{x:number,y:number}[]>([]);
  readonly path = signal('M24 50 L48 200');
  readonly height = signal(840);
  readonly progress = signal(0);
  readonly reduced = signal(false);
  readonly marker = signal({x:70,y:70});
  private readonly injector = inject(Injector);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroy = inject(DestroyRef);
  private readonly route = viewChild<ElementRef<SVGPathElement>>('route');
  private readonly map = viewChild<ElementRef<HTMLElement>>('map');
  private readonly cards = viewChildren<ElementRef<HTMLElement>>('stage');
  private readonly budget = new FrameBudget(60);
  private raf = 0;
  private geometryDirty = true;
  private routeLength = 1;
  private samples: {y:number;length:number}[] = [];
  private scrollMotion?: {panel:HTMLElement;from:number;to:number;started:number;duration:number};
  private entryAnimation?: Animation;
  private previousPhase: number | null = null;
  private wasFollowing = false;
  private stopFollowing = () => { this.scrollMotion=undefined; this.host.nativeElement.removeAttribute('data-scrolling'); };

  private schedule: (() => void) | undefined;
  select(index:number) {
    if (this.locked()) return;
    this.stopFollowing();
    this.browsed.emit();
    this.selected.update(old => old === index ? null : index);
    this.schedule?.();
  }
  constructor() {
    effect(() => this.phaseViewed.emit(this.selected()));
    effect(() => { this.cycle(); this.selected.set(this.phase()); this.schedule?.(); });
    afterNextRender(() => {
      const ref = afterRenderEffect(() => {
        const i=this.phase(), selected=this.selected(), locked=this.locked();this.cycle();
        const follow=locked || (this.wasFollowing && i!==this.previousPhase);
        this.wasFollowing=locked;this.previousPhase=i;
        if(!this.active()) {this.stopFollowing();return;}
        const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
        this.entryAnimation?.cancel();
        const result=this.cards()[selected ?? -1]?.nativeElement.querySelector<HTMLElement>('.stage-result');
        if(result && !reduce) this.entryAnimation=result.animate?.([{opacity:.25,transform:'translateY(8px)'},{opacity:1,transform:'translateY(0)'}],{duration:Math.min(220,this.phaseDuration()*350),easing:'cubic-bezier(.2,.8,.2,1)'});
        const card=this.cards()[i ?? -1]?.nativeElement,panel=this.host.nativeElement.closest<HTMLElement>('.lesson');
        if(follow && card && panel && panel.scrollHeight>panel.clientHeight && matchMedia('(min-width:901px)').matches) {
          const cardBox=card.getBoundingClientRect(),panelBox=panel.getBoundingClientRect();
          const target=followTarget(panel.scrollTop,cardBox.top-panelBox.top,cardBox.height,panel.clientHeight,panel.scrollHeight);
          if(target===null){this.schedule?.();return;}
          const top=target;
          if(reduce) panel.scrollTo({top,behavior:'instant'});
          else {
            this.scrollMotion={panel,from:panel.scrollTop,to:top,started:performance.now(),duration:Math.min(320,Math.max(140,this.phaseDuration()*450))};
            this.host.nativeElement.setAttribute('data-scrolling','true');
          }
        }
        this.schedule?.();
      },{injector:this.injector});
      this.destroy.onDestroy(()=>ref.destroy());
    });
    effect(() => { if (this.active()) this.schedule?.(); else this.cancel(); });
    afterNextRender(() => {
      const media = matchMedia('(prefers-reduced-motion: reduce)');
      const updateMotion = () => { this.stopFollowing(); this.reduced.set(media.matches); this.schedule?.(); };
      const draw = (now: number) => {
        this.raf = 0;
        if (!this.active() || document.hidden) return;
        if (this.budget.take(now) === null) { this.raf=requestAnimationFrame(draw); return; }
        const motion=this.scrollMotion;
        if(motion) {
          const t=Math.min(1,(now-motion.started)/motion.duration);
          motion.panel.scrollTop=motion.from+(motion.to-motion.from)*scrollEase(t);
          if(t>=1) this.stopFollowing();
        }
        const el=this.map()?.nativeElement, path=this.route()?.nativeElement;
        if (!el || !path || !el.getBoundingClientRect().height) return;
        const box=el.getBoundingClientRect();
        if(this.geometryDirty) {
          const nodes=this.cards().map((card,i) => ({x:i%2 ? 48 : 24,y:card.nativeElement.getBoundingClientRect().top-box.top+35}));
          if(nodes.length!==6) return;
          this.height.set(box.height);this.points.set(nodes);
          let d=`M${nodes[0].x} ${nodes[0].y}`;
          for(let i=1;i<nodes.length;i++) {
            const a=nodes[i-1],b=nodes[i],mid=(a.y+b.y)/2;
            d+=` C${a.x} ${mid} ${b.x} ${mid} ${b.x} ${b.y}`;
          }
          path.setAttribute('d',d);this.path.set(d);
          this.routeLength=path.getTotalLength();
          this.samples=Array.from({length:65},(_,i)=>{const length=this.routeLength*i/64;return {y:path.getPointAtLength(length).y,length};});
          this.geometryDirty=false;
        }
        const length=this.routeLength;
        const panel=el.closest('.lesson');
        const panelBox=panel?.getBoundingClientRect();
        const readingY=(panel && panel.scrollHeight>panel.clientHeight && panelBox ? panelBox.top+panel.clientHeight*.55 : innerHeight*.55)-box.top;
        let lo=0,hi=this.samples.length-1;
        while(hi-lo>1){const mid=(lo+hi)>>1;if(this.samples[mid].y<readingY)lo=mid;else hi=mid;}
        const a=this.samples[lo],b=this.samples[hi];
        const ratio=Math.max(0,Math.min(1,(readingY-a.y)/Math.max(.001,b.y-a.y)));
        const value=this.reduced() ? 1 : (a.length+(b.length-a.length)*ratio)/Math.max(1,length);
        this.progress.set(value);
        const point=path.getPointAtLength(length*value);
        this.marker.set({x:point.x,y:point.y});
        if(this.scrollMotion) this.schedule?.();
      };
      this.schedule=() => { if(this.active() && !document.hidden && !this.raf) this.raf=requestAnimationFrame(draw); };
      // Window scrolling only reads geometry: this component has no training-store dependency.
      window.addEventListener('scroll',this.schedule,{passive:true,capture:true});
      window.addEventListener('resize',this.schedule,{passive:true});
      document.addEventListener('visibilitychange',this.schedule);
      media.addEventListener('change',updateMotion);
      const observer=new ResizeObserver(() => { this.geometryDirty=true;this.schedule?.(); });observer.observe(this.host.nativeElement);
      for(const card of this.cards()) observer.observe(card.nativeElement);
      const panel=this.host.nativeElement.closest('.lesson');
      panel?.addEventListener('wheel',this.stopFollowing,{passive:true});
      panel?.addEventListener('touchstart',this.stopFollowing,{passive:true});
      panel?.addEventListener('keydown',this.stopFollowing);
      updateMotion();
      this.destroy.onDestroy(() => {
        this.cancel();observer.disconnect();this.entryAnimation?.cancel();this.stopFollowing();
        panel?.removeEventListener('wheel',this.stopFollowing);
        panel?.removeEventListener('touchstart',this.stopFollowing);
        panel?.removeEventListener('keydown',this.stopFollowing);
        window.removeEventListener('scroll',this.schedule!,true);
        window.removeEventListener('resize',this.schedule!);
        document.removeEventListener('visibilitychange',this.schedule!);
        media.removeEventListener('change',updateMotion);
      });
    });
  }
  private cancel() { this.stopFollowing(); if(this.raf) cancelAnimationFrame(this.raf); this.raf=0; }
}


/** Continuous ease-out for the visual scroll only, independent of training time. */
export function scrollEase(progress:number):number {const t=Math.max(0,Math.min(1,progress));return 1-(1-t)**3;}

/** Keep visible stages still; follow only when the whole card leaves the reading area. */
export function followTarget(scrollTop:number,cardTop:number,cardHeight:number,panelHeight:number,scrollHeight:number):number|null {
  const topMargin=90,bottomMargin=24;
  if(cardTop>=topMargin && cardTop+cardHeight<=panelHeight-bottomMargin)return null;
  const anchor=Math.min(160,Math.max(topMargin,panelHeight*.22));
  return Math.max(0,Math.min(scrollHeight-panelHeight,scrollTop+cardTop-anchor));
}
