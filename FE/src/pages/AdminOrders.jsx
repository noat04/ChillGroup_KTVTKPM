import React, { useEffect, useMemo, useState } from "react";
import { CheckCircle2, PackageCheck, RefreshCw, Search, Truck, XCircle } from "lucide-react";
import { apiBaseUrl } from "../config.js";
import { formatMoney } from "../utils/format.js";

const orderTabs = [
  { value: "all", label: "Tất cả" },
  { value: "PENDING_CONFIRMATION", label: "Chờ xác nhận" },
  { value: "CONFIRMED", label: "Đã xác nhận" },
  { value: "SHIPPING", label: "Đang giao" },
  { value: "COMPLETED", label: "Hoàn tất" },
  { value: "CANCELLED", label: "Đã hủy" }
];

export function AdminOrders({ token, setMessage, onUnauthorized }) {
  const [orders, setOrders] = useState([]);
  const [status, setStatus] = useState("all");
  const [paymentStatus, setPaymentStatus] = useState("all");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  async function adminFetch(path, options = {}) {
    let response;
    try {
      response = await fetch(`${apiBaseUrl}${path}`, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          ...(options.headers || {})
        }
      });
    } catch {
      setMessage?.("Service đang tạm ngưng. Bạn có thể chuyển trang khác và thử lại.", "warning");
      return null;
    }

    if (response.status === 401) {
      setMessage("Phiên đăng nhập admin đã hết hạn. Vui lòng đăng nhập lại.", "warning");
      onUnauthorized?.();
      return null;
    }

    if (!response.ok) {
      const result = await response.json().catch(() => ({}));
      setMessage?.(
        result.error || "Không tải được dữ liệu. Vui lòng thử lại.",
        response.status === 503 ? "warning" : "error"
      );
      return null;
    }

    return response.json();
  }

  async function loadOrders() {
    const nextOrders = await adminFetch("/admin/orders");
    setOrders(Array.isArray(nextOrders) ? nextOrders : []);
  }

  useEffect(() => {
    void loadOrders();
  }, []);

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const text = `${order.orderId} ${order.customerName} ${order.phone} ${order.address} ${(order.items || [])
        .map((item) => item.name)
        .join(" ")}`.toLowerCase();

      const matchesQuery = text.includes(query.toLowerCase());
      const matchesStatus = status === "all" || order.status === status;
      const matchesPayment = paymentStatus === "all" || order.paymentStatus === paymentStatus;

      return matchesQuery && matchesStatus && matchesPayment;
    });
  }, [orders, paymentStatus, query, status]);

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedOrders = filteredOrders.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const startItem = filteredOrders.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, filteredOrders.length);

  function resetPaging() {
    setPage(1);
  }

  function countByStatus(nextStatus) {
    if (nextStatus === "all") {
      return orders.length;
    }
    return orders.filter((order) => order.status === nextStatus).length;
  }

  async function updateOrderStatus(orderId, nextStatus, nextPaymentStatus) {
    await adminFetch(`/admin/orders/${orderId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status: nextStatus, paymentStatus: nextPaymentStatus })
    });
    setMessage("Đã cập nhật trạng thái đơn hàng.", "success");
    await loadOrders();
  }

  return (
    <main className="container py-4 py-lg-5">
      <section className="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center gap-3 mb-4">
        <div>
          <span className="badge rounded-pill text-bg-success mb-2">Admin</span>
          <h1 className="fw-bold text-success mb-1">Quản lý đơn hàng</h1>
          <p className="text-secondary mb-0">Kiểm tra, lọc và cập nhật trạng thái đơn hàng.</p>
        </div>

        <button type="button" className="btn btn-outline-success rounded-pill px-4" onClick={loadOrders}>
          <RefreshCw size={18} className="me-2" />
          Tải lại
        </button>
      </section>

      <section className="card border-0 shadow-sm rounded-5 mb-4">
        <div className="card-body p-4">
          <div className="d-flex flex-wrap gap-2 mb-4">
            {orderTabs.map((tab) => (
              <button
                type="button"
                className={`btn rounded-pill px-3 ${status === tab.value ? "btn-success" : "btn-outline-success"}`}
                key={tab.value}
                onClick={() => {
                  setStatus(tab.value);
                  resetPaging();
                }}
              >
                {tab.label}
                <span className={`badge rounded-pill ms-2 ${status === tab.value ? "text-bg-light text-success" : "text-bg-success"}`}>
                  {countByStatus(tab.value)}
                </span>
              </button>
            ))}
          </div>

          <div className="row g-3 align-items-end">
            <div className="col-lg-6">
              <label className="form-label fw-semibold">Tìm kiếm</label>
              <div className="input-group">
                <span className="input-group-text bg-white">
                  <Search size={18} />
                </span>
                <input
                  className="form-control"
                  placeholder="Tìm mã đơn, khách hàng, số điện thoại..."
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    resetPaging();
                  }}
                />
              </div>
            </div>

            <div className="col-sm-6 col-lg-3">
              <label className="form-label fw-semibold">Thanh toán</label>
              <select
                className="form-select"
                value={paymentStatus}
                onChange={(event) => {
                  setPaymentStatus(event.target.value);
                  resetPaging();
                }}
              >
                <option value="all">Tất cả</option>
                <option value="pending">Chưa thanh toán</option>
                <option value="paid">Đã thanh toán</option>
              </select>
            </div>

            <div className="col-sm-6 col-lg-3">
              <label className="form-label fw-semibold">Mỗi trang</label>
              <select
                className="form-select"
                value={pageSize}
                onChange={(event) => {
                  setPageSize(Number(event.target.value));
                  resetPaging();
                }}
              >
                <option value="10">10</option>
                <option value="20">20</option>
                <option value="30">30</option>
              </select>
            </div>
          </div>
        </div>
      </section>

      {orders.length === 0 && (
        <div className="alert alert-light border rounded-4">Chưa có đơn hàng.</div>
      )}

      {orders.length > 0 && filteredOrders.length === 0 && (
        <div className="alert alert-warning rounded-4">Không có đơn hàng phù hợp.</div>
      )}

      <section className="d-flex flex-column gap-3">
        {pagedOrders.map((order) => (
          <article className="card border-0 shadow-sm rounded-5" key={order.orderId}>
            <div className="card-body p-4">
              <div className="row g-3 align-items-center">
                <div className="col-lg-3">
                  <p className="text-secondary small mb-1">Mã đơn</p>
                  <h5 className="fw-bold mb-1">{order.orderId}</h5>
                  <span className={`badge rounded-pill ${getOrderBadgeClass(order.status)}`}>
                    {order.status}
                  </span>
                </div>

                <div className="col-lg-3">
                  <p className="text-secondary small mb-1">Khách hàng</p>
                  <h6 className="fw-bold mb-1">{order.customerName}</h6>
                  <small className="text-secondary">{order.phone || "Chưa có SĐT"}</small>
                </div>

                <div className="col-lg-2">
                  <p className="text-secondary small mb-1">Thanh toán</p>
                  <span className={`badge rounded-pill ${order.paymentStatus === "paid" ? "text-bg-success" : "text-bg-warning"}`}>
                    {order.paymentMethod} - {order.paymentStatus}
                  </span>
                </div>

                <div className="col-lg-2">
                  <p className="text-secondary small mb-1">Tổng tiền</p>
                  <strong className="fs-5 text-danger">{formatMoney(order.total || 0)}</strong>
                </div>

                <div className="col-lg-2">
                  <p className="text-secondary small mb-2">Thao tác</p>
                  <div className="d-flex flex-wrap gap-2">
                    <button type="button" className="btn btn-sm btn-outline-primary rounded-pill" onClick={() => updateOrderStatus(order.orderId, "CONFIRMED")}>
                      <CheckCircle2 size={15} className="me-1" />
                      Xác nhận
                    </button>
                    <button type="button" className="btn btn-sm btn-outline-info rounded-pill" onClick={() => updateOrderStatus(order.orderId, "SHIPPING")}>
                      <Truck size={15} className="me-1" />
                      Giao
                    </button>
                    <button type="button" className="btn btn-sm btn-outline-success rounded-pill" onClick={() => updateOrderStatus(order.orderId, "COMPLETED", "paid")}>
                      <PackageCheck size={15} className="me-1" />
                      Xong
                    </button>
                    <button type="button" className="btn btn-sm btn-outline-danger rounded-pill" onClick={() => updateOrderStatus(order.orderId, "CANCELLED")}>
                      <XCircle size={15} className="me-1" />
                      Hủy
                    </button>
                  </div>
                </div>
              </div>

              {Array.isArray(order.items) && order.items.length > 0 && (
                <div className="border-top mt-3 pt-3">
                  <p className="text-secondary small mb-2">Sản phẩm</p>
                  <div className="d-flex flex-wrap gap-2">
                    {order.items.map((item, index) => (
                      <span className="badge text-bg-light border rounded-pill" key={`${order.orderId}-${item.productId || item.name}-${index}`}>
                        {item.name} × {item.quantity}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </article>
        ))}
      </section>

      <nav className="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center gap-3 mt-4" aria-label="Phân trang đơn hàng admin">
        <span className="text-secondary">
          Hiển thị {startItem}-{endItem} / {filteredOrders.length} đơn hàng | Trang {currentPage}/{totalPages}
        </span>

        <ul className="pagination mb-0 flex-wrap">
          <li className={`page-item ${currentPage === 1 ? "disabled" : ""}`}>
            <button className="page-link" onClick={() => setPage(1)}>Đầu</button>
          </li>
          <li className={`page-item ${currentPage === 1 ? "disabled" : ""}`}>
            <button className="page-link" onClick={() => setPage((value) => Math.max(1, value - 1))}>Trước</button>
          </li>
          {Array.from({ length: totalPages }, (_, index) => index + 1).map((item) => (
            <li className={`page-item ${item === currentPage ? "active" : ""}`} key={item}>
              <button className="page-link" onClick={() => setPage(item)}>{item}</button>
            </li>
          ))}
          <li className={`page-item ${currentPage === totalPages ? "disabled" : ""}`}>
            <button className="page-link" onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>Sau</button>
          </li>
          <li className={`page-item ${currentPage === totalPages ? "disabled" : ""}`}>
            <button className="page-link" onClick={() => setPage(totalPages)}>Cuối</button>
          </li>
        </ul>
      </nav>
    </main>
  );
}

function getOrderBadgeClass(status) {
  const normalized = String(status || "").toUpperCase();
  if (normalized === "COMPLETED") return "text-bg-success";
  if (normalized === "SHIPPING") return "text-bg-info";
  if (normalized === "CONFIRMED") return "text-bg-primary";
  if (normalized === "CANCELLED") return "text-bg-danger";
  return "text-bg-warning";
}
