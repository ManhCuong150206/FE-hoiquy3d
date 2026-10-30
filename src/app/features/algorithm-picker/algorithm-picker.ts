import { Component, effect, input, output, signal } from '@angular/core';
import { Algorithm, ALGORITHM_LABELS } from '../../core/models/experiment';
import { AlgorithmSphere } from '../algorithm-sphere/algorithm-sphere';

@Component({ selector: 'app-algorithm-picker', imports: [AlgorithmSphere], templateUrl: './algorithm-picker.html', styleUrl: './algorithm-picker.css' })
export class AlgorithmPicker {
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
  constructor() { effect(() => this.highlighted.set(this.active())); }
}
