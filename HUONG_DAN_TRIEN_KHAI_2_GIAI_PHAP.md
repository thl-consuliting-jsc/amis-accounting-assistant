# 📘 HƯỚNG DẪN TRIỂN KHAI VẬN HÀNH SONG HÀNH 2 GIẢI PHÁP
> **Hệ thống:** AMIS MISA Accounting Automation & Reconciliation Assistant  
> **Phiên bản:** `v2.5.1` (Hỗ trợ Dual-Mode: Web VPS Tự Hủy & Desktop App Native)  
> **Ngày cập nhật:** 18/11/2026

---

## 📑 MỤC LỤC
1. [Tổng quan 2 Giải pháp Song hành](#1-tổng-quan-2-giải-pháp-song-hành)
2. [Cập nhật Máy chủ VPS (Dành cho Quản trị viên)](#2-cập-nhật-máy-chủ-vps-dành-cho-quản-trị-viên)
3. [Hướng dẫn Kế toán sử dụng GIẢI PHÁP 1: Web VPS Tự động](#3-hướng-dẫn-kế-toán-sử-dụng-giải-pháp-1-web-vps-tự-động)
4. [Hướng dẫn Kế toán sử dụng GIẢI PHÁP 2: Desktop App Native](#4-hướng-dẫn-kế-toán-sử-dụng-giải-pháp-2-desktop-app-native)
5. [Bảng so sánh chi tiết & Khuyến nghị](#5-bảng-so-sánh-chi-tiết--khuyến-nghị)

---

## 1. TỔNG QUAN 2 GIẢI PHÁP SONG HÀNH

Hệ thống cung cấp 2 phương thức vận hành song song:

```
                            ┌────────────────────────────────────────┐
                            │      AMIS ASSISTANT (DUAL-MODE)        │
                            └───────────────────┬────────────────────┘
                                                │
                 ┌──────────────────────────────┴──────────────────────────────┐
                 │                                                             │
  ▼ GIẢI PHÁP 1: WEB VPS TỰ ĐỘNG LẤY TỆP                       ▼ GIẢI PHÁP 2: DESKTOP APP NATIVE
  - Địa chỉ: http://103.107.183.86:9092                        - Ứng dụng: Tro_Ly_Ke_Toan_Setup_v2.5.0.exe
  - Cơ chế: Xử lý Tạm thời & Tự hủy sau khi xong               - Cơ chế: Đọc & Lưu trực tiếp ổ đĩa D:\
  - Không kéo thả: Bấm nút tự lấy theo cty chọn                - Không cần mạng: Xử lý offline siêu tốc
  - Ổ cứng VPS: GẦN 0 MB LƯU TRỮ VĨNH VIỄN                     - Ổ cứng VPS: 0 MB LƯU TRỮ FILE
```

---

## 2. CẬP NHẬT MÁY CHỦ VPS (DÀNH CHO QUẢN TRỊ VIÊN)

File mã nguồn đóng gói mới nhất đã có sẵn tại:
👉 `D:\2026\1.Work\9.PHUONG\publish.zip` *(50.5 MB)*

### Các bước cập nhật lên VPS:
1. Kết nối Remote Desktop (RDP) vào máy chủ VPS `103.107.183.86`.
2. Copy file `publish.zip` vào thư mục ứng dụng trên VPS:
   `C:\inetpub\wwwroot\HUNG_TEST\0.App\` (hoặc Desktop của VPS).
3. Click chuột phải vào file **`cap-nhat-vps.bat`** trên VPS $\rightarrow$ Chọn **"Run as administrator"**.
4. Chờ script tự động giải nén, thiết lập quyền IIS và kích hoạt phiên bản mới trong 10 giây.
5. Kiểm tra trên trình duyệt: Truy cập `http://103.107.183.86:9092` thấy huy hiệu `🌐 Web Tạm thời (Tự hủy)` là hoàn tất!

---

## 3. HƯỚNG DẪN KẾ TOÁN SỬ DỤNG GIẢI PHÁP 1: WEB VPS TỰ ĐỘNG

Dành cho kế toán muốn mở trình duyệt làm việc từ xa, không cần cài đặt phần mềm nặng.

### Bước 1: Khởi động Trợ lý ngầm trên máy tính
1. Vào thư mục: `D:\2026\1.Work\9.PHUONG\SyncAgent`
2. Nhấp đúp chuột vào file: **`CHAY_NGAM_SERVICE.vbs`**
   *(Trợ lý sẽ chạy ngầm hoàn toàn và không hiện bất kỳ cửa sổ đen nào làm phiền bạn).*
3. *(Tùy chọn cho tự chạy cùng máy tính)*: Nhấn `Windows + R` $\rightarrow$ Gõ `shell:startup` $\rightarrow$ Kéo shortcut của file `CHAY_NGAM_SERVICE.vbs` vào đây.

### Bước 2: Thao tác lập file trên Web
1. Mở trình duyệt truy cập: **`http://103.107.183.86:9092`**
2. Chọn **Công ty** bạn cần làm (VD: `CÔNG TY CỔ PHẦN ZFUND` hoặc `CÔNG TY CỔ PHẦN CÔNG NGHỆ ONDI`).
3. Chọn **Kỳ kế toán** (VD: `Tháng 10/2026`).
4. Bấm nút: **`▶ LẬP FILE`**
   * **Không cần kéo thả:** Hệ thống tự động báo cho Trợ lý ngầm vào đúng thư mục của công ty đó trên máy bạn, lấy các file sao kê & hóa đơn tháng 10.
   * Tiến trình sẽ hiển thị trực quan: *“Đang kết nối lấy tệp... $\rightarrow$ Đang xử lý... $\rightarrow$ Lập file AMIS thành công!”*
   * Bảng đối soát số dư ngân hàng khớp 100% (Diff = 0đ) hiển thị ngay lập tức.
   * Nhấn nút **Tải file kết quả ZIP** về máy để nạp vào phần mềm MISA AMIS.
5. **Bảo mật & Dung lượng:** Toàn bộ file sao kê tải lên được máy chủ xóa sạch ngay sau phiên xử lý, không lưu lại trên máy chủ.

---

## 4. HƯỚNG DẪN KẾ TOÁN SỬ DỤNG GIẢI PHÁP 2: DESKTOP APP NATIVE

Dành cho kế toán phụ trách chính, muốn thao tác trực tiếp trên máy tính nhanh như chớp.

### Bước 1: Cài đặt phần mềm
1. Tìm file cài đặt tại:
   👉 `D:\2026\1.Work\9.PHUONG\Tro_Ly_Ke_Toan_Setup_v2.5.0.exe`
2. Nhấp đúp chuột để cài đặt (quá trình cài đặt tự động tạo biểu tượng trên Desktop).

### Bước 2: Thao tác lập file
1. Mở ứng dụng **Trợ lý kế toán** từ màn hình Desktop.
2. Giao diện hiển thị huy hiệu: `💻 Desktop (Trực tiếp ổ D:)`.
3. Bỏ file sao kê vào thư mục: `D:\2026\1.Work\9.PHUONG\5. DU LIEU\THANG 10.2026`.
4. Bấm nút **`▶ LẬP FILE`**.
5. Ứng dụng đọc trực tiếp ổ đĩa và xuất ngay 9 file AMIS ra:
   `D:\2026\1.Work\9.PHUONG\4. UP PHAN MEM\THANG 10.2026\`.
6. Bấm nút **Mở thư mục kết quả** để mở trực tiếp trong Windows Explorer.

---

## 5. BẢNG SO SÁNH CHI TIẾT & KHUYẾN NGHỊ

| Tiêu chí so sánh | Giải pháp 1: Web VPS Tự Động | Giải pháp 2: Desktop App Native |
| :--- | :--- | :--- |
| **Giao diện thao tác** | Trình duyệt Web (`Chrome / Edge / Firefox`) | Ứng dụng Windows độc lập (`.exe`) |
| **Cách nạp dữ liệu** | Tự động lấy tệp qua Trợ lý ngầm | Đọc trực tiếp từ ổ đĩa `D:\...` |
| **Thao tác kéo thả** | **Không cần** (Bấm nút tự nhận diện cty) | **Không cần** (Đọc thẳng folder) |
| **Lưu trữ trên VPS** | **0 MB** (Tự động xóa sạch sau phiên) | **0 MB** (Không gửi file lên VPS) |
| **Lưu trữ trên máy tính**| Tải về file ZIP kết quả khi xong | Lưu vĩnh viễn trong `4. UP PHAN MEM` |
| **Yêu cầu kết nối mạng** | Cần Internet để kết nối Web VPS | Chỉ cần mạng để đồng bộ SQL Database |
| **Tốc độ xử lý** | Nhanh (~2-4 giây) | Cực nhanh (~0.5-1 giây) |
| **Đối tượng phù hợp** | Kế toán duyệt từ xa, làm việc linh hoạt | Kế toán chính làm việc thường xuyên tại máy |

---
*Tài liệu được phát hành và kiểm thử thành công trên toàn bộ hệ thống AMIS Assistant 2026.*
