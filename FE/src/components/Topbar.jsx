import React from "react";
import {
  BarChart3,
  ClipboardList,
  Home,
  LogIn,
  LogOut,
  ShoppingBag,
  ShoppingCart,
  Store,
  UserRound,
  UserPlus
} from "lucide-react";

export function Topbar({ view, setView, user, isAdmin, cartCount, logout }) {
  return (
    <>
      <div className="promo-bar">
        <span>Giam 25,000 phi ship cho don hang tren 600,000</span>
        <strong>Hotline: 0865 660 775</strong>
      </div>
      <header className="topbar">
        <button className="brand" onClick={() => setView(isAdmin ? "admin-dashboard" : "home")}>
          <ShoppingBag size={26} />
          <span>
            Fruitweb
            <small>Trai cay chat luong cao</small>
          </span>
        </button>
        <nav className="nav">
          {isAdmin ? (
            <>
              <button className={view === "admin-dashboard" ? "active" : ""} onClick={() => setView("admin-dashboard")}>
                <BarChart3 size={18} />
                Dashboard
              </button>
              <button className={view === "admin-orders" ? "active" : ""} onClick={() => setView("admin-orders")}>
                <ClipboardList size={18} />
                Don hang
              </button>
            </>
          ) : (
            <>
              <button className={view === "home" ? "active" : ""} onClick={() => setView("home")}>
                <Home size={18} />
                Trang chu
              </button>
              <button className={view === "products" ? "active" : ""} onClick={() => setView("products")}>
                <Store size={18} />
                Trai ngon hom nay
              </button>
              <button className={view === "cart" ? "active cart-button" : "cart-button"} onClick={() => setView("cart")}>
                <ShoppingCart size={18} />
                Gio hang ({cartCount})
              </button>
              {user ? (
                <>
                  <button className={view === "orders" ? "active" : ""} onClick={() => setView("orders")}>
                    <ClipboardList size={18} />
                    Don cua toi
                  </button>
                  <button className={view === "profile" ? "active" : ""} onClick={() => setView("profile")}>
                    <UserRound size={18} />
                    Tai khoan
                  </button>
                </>
              ) : null}
            </>
          )}
          {user ? (
            <button onClick={logout}>
              <LogOut size={18} />
              {user.name}
            </button>
          ) : (
            <>
              <button className={view === "login" ? "active" : ""} onClick={() => setView("login")}>
                <LogIn size={18} />
                Dang nhap
              </button>
              <button className={view === "register" ? "active" : ""} onClick={() => setView("register")}>
                <UserPlus size={18} />
                Dang ky
              </button>
            </>
          )}
        </nav>
      </header>
    </>
  );
}
