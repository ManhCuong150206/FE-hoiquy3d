import { Component, computed, effect, inject, signal, afterRenderEffect, ElementRef, viewChild } from '@angular/core';
import { LabStore } from '@app/core';
import { ALGORITHM_LABELS } from '@app/core';

@Component({ selector: 'app-experiment-workflow', templateUrl: './experiment-workflow.html', styleUrl: './experiment-workflow.css' })
export class ExperimentWorkflow {
  lab = inject(LabStore);
  labels = ALGORITHM_LABELS;
  guided = signal(false);
  private guideContent = viewChild<ElementRef<HTMLElement>>('guideContent');
  stage = signal(0);
  steps = ['Dữ liệu', 'Cấu hình & câu hỏi', 'Huấn luyện', 'Đánh giá', 'So sánh & thử tiếp'];
  shortSteps = ['Dữ liệu', 'Cấu hình', 'Chạy', 'Đánh giá', 'So sánh'];
  total = computed(() => this.lab.trainY().length + this.lab.validationY().length + this.lab.testY().length);
  target = computed(() => this.lab.provenance()?.target ?? 'y · giá trị cần dự đoán');
  firstRun = computed(() => !this.lab.trials().some(r => r.dataset === this.lab.datasetRevision()));
  reference = computed(() => this.lab.trials().find(r => r.id === this.lab.baselineId() && r.dataset === this.lab.datasetRevision()) ?? null);
  questions = computed(() => [
    'Giảm tốc độ học có giúp sai số ổn định hơn không?',
    'Tăng số vòng tối đa có giúp giảm sai số validation không?',
    ...(this.lab.algorithm() === 'polynomial' ? ['Tăng bậc đa thức có giúp dự đoán tốt hơn trên validation không?'] : []),
    ...(['ridge', 'lasso'].includes(this.lab.algorithm()) ? ['Tăng λ có giúp giảm sai số validation không?'] : []),
  ]);
  canRecord = computed(() => this.lab.iteration() > 0 && this.lab.status() !== 'running' && !this.lab.busy() && !this.lab.auto());
  constructor() {
    afterRenderEffect(() => {
      this.stage(); this.guided();
      const content = this.guideContent()?.nativeElement;
      if (content) content.scrollTop = 0;
    });
    effect(() => {
      if (this.lab.status() === 'running') this.stage.set(2);
      if (this.lab.status() === 'done' || this.lab.status() === 'error') this.stage.set(3);
    });
  }
  text(event: Event) { return (event.target as HTMLTextAreaElement).value.slice(0, 600); }
  openStage(index: number) { this.stage.set(index); this.guided.set(true); }
  run() { this.lab.play(); this.stage.set(2); this.guided.set(false); }
  fmt(n: number | undefined) { return n === undefined || !Number.isFinite(n) ? 'Không xác định' : n.toPrecision(4); }
  record() { if (this.lab.recordTrial()) this.stage.set(4); }
  retry() { this.lab.recordTrial(); this.lab.reset(); this.lab.hypothesis.set(''); this.lab.conclusion.set(''); this.stage.set(1); }
  settings(tab: 'model' | 'data') {
    document.getElementById('lab-tab-' + tab)?.click();
    document.getElementById('lab-setup-title')?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
  }
  exportTrials() {
    const blob = new Blob([JSON.stringify({ note: 'Thời gian worker trên thiết bị hiện tại, không phải benchmark.', trials: this.lab.trials() }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = 'nhat-ky-thu-nghiem-hoi-quy.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
