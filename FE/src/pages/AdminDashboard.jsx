import React, { useEffect, useState } from "react";
import {
  AlertTriangle,
  ClipboardList,
  DollarSign,
  Package,
  RefreshCw,
  Shield,
} from "lucide-react";
import { apiBaseUrl } from "../config.js";
import { formatMoney } from "../utils/format.js";

export function AdminDashboard({ token, onUnauthorized, setMessage }) {
  const [products, setProducts] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [orders, setOrders] = useState([]);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);

  async function adminFetch(path) {
    let response;

    try {
      response = await fetch(`${apiBaseUrl}${path}`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
    } catch {
      setMessage?.(
        "Service đang tạm ngưng. Bạn có thể chuyển trang khác và thử lại.",
        "warning"
      );
      return null;
    }

    if (response.status === 401) {
      setMessage?.(
        "Phiên đăng nhập admin đã hết hạn. Vui lòng đăng nhập lại.",
        "warning"
      );
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

  async function loadDashboard() {
    setLoading(true);

    try {
      const [nextProducts, nextInventory, nextOrders, nextReport] =
        await Promise.all([
          adminFetch("/admin/products"),
          adminFetch("/admin/inventory"),
          adminFetch("/admin/orders"),
          adminFetch("/admin/reports"),
        ]);

      setProducts(Array.isArray(nextProducts) ? nextProducts : []);
      setInventory(Array.isArray(nextInventory) ? nextInventory : []);
      setOrders(Array.isArray(nextOrders) ? nextOrders : []);
      setReport(nextReport && !Array.isArray(nextReport) ? nextReport : null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDashboard();
  }, []);

  const lowStock = Array.isArray(inventory)
    ? inventory.filter((item) => Number(item.stock) <= 10)
    : [];

  const latestOrders = orders.slice(0, 5);

  return (
    <section className="container-fluid">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div>
          <p className="text-uppercase text-success fw-bold small mb-1">
            Admin
          </p>
          <h1 className="fw-bold mb-0">Dashboard</h1>
        </div>

        <div className="d-flex align-items-center gap-2">
          <button
            type="button"
            className="btn btn-outline-success rounded-pill d-flex align-items-center gap-2 px-3"
            onClick={loadDashboard}
            disabled={loading}
          >
            <RefreshCw size={18} className={loading ? "spin" : ""} />
            Tải lại
          </button>

          <span className="bg-success text-white rounded-circle d-inline-flex align-items-center justify-content-center p-3">
            <Shield size={26} />
          </span>
        </div>
      </div>

      <div className="row g-4 mb-4">
        <DashboardStatCard
          icon={<ClipboardList size={24} />}
          title="Đơn hàng"
          value={report?.orders || 0}
          colorClass="success"
        />

        <DashboardStatCard
          icon={<DollarSign size={24} />}
          title="Doanh thu"
          value={formatMoney(report?.revenue || 0)}
          colorClass="danger"
        />

        <DashboardStatCard
          icon={<Package size={24} />}
          title="Sản phẩm"
          value={products.length}
          colorClass="primary"
        />
      </div>

      <div className="row g-4">
        <div className="col-xl-7">
          <section className="card border-0 shadow-sm rounded-5 h-100">
            <div className="card-body p-4">
              <div className="d-flex justify-content-between align-items-start gap-3 mb-3">
                <div>
                  <h4 className="fw-bold mb-1">Đơn hàng mới</h4>
                  <p className="text-secondary mb-0">
                    5 đơn gần nhất trong hệ thống
                  </p>
                </div>

                <span className="badge text-bg-light border rounded-pill px-3 py-2">
                  {latestOrders.length} đơn
                </span>
              </div>

              {latestOrders.length === 0 ? (
                <div className="alert alert-light border rounded-4 mb-0">
                  Chưa có đơn hàng mới.
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table align-middle mb-0">
                    <tbody>
                      {latestOrders.map((order) => (
                        <tr key={order.orderId}>
                          <td className="ps-0">
                            <div className="fw-bold text-dark">
                              {order.customerName || "Khách hàng"}
                            </div>
                            <div className="text-secondary small">
                              {order.orderId}
                            </div>
                          </td>

                          <td className="text-end">
                            <span className="fw-bold text-danger text-nowrap">
                              {formatMoney(order.total || 0)}
                            </span>
                          </td>

                          <td className="text-end pe-0">
                            <span
                              className={`badge rounded-pill px-3 py-2 text-nowrap ${getOrderStatusBadge(
                                order.status
                              )}`}
                            >
                              {formatOrderStatus(order.status)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        </div>

        <div className="col-xl-5">
          <section className="card border-0 shadow-sm rounded-5 h-100">
            <div className="card-body p-4">
              <div className="d-flex justify-content-between align-items-start gap-3 mb-3">
                <div>
                  <h4 className="fw-bold mb-1">Cần nhập thêm</h4>
                  <p className="text-secondary mb-0">
                    Sản phẩm có tồn kho thấp
                  </p>
                </div>

                <span className="text-warning">
                  <AlertTriangle size={24} />
                </span>
              </div>

              {lowStock.length === 0 ? (
                <div className="alert alert-success rounded-4 mb-0">
                  Tồn kho đang ổn định.
                </div>
              ) : (
                <div className="list-group list-group-flush">
                  {lowStock.slice(0, 8).map((item) => (
                    <div
                      className="list-group-item px-0 d-flex justify-content-between align-items-center gap-3"
                      key={item.productId}
                    >
                      <div>
                        <div className="fw-bold text-dark">
                          {item.productName || item.name || item.productId}
                        </div>
                        <div className="text-warning small">Tồn kho thấp</div>
                      </div>

                      <span className="badge text-bg-warning rounded-pill">
                        {item.stock}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </section>
  );
}

function DashboardStatCard({ icon, title, value, colorClass }) {
  return (
    <div className="col-md-4">
      <section className="card border-0 shadow-sm rounded-5 h-100">
        <div className="card-body p-4 p-lg-5">
          <div
            className={`bg-${colorClass}-subtle text-${colorClass} rounded-circle d-inline-flex align-items-center justify-content-center p-3 mb-4`}
          >
            {icon}
          </div>

          <p className="text-secondary mb-2">{title}</p>
          <h2 className="fw-bold mb-0">{value}</h2>
        </div>
      </section>
    </div>
  );
}

function getOrderStatusBadge(status) {
  const value = String(status || "").toUpperCase();

  if (value === "COMPLETED") return "text-bg-success";
  if (value === "SHIPPING") return "text-bg-primary";
  if (value === "CONFIRMED") return "text-bg-info";
  if (value === "CANCELLED") return "text-bg-danger";
  if (value === "PENDING_CONFIRMATION") return "text-bg-warning text-dark";

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