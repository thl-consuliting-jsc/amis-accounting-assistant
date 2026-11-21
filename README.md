# AMIS Accounting Automation & Reconciliation System

> **Tổ chức:** THL Consulting JSC  
> **Kỹ sư triển khai:** Trần Hùng  
> **Phiên bản:** `v2.5.1` (Hỗ trợ Kiến trúc Song hành: Desktop App Native & Web VPS Tự động)  

---

## 📌 Giới thiệu dự án

Hệ thống **AMIS Accounting Automation & Reconciliation System** là giải pháp phần mềm chuyên biệt hỗ trợ tự động hóa toàn diện quy trình xử lý, bóc tách và đối soát dữ liệu sao kê ngân hàng với phần mềm kế toán **MISA AMIS**.

Hệ thống giúp chuyển đổi quy trình thủ công (6 - 8 tiếng/ngày) thành quy trình tự động chỉ mất 1 - 2 phút với độ chính xác số dư đối soát tuyệt đối 100% ($\text{Diff} = 0đ$).

---

## 🏗️ Cấu trúc kiến trúc hệ thống (Monorepo)

```
├── Client/                 # Ứng dụng Frontend (Angular 17 + Rust Tauri v2)
│   ├── src/                # Mã nguồn giao diện Angular (Standalone Components, Signals)
│   ├── src-tauri/          # Lớp Desktop Native tích hợp OS (Rust Tauri)
│   └── package.json
│
├── Server/                 # Dịch vụ Backend WebAPI (ASP.NET Core 8 WebAPI)
│   ├── Controllers/        # RESTful API endpoints điều khiển nghiệp vụ
│   ├── Engine/             # Lõi đối soát kế toán & quy tắc định khoản tự động
│   ├── Repositories/       # Tầng truy xuất dữ liệu (Dapper / SQL Server)
│   ├── Services/           # Logic nghiệp vụ xử lý dữ liệu sao kê & mẫu biểu
│   └── Program.cs
│
├── SyncAgent/              # Tác vụ nền đồng bộ hóa dữ liệu nội bộ (Node.js)
│   ├── agent.js            # Service giám sát tệp và đồng bộ thời gian thực
│   └── config.json
│
├── docs/                   # Tài liệu đặc tả kỹ thuật & hướng dẫn nghiệp vụ
│   ├── SYSTEM_DEVELOPMENT_REQUIREMENT.md
│   └── images/
│
├── build-publish.ps1       # Script tự động hóa đóng gói phát hành (CI/CD Local)
└── cap-nhat-vps.ps1        # Script tự động triển khai cập nhật lên máy chủ VPS
```

---

## ⚡ Các tính năng chính

1. **Bộ máy phân tích sao kê & Bóc tách quy tắc thông minh (Rules Engine):**
   - Tự động nhận diện ngân hàng (Vietcombank, Techcombank, VPBank, MBBank, BIDV...).
   - Thuật toán Fuzzy Matching 8 cấp độ đối soát tên đối tác, số tài khoản, mã số thuế và số hóa đơn.
   - Định khoản tự động các nghiệp vụ nợ/có (TK 112, 131, 331, 511, 642, 334...).

2. **Kiểm soát cân bằng số dư 100%:**
   - Cơ chế chặn nghiêm ngặt: nếu phát hiện chênh lệch số dư dù chỉ $1đ$, hệ thống lập tức cảnh báo và khóa chức năng xuất file để kế toán viên rà soát.

3. **Kiến trúc Song hành (Dual-Mode):**
   - **Desktop App Native:** Chạy offline trực tiếp trên máy tính kế toán viên, đọc ghi tệp siêu tốc, bảo mật dữ liệu tuyệt đối.
   - **Web VPS Service:** Cổng vận hành trực tuyến, cơ chế tệp tạm tự hủy đảm bảo không chiếm dụng tài nguyên lưu trữ máy chủ.

4. **Tự động sinh bộ chứng từ & biểu mẫu AMIS:**
   - Xuất đầy đủ 9 file bảng kê chuẩn định dạng import trực tiếp vào MISA AMIS (Thu tiền, Chi tiền, Báo Nợ, Báo Có, Bảng kê mua vào/bán ra...).

---

## 🚀 Hướng dẫn cài đặt & Khởi chạy

### 1. Yêu cầu môi trường
- **Node.js:** `>= 18.x` & `pnpm` (hoặc `npm`)
- **.NET SDK:** `>= 8.0`
- **Rust Toolchain:** (Dành cho build Desktop Tauri)
- **Hệ cơ sở dữ liệu:** Microsoft SQL Server 2019+

### 2. Khởi chạy Backend Server
```bash
cd Server
dotnet restore
dotnet run
```
API mặc định khởi chạy tại cổng HTTP cấu hình trong `appsettings.json`.

### 3. Khởi chạy Frontend Client
```bash
cd Client
pnpm install
# Khởi chạy giao diện Web:
pnpm start
# Khởi chạy Desktop App (Tauri):
pnpm tauri dev
```

---

## 🔒 Bản quyền & Phân phối
Dự án được phát triển và quản lý nội bộ bởi **THL Consulting JSC**.
Mọi hành vi sao chép hoặc phân phối ra bên ngoài khi chưa có văn bản đồng thuận đều bị nghiêm cấm.
