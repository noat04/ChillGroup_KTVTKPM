import React, { useEffect, useMemo, useState } from "react";
import { RefreshCw, Search, X } from "lucide-react";
import { apiBaseUrl } from "../config.js";
import { OrderRow } from "../components/OrderRow.jsx";
import { formatMoney } from "../utils/format.js";

const statusTabs = [
  { value: "all", label: "Tat ca" },
  { value: "PENDING_CONFIRMATION", label: "Cho xac nhan" },
  { value: "CONFIRMED", label: "Da xac nhan" },
  { value: "SHIPPING", label: "Dang giao" },
  { value: "COMPLETED", label: "Hoan tat" },
  { value: "CANCELLED", label: "Da huy" }
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
        headers: { Authorization: `Bearer ${token}` }
      });
      const result = await response.json().catch(() => []);
      if (!response.ok) {
        setMessage?.(result.error || "Khong tai duoc don hang. Vui long thu lai.", "warning");
        return;
      }
      setOrders(Array.isArray(result) ? result : []);
    } catch {
      setMessage?.("order-service dang tam ngung. Ban co the thu lai sau.", "warning");
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
      const matchesPayment = paymentStatus === "all" || order.paymentStatus === paymentStatus;
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
    <section className="panel orders-page">
      <div className="section-title">
        <h2>Don cua toi</h2>
        <button onClick={loadOrders}>
          <RefreshCw size={18} />
          Tai lai
        </button>
      </div>

      <div className="order-tabs">
        {statusTabs.map((tab) => (
          <button className={status === tab.value ? "active" : ""} key={tab.value} onClick={() => setStatus(tab.value)}>
            {tab.label}
            <span>{countByStatus(tab.value)}</span>
          </button>
        ))}
      </div>

      <div className="order-filters">
        <label className="search">
          <Search size={18} />
          <input
            placeholder="Tim theo ma don, ten san pham..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <label>
          Thanh toan
          <select value={paymentStatus} onChange={(event) => setPaymentStatus(event.target.value)}>
            <option value="all">Tat ca</option>
            <option value="pending">Chua thanh toan</option>
            <option value="paid">Da thanh toan</option>
          </select>
        </label>
      </div>

      {orders.length === 0 ? <p className="empty">Ban chua co don hang.</p> : null}
      {orders.length > 0 && filteredOrders.length === 0 ? <p className="empty">Khong co don hang phu hop.</p> : null}

      <div className="order-list">
        {filteredOrders.map((order) => (
          <OrderRow key={order.orderId} order={order} onClick={() => setSelectedOrder(order)}>
            <button
              className="link-button"
              onClick={(event) => {
                event.stopPropagation();
                setSelectedOrder(order);
              }}
            >
              Xem chi tiet
            </button>
          </OrderRow>
        ))}
      </div>

      {selectedOrder ? <OrderDetail order={selectedOrder} onClose={() => setSelectedOrder(null)} /> : null}
    </section>
  );
}

function OrderDetail({ order, onClose }) {
  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <article className="order-detail modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
        <div className="section-title">
          <div>
            <p className="eyebrow">Chi tiet don hang</p>
            <h2>{order.orderId}</h2>
          </div>
          <button className="icon" onClick={onClose} title="Dong">
            <X size={18} />
          </button>
        </div>

        <div className="detail-grid">
          <div>
            <span>Khach hang</span>
            <strong>{order.customerName}</strong>
          </div>
          <div>
            <span>Trang thai</span>
            <strong>{order.status}</strong>
          </div>
          <div>
            <span>Thanh toan</span>
            <strong>{order.paymentMethod} - {order.paymentStatus}</strong>
          </div>
          <div>
            <span>Ngay dat</span>
            <strong>{new Date(order.createdAt).toLocaleString("vi-VN")}</strong>
          </div>
          <div>
            <span>So dien thoai</span>
            <strong>{order.phone || "Chua co"}</strong>
          </div>
          <div>
            <span>Dia chi</span>
            <strong>{order.address || "Chua co"}</strong>
          </div>
        </div>

        <section className="detail-items">
          <h2>San pham</h2>
          {(order.items || []).map((item) => (
            <div className="detail-item" key={item.productId}>
              <span>{item.name}</span>
              <span>x{item.quantity}</span>
              <strong>{formatMoney(item.price * item.quantity)}</strong>
            </div>
          ))}
        </section>

        {order.note ? (
          <div className="order-note">
            <span>Ghi chu</span>
            <p>{order.note}</p>
          </div>
        ) : null}

        <div className="total">
          <span>Tong cong</span>
          <strong>{formatMoney(order.total)}</strong>
        </div>
      </article>
    </div>
  );
}
