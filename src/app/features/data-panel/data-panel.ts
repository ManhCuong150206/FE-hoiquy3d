import { Component, inject } from '@angular/core';
import { SyntheticKind } from '../../core/models/experiment';
import { LabStore } from '../../state/lab-store';
import { CsvImport } from '../csv-import/csv-import';

@Component({
  selector: 'app-data-panel',
  imports: [CsvImport],
  templateUrl: './data-panel.html',
  styleUrl: './data-panel.css',
})
export class DataPanel {
  store = inject(LabStore);
  readonly scenarios: {id: SyntheticKind; label: string}[] = [
    {id:'linear',label:'Tuyến tính có nhiễu'}, {id:'curved',label:'Bề mặt cong — minh họa Polynomial'},
    {id:'correlated',label:'Biến tương quan — minh họa Ridge'}, {id:'sparse',label:'Biến không liên quan — minh họa Lasso'},
  ];
  chooseScenario(event: Event) {
    const kind = (event.target as HTMLSelectElement).value;
    if (this.scenarios.some(s => s.id === kind)) {
      this.store.syntheticKind.set(kind as SyntheticKind);
    }
  }
  num(e: Event) { return +(e.target as HTMLInputElement).value; }
  shuffleSeed() { this.store.seed.set(Math.floor(Math.random() * 1_000_000)); }
}