import { Component, computed, inject } from '@angular/core';
import { LabStore } from '../../state/lab-store';
import { polynomialFeatures, polynomialPowers } from '../../core/engine/polynomial';
import { predict } from '../../core/engine/metrics';

@Component({ selector: 'app-learning-walkthrough', templateUrl: './learning-walkthrough.html', styleUrl: './learning-walkthrough.css' })
export class LearningWalkthrough {
  lab = inject(LabStore);
  phases = ['A · Đầu vào', 'B · Dự đoán', 'C · Sai số', 'D · Loss', 'E · Hệ số', 'F · Đánh giá'];
  readonly previews = [
    'Xem đặc trưng và giá trị mục tiêu của mẫu train đang theo dõi.',
    'Kết hợp đặc trưng với trọng số để tạo giá trị dự đoán.',
    'So sánh dự đoán với giá trị thật trên mô hình 3D.',
    'Tổng hợp sai số trên tập train và phần phạt nếu có.',
    'Quan sát gradient và cách tính trọng số mới.',
    'Áp dụng một lần cập nhật, rồi so sánh kết quả train/test.',
  ];
  explanations = [
    'Mỗi bước dùng toàn bộ tập train. Mẫu đang chọn chỉ giúp bạn theo dõi một phép tính; mô hình không học riêng từ mẫu này.',
    'Nhân từng đặc trưng với trọng số tương ứng, rồi cộng intercept b để có dự đoán. Tất cả hệ số dưới đây thuộc mô hình trước cập nhật.',
    'Residual = dự đoán − giá trị thật. Số âm nghĩa là dự đoán thấp hơn thực tế; số dương nghĩa là cao hơn. Điểm dữ liệu thật luôn đứng yên.',
    'Bình phương sai số của từng mẫu, cộng trên toàn bộ tập train và chia cho số mẫu. Tập test chỉ đánh giá, không tham gia gradient.',
    'Gradient tổng hợp đóng góp của tất cả mẫu train. Bảng cho thấy thay đổi đã tính, nhưng bề mặt vẫn giữ mô hình cũ cho đến pha F.',
    'Hệ số mới đã được áp dụng đúng một lần. Trọng số đổi độ nghiêng hoặc độ cong; intercept b dịch bề mặt theo chiều y. Dữ liệu thật không đổi.',
  ];
  labels = computed(() => this.lab.provenance()?.labels ?? this.lab.selectedX().map((_, j) => `x${j + 1}`));
  features = computed(() => {
    const row = this.lab.selectedX();
    return this.lab.algorithm() === 'polynomial' ? polynomialFeatures([row], this.lab.degree())[0] ?? [] : row;
  });
  terms = computed(() => this.lab.algorithm() === 'polynomial'
    ? polynomialPowers(this.lab.dataFeatures(), this.lab.degree()).map(p => p.flatMap((v, j) => v ? [`${this.labels()[j]}${v > 1 ? '^' + v : ''}`] : []).join(' × '))
    : this.labels());
  selected = computed(() => {
    const s = this.lab.snapshot(); if (!s) return null;
    const before = predict([this.features()], s.before.w, s.before.b)[0];
    const after = predict([this.features()], s.after.w, s.after.b)[0];
    const y = this.lab.selectedY(), residual = before - y;
    return { before, after, y, residual, squared: residual ** 2, contribution: residual ** 2 / s.trainCount };
  });
  substitution = computed(() => {
    const s = this.lab.snapshot();
    if (!s) return '';
    return `${this.fmt(s.before.b)} + [${this.features().map((x, j) => `(${this.fmt(s.before.w[j])} × ${this.fmt(x)})`).join(' + ')}] ≈ ${this.fmt(this.selected()?.before)}`;
  });
  inputs = computed(() => {
    const p = this.lab.provenance(), source = this.lab.selectedSource();
    return [...this.lab.selectedX(), this.lab.selectedY()].map((value, j) => ({
      label: this.labels()[j] ?? (p?.target ?? 'y'), value,
      original: source?.original[j] ?? this.fmt(value), filled: source?.filled[j] ?? value,
      stats: p?.stats[j],
    }));
  });
  sampleRows = computed(() => {
    const start = Math.max(0, Math.min(this.lab.selectedSample() - 2, this.lab.trainX().length - 5));
    return this.lab.trainX().slice(start, start + 5).map((x, i) => ({ index: start + i, x, y: this.lab.trainY()[start + i] }));
  });
  parameters = computed(() => {
    const s = this.lab.snapshot(); if (!s) return [];
    return [...s.before.w, s.before.b].map((old, j) => {
      const bias = j === s.before.w.length;
      const next = bias ? s.after.b : s.after.w[j];
      return { name: bias ? 'b · intercept' : `w${j + 1} · ${this.terms()[j]}`, old, next, delta: next - old,
        gradient: bias ? s.biasGradient : s.gradient[j], intermediate: bias ? next : s.intermediate?.[j] };
    });
  });
  objective = computed(() => this.lab.algorithm() === 'lasso'
    ? 'J = MSE + λ × tổng trị tuyệt đối các trọng số; không phạt intercept.'
    : this.lab.algorithm() === 'ridge' ? 'J = MSE + λ × tổng bình phương các trọng số; không phạt intercept.' : 'J = MSE; không có phần phạt.');
  fmt(value: number | undefined) {
    if (value === undefined || !Number.isFinite(value)) return '—';
    return value !== 0 && (Math.abs(value) < 1e-5 || Math.abs(value) >= 1e6) ? value.toExponential(6) : value.toFixed(6);
  }
  signed(value: number) { return `${value > 0 ? '+' : ''}${this.fmt(value)}`; }
  number(event: Event) { return +(event.target as HTMLInputElement).value; }
  normalizeSample(event: Event) {
    const input = event.target as HTMLInputElement;
    this.lab.selectSample(+input.value - 1);
    input.value = String(this.lab.selectedSample() + 1);
  }
  direction(gradient: number) {
    return gradient === 0 ? 'Gradient bằng 0: không đổi ở bước gradient.' : gradient < 0 ? 'Gradient âm → bước gradient làm tăng tham số.' : 'Gradient dương → bước gradient làm giảm tham số.';
  }
}
