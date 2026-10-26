import { Component, computed, inject } from '@angular/core';
import { Algorithm } from '../../core/models/experiment';
import { LabStore } from '../../state/lab-store';

interface Note {
  title: string;
  model: string;
  loss: string;
  text: string;
  tip: string;
}

const NOTES: Record<Algorithm, Note> = {
  linear: {
    title: 'Hồi quy tuyến tính',
    model: 'ŷ = b + w₁x₁ + w₂x₂ + …',
    loss: 'L = (1/n) · Σ (yᵢ − ŷᵢ)²',
    text: 'Tìm mặt phẳng (siêu phẳng) sao cho tổng bình phương sai số giữa giá trị thật và giá trị dự đoán nhỏ nhất. Gradient descent cập nhật w và b ngược hướng đạo hàm: w ← w − α · ∂L/∂w.',
    tip: 'Nếu loss tăng dần hoặc thành NaN, learning rate α đang quá lớn. Dữ liệu có thang đo chênh lệch nhiều thì nên chuẩn hoá trước.',
  },
  polynomial: {
    title: 'Hồi quy đa thức',
    model: 'ŷ = b + w₁x + w₂x² + … + w_d·x^d',
    loss: 'L = (1/n) · Σ (yᵢ − ŷᵢ)²',
    text: 'Vẫn là hồi quy tuyến tính, nhưng trên các đặc trưng được mở rộng thành luỹ thừa của x. Nhờ vậy mô hình uốn cong được theo dữ liệu phi tuyến.',
    tip: 'Bậc d càng cao càng dễ khớp thừa (overfit): train loss rất thấp nhưng test loss tăng. Luỹ thừa cao cũng làm thang đo các đặc trưng chênh nhau rất lớn, nên cần learning rate nhỏ.',
  },
  ridge: {
    title: 'Hồi quy Ridge (L2)',
    model: 'ŷ = b + w₁x₁ + w₂x₂ + …',
    loss: 'L = MSE + λ · Σ wⱼ²',
    text: 'Thêm phạt bình phương trọng số vào hàm mất mát. Các trọng số bị kéo nhỏ lại nhưng hiếm khi bằng đúng 0, giúp mô hình ổn định khi các đặc trưng tương quan mạnh với nhau.',
    tip: 'λ = 0 quay về hồi quy tuyến tính thường. λ càng lớn mô hình càng đơn giản, nhưng quá lớn sẽ khớp thiếu (underfit). Bias b thường không bị phạt.',
  },
  lasso: {
    title: 'Hồi quy Lasso (L1)',
    model: 'ŷ = b + w₁x₁ + w₂x₂ + …',
    loss: 'J = MSE + λ × tổng trị tuyệt đối các trọng số; không phạt intercept.',
    text: 'Engine dùng ISTA: bước gradient của MSE tạo u = w − αg, rồi soft-thresholding co u về 0 với ngưỡng αλ. Giá trị trong ngưỡng trở thành đúng 0, giúp chọn đặc trưng.',
    tip: 'Intercept b chỉ cập nhật bằng gradient MSE, không bị phạt. λ = 0 trở về bước gradient thông thường. Biểu đồ hiện MSE; panel học hiển thị riêng phần phạt và mục tiêu J.',
  },
};

@Component({
  selector: 'app-algorithm-notes',
  templateUrl: './algorithm-notes.html',
  styleUrl: './algorithm-notes.css',
})
export class AlgorithmNotes {
  store = inject(LabStore);

  note = computed(() => NOTES[this.store.algorithm()]);

  // Nhận xét nhanh dựa trên kết quả hiện tại
  hint = computed<{ kind: 'warn' | 'info'; text: string } | null>(() => {
    const s = this.store.latest();
    const m = this.store.metrics();
    if (!s || !m) return null;

    if (!Number.isFinite(s.trainLoss) || !Number.isFinite(s.testLoss)) {
      return { kind: 'warn', text: 'Loss đã phân kỳ (NaN hoặc vô cùng). Hãy giảm learning rate rồi bấm Reset.' };
    }
    if (s.iteration < 20) return null; // những bước đầu chưa nói lên điều gì

    if (m.test.r2 < 0) {
      return {
        kind: 'warn',
        text: 'R² trên tập test đang âm: mô hình dự đoán tệ hơn việc luôn đoán giá trị trung bình. Hãy chạy thêm vòng lặp, hoặc thử learning rate lớn hơn nếu loss giảm quá chậm.',
      };
    }
    if (s.trainLoss > 0 && s.testLoss > 1.5 * s.trainLoss) {
      return {
        kind: 'warn',
        text: 'Test loss cao hơn train loss khá nhiều — dấu hiệu khớp thừa (overfit). Thử thêm dữ liệu, giảm bậc/độ phức tạp, hoặc dùng Ridge/Lasso.',
      };
    }
    return { kind: 'info', text: 'Train loss và test loss khá gần nhau: mô hình đang tổng quát hoá tốt trên dữ liệu này.' };
  });
}
