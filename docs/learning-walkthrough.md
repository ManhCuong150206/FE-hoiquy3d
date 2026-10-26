# Học từng bước

## Cách thử

Chạy `npm start -- --host 127.0.0.1 --port 4300`, mở http://127.0.0.1:4300.
Chọn chế độ **Học từng bước**, bấm **Bắt đầu bước học** hoặc **Phát các pha**.
Thời lượng mặc định 1 giây/pha, chỉnh được 0.5/1/2/3/5 giây. Chuyển thủ công sẽ tạm dừng tự phát.
Thu gọn panel cũng dừng tự phát. Reset bắt đầu lại; đổi thuật toán/tham số hoặc sinh dữ liệu mới hủy snapshot cũ.
Đổi chế độ đợi worker dừng ở iteration đã hoàn thành và bỏ ứng viên chưa áp dụng.

## Sáu pha và tính nhất quán

- A — dữ liệu gốc, sau xử lý thiếu, giá trị đưa vào mô hình; chỉ rõ toàn bộ train tham gia học.
- B — phép nhân trọng số với đặc trưng và intercept; Polynomial hiển thị đúng lũy thừa/tích chéo của engine.
- C — dự đoán, y thật, residual = dự đoán − y; cầu viền/khối vuông/đoạn nối tương ứng trong 3D.
- D — bình phương residual, đóng góp của mẫu, MSE toàn train, phần phạt và mục tiêu J; test chỉ đánh giá.
- E — gradient, hệ số cũ, mức thay đổi, hệ số mới. Lasso hiển thị thêm u và ngưỡng soft-threshold.
- F — áp dụng đúng một lần, so sánh trước/sau. Loss, tham số, chart và bề mặt cùng iteration đã áp dụng.

`TrainingSession.prepare()` tạo một snapshot trước/sau cùng gradient lấy từ chính hàm cập nhật hiện tại, chưa đổi model. `commit(iteration)` chỉ chấp nhận ứng viên đang chờ và chống áp dụng lặp. `LabStore.latest()` là nguồn mô hình đã áp dụng cho metric và 3D; A–E vẫn dùng mô hình cũ. Thời lượng pha chỉ điều khiển trình diễn, không đổi learning rate. Mẫu đang chọn chỉ giải thích một phép tính, không biến batch gradient descent thành SGD.

Điểm dữ liệu không di chuyển. Với hơn hai đặc trưng, bề mặt là lát cắt qua các giá trị còn lại của mẫu đang chọn trong chế độ học, hoặc qua 0 trong chế độ thường. Các điểm khác là hình chiếu; không nhất thiết nằm trên lát cắt này. Tất cả tọa độ cùng hệ số co hiển thị; co 3D không phải chuẩn hóa dữ liệu học.

## Vấn đề CSV ghi nhận riêng — chưa sửa cách tính

Hiện tại `buildDataset()` xử lý thiếu và tính thống kê z-score **trên toàn bộ dữ liệu trước khi chia train/test**; cả X và y đều được chuẩn hóa nếu bật tùy chọn. Điều này có thể đưa thông tin test vào tiền xử lý, làm đánh giá lạc quan. Đợt này chỉ lưu provenance để giải thích đúng dữ liệu thực tế; không đổi phép tính, thứ tự mẫu hay cách chia.

Đợt riêng cần chia trước, fit imputer/scaler chỉ bằng train, rồi transform train/test bằng cùng thống kê; bổ sung kiểm thử chống rò rỉ và quyết định hiển thị metric theo đơn vị gốc hay chuẩn hóa. Số nguồn CSV hiện theo bản ghi logic (tính cả header), không phải vị trí dòng vật lý nếu CSV có dòng trống hoặc ô chứa xuống dòng.

## Kiểm tra

- `npm run build` — production gồm prerender.
- `npm test -- --watch=false` — engine, dữ liệu/3D và state machine cùng các smoke test hiện có.
- Engine kiểm tra bốn thuật toán qua 100 cập nhật, khớp chính xác giữa chạy thường và prepare/commit, gradient, MSE, penalty, intercept, commit lặp/sai, discard và phân kỳ.
- Store kiểm tra timer, pause/resume, thu gọn, đổi mẫu, Reset/Stop, đổi chế độ/thuật toán và lượt cuối; phản hồi worker cũ bị bỏ.
- Dữ liệu kiểm tra nguồn CSV sau lọc/chia, z-score và thứ tự đặc trưng Polynomial; công thức lát cắt 3D cùng dự đoán mẫu.

Test DOM dùng môi trường jsdom không có WebGL; kiểm tra ảnh 3D thực hiện riêng trong trình duyệt.
Để chạy SSR production cục bộ bằng PowerShell: `$env:NG_ALLOWED_HOSTS='localhost,127.0.0.1'` rồi `node dist/Hoiquy3d/server/server.mjs`, mở http://localhost:4000. Khi triển khai cần cấu hình hostname thật thay vì wildcard.
