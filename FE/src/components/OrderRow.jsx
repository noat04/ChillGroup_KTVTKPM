import React from "react";
import { formatMoney } from "../utils/format.js";

export function OrderRow({ order, children, onClick }) {
  return (
    <article className={onClick ? "order-row clickable" : "order-row"} onClick={onClick}>
      <div className="order-summary">
        <div>
          <strong>{order.customerName || order.orderId}</strong>
          <span>{order.orderId}</span>
        </div>
        <div>
          <strong>{formatMoney(order.total)}</strong>
          <span>{new Date(order.createdAt).toLocaleString("vi-VN")}</span>
        </div>
        <span className={`status ${String(order.status).toLowerCase()}`}>{order.status}</span>
        <span className="status payment">{order.paymentStatus}</span>
      </div>
      <div className="order-items">
        {(order.items || []).map((item) => (
          <span key={item.productId}>{item.name} x{item.quantity}</span>
        ))}
      </div>
      {children}
    </article>
  );
}
