import { Component, inject } from '@angular/core';
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
  num(e: Event) { return +(e.target as HTMLInputElement).value; }
  shuffleSeed() { this.store.seed.set(Math.floor(Math.random() * 1_000_000)); }
}