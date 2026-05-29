import React, { useEffect, useMemo, useState } from "react";
import { CheckCircle2, PackageCheck, RefreshCw, Search, Truck, XCircle } from "lucide-react";
import { apiBaseUrl } from "../config.js";
import { OrderRow } from "../components/OrderRow.jsx";

const orderTabs = [
  { value: "all", label: "Tat ca" },
  { value: "PENDING_CONFIRMATION", label: "Cho xac nhan" },
  { value: "CONFIRMED", label: "Da xac nhan" },
  { value: "SHIPPING", label: "Dang giao" },
  { value: "COMPLETED", label: "Hoan tat" },
  { value: "CANCELLED", label: "Da huy" }
];

export function AdminOrders({ token, setMessage, onUnauthorized }) {
  const [orders, setOrders] = useState([]);
  const [status, setStatus] = useState("all");
  const [paymentStatus, setPaymentStatus] = useState("all");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  async function adminFetch(path, options = {}) {
    const response = await fetch(`${apiBaseUrl}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(options.headers || {})
      }
    });
    if (response.status === 401) {
      setMessage("Phien dang nhap admin da het han. Vui long dang nhap lai.", "warning");
      onUnauthorized?.();
      return null;
    }
    if (!response.ok) {
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
    setMessage("Da cap nhat trang thai don hang.", "success");
    await loadOrders();
  }

  return (
    <section className="admin-page">
      <div className="section-title">
        <div>
          <p className="eyebrow">Admin</p>
          <h1>Quan ly don hang</h1>
        </div>
        <button onClick={loadOrders}>
          <RefreshCw size={18} />
          Tai lai
        </button>
      </div>

      <section className="panel admin-order-toolbar">
        <div className="order-tabs">
          {orderTabs.map((tab) => (
            <button
              className={status === tab.value ? "active" : ""}
              key={tab.value}
              onClick={() => {
                setStatus(tab.value);
                resetPaging();
              }}
            >
              {tab.label}
              <span>{countByStatus(tab.value)}</span>
            </button>
          ))}
        </div>
        <div className="order-filters">
          <label className="search">
            <Search size={18} />
            <input
              placeholder="Tim ma don, khach hang, so dien thoai..."
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                resetPaging();
              }}
            />
          </label>
          <label>
            Thanh toan
            <select
              value={paymentStatus}
              onChange={(event) => {
                setPaymentStatus(event.target.value);
                resetPaging();
              }}
            >
              <option value="all">Tat ca</option>
              <option value="pending">Chua thanh toan</option>
              <option value="paid">Da thanh toan</option>
            </select>
          </label>
          <label>
            Moi trang
            <select
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
          </label>
        </div>
      </section>

      {orders.length === 0 ? <p className="empty">Chua co don hang.</p> : null}
      {orders.length > 0 && filteredOrders.length === 0 ? <p className="empty">Khong co don hang phu hop.</p> : null}

      <div className="order-list">
        {pagedOrders.map((order) => (
          <OrderRow key={order.orderId} order={order}>
            <div className="order-actions admin-order-actions">
              <button className="status-action confirm" onClick={() => updateOrderStatus(order.orderId, "CONFIRMED")}>
                <CheckCircle2 size={16} />
                Xac nhan
              </button>
              <button className="status-action shipping" onClick={() => updateOrderStatus(order.orderId, "SHIPPING")}>
                <Truck size={16} />
                Giao hang
              </button>
              <button className="status-action complete" onClick={() => updateOrderStatus(order.orderId, "COMPLETED", "paid")}>
                <PackageCheck size={16} />
                Hoan tat
              </button>
              <button className="status-action cancel" onClick={() => updateOrderStatus(order.orderId, "CANCELLED")}>
                <XCircle size={16} />
                Huy
              </button>
            </div>
          </OrderRow>
        ))}
      </div>

      <nav className="pagination" aria-label="Phan trang don hang admin">
        <span className="pagination-summary">
          Hien thi {startItem}-{endItem} / {filteredOrders.length} don hang | Trang {currentPage}/{totalPages}
        </span>
        <button disabled={currentPage === 1} onClick={() => setPage(1)}>
          Dau
        </button>
        <button disabled={currentPage === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>
          Truoc
        </button>
        {Array.from({ length: totalPages }, (_, index) => index + 1).map((item) => (
          <button className={item === currentPage ? "active" : ""} key={item} onClick={() => setPage(item)}>
            {item}
          </button>
        ))}
        <button disabled={currentPage === totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>
          Sau
        </button>
        <button disabled={currentPage === totalPages} onClick={() => setPage(totalPages)}>
          Cuoi
        </button>
      </nav>
    </section>
  );
}
