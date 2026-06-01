import React, { useEffect, useMemo, useState } from "react";
import { RefreshCw, Search, X } from "lucide-react";
import { apiBaseUrl } from "../config.js";
import { formatMoney } from "../utils/format.js";

const statusTabs = [
  { value: "all", label: "Tất cả" },
  { value: "PENDING_CONFIRMATION", label: "Chờ xác nhận" },
  { value: "CONFIRMED", label: "Đã xác nhận" },
  { value: "SHIPPING", label: "Đang giao" },
  { value: "COMPLETED", label: "Hoàn tất" },
  { value: "CANCELLED", label: "Đã hủy" },
];

export function MyOrders({ token, setMessage }) {
  const [orders, setOrders] = useState([]);
  const [status, setStatus] = useState("all");
  const [paymentStatus, setPaymentStatus] = useState("all");
  const [query, setQuery] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);

  async function loadOrders() {
    try {
      const response = await fetch(`${apiBaseUrl}/my/orders`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const result = await response.json().catch(() => []);

      if (!response.ok) {
        setMessage?.(
          result.error || "Không tải được đơn hàng. Vui lòng thử lại.",
          "warning"
        );
        return;
      }

      setOrders(Array.isArray(result) ? result : []);
    } catch {
      setMessage?.(
        "order-service đang tạm ngưng. Bạn có thể thử lại sau.",
        "warning"
      );
    }
  }

  useEffect(() => {
    void loadOrders();
  }, [token]);

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const searchable = `${order.orderId} ${order.customerName} ${(order.items || [])
        .map((item) => item.name)
        .join(" ")}`.toLowerCase();

      const matchesQuery = searchable.includes(query.toLowerCase());
      const matchesStatus = status === "all" || order.status === status;
      const matchesPayment =
        paymentStatus === "all" || order.paymentStatus === paymentStatus;

      return matchesQuery && matchesStatus && matchesPayment;
    });
  }, [orders, paymentStatus, query, status]);

  function countByStatus(nextStatus) {
    if (nextStatus === "all") {
      return orders.length;
    }

    return orders.filter((order) => order.status === nextStatus).length;
  }

  return (
    <main className="container py-4 py-lg-5">
      <section className="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center gap-3 mb-4">
        <div>
          <span className="badge rounded-pill text-bg-success mb-2">
            Tài khoản
          </span>
          <h1 className="fw-bold text-success mb-1">Đơn của tôi</h1>
          <p className="text-secondary mb-0">
            Theo dõi lịch sử mua hàng và trạng thái giao hàng.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-outline-success rounded-pill px-4"
          onClick={loadOrders}
        >
          <RefreshCw size={18} className="me-2" />
          Tải lại
        </button>
      </section>

      <section className="card border-0 shadow-sm rounded-5 mb-4">
        <div className="card-body p-4">
          <div className="d-flex flex-wrap gap-2 mb-4">
            {statusTabs.map((tab) => (
              <button
                type="button"
                className={`btn rounded-pill ${
                  status === tab.value ? "btn-success" : "btn-outline-success"
                }`}
                key={tab.value}
                onClick={() => setStatus(tab.value)}
              >
                {tab.label}

                <span
                  className={`badge rounded-pill ms-2 ${
                    status === tab.value
                      ? "text-bg-light text-success"
                      : "text-bg-success"
                  }`}
                >
                  {countByStatus(tab.value)}
                </span>
              </button>
            ))}
          </div>

          <div className="row g-3">
            <div className="col-lg-8">
              <label className="form-label fw-semibold">Tìm kiếm</label>
              <div className="input-group">
                <span className="input-group-text bg-white">
                  <Search size={18} />
                </span>

                <input
                  className="form-control"
                  placeholder="Tìm theo mã đơn, tên sản phẩm..."
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </div>
            </div>

            <div className="col-lg-4">
              <label className="form-label fw-semibold">Thanh toán</label>
              <select
                className="form-select"
                value={paymentStatus}
                onChange={(event) => setPaymentStatus(event.target.value)}
              >
                <option value="all">Tất cả</option>
                <option value="pending">Chưa thanh toán</option>
                <option value="paid">Đã thanh toán</option>
              </select>
            </div>
          </div>
        </div>
      </section>

      {orders.length === 0 && (
        <div className="alert alert-light border rounded-4">
          Bạn chưa có đơn hàng.
        </div>
      )}

      {orders.length > 0 && filteredOrders.length === 0 && (
        <div className="alert alert-warning rounded-4">
          Không có đơn hàng phù hợp.
        </div>
      )}

      <section className="d-flex flex-column gap-3">
        {filteredOrders.map((order) => (
          <article
            className="card border-0 shadow-sm rounded-5"
            key={order.orderId}
          >
            <div className="card-body p-4">
              <div className="row g-3 align-items-center">
                <div className="col-lg-3">
                  <p className="text-secondary small mb-1">Mã đơn</p>
                  <h5 className="fw-bold mb-1">{order.orderId}</h5>
                  <span
                    className={`badge rounded-pill ${getOrderBadgeClass(
                      order.status
                    )}`}
                  >
                    {formatOrderStatus(order.status)}
                  </span>
                </div>

                <div className="col-lg-3">
                  <p className="text-secondary small mb-1">Người nhận</p>
                  <h6 className="fw-bold mb-1">{order.customerName}</h6>
                  <small className="text-secondary">
                    {order.phone || "Chưa có SĐT"}
                  </small>
                </div>

                <div className="col-lg-2">
                  <p className="text-secondary small mb-1">Thanh toán</p>
                  <span
                    className={`badge rounded-pill ${
                      order.paymentStatus === "paid"
                        ? "text-bg-success"
                        : "text-bg-warning"
                    }`}
                  >
                    {formatPaymentStatus(order.paymentStatus)}
                  </span>
                </div>

                <div className="col-lg-2">
                  <p className="text-secondary small mb-1">Tổng tiền</p>
                  <strong className="fs-5 text-danger">
                    {formatMoney(order.total || 0)}
                  </strong>
                </div>

                <div className="col-lg-2 text-lg-end">
                  <button
                    type="button"
                    className="btn btn-outline-success rounded-pill"
                    onClick={() => setSelectedOrder(order)}
                  >
                    Xem chi tiết
                  </button>
                </div>
              </div>
            </div>
          </article>
        ))}
      </section>

      {selectedOrder && (
        <OrderDetail
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
        />
      )}
    </main>
  );
}

function OrderDetail({ order, onClose }) {
  useEffect(() => {
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = oldOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return (
    <>
      <div
        className="position-fixed top-0 start-0 w-100 h-100 bg-dark bg-opacity-50"
        style={{
          zIndex: 1050,
          backdropFilter: "blur(6px)",
        }}
        onClick={onClose}
      />

      <div
        className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center p-3"
        style={{ zIndex: 1055 }}
        role="dialog"
        aria-modal="true"
        onClick={onClose}
      >
        <article
          className="bg-white rounded-5 shadow-lg border-0 w-100 overflow-hidden"
          style={{
            maxWidth: "900px",
            maxHeight: "90vh",
          }}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="d-flex justify-content-between align-items-start gap-3 border-bottom p-4">
            <div>
              <span className="badge rounded-pill text-bg-success mb-2">
                Chi tiết đơn hàng
              </span>
              <h2 className="fw-bold mb-1">{order.orderId}</h2>
              <p className="text-secondary mb-0">
                Thông tin giao hàng, thanh toán và sản phẩm trong đơn.
              </p>
            </div>

            <button
              type="button"
              className="btn btn-light rounded-circle flex-shrink-0"
              onClick={onClose}
              title="Đóng"
            >
              <X size={20} />
            </button>
          </div>

          <div
            className="p-4 overflow-auto"
            style={{ maxHeight: "calc(90vh - 130px)" }}
          >
            <div className="row g-3 mb-4">
              <InfoCard label="Khách hàng" value={order.customerName} />
              <InfoCard label="Số điện thoại" value={order.phone} />
              <InfoCard
                label="Trạng thái"
                value={formatOrderStatus(order.status)}
              />
              <InfoCard
                label="Thanh toán"
                value={`${order.paymentMethod || "-"} - ${formatPaymentStatus(
                  order.paymentStatus
                )}`}
              />
              <InfoCard
                label="Ngày đặt"
                value={
                  order.createdAt
                    ? new Date(order.createdAt).toLocaleString("vi-VN")
                    : "-"
                }
              />
              <InfoCard label="Địa chỉ" value={order.address} />
            </div>

            {order.note ? (
              <div className="alert alert-light border rounded-4 mb-4">
                <span className="text-secondary small d-block mb-1">
                  Ghi chú
                </span>
                <strong>{order.note}</strong>
              </div>
            ) : null}

            <div className="card border rounded-4 mb-4">
              <div className="card-body p-4">
                <h5 className="fw-bold mb-3">Sản phẩm trong đơn</h5>

                {(order.items || []).length === 0 ? (
                  <p className="text-secondary mb-0">Không có sản phẩm.</p>
                ) : (
                  <div className="table-responsive">
                    <table className="table align-middle mb-0">
                      <thead>
                        <tr>
                          <th>Sản phẩm</th>
                          <th className="text-center">Số lượng</th>
                          <th className="text-end">Thành tiền</th>
                        </tr>
                      </thead>

                      <tbody>
                        {(order.items || []).map((item, index) => (
                          <tr
                            key={`${order.orderId}-${
                              item.productId || item.name
                            }-${index}`}
                          >
                            <td>
                              <strong>{item.name}</strong>
                              {item.productId ? (
                                <small className="d-block text-secondary">
                                  {item.productId}
                                </small>
                              ) : null}
                            </td>

                            <td className="text-center">
                              <span className="badge text-bg-light border rounded-pill">
                                x{item.quantity}
                              </span>
                            </td>

                            <td className="text-end">
                              <strong className="text-danger text-nowrap">
                                {formatMoney(
                                  Number(item.price || 0) *
                                    Number(item.quantity || 0)
                                )}
                              </strong>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            <div className="d-flex justify-content-between align-items-center bg-light rounded-4 p-4">
              <div>
                <span className="text-secondary small d-block">Tổng tiền</span>
                <strong className="fs-4 text-danger">
                  {formatMoney(order.total || 0)}
                </strong>
              </div>

              <button
                type="button"
                className="btn btn-success rounded-pill px-4"
                onClick={onClose}
              >
                Đã hiểu
              </button>
            </div>
          </div>
        </article>
      </div>
    </>
  );
}

function InfoCard({ label, value }) {
  return (
    <div className="col-md-6">
      <div className="border rounded-4 p-3 h-100 bg-light">
        <span className="text-secondary small d-block mb-1">{label}</span>
        <strong>{value || "-"}</strong>
      </div>
    </div>
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

function formatOrderStatus(status) {
  const normalized = String(status || "").toUpperCase();

  if (normalized === "PENDING_CONFIRMATION") return "Chờ xác nhận";
  if (normalized === "CONFIRMED") return "Đã xác nhận";
  if (normalized === "SHIPPING") return "Đang giao";
  if (normalized === "COMPLETED") return "Hoàn tất";
  if (normalized === "CANCELLED") return "Đã hủy";

  return status || "Không rõ";
}

function formatPaymentStatus(status) {
  const normalized = String(status || "").toLowerCase();

  if (normalized === "paid") return "Đã thanh toán";
  if (normalized === "pending") return "Chưa thanh toán";
  if (normalized === "failed") return "Thất bại";

  return status || "Không rõ";
}