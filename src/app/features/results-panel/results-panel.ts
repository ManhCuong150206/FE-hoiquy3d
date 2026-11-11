import { Component, computed, inject } from '@angular/core';
import { polynomialTermNames } from '../../core/engine/polynomial';
import { LabStore } from '../../state/lab-store';

@Component({
  selector: 'app-results-panel',
  templateUrl: './results-panel.html',
  styleUrl: './results-panel.css',
})
export class ResultsPanel {
  store = inject(LabStore);
  finite = Number.isFinite;
  formatMetric(value: number) { return Number.isFinite(value) ? value.toFixed(3) : 'Không xác định'; }

  readonly coefficients = computed(() => {
    const w = this.store.latest()?.w ?? [];
    const terms = this.store.algorithm() === 'polynomial'
      ? polynomialTermNames(this.store.dataFeatures(), this.store.degree())
      : Array.from({length:w.length}, (_, j) => this.store.provenance()?.labels[j] ?? `x${j+1}`);
    const max = Math.max(1e-12, ...w.map(Math.abs));
    return w.map((value, j) => ({name: terms[j], value, width: Math.abs(value)/max*100, zero: value === 0}));
  });
  // Tính 2 đường loss (train, test) cho SVG 300x100
  chart = computed(() => {
    const h = this.store.history();
    if (h.length < 2) return null;
    const max = Math.max(...h.map((s) => Math.max(s.trainLoss, s.testLoss))) || 1;
    const line = (key: 'trainLoss' | 'testLoss') =>
      h.map((s) => `${((s.iteration - h[0].iteration) / Math.max(1, h.at(-1)!.iteration - h[0].iteration)) * 300},${100 - (s[key] / max) * 100}`).join(' ');
    return { train: line('trainLoss'), test: line('testLoss'), max, first: h[0].iteration, last: h.at(-1)!.iteration };
  });
}
