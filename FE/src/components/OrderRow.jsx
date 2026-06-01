import React from "react";
import { CalendarDays, CreditCard, Package, ReceiptText, UserRound } from "lucide-react";
import { formatMoney } from "../utils/format.js";

export function OrderRow({ order, children, onClick }) {
  const statusClass = getStatusClass(order.status);
  const paymentClass = getPaymentClass(order.paymentStatus);
  const createdAt = order.createdAt
    ? new Date(order.createdAt).toLocaleString("vi-VN")
    : "Chưa có ngày";

  return (
    <article
      className={`card border-0 shadow-sm rounded-5 mb-3 overflow-hidden ${
        onClick ? "cursor-pointer" : ""
      }`}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(event) => {
        if (onClick && (event.key === "Enter" || event.key === " ")) {
          onClick(event);
        }
      }}
    >
      <div className="card-body p-4">
        <div className="row g-3 align-items-center">
          <div className="col-lg-3">
            <div className="d-flex align-items-center gap-3">
              <span className="bg-success-subtle text-success rounded-circle d-inline-flex align-items-center justify-content-center p-2">
                <UserRound size={22} />
              </span>

              <div className="min-w-0">
                <h6 className="fw-bold mb-1 text-truncate">
                  {order.customerName || "Khách hàng"}
                </h6>
                <div className="small text-secondary d-flex align-items-center gap-1">
                  <ReceiptText size={14} />
                  <span className="text-truncate">{order.orderId}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="col-lg-2">
            <p className="small text-secondary mb-1">Tổng tiền</p>
            <h6 className="fw-bold text-danger mb-0">
              {formatMoney(order.total || 0)}
            </h6>
          </div>

          <div className="col-lg-3">
            <p className="small text-secondary mb-1 d-flex align-items-center gap-1">
              <CalendarDays size={14} />
              Ngày đặt
            </p>
            <span className="fw-semibold">{createdAt}</span>
          </div>

          <div className="col-lg-2">
            <p className="small text-secondary mb-1">Trạng thái</p>
            <span className={`badge rounded-pill px-3 py-2 ${statusClass}`}>
              {formatOrderStatus(order.status)}
            </span>
          </div>

          <div className="col-lg-2">
            <p className="small text-secondary mb-1 d-flex align-items-center gap-1">
              <CreditCard size={14} />
              Thanh toán
            </p>
            <span className={`badge rounded-pill px-3 py-2 ${paymentClass}`}>
              {formatPaymentStatus(order.paymentStatus)}
            </span>
          </div>
        </div>

        <div className="border-top mt-3 pt-3">
          <div className="d-flex align-items-start gap-2 flex-wrap">
            <span className="text-secondary small fw-semibold d-flex align-items-center gap-1">
              <Package size={15} />
              Sản phẩm:
            </span>

            {(order.items || []).length > 0 ? (
              (order.items || []).map((item) => (
                <span
                  key={item.productId}
                  className="badge text-bg-light border rounded-pill px-3 py-2"
                >
                  {item.name} x{item.quantity}
                </span>
              ))
            ) : (
              <span className="text-secondary small">Không có sản phẩm</span>
            )}
          </div>
        </div>

        {children ? (
          <div
            className="border-top mt-3 pt-3 d-flex flex-wrap gap-2"
            onClick={(event) => event.stopPropagation()}
          >
            {children}
          </div>
        ) : null}
      </div>
    </article>
  );
}

function getStatusClass(status) {
  const value = String(status || "").toUpperCase();

  if (value === "COMPLETED") return "text-bg-success";
  if (value === "SHIPPING") return "text-bg-primary";
  if (value === "CONFIRMED") return "text-bg-info";
  if (value === "CANCELLED") return "text-bg-danger";
  if (value === "PENDING_CONFIRMATION") return "text-bg-warning";

  return "text-bg-secondary";
}

function getPaymentClass(status) {
  const value = String(status || "").toLowerCase();

  if (value === "paid") return "text-bg-success";
  if (value === "pending") return "text-bg-warning";
  if (value === "failed") return "text-bg-danger";

  return "text-bg-secondary";
}

function formatOrderStatus(status) {
  const value = String(status || "").toUpperCase();

  if (value === "PENDING_CONFIRMATION") return "Chờ xác nhận";
  if (value === "CONFIRMED") return "Đã xác nhận";
  if (value === "SHIPPING") return "Đang giao";
  if (value === "COMPLETED") return "Hoàn tất";
  if (value === "CANCELLED") return "Đã hủy";

  return status || "Không rõ";
}

function formatPaymentStatus(status) {
  const value = String(status || "").toLowerCase();

  if (value === "paid") return "Đã thanh toán";
  if (value === "pending") return "Chưa thanh toán";
  if (value === "failed") return "Thất bại";

  return status || "Không rõ";
}