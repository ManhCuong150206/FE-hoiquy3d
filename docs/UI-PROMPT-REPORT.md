# Prompt chỉnh giao diện và cách trình bày trong báo cáo

Ngày biên tập: 31/10/2026. Phạm vi: đợt chỉnh frontend Hồi quy 3D, không thay thế yêu cầu của toàn bộ dự án backend/database/triển khai.

## 1. Cách sử dụng tài liệu này

Phần prompt bên dưới được **biên soạn lại từ các yêu cầu và lựa chọn đã chốt trong hội thoại**, theo văn phong tự nhiên và dạng yêu cầu trực tiếp. Có thể dùng để giải thích cách đặt prompt hoặc làm một prompt tổng hợp cho lần làm việc tiếp theo.

Đây không phải bản chép nguyên văn một tin nhắn đã gửi. Khi đưa vào báo cáo, hãy ghi “Prompt tổng hợp sau các vòng trao đổi” hoặc “Nội dung yêu cầu đã được chuẩn hóa”. Nếu giảng viên cần lịch sử nguyên gốc, hãy trích tin nhắn/ảnh hội thoại tương ứng, không dùng bản biên tập này thay cho nhật ký gốc.

Yêu cầu chi tiết nằm tại [UI-REDESIGN-SPEC.md](UI-REDESIGN-SPEC.md). Kết quả chạy thực tế nằm tại [UI-REDESIGN-VERIFICATION.md](UI-REDESIGN-VERIFICATION.md).

## 2. Prompt tổng hợp để trích hoặc sử dụng lại

```text
Bạn hãy đóng vai một lập trình viên frontend có kinh nghiệm với Angular, TypeScript và Three.js. Hãy đọc lại cấu trúc dự án Hồi quy 3D của nhóm tôi trước khi chỉnh sửa.

Tôi muốn làm mới giao diện trên web hiện có. Chỉ thay đổi phần trình bày và điều hướng; giữ nguyên thuật toán hồi quy, xử lý dữ liệu, Web Worker, metric, lưu offline và API. Không tự viết lại engine hoặc sửa database để phục vụ hiệu ứng.

Hãy tổ chức web thành bốn trang: đăng nhập/Guest, chọn thuật toán, thực nghiệm, và học từng bước kèm ghi chú. Mỗi lần chỉ hiện một trang. Chuyển trang bằng nút hoặc chọn trên cầu, không dùng cuộn chuột để chuyển trang. Cuộn chỉ đọc nội dung hoặc zoom trong vùng 3D như chức năng sẵn có.

Ở trang đăng nhập, hãy giữ email, mật khẩu, đăng ký và Guest. Đây mới là giao diện demo, chưa kết nối xác thực thật. Bỏ nút Khám phá thuật toán ở phần giới thiệu vì trùng với Guest. Khi form hợp lệ hoặc người dùng chọn Guest, hãy chuyển cảnh sang trang chọn thuật toán; không gửi hoặc lưu thông tin đăng nhập.

Ở trang chọn thuật toán, hãy dùng một quả cầu đặc có bốn vùng màu cho Linear, Polynomial, Ridge và Lasso. Ngay lúc đầu phải thấy đủ bốn màu. Cho phép kéo xoay, rê vào vùng nào thì vùng đó sáng neon và bấm để chọn. Hãy phân biệt kéo với bấm để không chọn nhầm. Giữ các thẻ lựa chọn để có thể dùng bàn phím. Đổi nút footer thành Đăng xuất để quay về đăng nhập demo, xóa nội dung form và tạm dừng phiên đang chạy; không xóa thí nghiệm đã lưu.

Ở trang thực nghiệm, hãy giữ cấu trúc và các chức năng đã có. Trên màn hình rộng, đưa các nhóm chế độ, nút chạy, iteration và tham số về cùng một hàng, không để nhóm tham số rơi xuống làm trống một vùng lớn. Trên màn hình nhỏ, sắp xếp lại hợp lý và không tràn ngang.

Ô thuật toán chỉ hiển thị thuật toán đã chọn. Chỉ giữ nút Đổi thuật toán ở header trang 3; bỏ nút đổi ở footer và bên dưới ô thuật toán. Nếu đổi thuật toán làm đặt lại tiến trình, hãy giữ xác nhận trước khi áp dụng.

Hãy tách phần học từng bước và ghi chú thành trang thứ tư, có mô hình 3D đi kèm. Dùng chung dữ liệu và trạng thái với trang thực nghiệm. Trên desktop, đặt mô hình bên trái, giải thích bên phải và ghi chú phía dưới; mobile xếp dọc. Hiển thị lộ trình sáu pha để người dùng biết sẽ học gì. Cuộn không thực hiện phép tính; chỉ các nút học/phát mới chạy các pha theo logic hiện tại.

Hãy dùng Times New Roman cho toàn bộ web, kể cả nút, số liệu và công thức. Giữ nền chủ đạo đen, thay nền ảnh/công thức bằng bầu trời sao giống vũ trụ. Cho sao trôi chậm và sáng tối nhẹ ở các thời điểm khác nhau, không nháy đồng loạt.

Hãy làm các nút trong như giọt nước, có viền phản chiếu và chữ neon. Các khung trang 3 và 4 cũng dùng phong cách Liquid Glass trong vừa: nhìn thấy sao phía sau nhưng chữ vẫn rõ. Áp dụng cho cả thanh điều khiển, bảng dữ liệu/kết quả, khung 3D, phần học và ghi chú. Không làm glow hoặc blur quá mạnh gây rối mắt.

Đổi màu điểm Train thành cam neon, điểm Test thành xanh lam neon ở cả trang 3 và 4. Đồng bộ màu với chú giải, biểu đồ và số liệu, nhưng không đổi tọa độ hoặc cách tính. Với màu thuật toán, hãy dùng cyan cho Linear, hồng cho Polynomial, tím cho Ridge và bạc cho Lasso.

Giữ con trỏ hệ thống và thêm vòng neon, đuôi ngắn, gợn khi bấm. Hiệu ứng chỉ trang trí, không chặn thao tác. Hãy hỗ trợ người dùng bật giảm chuyển động.

Hãy làm chuyển cảnh liền mạch như trình chiếu: trang cũ rời đi, đổi trang, rồi nội dung trang mới xuất hiện. Cầu, các bảng và mô hình cần có hiệu ứng vào trang phù hợp; không chỉ phóng to phát sáng rồi biến mất.

Giới hạn render 3D và GSAP ở tối đa 60 FPS, tối ưu công việc mỗi khung hình và ngừng vẽ các trang đang ẩn. Tiếp tục dùng số phức/quaternion cho các phép chuyển động qua các hàm có sẵn.

Sau khi chỉnh xong, hãy chạy unit test, E2E và build phù hợp. Báo rõ phần đã sửa, kết quả thực tế và phần chưa kiểm chứng. Cập nhật tài liệu Markdown theo yêu cầu cuối cùng, không để các yêu cầu cũ mâu thuẫn với bản mới. Nếu còn điểm chưa rõ, hãy hỏi ngắn gọn trước khi triển khai. Trả lời bằng tiếng Việt, dễ hiểu và đúng trọng tâm.
```

## 3. Cách chia prompt theo từng vòng trao đổi

Các mẫu trong phần này cũng là bản biên tập, dùng để minh họa cách đưa yêu cầu từng bước.

### Vòng 1 — Nêu bối cảnh và giới hạn

```text
Nhóm tôi đã có frontend Angular cho hệ thống Hồi quy 3D. Hãy xem lại cấu trúc dự án rồi đề xuất cách làm mới giao diện. Tôi muốn giữ các chức năng hiện có, không thay công thức, dữ liệu, API và lưu offline. Trước khi viết code, hãy tóm tắt yêu cầu và hỏi tối đa năm câu để làm rõ; sau khi tôi trả lời, hãy cập nhật tài liệu Markdown.
```

Mục đích: cho AI biết dự án đang có gì, cần làm gì và phần nào không được thay đổi. Việc chốt tài liệu trước giúp hạn chế hiểu sai phạm vi.

### Vòng 2 — Làm rõ cách tương tác bằng tình huống cụ thể

```text
Ý tôi là mỗi lần chỉ hiển thị một trang, không phải cuộn xuống để sang phần tiếp theo. Hãy chuyển bằng nút hoặc chọn trên cầu. Sau khi chuyển xong, nội dung trang đích cũng phải có animation xuất hiện. Trang học cần có mô hình 3D và dùng chung trạng thái với trang thực nghiệm; cuộn không được tự chạy bước tính toán.
```

Mục đích: thay mô tả chung như “chuyển cảnh đẹp” bằng hành vi có thể quan sát và kiểm tra.

### Vòng 3 — Điều chỉnh thẩm mỹ khi đã xem kết quả

```text
Nền công thức hiện chưa đúng ý tôi. Hãy bỏ nó và thay bằng bầu trời sao trôi chậm, sáng tối nhẹ. Đổi toàn bộ font sang Times New Roman. Các khung trang 3 và 4 hãy làm trong vừa theo phong cách Liquid Glass, nhìn thấy sao phía sau nhưng chữ vẫn rõ. Giữ Train cam neon, Test xanh lam neon và trần render 60 FPS.
```

Mục đích: nêu rõ phần cần thay, phần cần giữ và mức độ hiệu ứng mong muốn, thay vì yêu cầu AI tự làm lại toàn bộ.

### Vòng 4 — Chỉ ra lỗi bố cục và phần trùng chức năng

```text
Ở trang 2, đổi nút footer thành Đăng xuất. Bỏ nút Khám phá thuật toán ở trang đăng nhập vì đã có Guest. Trang 3 hãy khôi phục thanh điều khiển nằm ngang trên màn hình rộng; chỉ giữ nút Đổi thuật toán ở header, bỏ hai nút đổi trùng ở footer và trong khung thuật toán. Hãy kiểm tra cả desktop, tablet và mobile.
```

Mục đích: dùng ảnh và vị trí cụ thể để AI biết chính xác vùng cần sửa, tránh sửa lan sang những phần đã đúng.

### Vòng 5 — Yêu cầu xác minh và bàn giao

```text
Hãy kiểm tra lại những luồng bị ảnh hưởng, chạy test và build, sau đó ghi kết quả thực tế vào tài liệu. Phân biệt rõ kiểm thử bằng API giả lập với kết nối MongoDB thật. Cho tôi biết thay đổi đã nằm ở local hay đã commit/push; chỉ báo đã push khi Git xác nhận thành công.
```

Mục đích: yêu cầu bằng chứng thay cho câu trả lời chung “đã hoàn thành”. Chỉ dùng mẫu này khi thực sự muốn thực hiện các bước được nêu.

## 4. Một số câu nguyên văn để minh họa việc làm rõ yêu cầu

Hai trích đoạn sau lấy từ lời yêu cầu trong hội thoại; không thay bằng prompt tổng hợp rồi ghi là nguyên văn:

> ý tôi không phải thiết kế web theo dạng cuộn mà sẽ là chuyển trang và chuyển cảnh

> font chữ cho chung cho web là times new roman

Có thể đặt cạnh ảnh trước/sau để giải thích rằng người dùng đã phản hồi và điều chỉnh kết quả, thay vì chấp nhận ngay phương án đầu tiên. Với các trích đoạn khác, hãy đối chiếu tin nhắn gốc trước khi đưa vào báo cáo.

## 5. Đoạn trình bày mẫu với giảng viên

Tôi sử dụng AI như một công cụ hỗ trợ chỉnh sửa giao diện trên dự án có sẵn. Ban đầu, tôi cung cấp bối cảnh, công nghệ đang dùng và giới hạn không được thay đổi logic hồi quy, dữ liệu hoặc API. Sau đó, tôi yêu cầu AI đặt câu hỏi để làm rõ trước khi triển khai.

Trong các vòng trao đổi tiếp theo, tôi mô tả cụ thể cách người dùng thao tác: chỉ hiện một trang, chuyển bằng nút hoặc cầu, tách phần học thành trang riêng và không cho cuộn tự chạy phép tính. Khi xem kết quả, tôi tiếp tục phản hồi về nền, font, độ trong của khung và các nút trùng chức năng. Các yêu cầu mới nhất được dùng để thay thế những lựa chọn cũ.

Cuối cùng, tôi yêu cầu chạy kiểm thử và cập nhật tài liệu. Tôi phân biệt phần giao diện demo với xác thực thật, kiểm thử API giả lập với kết nối cơ sở dữ liệu, và kết quả đo trên máy thử với bảo đảm hiệu năng trên mọi thiết bị. Cách làm này giúp tôi thể hiện rõ vai trò đưa yêu cầu, phản hồi và kiểm tra đầu ra khi sử dụng AI.

Đây là đoạn thuyết minh mẫu được biên soạn để sử dụng trong báo cáo, không phải bản trích một tin nhắn gốc.

## 6. Bằng chứng nên đưa vào báo cáo

- Chèn một vài tin nhắn gốc thể hiện yêu cầu ban đầu, câu trả lời làm rõ và lần điều chỉnh quan trọng.
- Chọn ảnh trước/sau của cùng một vùng, chẳng hạn thanh điều khiển trang 3 hoặc nền công thức so với nền sao.
- Đối chiếu yêu cầu cuối với [đặc tả](UI-REDESIGN-SPEC.md) và [kiểm thử](UI-REDESIGN-VERIFICATION.md). Theo lần xác minh gần nhất được ghi nhận: 79 unit test, 9 nhóm E2E với 73 tiêu chí và production build đã đạt. Lần biên tập tài liệu này không chạy lại các test đó.
- Dùng log/ảnh thật ở `output/playwright` nếu cần minh chứng. Thư mục này bị bỏ qua khi commit; hãy chủ động chèn những hình cần thiết vào báo cáo.
- Nếu trích commit, số đo FPS hoặc trạng thái triển khai, hãy ghi đúng mốc tương ứng. Không dùng một ảnh giao diện để kết luận MongoDB đã đồng bộ hoặc hệ thống xác thực đã hoàn thành.

## 7. Thuật ngữ ngắn gọn

| Từ | Cách hiểu trong báo cáo |
| --- | --- |
| Prompt | Yêu cầu gửi cho AI, gồm bối cảnh, mục tiêu, giới hạn và đầu ra mong muốn. |
| Làm rõ yêu cầu | Hỏi và trả lời để thống nhất những ý còn có thể hiểu theo nhiều cách. |
| Prompt theo vòng lặp | Xem kết quả, phản hồi rồi bổ sung yêu cầu; ví dụ đổi nền công thức sang nền sao sau khi xem giao diện. |
| Tiêu chí nghiệm thu | Dấu hiệu để biết đã làm đúng; ví dụ trang 3 chỉ còn một nút đổi thuật toán ở header. |
| Unit test / E2E | Kiểm tra logic nhỏ / kiểm tra luồng thao tác trên trình duyệt. |
| FPS | Số khung hình được vẽ mỗi giây; trần 60 FPS không đồng nghĩa mọi thiết bị luôn đạt đúng 60. |

## 8. Công cụ trong prompt dùng để làm gì?

| Công cụ/khái niệm | Vai trò trong phần giao diện | Ví dụ trong dự án |
| --- | --- | --- |
| Angular + TypeScript | Tổ chức giao diện thành các thành phần và quản lý trạng thái có kiểu dữ liệu. | Hiển thị đúng trang đang chọn và tên thuật toán. |
| Three.js | Vẽ các thực thể 3D trên trình duyệt. | Cầu chọn thuật toán, điểm dữ liệu và bầu trời sao. |
| GSAP | Điều phối thứ tự và thời gian của animation. | Trang cũ rời đi, rồi các bảng trang mới xuất hiện. |
| Web Worker | Chạy công việc tính toán tách khỏi luồng giao diện. | Học hồi quy trong khi người dùng vẫn xoay camera. |
| IndexedDB | Cơ sở dữ liệu cục bộ trong trình duyệt. | Giữ thí nghiệm khi chưa có mạng. |
| Playwright | Tự động thao tác trình duyệt để kiểm tra E2E. | Bấm Guest, chọn Ridge, chạy một bước và quay lại. |
| Vitest | Chạy unit test trong bộ công cụ của frontend hiện có. | Kiểm tra hàm logic hoặc bộ giới hạn khung hình. |
| Liquid Glass | Phong cách kính bán trong suốt được mô phỏng trên web. | Khung dữ liệu nhìn thấy sao phía sau nhưng chữ vẫn rõ. |
| Shader / instancing | Chương trình vẽ trên GPU / cách vẽ nhiều vật thể cùng loại hiệu quả. | Đổi độ sáng sao và vẽ nhiều điểm dữ liệu mà không tạo từng vòng vẽ riêng. |

Các mô tả này giải thích vai trò công cụ, không khẳng định mọi chức năng của dự án đã hoàn thiện. Việc kết nối MongoDB, xác thực thật và triển khai HTTPS cần được báo cáo bằng minh chứng riêng.
