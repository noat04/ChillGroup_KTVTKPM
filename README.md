# 🍓 Fruitweb — Website Bán Trái Cây Đa Tầng (Microservices)

> Đồ án môn **Kiến trúc và Thiết kế Phần mềm**  
> Trường Đại học Công nghiệp TP.HCM — Nhóm Chill Group

**Thành viên:**
- Nguyễn Danh Minh Toàn — 22645251
- Phạm Như Ý — 22644931
- Trần Quốc Đảm — 22642101

---

## 📌 Giới Thiệu

**Fruitweb** là nền tảng thương mại điện tử bán trái cây, được xây dựng theo kiến trúc **Microservices** kết hợp **Event-Driven Architecture** và **CQRS** (Command Query Responsibility Segregation). Hệ thống tách biệt hoàn toàn tầng giao diện và tầng nghiệp vụ, sử dụng Redis làm event bus và read model để tối ưu hiệu suất đọc dữ liệu.

---

## 🛠️ Công Nghệ Sử Dụng

### Frontend

| Công nghệ | Mục đích |
|---|---|
| React + Vite | Giao diện người dùng (SPA) |
| React Router | Điều hướng client-side |
| JavaScript / CSS | Ngôn ngữ & styling |

### Backend (Microservices)

| Service | Công nghệ | Trách nhiệm |
|---|---|---|
| API Gateway | Node.js / Express | Điểm vào duy nhất, xác thực JWT, rate limiting, định tuyến |
| User Service | Node.js / Express + MongoDB | Đăng ký, đăng nhập, quản lý hồ sơ |
| Product Service (Catalog) | Node.js / Express + MongoDB | Quản lý danh mục sản phẩm |
| Order Service | Node.js / Express + MongoDB | Tạo và quản lý đơn hàng |
| Inventory Service | Node.js / Express + MongoDB | Quản lý tồn kho, xử lý giữ hàng |
| Projection Service | Node.js / Express + Redis | Dựng read model sản phẩm lên Redis |

### Thư viện & Công cụ Backend

| Công nghệ | Mục đích |
|---|---|
| Mongoose | ODM cho MongoDB |
| JWT | Xác thực người dùng |
| bcrypt | Mã hóa mật khẩu |
| Zod | Validation dữ liệu đầu vào |
| Nodemailer (SMTP) | Gửi email OTP, hóa đơn COD |
| Cloudinary | Lưu trữ hình ảnh sản phẩm |
| Google Gemini API | Gợi ý sản phẩm bằng AI |

### Database

| Database | Vai trò |
|---|---|
| MongoDB Atlas | Database chính cho từng service (database-per-service) |
| Redis (Hash) | Read model `projection:products` — tối ưu truy vấn sản phẩm |
| Redis Streams | Event bus bất đồng bộ giữa các service |

**Các database MongoDB riêng biệt theo service:**
`fruitweb_users` · `fruitweb_catalog` · `fruitweb_orders` · `fruitweb_inventory`

### DevOps & Infrastructure

| Công nghệ | Mục đích |
|---|---|
| Docker Compose | Orchestration MongoDB + Redis local |
| `.env` per service | Cấu hình môi trường tách biệt (port, DB, Redis, JWT, SMTP, Cloudinary, Gemini) |
| Agile/Scrum | Quản lý tiến độ: backlog, sprint planning, phân công nhiệm vụ |

---

## 🏗️ Kiến Trúc Hệ Thống

**Kiểu kiến trúc:** Microservices + Event-Driven + CQRS

```
┌─────────────────────────────────────────┐
│           React Frontend (Vite)         │
└───────────────────┬─────────────────────┘
                    │ REST API
         ┌──────────▼──────────┐
         │     API Gateway     │
         │  JWT · Rate Limit   │
         │  Auth · Routing     │
         └──┬──────┬──────┬───┘
            │      │      │
   ┌────────▼─┐ ┌──▼───┐ ┌▼──────────┐
   │  User    │ │Product│ │  Order    │
   │ Service  │ │Service│ │ Service   │
   └────┬─────┘ └──┬────┘ └─────┬────┘
        │          │             │
        │    ┌─────▼──────┐      │
        │    │ Projection │      │
        │    │  Service   │      │
        │    └─────┬──────┘      │
        │          │             │
   ┌────▼──────────▼─────────────▼────┐
   │              Redis               │
   │  Hash: projection:products       │
   │  Streams: Event Bus              │
   └──────────────────────────────────┘
        │          │             │
   ┌────▼──┐  ┌────▼──┐  ┌──────▼──────┐
   │Mongo  │  │Mongo  │  │  Inventory  │
   │_users │  │_catalog  │  Service    │
   └───────┘  └────────┘ └─────────────┘
```

### Luồng sự kiện chính (Event Flow)

```
[Admin tạo/sửa sản phẩm]
  → Product Service lưu MongoDB
  → Phát sự kiện: ProductUpserted
    → Inventory Service: cập nhật InventoryItem
    → Projection Service: cập nhật Redis projection:products

[Khách hàng đặt hàng]
  → Order Service đọc sản phẩm từ Redis projection (nhanh)
  → Lưu đơn hàng MongoDB (trạng thái: PENDING_INVENTORY)
  → Phát sự kiện: OrderCreated
    → Inventory Service kiểm tra & giữ hàng
      → Đủ hàng: phát InventoryReserved → Order: PENDING_CONFIRMATION
      → Thiếu hàng: phát InventoryRejected → Order: REJECTED
```

---

## ✅ Chức Năng Chính

### 👤 Khách vãng lai
- Xem danh sách sản phẩm đang hoạt động
- Đăng ký tài khoản
- Đăng nhập, quên mật khẩu (OTP qua email)

### 🛒 Khách hàng
- Đăng nhập bằng JWT, xem & cập nhật hồ sơ cá nhân
- Đổi mật khẩu
- Quản lý giỏ hàng: thêm, cập nhật số lượng, xóa sản phẩm
- Đặt hàng với thông tin giao hàng & phương thức thanh toán (COD, ...)
- Xem danh sách đơn hàng & chi tiết trạng thái đơn

### 🛡️ Quản trị viên (Admin)
- Quản lý sản phẩm: thêm, sửa, xóa mềm (`active = false`)
- Quản lý tồn kho theo từng `productId`
- Xem & cập nhật trạng thái đơn hàng
- Quản lý người dùng: xem, thêm, sửa, xóa tài khoản
- Dashboard báo cáo: tổng đơn, doanh thu, thống kê theo trạng thái, đơn gần đây

### ⚙️ Hệ thống nền (Background)
- Đồng bộ sản phẩm qua event `ProductUpserted` → cập nhật Inventory & Redis projection
- Xử lý tồn kho bất đồng bộ khi đặt hàng qua Redis Streams
- Gợi ý sản phẩm bằng **Google Gemini AI**

---

## 🔒 Bảo Mật

- **JWT** xác thực tại API Gateway, phân quyền `customer` / `admin`
- **bcrypt** mã hóa mật khẩu người dùng
- **Rate limiting** tại Gateway để chống spam
- Dữ liệu nhạy cảm (mật khẩu, reset token) không trả về client
- Xóa sản phẩm theo dạng **soft delete** để bảo toàn lịch sử đơn hàng

---

## 🚀 Hướng Phát Triển Tương Lai

### DevOps & Production-Ready
- **Docker hóa toàn bộ** frontend + backend services với `restart policy` và `healthcheck`
- **CI/CD với GitHub Actions** — tự động test, build, deploy
- **Load balancer + replica** cho các service quan trọng (Gateway, Order, Inventory)
- **Monitoring:** Prometheus + Grafana
- **Logging tập trung:** ELK Stack hoặc Loki

### Tăng độ bền vững hệ thống
- **Retry (3–5s), timeout thống nhất, circuit breaker, fallback response** cho HTTP call giữa service
- **Redis Sentinel / Cluster** — loại bỏ single point of failure
- **TTL + cache invalidation strategy** và cơ chế rebuild projection khi Redis mất dữ liệu

### Nâng cấp chức năng
- **Thanh toán online** (VNPay, MoMo, Stripe)
- **Quản lý vận chuyển**, tracking đơn hàng
- **Mã giảm giá / voucher**, đánh giá & nhận xét sản phẩm
- **Thông báo realtime** (WebSocket / SSE)
- **AI Agent nâng cao:** tư vấn sản phẩm theo ngữ cảnh, đề xuất combo, phân tích đơn hàng, cảnh báo tồn kho thấp

### Chất lượng mã nguồn
- **Unit test + Integration test** đầy đủ cho các luồng quan trọng
- **Database migration** chính thức
- **Phân quyền admin chi tiết** (quản lý từng module độc lập)

---

*Dự án phát triển theo phương pháp Agile/Scrum — Nhóm Chill Group, 2025*
