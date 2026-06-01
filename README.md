# Fruitweb

Web ban trai cay bang JavaScript theo huong microservice, event-driven, CQRS va space-based read model tren Redis.

## Kien truc

- `FE`: ReactJS + Vite JavaScript client cho khach mua trai cay.
- `BE/apps/gateway`: Node.js Express API gateway cho frontend.
- `BE/apps/user-service`: dang ky, dang nhap, JWT, quen mat khau va reset password qua email.
- `BE/apps/product-service`: Node.js Express service quan ly san pham, luu MongoDB, publish `ProductUpserted`.
- `BE/apps/inventory-service`: worker quan ly ton kho trong MongoDB, cache stock tren Redis, subscribe order events.
- `BE/apps/order-service`: Node.js Express command side tao don hang, luu MongoDB, publish `OrderCreated`.
- `BE/apps/projection-service`: worker query side, build Redis projections cho product list.
- `BE/packages/shared`: config, Redis client, Redis Streams event bus, Express helpers.

MongoDB duoc dung lam database , luu ben vung tren may thong qua Docker volume:

- `fruitweb_products`: san pham.
- `fruitweb_inventory`: ton kho.
- `fruitweb_orders`: don hang.
- `fruitweb_users`: tai khoan khach hang/admin va token reset mat khau.

Redis duoc dung theo 3 vai tro:

1. Event backbone: Redis Streams.
2. Space-based data grid: hash/cache/projection nam trong Redis.
3. CQRS query store: frontend doc nhanh qua gateway tu Redis projection.

## Chay local

```powershell
docker compose up -d mongo redis
cd BE
npm install
npm run dev
```

Mo terminal khac:

```powershell
cd FE
npm install
npm run dev
```

Mac dinh:

- Frontend: `http://localhost:5173`
- Gateway: `http://localhost:8080`
- User service: `http://localhost:8083`
- Inventory service: `http://localhost:8084`
- Redis: `localhost:6379`
- MongoDB: `localhost:27017`

## API chinh

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`
- `GET /api/products`
- `POST /api/products`
- `POST /api/products/seed`
- `POST /api/orders`
- `GET /api/orders/:id`
- `GET /api/admin/products`
- `GET /api/admin/inventory`
- `GET /api/admin/orders`
- `GET /api/admin/reports`
- `GET /api/health`

Tai khoan dau tien dang ky se tu dong la `admin`. Cac tai khoan sau mac dinh la `customer`.

Quen mat khau:

- Neu cau hinh SMTP trong `BE/.env`, service se gui mail that.
- Neu chua cau hinh SMTP, backend se log reset link va response tra `resetLink` de test local.

## Quan ly du an Agile/Scrum

Du an ap dung Scrum nhe, chia cong viec theo backlog, sprint va task ro rang de nhom co the theo doi tien do khi phat trien Fruitweb.

Vai tro:

- Product Owner: quan ly yeu cau, uu tien product backlog va chap nhan ket qua sprint.
- Scrum Master: theo doi tien do, go bo blocker, dam bao nhom cap nhat task hang ngay.
- Development Team: thiet ke, lap trinh, test va demo cac tinh nang trong sprint.

Product backlog:

| ID | User story | Uu tien | Trang thai |
| --- | --- | --- | --- |
| PB-01 | La khach hang, toi muon dang ky/dang nhap de quan ly tai khoan va don hang. | High | Done |
| PB-02 | La khach hang, toi muon xem danh sach san pham trai cay de chon mua. | High | Done |
| PB-03 | La khach hang, toi muon them san pham vao gio hang va dat hang. | High | Done |
| PB-04 | La admin, toi muon quan ly san pham de cap nhat gia, mo ta va ton kho. | High | Done |
| PB-05 | La admin, toi muon xem danh sach don hang va cap nhat trang thai xu ly. | Medium | Done |
| PB-06 | La he thong, toi muon dong bo su kien don hang va ton kho qua Redis Streams. | High | Done |
| PB-07 | La admin, toi muon xem bao cao don hang/doanh thu de theo doi kinh doanh. | Medium | Done |
| PB-08 | La nguoi dung, toi muon quen mat khau va dat lai mat khau qua email/link test. | Medium | Done |
| PB-09 | La nhom phat trien, toi muon docker hoa MongoDB/Redis de chay local on dinh. | Medium | Done |

Sprint plan:

| Sprint | Muc tieu | Backlog items | Ket qua |
| --- | --- | --- | --- |
| Sprint 1 | Khoi tao kien truc microservice, frontend Vite va ha tang MongoDB/Redis. | PB-02, PB-09 | Co FE/BE chay local, gateway va services ket noi ha tang. |
| Sprint 2 | Hoan thien luong tai khoan, san pham va admin product. | PB-01, PB-04, PB-08 | Co dang ky/dang nhap, reset password, CRUD/seed san pham. |
| Sprint 3 | Hoan thien dat hang, ton kho, event-driven va trang admin don hang. | PB-03, PB-05, PB-06 | Tao don hang, cap nhat ton kho, projection Redis va quan ly don hang. |
| Sprint 4 | On dinh san pham, bao cao va tai lieu demo. | PB-07 | Co dashboard/report, README va huong dan trien khai nhom. |

Task management:

| Task | Mo ta | Phu trach | Trang thai |
| --- | --- | --- | --- |
| T-01 | Thiet lap `docker-compose.yml` cho MongoDB va Redis. | Nguoi 3 | Done |
| T-02 | Xay dung gateway route `/api/products`, `/api/orders`, `/api/auth`. | Nguoi 1 | Done |
| T-03 | Xay dung `user-service` cho auth, JWT va reset password. | Nguoi 1 | Done |
| T-04 | Xay dung `product-service` va model san pham. | Nguoi 2 | Done |
| T-05 | Xay dung `order-service` command/query tao va doc don hang. | Nguoi 3 | Done |
| T-06 | Xay dung `inventory-service` lang nghe order event va cap nhat stock. | Nguoi 3 | Done |
| T-07 | Xay dung `projection-service` tao read model tren Redis. | Nguoi 2 | Done |
| T-08 | Xay dung FE: home, product list, cart, profile, my orders. | Nguoi 1 | Done |
| T-09 | Xay dung FE admin: dashboard, products, orders. | Nguoi 1 | Done |
| T-10 | Kiem thu luong chinh: seed product, login, dat hang, xem admin orders. | Ca nhom | Done |

Quy trinh Scrum:

1. Sprint planning: chon cac item co uu tien cao tu product backlog, tach thanh task nho va gan nguoi phu trach.
2. Daily scrum: moi thanh vien cap nhat da lam gi, se lam gi tiep theo va blocker neu co.
3. Development: moi task can co code, chay local duoc va duoc review theo module lien quan.
4. Sprint review: demo cac tinh nang hoan thanh tren frontend va API, doi chieu voi acceptance criteria.
5. Sprint retrospective: ghi lai diem tot, van de gap phai va hanh dong cai tien cho sprint tiep theo.

Definition of Done:

- Tinh nang chay duoc tren moi truong local voi MongoDB va Redis.
- API lien quan co response dung va frontend su dung duoc.
- Khong lam hong cac luong chinh: dang nhap, xem san pham, dat hang, quan ly admin.
- README hoac ghi chu ky thuat duoc cap nhat neu co thay doi cach chay/cach dung.
- Task duoc chuyen sang `Done` sau khi demo hoac duoc nhom xac nhan.

## Chia service cho 3 may

Dat MongoDB va Redis o mot may chung, vi tat ca service can ket noi ve hai ha tang nay. Vi du may chung co IP `192.168.1.10`:

```env
REDIS_URL=redis://192.168.1.10:6379
MONGO_URL=mongodb://192.168.1.10:27017
```

Gateway can tro den IP service that:

```env
PRODUCT_SERVICE_URL=http://192.168.1.11:8081
ORDER_SERVICE_URL=http://192.168.1.12:8082
USER_SERVICE_URL=http://192.168.1.13:8083
INVENTORY_SERVICE_URL=http://192.168.1.12:8084
```

Goi y chia nhom:

- Nguoi 1: `gateway` + `FE` + `user-service`.
- Nguoi 2: `product-service` + `projection-service`.
- Nguoi 3: `order-service` + `inventory-service` + Docker ha tang chung.
