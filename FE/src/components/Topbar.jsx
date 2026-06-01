import React, { useState } from "react";
import {
  BarChart3,
  ChevronDown,
  ClipboardList,
  Home,
  LogIn,
  LogOut,
  Menu,
  ShoppingBag,
  ShoppingCart,
  Store,
  UserRound,
  UserPlus,
  X,
} from "lucide-react";

export function Topbar({ view, setView, user, isAdmin, cartCount, logout }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);

  const goTo = (nextView) => {
    setView(nextView);
    setMenuOpen(false);
    setAccountOpen(false);
  };

  const handleLogout = () => {
    setAccountOpen(false);
    setMenuOpen(false);
    logout();
  };

  const navButtonClass = (targetView) =>
    `btn d-flex align-items-center gap-2 rounded-pill px-3 ${
      view === targetView
        ? "btn-success text-white"
        : "btn-light text-success border"
    }`;

  return (
    <header className="navbar navbar-expand-lg bg-white shadow-sm sticky-top">
      <div className="container py-2">
        <button
          type="button"
          className="navbar-brand btn border-0 d-flex align-items-center gap-2 p-0"
          onClick={() => goTo(isAdmin ? "admin-dashboard" : "home")}
        >
          <span className="bg-success text-white rounded-circle d-inline-flex align-items-center justify-content-center p-2">
            <ShoppingBag size={24} />
          </span>

          <span className="d-flex flex-column align-items-start lh-sm">
            <span className="fw-bold fs-4 text-success">Fruitweb</span>
            <small className="text-secondary">Trái cây chất lượng cao</small>
          </span>
        </button>

        <button
          type="button"
          className="btn btn-outline-success d-lg-none rounded-pill"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

        <nav className={`collapse navbar-collapse ${menuOpen ? "show" : ""}`}>
          <div className="navbar-nav ms-lg-auto mt-3 mt-lg-0 d-flex flex-column flex-lg-row gap-2 align-items-lg-center">
            {isAdmin ? (
              <>
                <button
                  type="button"
                  className={navButtonClass("admin-dashboard")}
                  onClick={() => goTo("admin-dashboard")}
                >
                  <BarChart3 size={18} />
                  Dashboard
                </button>

                <button
                  type="button"
                  className={navButtonClass("admin-orders")}
                  onClick={() => goTo("admin-orders")}
                >
                  <ClipboardList size={18} />
                  Đơn hàng
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className={navButtonClass("home")}
                  onClick={() => goTo("home")}
                >
                  <Home size={18} />
                  Trang chủ
                </button>

                <button
                  type="button"
                  className={navButtonClass("products")}
                  onClick={() => goTo("products")}
                >
                  <Store size={18} />
                  Trái cây hôm nay
                </button>

                <button
                  type="button"
                  className={`btn d-flex align-items-center gap-2 rounded-pill px-3 ${
                    view === "cart"
                      ? "btn-success text-white"
                      : "btn-light text-success border"
                  }`}
                  onClick={() => goTo("cart")}
                >
                  <ShoppingCart size={18} />
                  Giỏ hàng

                  {cartCount > 0 && (
                    <span className="badge rounded-pill text-bg-danger">
                      {cartCount}
                    </span>
                  )}
                </button>
              </>
            )}

            {user ? (
              <div className="dropdown position-relative">
                <button
                  type="button"
                  className={`btn d-flex align-items-center gap-2 rounded-pill px-3 ${
                    view === "profile" || view === "orders"
                      ? "btn-success text-white"
                      : "btn-outline-success"
                  }`}
                  onClick={() => setAccountOpen(!accountOpen)}
                >
                  <UserRound size={18} />
                  {user.name || "Tài khoản"}
                  <ChevronDown size={16} />
                </button>

                <ul
                  className={`dropdown-menu dropdown-menu-end shadow border-0 rounded-4 mt-2 ${
                    accountOpen ? "show" : ""
                  }`}
                >
                  {!isAdmin && (
                    <li>
                      <button
                        type="button"
                        className="dropdown-item d-flex align-items-center gap-2 py-2"
                        onClick={() => goTo("orders")}
                      >
                        <ClipboardList size={17} />
                        Đơn của tôi
                      </button>
                    </li>
                  )}

                  <li>
                    <button
                      type="button"
                      className="dropdown-item d-flex align-items-center gap-2 py-2"
                      onClick={() => goTo("profile")}
                    >
                      <UserRound size={17} />
                      Xem tài khoản
                    </button>
                  </li>

                  <li>
                    <hr className="dropdown-divider" />
                  </li>

                  <li>
                    <button
                      type="button"
                      className="dropdown-item d-flex align-items-center gap-2 py-2 text-danger"
                      onClick={handleLogout}
                    >
                      <LogOut size={17} />
                      Đăng xuất
                    </button>
                  </li>
                </ul>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  className={navButtonClass("login")}
                  onClick={() => goTo("login")}
                >
                  <LogIn size={18} />
                  Đăng nhập
                </button>

                <button
                  type="button"
                  className={navButtonClass("register")}
                  onClick={() => goTo("register")}
                >
                  <UserPlus size={18} />
                  Đăng ký
                </button>
              </>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}