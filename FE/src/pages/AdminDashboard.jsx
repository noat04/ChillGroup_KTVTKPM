import React, { useEffect, useState } from "react";
import { ClipboardList, DollarSign, Package, Shield } from "lucide-react";
import { apiBaseUrl } from "../config.js";
import { formatMoney } from "../utils/format.js";

export function AdminDashboard({ token, onUnauthorized, setMessage }) {
  const [products, setProducts] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [orders, setOrders] = useState([]);
  const [report, setReport] = useState(null);

  async function adminFetch(path) {
    const response = await fetch(`${apiBaseUrl}${path}`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      }
    });
    if (response.status === 401) {
      setMessage?.("Phien dang nhap admin da het han. Vui long dang nhap lai.", "warning");
      onUnauthorized?.();
      return null;
    }
    if (!response.ok) {
      return null;
    }
    return response.json();
  }

  async function loadDashboard() {
    const [nextProducts, nextInventory, nextOrders, nextReport] = await Promise.all([
      adminFetch("/admin/products"),
      adminFetch("/admin/inventory"),
      adminFetch("/admin/orders"),
      adminFetch("/admin/reports")
    ]);
    setProducts(Array.isArray(nextProducts) ? nextProducts : []);
    setInventory(Array.isArray(nextInventory) ? nextInventory : []);
    setOrders(Array.isArray(nextOrders) ? nextOrders : []);
    setReport(nextReport && !Array.isArray(nextReport) ? nextReport : null);
  }

  useEffect(() => {
    void loadDashboard();
  }, []);

  const lowStock = Array.isArray(inventory) ? inventory.filter((item) => Number(item.stock) <= 10) : [];

  return (
    <section className="admin-page">
      <div className="admin-title">
        <div>
          <p className="eyebrow">Admin</p>
          <h1>Dashboard</h1>
        </div>
        <Shield size={34} />
      </div>

      <div className="stats admin-stats">
        <div>
          <ClipboardList size={22} />
          <span>Don hang</span>
          <strong>{report?.orders || 0}</strong>
        </div>
        <div>
          <DollarSign size={22} />
          <span>Doanh thu</span>
          <strong>{formatMoney(report?.revenue || 0)}</strong>
        </div>
        <div>
          <Package size={22} />
          <span>San pham</span>
          <strong>{products.length}</strong>
        </div>
      </div>

      <div className="admin-overview">
        <section className="panel">
          <h2>Don hang moi</h2>
          {orders.slice(0, 5).map((order) => (
            <div className="admin-list-row" key={order.orderId}>
              <div>
                <strong>{order.customerName}</strong>
                <span>{order.orderId}</span>
              </div>
              <strong>{formatMoney(order.total)}</strong>
              <span className={`status ${String(order.status).toLowerCase()}`}>{order.status}</span>
            </div>
          ))}
        </section>
        <section className="panel">
          <h2>Can nhap them</h2>
          {lowStock.length === 0 ? <p className="empty">Ton kho dang on dinh.</p> : null}
          {lowStock.slice(0, 8).map((item) => (
            <div className="admin-list-row" key={item.productId}>
              <div>
                <strong>{item.productId}</strong>
                <span>Ton kho thap</span>
              </div>
              <strong>{item.stock}</strong>
            </div>
          ))}
        </section>
      </div>
    </section>
  );
}
