import React, { useEffect, useMemo, useState } from "react";
import { apiBaseUrl } from "./config.js";
import { AdminLayout } from "./components/AdminLayout.jsx";
import { Topbar } from "./components/Topbar.jsx";
import { AdminDashboard } from "./pages/AdminDashboard.jsx";
import { AdminOrders } from "./pages/AdminOrders.jsx";
import { AdminProducts } from "./pages/AdminProducts.jsx";
import { AdminUsers } from "./pages/AdminUsers.jsx";
import { AuthPage } from "./pages/AuthPage.jsx";
import { CartPage } from "./pages/CartPage.jsx";
import { HomePage } from "./pages/HomePage.jsx";
import { MyOrders } from "./pages/MyOrders.jsx";
import { ProductListPage } from "./pages/ProductListPage.jsx";
import { ProfilePage } from "./pages/ProfilePage.jsx";
import { readJson } from "./utils/storage.js";

export function App() {
  const [view, setView] = useState("home");
  const [products, setProducts] = useState([]);
  const [user, setUser] = useState(() => readJson("fruitweb_user"));
  const [cart, setCart] = useState({});
  const [token, setToken] = useState(() => localStorage.getItem("fruitweb_token") || "");
  const [message, setMessageState] = useState(null);

  const isAdmin = user?.role === "admin";

  function setMessage(nextMessage, type = "info", timeout = 3200) {
    const normalized =
      typeof nextMessage === "string"
        ? { text: nextMessage, type, timeout }
        : { type: "info", timeout, ...nextMessage };
    setMessageState(normalized);
  }

  useEffect(() => {
    if (!message || message.timeout === 0) {
      return undefined;
    }

    const timer = window.setTimeout(() => setMessageState(null), message.timeout);
    return () => window.clearTimeout(timer);
  }, [message]);

  async function loadProducts() {
    const response = await fetch(`${apiBaseUrl}/products`);
    setProducts(await response.json());
  }

  useEffect(() => {
    void loadProducts();
  }, []);

  useEffect(() => {
    if (user && token && !isAdmin) {
      void loadServerCart();
    }
  }, [user?.id, token, isAdmin]);

  useEffect(() => {
    if (isAdmin && !token) {
      setMessage("Phien dang nhap admin khong hop le. Vui long dang nhap lai.", "warning");
      logout();
      return;
    }

    if (isAdmin && !view.startsWith("admin-")) {
      setView("admin-dashboard");
    }
  }, [isAdmin, token, view]);

  async function loadServerCart() {
    const response = await fetch(`${apiBaseUrl}/cart`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!response.ok) {
      return;
    }

    const result = await response.json();
    const serverCart = Object.fromEntries(
      (result.items || []).map((item) => [item.productId, item.quantity])
    );
    if (Object.keys(serverCart).length === 0 && Object.keys(cart).length > 0) {
      await syncServerCart(cart);
      localStorage.removeItem("fruitweb_guest_cart");
      return;
    }

    setCart(serverCart);
  }

  async function syncServerCart(nextCart) {
    if (!token) {
      localStorage.setItem("fruitweb_guest_cart", JSON.stringify(nextCart));
      return;
    }

    await fetch(`${apiBaseUrl}/cart`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        items: Object.entries(nextCart).map(([productId, quantity]) => ({ productId, quantity }))
      })
    });
  }

  function saveSession(nextUser, nextToken) {
    setUser(nextUser);
    setToken(nextToken);
    localStorage.setItem("fruitweb_user", JSON.stringify(nextUser));
    localStorage.setItem("fruitweb_token", nextToken);
    setView(nextUser.role === "admin" ? "admin-dashboard" : "home");
  }

  function logout() {
    setUser(null);
    setToken("");
    localStorage.removeItem("fruitweb_user");
    localStorage.removeItem("fruitweb_token");
    localStorage.removeItem("fruitweb_guest_cart");
    setCart({});
    setView("home");
  }

  function addToCart(product) {
    if (!user) {
      setMessage("Ban can dang nhap de them san pham vao gio hang.", "warning");
      setView("login");
      return;
    }

    if (isAdmin) {
      setMessage("Tai khoan admin khong dung gio hang khach.", "warning");
      return;
    }

    setCart((current) => {
      const next = {
        ...current,
        [product.id]: Math.min(product.stock, (current[product.id] || 0) + 1)
      };
      void syncServerCart(next);
      return next;
    });
    setMessage(`Da them ${product.name} vao gio hang.`, "success");
  }

  function updateCartQuantity(productId, quantity) {
    setCart((current) => {
      const next = { ...current };
      const product = products.find((item) => item.id === productId);
      const nextQuantity = Math.max(0, Math.min(product?.stock || 0, Number(quantity)));
      if (nextQuantity === 0) {
        delete next[productId];
      } else {
        next[productId] = nextQuantity;
      }
      void syncServerCart(next);
      return next;
    });
  }

  function removeFromCart(productId) {
    setCart((current) => {
      const next = { ...current };
      delete next[productId];
      void syncServerCart(next);
      return next;
    });
  }

  async function clearSyncedCart() {
    setCart({});
    await syncServerCart({});
  }

  const cartItems = useMemo(
    () =>
      Object.entries(cart)
        .map(([productId, quantity]) => {
          const product = products.find((item) => item.id === productId);
          return product ? { ...product, quantity } : null;
        })
        .filter(Boolean),
    [cart, products]
  );

  if (isAdmin) {
    return (
      <AdminLayout view={view} setView={setView} user={user} logout={logout} message={message}>
        {view === "admin-dashboard" ? <AdminDashboard token={token} onUnauthorized={logout} setMessage={setMessage} /> : null}
        {view === "admin-products" ? (
          <AdminProducts token={token} loadProducts={loadProducts} setMessage={setMessage} onUnauthorized={logout} />
        ) : null}
        {view === "admin-orders" ? <AdminOrders token={token} setMessage={setMessage} onUnauthorized={logout} /> : null}
        {view === "admin-users" ? <AdminUsers token={token} setMessage={setMessage} onUnauthorized={logout} /> : null}
      </AdminLayout>
    );
  }

  return (
    <main className="shell">
      <Topbar
        view={view}
        setView={setView}
        user={user}
        isAdmin={isAdmin}
        cartCount={cartItems.length}
        logout={logout}
      />

      {message ? <p className={`message ${message.type}`}>{message.text}</p> : null}
      {view === "home" ? <HomePage products={products} addToCart={addToCart} setView={setView} /> : null}
      {view === "products" ? (
        <ProductListPage
          products={products}
          addToCart={addToCart}
          loadProducts={loadProducts}
          setMessage={setMessage}
        />
      ) : null}
      {view === "cart" ? (
        <CartPage
          cartItems={cartItems}
          user={user}
          updateCartQuantity={updateCartQuantity}
          removeFromCart={removeFromCart}
          clearCart={clearSyncedCart}
          loadProducts={loadProducts}
          setMessage={setMessage}
          setView={setView}
        />
      ) : null}
      {view === "orders" && user ? <MyOrders token={token} /> : null}
      {view === "profile" && user ? (
        <ProfilePage user={user} token={token} saveSession={saveSession} setMessage={setMessage} />
      ) : null}
      {view === "login" ? <AuthPage mode="login" saveSession={saveSession} setMessage={setMessage} /> : null}
      {view === "register" ? <AuthPage mode="register" saveSession={saveSession} setMessage={setMessage} /> : null}
    </main>
  );
}
