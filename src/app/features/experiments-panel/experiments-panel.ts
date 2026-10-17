import { Component, computed, inject, signal } from '@angular/core';
import { ALGORITHM_LABELS, SavedExperiment } from '../../core/models/experiment';
import { ExperimentsStore } from '../../state/experiments-store';
import { LabStore } from '../../state/lab-store';

const MAX_COMPARE = 4;

interface Cell { text: string; best: boolean; }
interface Row { label: string; cells: Cell[]; }

@Component({
  selector: 'app-experiments-panel',
  templateUrl: './experiments-panel.html',
  styleUrl: './experiments-panel.css',
})
export class ExperimentsPanel {
  exp = inject(ExperimentsStore);
  lab = inject(LabStore);
  labels = ALGORITHM_LABELS;

  name = signal('');
  selected = signal<string[]>([]);
  note = signal<string | null>(null);

  compared = computed(() => {
    const ids = this.selected();
    return this.exp.list().filter((e) => ids.includes(e.id));
  });

  rows = computed<Row[]>(() => {
    const c = this.compared();
    if (c.length < 2) return [];
    const bestMse = Math.min(...c.map((e) => e.test.mse));
    const bestR2 = Math.max(...c.map((e) => e.test.r2));
    const plain = (label: string, f: (e: SavedExperiment) => string): Row => ({
      label, cells: c.map((e) => ({ text: f(e), best: false })),
    });
    return [
      plain('Thuật toán', (e) => this.labels[e.algorithm]),
      plain('Learning rate', (e) => String(e.learningRate)),
      plain('Iterations', (e) => String(e.iterations)),
      plain('Dữ liệu', (e) => (e.dataSource === 'csv' ? (e.csvName ?? 'CSV') : `seed ${e.seed}`)),
      plain('Train MSE', (e) => this.fmt(e.train.mse)),
      { label: 'Test MSE', cells: c.map((e) => ({ text: this.fmt(e.test.mse), best: e.test.mse === bestMse })) },
      plain('Test RMSE', (e) => this.fmt(e.test.rmse)),
      plain('Test MAE', (e) => this.fmt(e.test.mae)),
      { label: 'Test R²', cells: c.map((e) => ({ text: this.fmt(e.test.r2), best: e.test.r2 === bestR2 })) },
    ];
  });

  onName(e: Event) {
    this.name.set((e.target as HTMLInputElement).value);
  }

  save() {
    const saved = this.exp.save(this.name());
    if (!saved) {
      this.note.set('Hãy chạy ít nhất một bước huấn luyện trước khi lưu.');
      return;
    }
    this.name.set('');
    this.note.set(`Đã lưu “${saved.name}”.`);
  }

  apply(e: SavedExperiment) {
    this.lab.applyConfig(e);
    this.note.set(
      e.dataSource === 'csv'
        ? 'Dữ liệu CSV không được lưu kèm: chỉ áp dụng thuật toán và tham số lên dữ liệu hiện tại.'
        : `Đã áp dụng cấu hình “${e.name}”. Bấm Play để chạy lại.`,
    );
  }

  toggle(id: string, e: Event) {
    const on = (e.target as HTMLInputElement).checked;
    if (on && this.compared().length >= MAX_COMPARE) {
      (e.target as HTMLInputElement).checked = false;
      this.note.set(`Chỉ so sánh tối đa ${MAX_COMPARE} lần chạy cùng lúc.`);
      return;
    }
    this.selected.update((s) => (on ? [...s, id] : s.filter((x) => x !== id)));
  }

  isSelected(id: string) {
    return this.selected().includes(id);
  }

  remove(id: string) {
    this.exp.remove(id);
    this.selected.update((s) => s.filter((x) => x !== id));
  }

  meta(e: SavedExperiment) {
    return `${this.labels[e.algorithm]} · lr ${e.learningRate} · ${e.iterations}/${e.maxIterations} it`;
  }

  when(e: SavedExperiment) {
    return new Date(e.createdAt).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });
  }

  fmt(n: number) {
    if (!Number.isFinite(n)) return '—';
    return Math.abs(n) >= 1000 ? n.toExponential(2) : n.toFixed(3);
  }
}