import { Component, computed, inject } from '@angular/core';
import { LabStore } from '../../state/lab-store';

@Component({
  selector: 'app-results-panel',
  templateUrl: './results-panel.html',
  styleUrl: './results-panel.css',
})
export class ResultsPanel {
  store = inject(LabStore);

  // Tính 2 đường loss (train, test) cho SVG 300x100
  chart = computed(() => {
    const h = this.store.history();
    if (h.length < 2) return null;
    const max = Math.max(...h.map((s) => Math.max(s.trainLoss, s.testLoss))) || 1;
    const line = (key: 'trainLoss' | 'testLoss') =>
      h.map((s) => `${((s.iteration - h[0].iteration) / Math.max(1, h.at(-1)!.iteration - h[0].iteration)) * 300},${100 - (s[key] / max) * 100}`).join(' ');
    return { train: line('trainLoss'), test: line('testLoss') };
  });
}
