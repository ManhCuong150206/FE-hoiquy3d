import { AlgorithmFlight } from '../../presentation/algorithm-flight';
import { Component, effect, input, output, signal, ElementRef, inject, viewChild, DestroyRef } from '@angular/core';
import { Algorithm, ALGORITHM_LABELS } from '../../core/models/experiment';
import { AlgorithmSphere } from '../algorithm-sphere/algorithm-sphere';

@Component({ selector: 'app-algorithm-picker', host: {'[attr.data-algorithm]':'highlighted()'}, imports: [AlgorithmSphere], templateUrl: './algorithm-picker.html', styleUrl: './algorithm-picker.css' })
export class AlgorithmPicker {
  private readonly host=inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly sphere=viewChild<AlgorithmSphere>('sphere');
  private readonly flight=new AlgorithmFlight();
  readonly hovering=signal(false);
  readonly flying=signal(false);
  readonly active = input<Algorithm>('linear');
  readonly departing = input(false);
  readonly lowEffects = input(false);
  readonly highlighted = signal<Algorithm>('linear');
  readonly selected = output<Algorithm>();
  readonly back = output<void>();
  readonly labels = ALGORITHM_LABELS;
  readonly algorithms: {id: Algorithm; number: string; label: string; summary: string}[] = [
    {id:'linear',number:'01',label:'Linear',summary:'Tìm đường đi qua dữ liệu.'},
    {id:'polynomial',number:'02',label:'Polynomial',summary:'Khám phá những đường cong.'},
    {id:'ridge',number:'03',label:'Ridge',summary:'Cân bằng bằng điều chuẩn L2.'},
    {id:'lasso',number:'04',label:'Lasso',summary:'Chọn điều quan trọng với L1.'},
  ];
  preview(algorithm:Algorithm|null){if(this.flying())return;this.hovering.set(algorithm!==null);this.highlighted.set(algorithm??this.active());}
  async animate(algorithm:Algorithm,back=false):Promise<boolean>{
    this.highlighted.set(algorithm);
    if(typeof matchMedia==='undefined'||this.lowEffects()||matchMedia('(prefers-reduced-motion: reduce)').matches){this.flight.restore();this.sphere()?.restoreJourney();return false;}
    this.flying.set(true);
    try{return await this.flight.run(this.host,this.sphere(),algorithm,back);}finally{this.flying.set(false);}
  }
  restoreFlight(){this.flight.restore();this.sphere()?.restoreJourney();}
  constructor() { inject(DestroyRef).onDestroy(()=>this.flight.restore()); effect(() => this.highlighted.set(this.active())); }
}
