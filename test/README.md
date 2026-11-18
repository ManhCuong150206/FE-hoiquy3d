## 1. Tổng quan


Tài liệu này mô tả cách thực hiện và kết quả kiểm thử Frontend của dự án
**Hoiquy3d** tại:


``` powershell
C:\Git\Hoi_Quy_3D\FE-hoiquy3d
```


Quy trình hiện tại gồm bốn nhóm chính:


  -----------------------------------------------------------------------
  Nhóm kiểm thử           Công cụ / lệnh          Mục tiêu
  ----------------------- ----------------------- -----------------------
  Unit Test               Angular test runner,    Kiểm tra logic
                          Vitest, jsdom           component, service,
                                                  state và các hàm xử lý


  Build Test              Angular CLI             Kiểm tra khả năng biên
                          (`ng build`)            dịch và đóng gói ứng
                                                  dụng


  E2E Test                Playwright, PowerShell  Kiểm tra luồng giao
                                                  diện và hành vi ứng
                                                  dụng trên trình duyệt

  -----------------------------------------------------------------------


> **Phạm vi kết quả:** Unit Test, Build Test và E2E Test có kết quả chạy

------------------------------------------------------------------------


## 2. Môi trường và công nghệ kiểm thử


Các công nghệ được xác định từ lệnh chạy và log kiểm thử:


-   **Angular CLI:** biên dịch ứng dụng bằng `ng build`, chạy kiểm thử
    bằng `ng test`.
-   **Vitest 5.0.5:** test runner xuất hiện trong log Unit Test.
-   **jsdom:** môi trường DOM giả lập được Vitest sử dụng khi chạy test.
-   **Playwright:** công cụ tự động hóa trình duyệt dùng trong bộ UI
    E2E.
-   **PowerShell:** chạy script điều phối các UI test suite.

### Kiểm tra phiên bản công cụ


Chạy tại thư mục dự án:


``` powershell
node --version
npm --version
npx ng version
npm ls vitest jsdom playwright
```


Nếu một package không được cài trực tiếp trong dự án, `npm ls` có thể
báo không tìm thấy package. Điều đó không tự động chứng minh công cụ
không tồn tại ở nơi khác trên máy.


------------------------------------------------------------------------


## 3. Unit Test - Kiểm tra logic thành phần


### 3.1. Mục đích


Unit Test kiểm tra các đơn vị mã nguồn riêng lẻ, chẳng hạn:


-   Component: khởi tạo, hiển thị dữ liệu, xử lý sự kiện.
-   Service: xử lý dữ liệu và các nghiệp vụ được kiểm thử.
-   State/store: cập nhật và duy trì trạng thái.
-   Hàm xử lý dữ liệu, validation và logic nghiệp vụ.


Unit Test không thay thế E2E Test. Một component có thể vượt qua Unit
Test nhưng luồng sử dụng toàn ứng dụng vẫn có thể gặp lỗi.


### 3.2. Công nghệ


-   Angular CLI: gọi lệnh test được cấu hình trong dự án.
-   Vitest 5.0.5: thực thi và báo cáo test.
-   jsdom: cung cấp môi trường DOM giả lập cho các test cần DOM.


### 3.3. Cách thực hiện


Mở PowerShell:


``` powershell
cd C:\Git\Hoi_Quy_3D\FE-hoiquy3d
npm.cmd run test -- --watch=false
```


Ý nghĩa:


-   `npm.cmd run test`: chạy script `test` trong `package.json`.
-   `--`: chuyển các tham số phía sau cho script.
-   `--watch=false`: chạy một lượt rồi kết thúc, không chờ thay đổi file
    để chạy lại.


### 3.4. Kết quả đã ghi nhận


Lần chạy ngày 16/11/2026:


``` text
Test Files  33 passed (33)
Tests       212 passed (212)
Duration    34.74s
```


  Chỉ tiêu                     Kết quả
  ----------------------- ------------
  Test files thành công          33/33
  Test thành công              212/212
  Test thất bại                      0
  Thời gian chạy            34.74 giây


**Đánh giá:** Tất cả 33 file test và 212 test case trong log đều PASS.


> Trong phần ghi chú cuối log có dòng "245 test". Tuy nhiên, số liệu
> tổng kết trực tiếp của Vitest ghi `212 passed (212)`. README sử dụng
> số liệu tổng kết của test runner để tránh cộng nhầm số file test với
> số test case.


### 3.5. Cảnh báo trong môi trường test


Log có một số thông báo:


-   `HTMLCanvasElement's getContext() method` chưa được jsdom triển khai
    nếu không cài package `canvas`.
-   `THREE.WebGLRenderer: Error creating WebGL context` khi test thành
    phần dùng Three.js/WebGL.
-   `matchMedia is not a function` tại `learning-route.ts` và
    `card-glow.ts`.


Dù có các thông báo trên, log vẫn ghi nhận các file liên quan hoàn tất
và tổng kết là 212/212 test PASS. Vì vậy:


-   Không nên kết luận các thông báo này đồng nghĩa với test thất bại.
-   Chúng cho thấy môi trường jsdom chưa mô phỏng đầy đủ một số API
    trình duyệt và WebGL.
-   Nếu muốn kiểm thử sâu hành vi đồ họa, cần có chiến lược mock phù hợp
    hoặc kiểm thử trên trình duyệt thật bằng E2E.


### 3.6. Khi có test thất bại


1.  Tìm tên file `.spec.ts` bị FAIL.
2.  Đọc tên test case thất bại và stack trace.
3.  Xác định lỗi thuộc logic ứng dụng hay môi trường test.
4.  Sửa nguyên nhân, không xóa assertion chỉ để làm test PASS.
5.  Chạy lại test liên quan, sau đó chạy toàn bộ Unit Test.


------------------------------------------------------------------------


## 4. Build Test - Kiểm tra biên dịch ứng dụng


### 4.1. Mục đích


Build Test kiểm tra Angular có thể biên dịch mã nguồn và tạo ra các
bundle phục vụ triển khai hay không.


Quá trình build có thể phát hiện:


-   Lỗi TypeScript và lỗi biên dịch Angular.
-   Lỗi template hoặc cấu hình build.
-   Vấn đề khi đóng gói tài nguyên.
-   Cảnh báo kích thước bundle hoặc CSS vượt ngân sách cấu hình.


Build thành công không chứng minh mọi chức năng chạy đúng. Chức năng vẫn
cần được kiểm tra bằng Unit Test và E2E Test.


### 4.2. Công nghệ


-   Angular CLI (`ng build`).
-   Quy trình bundling của Angular.
-   Các bundle trình duyệt và bundle máy chủ được tạo trong lần build
    này.


### 4.3. Cách thực hiện


``` powershell
cd C:\Git\Hoi_Quy_3D\FE-hoiquy3d
npm.cmd run build
```


Lệnh gọi script `build` trong `package.json`, log hiện tại cho thấy
script đó thực thi `ng build`.


### 4.4. Kết quả đã ghi nhận


``` text
Prerendered 1 static route.
Application bundle generation complete. [12.896 seconds]
Output location:
C:\Git\Hoi_Quy_3D\FE-hoiquy3d\dist\Hoiquy3d\
```


  Chỉ tiêu                   Kết quả
  -------------------------- --------------------------------------
  Trạng thái build           Thành công
  Thời gian                  12.896 giây
  Static route prerendered   1
  Thư mục đầu ra             `dist/Hoiquy3d/`
  Bundle                     Có Browser bundles và Server bundles


Build tạo ra các nhóm bundle:


-   **Browser bundles:** mã JavaScript và CSS dành cho trình duyệt.
-   **Lazy chunk files:** các phần mã được tách riêng và tải khi cần.
-   **Server bundles:** bundle phục vụ phần chạy phía server/SSR trong
    cấu hình build hiện tại.


### 4.5. Cảnh báo CSS budget


Build thành công nhưng có 4 cảnh báo CSS vượt ngân sách 4.00 kB:


  -------------------------------------------------------------------------------------------------------------------
  File CSS                                                            Ngân sách Kích thước thực tế               Vượt
  ---------------------------------------------------------- ------------------ ------------------ ------------------
  `src/app/app.css`                                                     4.00 kB            5.43 kB            1.43 kB


  `src/app/features/csv-import/csv-import.css`                          4.00 kB            4.41 kB          414 bytes


  `src/app/features/welcome-panel/welcome-panel.css`                    4.00 kB            7.52 kB            3.52 kB


  `src/app/features/algorithm-picker/algorithm-picker.css`              4.00 kB            7.30 kB            3.30 kB
  -------------------------------------------------------------------------------------------------------------------


**Đánh giá:** Build PASS, nhưng cần theo dõi và tối ưu 4 file CSS nêu
trên.


Cách xử lý đề xuất:


1.  Kiểm tra CSS trùng lặp hoặc selector không còn sử dụng.
2.  Tách style dùng chung thành phần phù hợp nếu việc đó giúp giảm CSS
    riêng của component.
3.  Loại bỏ khai báo không cần thiết.
4.  Chạy lại `npm.cmd run build` để xác nhận.
5.  Chỉ thay đổi budget trong cấu hình khi có lý do kỹ thuật rõ ràng;
    không nên tăng giới hạn chỉ để che cảnh báo.


------------------------------------------------------------------------


## 5. E2E Test - Kiểm tra luồng giao diện bằng trình duyệt


### 5.1. Mục đích


E2E (End-to-End) Test mô phỏng hành vi người dùng trên ứng dụng đang
chạy trong trình duyệt.


Tùy kịch bản được viết, test có thể kiểm tra:


-   Mở trang và điều hướng.
-   Tương tác với nút, biểu mẫu và thành phần giao diện.
-   Trạng thái đăng nhập hoặc Guest.
-   Các luồng học tập, Lab và thao tác trên giao diện 3D.
-   Hiển thị và hành vi responsive.
-   Tính nhất quán của giao diện sau các thao tác.


E2E kiểm tra luồng từ góc nhìn người dùng, không chỉ gọi trực tiếp một
hàm riêng lẻ.


### 5.2. Công nghệ


-   **Playwright:** tự động hóa trình duyệt và thực thi các kịch bản UI.
-   **PowerShell:** chạy script `e2e/run-ui-redesign.ps1`, điều phối các
    suite và tổng hợp trạng thái.
-   **Trình duyệt:** môi trường thực thi thao tác và xác minh giao diện.


### 5.3. Cách thực hiện


Mở PowerShell tại thư mục Frontend:


``` powershell
cd C:\Git\Hoi_Quy_3D\FE-hoiquy3d
```


Chạy:


``` powershell
powershell -NoProfile -ExecutionPolicy Bypass -File e2e/run-ui-redesign.ps1
```


Ý nghĩa tham số:


-   `-NoProfile`: không nạp PowerShell profile của người dùng.
-   `-ExecutionPolicy Bypass`: bỏ qua chính sách thực thi cho tiến trình
    PowerShell này.
-   `-File`: chạy file script được chỉ định.


Script hiện tại chạy các UI suite đã được chọn. Cần đọc nội dung script
và các file test để xác định chính xác từng assertion và việc script tự
khởi động server hay yêu cầu server chạy sẵn.


### 5.4. Kết quả đã ghi nhận


  UI suite            Kết quả
  ------------------- ---------
  audit-fixes         PASS
  comparison          PASS
  pearl-transition    PASS
  pearl-theme         PASS
  auth-session        PASS
  guest-memory        PASS
  entry               PASS
  entry-validation    PASS
  lab                 PASS
  learning-offline    PASS
  lesson-restart      PASS
  page-modes          PASS
  mobile-fallback     PASS
  sphere              PASS
  motion              PASS
  slides              PASS
  neon                PASS
  navigation-layout   PASS
  learning-route      FAIL
  smooth-learning     PASS
  card-glow           PASS
  shared-planet       PASS
  lab-arrival         PASS
  planet              PASS
  algorithm-flight    PASS
  model-integrity     PASS


Tổng hợp:


  Chỉ tiêu                   Kết quả
  --------------- ------------------
  Tổng số suite                   26
  PASS                            25
  FAIL                             1
  Suite lỗi         `learning-route`


**Đánh giá:** E2E chưa PASS toàn bộ. Có 25/26 suite thành công; suite
`learning-route` cần được điều tra.


### 5.5. Cách điều tra suite thất bại


Đọc log chi tiết:


``` powershell
Get-Content .\output\playwright\learning-route-result.log
```


Đọc báo cáo tổng hợp:


``` powershell
Get-Content .\output\playwright\suite-summary.json
```


Khi phân tích lỗi, xác định:


1.  Test case nào trong `learning-route` thất bại?
2.  Lỗi là assertion không đúng, timeout, lỗi JavaScript hay không tìm
    thấy phần tử?
3.  Lỗi có tái hiện khi chạy riêng suite không?
4.  Có phụ thuộc dữ liệu, trạng thái đăng nhập hoặc thứ tự chạy suite
    không?
5.  Sau khi sửa, chạy lại suite lỗi và toàn bộ script.


Không nên chỉ sửa script để bỏ qua `learning-route` hoặc đổi trạng thái
FAIL thành PASS. Báo cáo phải phản ánh đúng kết quả kiểm thử.


##6. Lệnh kiểm thử nhanh

Chạy tại thư mục `C:\Git\Hoi_Quy_3D\FE-hoiquy3d`:

``` powershell
# 1. Unit Test
npm.cmd run test -- --watch=false


# 2. Build Test
npm.cmd run build


# 3. E2E Test
powershell -NoProfile -ExecutionPolicy Bypass -File e2e/run-ui-redesign.ps1
