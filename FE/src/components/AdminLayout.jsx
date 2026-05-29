import React from "react";
import { BarChart3, ClipboardList, LogOut, Package, ShoppingBag, Users } from "lucide-react";

export function AdminLayout({ view, setView, user, logout, message, children }) {
  const items = [
    { view: "admin-dashboard", label: "Dashboard", icon: BarChart3 },
    { view: "admin-products", label: "San pham", icon: Package },
    { view: "admin-orders", label: "Don hang", icon: ClipboardList },
    { view: "admin-users", label: "Nguoi dung", icon: Users }
  ];

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <button className="admin-brand" onClick={() => setView("admin-dashboard")}>
          <ShoppingBag size={24} />
          <span>
            Fruitweb
            <small>Admin console</small>
          </span>
        </button>
        <nav className="admin-menu">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <button className={view === item.view ? "active" : ""} key={item.view} onClick={() => setView(item.view)}>
                <Icon size={18} />
                {item.label}
              </button>
            );
          })}
        </nav>
        <div className="admin-user">
          <span>{user?.name}</span>
          <button onClick={logout}>
            <LogOut size={18} />
            Dang xuat
          </button>
        </div>
      </aside>
      <section className="admin-main">
        {message ? <p className={`message ${message.type}`}>{message.text}</p> : null}
        {children}
      </section>
    </div>
  );
}
