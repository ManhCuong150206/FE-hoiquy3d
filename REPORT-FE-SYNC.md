# Báo cáo FE offline-first và đồng bộ

Ngày báo cáo: 08/11/2026 (Asia/Saigon).

Căn cứ: `FE-SYNC-MIGRATION(2).md` (v2), `API-HANDBOOK.md`, diff thực tế của bốn file state/spec và kết quả lệnh đã chạy trong phiên làm việc này. Báo cáo này không coi những phần đã có trước là phần triển khai mới. Không sửa thêm logic ứng dụng trong lượt lập báo cáo.

## 1. Danh sách file sửa, thêm, xóa

| Loại | Đường dẫn từ gốc dự án | Hàm/phần đã đổi |
| --- | --- | --- |
| Sửa | `src/app/state/auth-session.ts` | Thêm `IDENTITY_KEY`, `remember()`, `restoreLocal()`; sửa `set()`, `restore()`, `enter()`, `ensure()`; cập nhật comment cạnh `api()` và thêm TODO. |
| Sửa | `src/app/state/experiments-store.ts` | Sửa `operation()`, `fromServer()`, kiểu signal `conflict`, `persist()`, `loadScope()`, `readRemote()`, `resolveConflict()`, `sync()`; thêm TODO. |
| Sửa | `src/app/state/auth-session.spec.ts` | Fixture `beforeEach`, ba test cũ, tám khai báo test mới (có test tham số hóa), helper `cache()`. |
| Sửa | `src/app/state/experiments-store.spec.ts` | Fixture `beforeEach`, hai test cũ; helper `raw()`, `respond()`, cursor fixture; thêm test sync và nhóm `offline reload with the real auth session and mocked IndexedDB`. |
| Thêm | `REPORT-FE-SYNC.md` | Báo cáo theo yêu cầu hiện tại. |
| Thêm | `fe-sync.patch` | Xuất `git diff` của đúng bốn file code/spec nêu trên; không chứa báo cáo hoặc các thay đổi không thuộc tác vụ. |

Không xóa file nào. Không sửa `core/models/experiment.ts`.

## 2. Trạng thái mục 4.1–4.5 và hành vi trước/sau

“Đã làm” dưới đây chỉ xác nhận code và kiểm thử tự động trong môi trường mock; không có nghĩa đã kiểm thử FE cùng BE thật hoặc tải lại trình duyệt production khi mất mạng.

| Mục | Trạng thái | File và hàm cụ thể |
| --- | --- | --- |
| 4.1 — Danh tính offline | Đã làm | `auth-session.ts`: `remember()`, `restoreLocal()`, `set()`, `restore()`, `enter()`, `ensure()`; `experiments-store.ts`: `persist()`, `loadScope()`. |
| 4.2 — Cursor `since` | Đã làm | `experiments-store.ts`: `readRemote()`, phần gộp và ghi cursor cuối `sync()`. |
| 4.3 — Lỗi từng bản ghi | Đã làm | `experiments-store.ts`: `sync()`, các tập `excluded`, `failures`, helper cục bộ `reject()`, nhánh kết thúc và chạy tiếp. |
| 4.4 — Xác minh duplicate | Đã làm | `experiments-store.ts`: `operation()`, `fromServer()`, `readRemote(scope, full)`, phần `duplicates` trong `sync()`. |
| 4.5 — Tombstone/conflict | Đã làm | `experiments-store.ts`: `fromServer()`, signal `conflict.invalidServer`, `sync()`, `resolveConflict()`, `persist(removed)`. |

### 4.1 — Hành vi cũ và mới

Trước đây danh tính chỉ ở bộ nhớ và `restore()` thoát ngay khi offline, nên tải lại không mở được scope của người dùng. Nay login hoặc `/auth/me` thành công lưu đúng `{ userId, displayName, email }` vào `regression.lastIdentity`; offline hoặc lỗi fetch trước khi nhận response cho phép khôi phục danh tính để dùng local, còn HTTP 403/500 không dùng fallback đó. `/auth/me` trả 401, protected request trả 401 hoặc logout đi qua `set(null)` sẽ xóa cache danh tính; lệnh ghi local đã nhận được hoàn tất trong scope ban đầu ngay cả khi phiên đổi.

### 4.2 — Hành vi cũ và mới

Trước đây mỗi lần pull gọi `/sync/changes` không có mốc. Nay `readRemote()` dùng `regression.syncCursor.<scopeId>` trừ 60 giây khi mốc hợp lệ và bộ nhớ của scope có bản ghi; không có mốc, mốc lỗi, scope rỗng hoặc cần xác minh duplicate thì pull toàn bộ. `sync()` chỉ lưu `serverTime` hợp lệ sau khi gộp và `persist()` hoàn tất; nếu có bản remote không parse được thì `readRemote()` không cung cấp mốc mới để ghi.

### 4.3 — Hành vi cũ và mới

Trước đây một kết quả bị từ chối làm throw, ngừng các lô sau và bỏ qua pull. Nay bản lỗi được giữ chưa đồng bộ, loại khỏi vòng đẩy hiện tại bằng `excluded`, các bản/lô khác và pull vẫn tiếp tục, cuối lần chạy báo số bản lỗi cùng lý do đầu tiên. Conflict vẫn dừng để chờ xử lý; lỗi HTTP hoặc mạng vẫn kết thúc lần chạy và giữ dữ liệu chờ.

### 4.4 — Hành vi cũ và mới

Trước đây `duplicate` có thể được coi như `applied` chỉ nhờ version trong response. Nay payload thêm `lastMutationId` bên trong snapshot; duplicate buộc pull toàn bộ rồi đối chiếu mutation (hoặc tombstone cho thao tác delete) và version hợp lệ từ bản server trước khi đánh dấu synced. Không xác nhận được thì đổi mutation ID, giữ pending và loại khỏi lần chạy hiện tại; pull bị lỗi thì giữ nguyên mutation ID để retry.

### 4.5 — Hành vi cũ và mới

Trước đây tombstone remote có thể được lưu như một bản ghi local, còn conflict không parse được có thể bị hiểu là server không còn dữ liệu. Nay tombstone không có local bị bỏ qua, local đã synced bị xóa khỏi bộ nhớ/IndexedDB, còn local pending được giữ; conflict có dữ liệu không đọc được hoặc sai ID được đánh dấu `invalidServer`. Khi người dùng giải quyết conflict đó, kể cả chọn server, FE tạo bản sao local và ghi trước khi xóa bản gốc; lỗi ghi giữ lại bản gốc và conflict.

## 3. Chi tiết triển khai bổ sung nằm trong hai file state

- `remember()` chỉ ghi ba trường danh tính, không lưu password, token, cookie, role hay status; thao tác localStorage được bọc `try/catch` và đường vào được giới hạn ở trình duyệt.
- `restoreLocal()` chỉ nhận cache có userId không rỗng, khác `guest`, displayName/email là chuỗi; chỉ lấy các trường cần thiết. Đây là quyền dùng dữ liệu local, không phải xác thực BE.
- `enter()` chỉ ghi danh tính khi login thành công; đăng ký vẫn không tự đăng nhập. `ensure()` giữ bước đối chiếu `_id` với scope và cập nhật cache sau khi xác minh cùng tài khoản.
- `persist()` chụp các bản ghi của scope tại thời điểm gọi, nối vào hàng đợi ghi và không bỏ lệnh đã nhận vì phiên đổi; ghi `putMany` trước các lệnh `remove`. `loadScope()` chờ hàng đợi ghi trước khi đọc IndexedDB.
- `sync()` tạo và lưu mutation ID cho bản pending còn thiếu ID trước khi gửi; tính kích thước theo operation JSON cùng wrapper/dấu phân cách, giữ trần 50 operation/8 MiB và loại bản riêng lẻ vượt trần khỏi lần chạy.
- Phản hồi batch chỉ áp dụng cho mutation đã gửi còn là mutation hiện tại; phản hồi cũ không xác nhận một thao tác xóa mới phát sinh trong lúc fetch đang chờ.
- Pull gộp theo ID, ưu tiên version cao hơn; cùng version có tombstone thì ưu tiên tombstone. Bản thường chỉ thay bản local đã synced khi version mới cao hơn; local pending không bị thay.
- `fromServer()` vẫn ưu tiên `algorithm.config.snapshot`, thêm đọc `snapshot.lastMutationId`, kiểm tra snapshot là object và cho phép parse tombstone tối thiểu không có algorithm. Chuyển `r2: null` thành `NaN` là logic đã có, không phải phần mới.
- `resolveConflict()` giữ cơ chế chọn server hoặc tạo bản sao có sẵn, thêm bảo vệ dữ liệu server không đọc được và đổi thứ tự ghi/xóa. Với conflict không đọc được, sau khi lưu bản sao FE hiển thị thông báo và để chờ đồng bộ, không tự gọi sync ngay trong nhánh đó.
- Cơ chế `syncAgain` được điều chỉnh để không tự chạy lại chỉ vì còn các ID đã bị loại trong lần chạy vừa kết thúc.

## 4. Spec đã sửa và thêm

Tên trong dấu backtick là tên test trong source. `%s` là test tham số hóa; các giá trị được ghi riêng để không coi một khai báo test là một lần thực thi duy nhất.

### 4.1. Test cũ đã sửa

| File | Test | Trước đây khẳng định gì; thay đổi và lý do |
| --- | --- | --- |
| `auth-session.spec.ts` | `accepts the direct User response and sends cookies plus CSRF header without storing identity` → `sends cookies plus CSRF header and stores only userId, displayName and email` | Trước yêu cầu `Storage.setItem` không được gọi. Nay yêu cầu ghi `regression.lastIdentity` đúng ba trường; đổi vì mục 4.1 yêu cầu lưu danh tính để khôi phục offline. Các kiểm tra cookie, CSRF và login body được giữ. |
| `auth-session.spec.ts` | `clears the session on a protected 401 and prevents another write` | Giữ kiểm tra xóa phiên/chặn request sau 401; thêm kiểm tra cache danh tính bị xóa. Không bỏ khẳng định cũ. |
| `auth-session.spec.ts` | `posts logout with the CSRF header and clears the session` | Giữ kiểm tra POST/logout, CSRF và user null; thêm kiểm tra cache danh tính bị xóa. Không bỏ khẳng định cũ. |
| `experiments-store.spec.ts` | `pulls saved server results and remote deletion without requiring a local change` | Trước yêu cầu tombstone còn trong disk mock. Nay yêu cầu ID không còn trong disk, theo mục 4.5 phải xóa local đã synced khi nhận tombstone remote. |
| `experiments-store.spec.ts` | `keeps rejected operations pending even when the HTTP batch response is 200` | Trước chỉ mong thông báo lỗi thô và mock mọi request bằng batch response. Nay mong `1 bản ghi chưa đồng bộ: Không tìm thấy dữ liệu` và mock GET bằng changes response, vì mục 4.3 vẫn phải pull sau lỗi operation. |

Fixture `beforeEach` của hai file thêm `localStorage.clear()` để các ca không dùng lại danh tính/cursor của nhau. Test `marks synced only after an acknowledgement of the exact ID and mutation` giữ nguyên vì vẫn đúng cho nhánh applied; kiểm tra duplicate được thêm bằng test riêng, không sửa test này chỉ để qua. Các test Guest, đăng ký không tự đăng nhập và snapshot round trip cũ giữ nguyên nội dung.

### 4.2. Test mới trong `auth-session.spec.ts`

| Tên test | Mục đích và phạm vi thực tế |
| --- | --- |
| `restores offline identity without contacting the API and ensure waits for connectivity` | Khôi phục đúng scope từ cache, không fetch offline, `ensure()` trả null. |
| `restores cached identity on a network failure even if navigator reports online` | Fetch reject vẫn khôi phục cache khi navigator báo online. |
| `does not fall back to cached identity on HTTP %s` — 403, 500 | Phân biệt response HTTP lỗi với lỗi mạng không có response. |
| `clears cached identity and an offline-restored user when restore receives 401` | Restore offline rồi online nhận 401 phải xóa user/cache. |
| `refreshes the cached identity from auth/me and replaces it on another login` | Cập nhật cache từ `/auth/me`, ghi đè userId khi login tài khoản khác. |
| `ignores invalid cached identity %s` — JSON lỗi, `{}`, identity `guest` | Không thiết lập người dùng từ các cache không hợp lệ này. |
| `continues when localStorage is unavailable` | Mock lỗi `setItem`/`getItem`; login vẫn hoạt động, restore không throw. Không kiểm thử lỗi `removeItem` trong test này. |
| `does not restore cached identity after Guest was chosen during a failed fetch` | Fetch restore thất bại đến trễ không thay thế Guest đã chọn. |

### 4.3. Test mới trong `experiments-store.spec.ts`

| Tên test | Mục đích và phạm vi thực tế |
| --- | --- |
| `uses a scope cursor with a 60-second overlap only after successful persistence` | Ghi serverTime rồi lần sync sau gửi since trừ đúng 60 giây. |
| `pulls everything for an invalid or missing cursor %s` — `invalid`, chuỗi rỗng | Không thêm since với hai giá trị này. Trường hợp không có khóa còn xuất hiện trong các fixture mặc định. |
| `ignores a stale cursor when IndexedDB for the scope is empty` | Scope tải từ disk mock rỗng thì pull toàn bộ dù localStorage có mốc. |
| `does not advance the cursor with invalid serverTime %s` — undefined, `invalid` | Không ghi mốc; lưu ý nhánh tham số undefined thực tế được helper chuyển thành `serverTime: null`, không phải xóa field khỏi response. |
| `does not advance the cursor when IndexedDB persistence fails` | Mock ghi thất bại ngay trước pull; không ghi cursor, hiện lỗi disk. |
| `does not advance the cursor when persisting the pulled records fails` | Lỗi khi ghi bản vừa kéo về không tiến cursor. |
| `continues later batches and pulls after per-record errors, retrying only on a later sync` | 52 bản chia lô 50/2; một bản lỗi, 51 bản áp dụng; vẫn pull, không tự lặp bản lỗi, lần sync tiếp theo mới gửi lại. |
| `verifies duplicate via snapshot lastMutationId independently of response version %s` — undefined, 99 | Không lấy version của duplicate làm bằng chứng; pull toàn bộ và lấy syncVersion 4 từ server mock khi mutation khớp. |
| `does not acknowledge a duplicate for a different or missing server mutation %s` — `other`, undefined | Với `other`, server trả mutation khác; với undefined, fixture trả mảng remote rỗng. Cả hai giữ local pending và đổi key; test không trực tiếp dựng bản server tồn tại nhưng thiếu field lastMutationId. |
| `acknowledges duplicate deletion only after pulling a server tombstone` | Duplicate delete chỉ hoàn tất sau tombstone server mock, sau đó xóa bản local. |
| `keeps the duplicate mutation intact if the verification pull fails` | Lỗi mạng ở pull xác minh giữ nguyên mutation/pending để retry. |
| `ignores unknown tombstones and preserves pending local records against remote deletion` | Không thêm tombstone ID lạ; không xóa local pending khi nhận tombstone cùng ID. |
| `deduplicates pulls by id/version and never overwrites pending data` | Giữ bản mới nhất cho ID remote trùng và giữ nguyên local pending. |
| `preserves all synthetic kinds and mutation identity inside the snapshot round trip` | Payload có lastMutationId trong snapshot, không có mutationId ở snapshot; các bản mock remote có linear/curved/correlated/sparse được giữ kind và đọc lại mutation. Không kiểm thử mở lại thí nghiệm qua UI/engine. |
| `keeps a copy even when the user chooses server for an unreadable conflict` | Mock serverData không đọc được; chọn server vẫn tạo bản sao mới, giữ w, version 0, pending và thông báo. |
| `retains the original on disk if persisting a conflict copy fails` | Lỗi putMany khi lưu bản sao giữ bản gốc và conflict. |
| `commits a pending local write even if the account changes before the write runs` | Save rồi đổi scope sang Guest trước khi promise ghi chạy; disk vẫn có dữ liệu thuộc user cũ. |
| `preserves the queue on HTTP %s` — 400, 401, 403, 500 | Mock auth trong suite này, kiểm tra disk pending/key không đổi và không có cursor. Riêng xóa danh tính do 401 được kiểm tra bằng AuthSession thật ở nhóm dưới. |
| `does not acknowledge a newer deletion with the response to an older save` | Giữ pending/mutation mới của delete khi applied cho save cũ đến trễ; request tiếp theo được mock trả error. |
| `keeps local data and the cursor unchanged on a batch network failure` | Batch reject giữ local pending và mốc cũ. |
| `reloads only the cached owner records, permits offline saves/deletes, and retains them on reconnect 401` | Dùng AuthSession thật, reset TestBed để mô phỏng reload; chỉ tải dữ liệu chủ cache, tiếp tục save/delete; reconnect 401 chỉ gọi auth/me, xóa danh tính nhưng giữ cả dữ liệu pending và tài khoản khác trong disk mock. |
| `verifies auth/me before syncing the offline queue and keeps IndexedDB after logout` | Dùng AuthSession thật, kiểm tra thứ tự auth/me → sync/batch → sync/changes, applied ghi synced; logout xóa cache nhưng giữ disk. |

Hai test cuối thuộc nhóm mới `offline reload with the real auth session and mocked IndexedDB`. Mock IndexedDB là các method `experimentDb.all/putMany/remove` dùng `Map`, không phải một IndexedDB engine thật.

## 5. Kết quả lệnh thực tế

Các kết quả dưới đây lấy từ các lần chạy trong lượt sửa code trước khi lập báo cáo. Không chạy lại build/test chỉ để tạo báo cáo; lượt này không đổi code hoặc spec.

### `npm run build`

Đã chạy, exit code **1**. Có output bundle browser/server và prerender, nhưng production build cuối cùng thất bại vì budget CSS. Trích nguyên phần kết quả liên quan:

```text
Prerendered 1 static route.
Application bundle generation failed. [24.773 seconds] - 2026-11-08T05:53:12.691Z

▲ [WARNING] src/app/features/training-controls/training-controls.css exceeded maximum budget. Budget 4.00 kB was not met by 800 bytes with a total of 4.80 kB.

▲ [WARNING] src/app/features/algorithm-picker/algorithm-picker.css exceeded maximum budget. Budget 4.00 kB was not met by 4.76 kB with a total of 8.76 kB.

▲ [WARNING] src/app/features/welcome-panel/welcome-panel.css exceeded maximum budget. Budget 4.00 kB was not met by 5.75 kB with a total of 9.75 kB.

X [ERROR] src/app/features/algorithm-picker/algorithm-picker.css exceeded maximum budget. Budget 8.00 kB was not met by 763 bytes with a total of 8.76 kB.

X [ERROR] src/app/features/welcome-panel/welcome-panel.css exceeded maximum budget. Budget 8.00 kB was not met by 1.75 kB with a total of 9.75 kB.
```

Không sửa các CSS đó hoặc tăng budget. Không chạy build baseline riêng; nhận định các lỗi này nằm ngoài phần sửa dựa trên đường dẫn lỗi và diff, không phải so sánh hai lần build baseline/final. Lệnh build không sinh số test đạt/hỏng.

### `npm test -- --watch=false`

Đã chạy script `npm test` với tham số tắt watch. Lần cuối exit code **0**, số liệu nguyên văn:

```text
Test Files  26 passed (26)
     Tests  208 passed (208)
  Start at  12:55:02
  Duration  15.70s (environment 78%, tests 10%, setup 9%, transform 2%, import 1%)
```

Kết quả: **208 test đạt, 0 test hỏng; 26 file test đạt**. Đây là tổng của cả repo, không phải tất cả đều là test mới của tác vụ này. Suite in cảnh báo jsdom lặp lại `Not implemented: HTMLCanvasElement's getContext() method: without installing the canvas npm package`; các cảnh báo không làm test thất bại và không có thư viện canvas nào được cài.

Các lần chạy trước đó trong cùng lượt sửa:

- Lần đầu exit code 1 ở bước compile test, lỗi `TS2345` tại `experiments-store.spec.ts:140`: spread một giá trị `SavedExperiment | null` vào `raw()`. Chưa chạy test nên không có số đạt/hỏng; đã sửa biến fixture thành `store.save('Remote')!`.
- Sau sửa kiểu, một lần chạy đạt nguyên số liệu `Test Files  26 passed (26)` và `Tests  204 passed (204)`; `Duration  18.75s (environment 84%, tests 8%, setup 6%, transform 2%)`.
- Sau khi thêm bốn ca kiểm thử cuối, chạy lại đạt 208/208 như trên.

`git diff --check` đã chạy và không báo lỗi whitespace; Git có cảnh báo chuẩn hóa LF/CRLF ở hai file auth, không phải lỗi test.

## 6. TODO(BE-confirm) và giả định thực tế

| Vị trí trong code | Comment đã gắn nguyên văn | Giả định/cách xử lý đã dùng |
| --- | --- | --- |
| `src/app/state/auth-session.ts:56`, cạnh `api()` | `TODO(BE-confirm): verify the deployed Origin allowlist and cookie flow with the real BE.` | Giữ nguyên credentials/include và CSRF header của helper; chưa xác minh proxy/cookie/Origin triển khai thật. Không sửa cấu hình CORS. |
| `src/app/state/auth-session.ts:94`, `restore()` | `TODO(BE-confirm): verify offline reload with the production service worker after its first online install.` | Khôi phục danh tính chỉ chạy được khi ứng dụng đã được trình duyệt tải; không coi test TestBed là chứng minh app shell offline. |
| `src/app/state/experiments-store.ts:200`, nhánh conflict của `sync()` | `TODO(BE-confirm): confirm live serverData shape; unreadable data must preserve the local record.` | Thử đọc serverData bằng `fromServer()` như raw record. Dữ liệu khác null nhưng không đọc được hoặc sai clientId bị đánh dấu invalidServer; cả object rỗng cũng đi vào nhánh bảo vệ này. Null/undefined giữ cách hiểu server vắng mặt như luồng cũ. |
| `src/app/state/experiments-store.ts:214`, trước pull xác minh duplicate | `TODO(BE-confirm): duplicate may omit serverVersion; only the pulled record proves acknowledgement.` | Không dựa version của duplicate; yêu cầu bản pull có serverVersion nguyên dương cùng mutation, hoặc tombstone cho delete. |

Các lựa chọn triển khai đã dùng và giới hạn tương ứng:

- Giữ snapshot bên trong `algorithm.config` theo tài liệu v2; không đổi sang snapshot field cấp ngoài cùng. Việc BE giữ nguyên cấu trúc này được lấy từ tài liệu, chưa kiểm chứng end-to-end.
- Khi có duplicate, bỏ cursor để tìm cả bản đã cập nhật từ trước cửa sổ 60 giây. Đây là lựa chọn triển khai để xác minh key cũ.
- Kiểm tra scope rỗng trong `readRemote()` dùng `this.all()` đã được `loadScope()` nạp từ IndexedDB, không truy vấn IndexedDB mới cho từng pull. Không phát hiện riêng trường hợp IndexedDB bị xóa bên ngoài trong khi trang đang mở và `all` còn dữ liệu.
- Nếu một raw record không parse được, không tiến cursor; các record parse được vẫn được gộp. Không thêm thông báo UI riêng cho record bị bỏ qua ở nhánh này.
- Danh tính cache hợp lệ về hình dạng được dùng để chọn scope local; không coi nó chứng minh cookie còn hiệu lực. Sync vẫn xác minh `/auth/me`.
- Nhánh xét `results[]` quyết định từng operation; code có khai báo kiểu `success` trong response nhưng không dùng cờ này làm điều kiện riêng để chấp nhận hay từ chối toàn bộ batch.

## 7. Những phần chưa kiểm chứng và giới hạn của báo cáo

- Không gọi BE thật; chưa chứng minh dữ liệu đã được ghi vào MongoDB, cookie thật đi qua proxy đúng, Origin được chấp nhận, hoặc response thực tế khớp handbook.
- Chưa chạy trình duyệt production cùng Service Worker rồi ngắt mạng và tải lại. Đã đọc `ngsw-config.json`, `angular.json`, `app.config.ts`: có cấu hình cache app shell và Service Worker chỉ bật ngoài dev, nhưng đó là kiểm tra source, không phải kiểm thử vận hành.
- Chưa chạy `npm run serve:ssr:Hoiquy3d` trong tác vụ này. Production build bị chặn bởi budget CSS nêu trên.
- Chưa kiểm thử trên hai thiết bị thật; conflict, duplicate và tombstone từ thiết bị khác đều được dựng bằng mock response.
- Reload trong test là `TestBed.resetTestingModule()`, không phải reload trang thật; disk mock không kiểm chứng transaction, quota, eviction hoặc độ bền IndexedDB khi trình duyệt/thiết bị bị đóng đột ngột.
- Test synthetic xác nhận snapshot giữ bốn kind trong store; chưa mở lại thí nghiệm synthetic qua màn hình/engine trên thiết bị khác. Không thay đổi engine hoặc suy đoán kind bị thiếu.
- Không có test riêng trong phần bổ sung cho mọi nhánh bảo vệ, ví dụ payload riêng lẻ vượt 8 MiB, bản legacy thiếu mutationId, cursor của hai tài khoản khác nhau, hoặc IndexedDB bị xóa bên ngoài khi trang còn mở. Không coi tổng 208 test là bằng chứng bao phủ mọi trường hợp.
- Không chứng minh bất biến “không mất dữ liệu” cho mọi sự cố lưu trữ/hệ điều hành. Bằng chứng hiện có là code bảo vệ và các ca mock đã liệt kê, gồm lỗi mạng/HTTP, pending write khi đổi phiên, phản hồi cũ và lỗi ghi bản sao conflict.

## 8. Phạm vi thay đổi và đối chiếu hiện trạng

Không sửa code ngoài phạm vi mục 2 của tài liệu v2. Không sửa engine, csv-import, lab-store, results-panel, server.ts, schema/version IndexedDB, dependency hoặc API ngoài phạm vi. Giữ nguyên Guest ID `guest` không lưu/không gọi API, đăng ký không tự đăng nhập và payload snapshot; các chuỗi UI cũ được giữ, thông báo mới cho lỗi/tạo bản sao dùng tiếng Việt.

`REPORT-FE-SYNC.md` và `fe-sync.patch` là hai artifact thêm ngoài danh sách file code của mục 2, theo yêu cầu lập báo cáo/xuất patch hiện tại của người dùng.

Không gặp khác biệt so với mục 3 của v2 khiến mục 4–5 không áp dụng được. Rủi ro bổ sung được phát hiện và sửa trong phạm vi là `persist()` cũ bỏ lệnh ghi nếu scope đổi, cùng thứ tự xóa bản gốc trước khi lưu bản sao trong `resolveConflict()`.

Các thay đổi workspace sau đã tồn tại trước lượt triển khai v2, không do tác vụ đồng bộ này tạo và không nằm trong patch:

- `docs/CONG-NGHE-VA-HIEU-UNG.md`
- `src.rar`
- `src/app/features/viewport3d/viewport3d.html`
- `src/app/features/viewport3d/viewport3d.spec.ts`
- `src/app/features/viewport3d/viewport3d.ts`

Patch được xuất từ diff working tree so với Git index, giới hạn đúng bốn file code/spec:

```powershell
git diff --no-ext-diff --no-color --output=fe-sync.patch -- src/app/state/auth-session.ts src/app/state/auth-session.spec.ts src/app/state/experiments-store.ts src/app/state/experiments-store.spec.ts
```

Không stage, commit hoặc hoàn tác các thay đổi đã có. Hai file báo cáo/patch là file mới chưa tracked, không tự xuất hiện trong `git diff` trên bốn file code/spec.
