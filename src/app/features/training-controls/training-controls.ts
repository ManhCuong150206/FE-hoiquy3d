import { Component, inject } from '@angular/core';
import { LabStore } from '../../state/lab-store';

@Component({
  selector: 'app-training-controls',
  templateUrl: './training-controls.html',
  styleUrl: './training-controls.css',
})
export class TrainingControls {
  store = inject(LabStore);
  lrOptions = [0.0001, 0.001, 0.003, 0.01, 0.03, 0.1, 0.3, 1];
  iterOptions = [100, 500, 1000, 5000];
  speedOptions = [0.25, 0.5, 1, 2, 5];
  degreeOptions = [1, 2, 3, 4, 5];
  lambdaOptions = [0, 0.001, 0.01, 0.1, 1, 10];

  toggle() {
    if (this.store.status() === 'running') this.store.pause();
    else this.store.play();
  }
}