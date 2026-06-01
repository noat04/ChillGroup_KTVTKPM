import React, { useState } from "react";
import {
  BarChart3,
  ClipboardList,
  LogOut,
  Menu,
  Package,
  ShoppingBag,
  Users,
  X,
} from "lucide-react";

export function AdminLayout({ view, setView, user, logout, message, children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const items = [
    { view: "admin-dashboard", label: "Dashboard", icon: BarChart3 },
    { view: "admin-products", label: "Sản phẩm", icon: Package },
    { view: "admin-orders", label: "Đơn hàng", icon: ClipboardList },
    { view: "admin-users", label: "Người dùng", icon: Users },
  ];

  const goTo = (nextView) => {
    setView(nextView);
    setSidebarOpen(false);
  };

  const alertClass = getAlertClass(message?.type);

  return (
    <div className="min-vh-100 bg-light">
      <header className="d-lg-none bg-white border-bottom shadow-sm sticky-top">
        <div className="container-fluid py-3 d-flex align-items-center justify-content-between">
          <button
            type="button"
            className="btn border-0 d-flex align-items-center gap-2 p-0"
            onClick={() => goTo("admin-dashboard")}
          >
            <span className="bg-success text-white rounded-circle d-inline-flex align-items-center justify-content-center p-2">
              <ShoppingBag size={22} />
            </span>

            <span className="d-flex flex-column align-items-start lh-sm">
              <strong className="text-success fs-5">Fruitweb</strong>
              <small className="text-secondary">Admin console</small>
            </span>
          </button>

          <button
            type="button"
            className="btn btn-outline-success rounded-pill"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      <div className="container-fluid">
        <div className="row">
          <aside
            className={`col-lg-3 col-xl-2 bg-white border-end shadow-sm p-0 ${
              sidebarOpen ? "d-block" : "d-none d-lg-block"
            }`}
          >
            <div className="position-sticky top-0 min-vh-100 d-flex flex-column p-3">
              <button
                type="button"
                className="btn border-0 d-none d-lg-flex align-items-center gap-2 p-0 mb-4"
                onClick={() => goTo("admin-dashboard")}
              >
                <span className="bg-success text-white rounded-circle d-inline-flex align-items-center justify-content-center p-2">
                  <ShoppingBag size={24} />
                </span>

                <span className="d-flex flex-column align-items-start lh-sm">
                  <strong className="text-success fs-4">Fruitweb</strong>
                  <small className="text-secondary">Admin console</small>
                </span>
              </button>

              <div className="mb-3">
                <p className="text-uppercase text-secondary fw-bold small mb-2">
                  Quản trị hệ thống
                </p>

                <nav className="d-grid gap-2">
                  {items.map((item) => {
                    const Icon = item.icon;
                    const isActive = view === item.view;

                    return (
                      <button
                        type="button"
                        key={item.view}
                        className={`btn d-flex align-items-center gap-2 rounded-4 px-3 py-2 ${
                          isActive
                            ? "btn-success text-white shadow-sm"
                            : "btn-light text-success border"
                        }`}
                        onClick={() => goTo(item.view)}
                      >
                        <Icon size={18} />
                        <span className="fw-semibold">{item.label}</span>
                      </button>
                    );
                  })}
                </nav>
              </div>

              <div className="mt-auto">
                <div className="card border-0 bg-light rounded-4 mb-3">
                  <div className="card-body p-3">
                    <p className="text-secondary small mb-1">Admin</p>
                    <h6 className="fw-bold mb-0 text-truncate">
                      {user?.name || "Quản trị viên"}
                    </h6>
                  </div>
                </div>

                <button
                  type="button"
                  className="btn btn-outline-danger w-100 rounded-pill d-flex align-items-center justify-content-center gap-2"
                  onClick={logout}
                >
                  <LogOut size={18} />
                  Đăng xuất
                </button>
              </div>
            </div>
          </aside>

          <main className="col-lg-9 col-xl-10 px-3 px-lg-4 py-4">
            {message ? (
              <div className={`alert ${alertClass} rounded-4 shadow-sm border-0 mb-4`}>
                {message.text}
              </div>
            ) : null}

            {children}
          </main>
        </div>
      </div>
    </div>
  );
}

function getAlertClass(type) {
  if (type === "success") return "alert-success";
  if (type === "warning") return "alert-warning";
  if (type === "error") return "alert-danger";
  return "alert-info";}