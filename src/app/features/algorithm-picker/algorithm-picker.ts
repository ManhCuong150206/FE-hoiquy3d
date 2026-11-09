import { ThemeStore } from '../../state/theme-store';
import { AlgorithmFlight } from '../../presentation/algorithm-flight';
import { Component, effect, input, output, signal, ElementRef, inject, viewChild, DestroyRef, Injector, afterNextRender } from '@angular/core';
import { Algorithm, ALGORITHM_LABELS } from '../../core/models/experiment';
import { AlgorithmSphere } from '../algorithm-sphere/algorithm-sphere';
import { AuthSession } from '../../state/auth-session';

@Component({ selector: 'app-algorithm-picker', host: {'[attr.data-algorithm]':'highlighted()'}, imports: [AlgorithmSphere], templateUrl: './algorithm-picker.html', styleUrl: './algorithm-picker.css' })
export class AlgorithmPicker {
  readonly auth = inject(AuthSession);
  readonly themeStore = inject(ThemeStore);
  private readonly host=inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly sphere=viewChild<AlgorithmSphere>('sphere');
  private readonly flight=new AlgorithmFlight();
  readonly hovering=signal(false);
  readonly flying=signal(false);
  private readonly injector=inject(Injector);
  readonly planetScreen=input('welcome');
  readonly active = input<Algorithm>('linear');
  readonly departing = input(false);
  readonly lowEffects = input(false);
  readonly highlighted = signal<Algorithm>('linear');
  readonly selected = output<Algorithm>();
  readonly loginRequested = output<void>();
  readonly back = output<void>();
  readonly labels = ALGORITHM_LABELS;
  readonly algorithms: {id: Algorithm; number: string; label: string; summary: string; details: string[]}[] = [
    {id:'linear',number:'01',label:'Linear',summary:'Tìm đường thẳng phù hợp nhất với dữ liệu.',details:['Model · y = wx + b','Tuyến tính','Loss · MSE']},
    {id:'polynomial',number:'02',label:'Polynomial',summary:'Mô hình hóa các mối quan hệ phi tuyến trong dữ liệu.',details:['Model · y = a₀ + a₁x + a₂x² + …','Đặc trưng phi tuyến','Loss · MSE']},
    {id:'ridge',number:'03',label:'Ridge',summary:'Giảm overfitting thông qua điều chuẩn L2.',details:['Regularization · L2','Giữ mọi hệ số, hạn chế độ lớn','Alpha · α']},
    {id:'lasso',number:'04',label:'Lasso',summary:'Điều chuẩn L1 và lựa chọn đặc trưng.',details:['Regularization · L1','Có thể đưa hệ số về 0','Alpha · α']},
  ];
  preview(algorithm:Algorithm|null){if(this.flying())return;this.hovering.set(algorithm!==null);this.highlighted.set(algorithm??this.active());}
  async animate(algorithm:Algorithm,back=false):Promise<boolean>{
    this.highlighted.set(algorithm);
    if(typeof matchMedia==='undefined'||this.lowEffects()||matchMedia('(prefers-reduced-motion: reduce)').matches){this.flight.restore();this.sphere()?.restoreJourney();return false;}
    this.flying.set(true);
    try{return await this.flight.run(this.host,this.sphere(),algorithm,back);}finally{this.flying.set(false);}
  }
  prepareReturn(algorithm:Algorithm){
    if(this.lowEffects()||typeof matchMedia==='undefined'||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
    const sphere=this.sphere();if(sphere?.beginJourney(algorithm,true)&&sphere.beginCinema(true))document.querySelector<HTMLElement>('.planet-cinema')!.style.opacity='0';
  }
  restoreFlight(){this.flight.restore();this.sphere()?.restoreJourney();}
  constructor() {
    inject(DestroyRef).onDestroy(()=>this.flight.restore());effect(()=>this.highlighted.set(this.active()));
    effect(()=>{
      const sphere=this.sphere(),screen=this.planetScreen();
      if(sphere&&(screen==='welcome'||screen==='algorithms'))afterNextRender(()=>{
        const slot=document.getElementById(screen==='welcome'?'welcome-planet-slot':'algorithm-planet-slot');
        if(slot)sphere.dockAt(slot);
      },{injector:this.injector});
    });
  }
}
