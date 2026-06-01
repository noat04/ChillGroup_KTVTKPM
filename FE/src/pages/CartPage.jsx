import React, { useEffect, useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { apiBaseUrl } from "../config.js";
import { formatMoney } from "../utils/format.js";

export function CartPage({ cartItems, user, updateCartQuantity, removeFromCart, clearCart, loadProducts, setMessage, setView }) {
  const [form, setForm] = useState({
    customerName: user?.name || "",
    phone: user?.phone || "",
    address: user?.address || "",
    note: "",
    paymentMethod: "cod"
  });
  const [lastOrder, setLastOrder] = useState(null);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const total = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  useEffect(() => {
    setForm((current) => ({
      ...current,
      customerName: user?.name || current.customerName,
      phone: user?.phone || current.phone,
      address: user?.address || current.address
    }));
  }, [user?.name, user?.phone, user?.address]);

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function checkout(event) {
    event.preventDefault();
    if (isCheckingOut) {
      return;
    }
    if (!user) {
      setMessage("Ban can dang nhap de dat hang.", "warning");
      setView("login");
      return;
    }

    setIsCheckingOut(true);
    try {
      const response = await fetch(`${apiBaseUrl}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
        ...form,
        userId: user.id,
        customerEmail: user.email,
        items: cartItems.map((item) => ({ productId: item.id, quantity: item.quantity }))
      })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage(result.error || "Khong tao duoc don hang", "error");
        return;
      }
      await clearCart();
      setMessage(`Da tao don ${result.orderId}.`, "success", 5000);
      setTimeout(async () => {
        await loadProducts();
        try {
          const orderResponse = await fetch(`${apiBaseUrl}/orders/${result.orderId}`);
          if (orderResponse.ok) {
            setLastOrder(await orderResponse.json());
          }
        } catch {
          setMessage("Da tao don nhung tam thoi chua tai duoc chi tiet don.", "warning");
        }
      }, 900);
    } catch {
      setMessage("order-service dang tam ngung. Don hang chua duoc tao, ban co the thu lai sau.", "warning");
    } finally {
      setIsCheckingOut(false);
    }
  }

  return (
    <section className="cart-layout">
      <div className="panel">
        <div className="section-title">
          <h2>Gio hang</h2>
          <span>{cartItems.length} san pham</span>
        </div>
        {cartItems.length === 0 ? <p className="empty">Gio hang dang trong.</p> : null}
        {cartItems.map((item) => (
          <div className="cart-item" key={item.id}>
            <img src={item.imageUrl} alt={item.name} />
            <div>
              <strong>{item.name}</strong>
              <span>{formatMoney(item.price)} / {item.unit}</span>
            </div>
            <input
              aria-label={`So luong ${item.name}`}
              type="number"
              min="1"
              max={item.stock}
              value={item.quantity}
              onChange={(event) => updateCartQuantity(item.id, event.target.value)}
            />
            <strong>{formatMoney(item.price * item.quantity)}</strong>
            <button className="icon" onClick={() => removeFromCart(item.id)} title="Xoa">
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>

      <form className="panel checkout-panel" onSubmit={checkout}>
        <h2>Thong tin giao hang</h2>
        <label>
          Ten khach
          <input value={form.customerName} onChange={(event) => update("customerName", event.target.value)} required />
        </label>
        <label>
          So dien thoai
          <input value={form.phone} onChange={(event) => update("phone", event.target.value)} required />
        </label>
        <label>
          Dia chi
          <input value={form.address} onChange={(event) => update("address", event.target.value)} required />
        </label>
        <label>
          Ghi chu
          <input value={form.note} onChange={(event) => update("note", event.target.value)} />
        </label>
        <label>
          Thanh toan
          <select value={form.paymentMethod} onChange={(event) => update("paymentMethod", event.target.value)}>
            <option value="cod">COD</option>
            <option value="bank">Chuyen khoan</option>
            <option value="card">The noi dia</option>
          </select>
        </label>
        <div className="total">
          <span>Tong</span>
          <strong>{formatMoney(total)}</strong>
        </div>
        <button disabled={cartItems.length === 0 || isCheckingOut}>
          {isCheckingOut ? (
            <>
              <Loader2 className="spin" size={18} />
              Dang thanh toan
            </>
          ) : (
            "Thanh toan"
          )}
        </button>
        {lastOrder ? (
          <div className="order-status">
            <span>Don gan nhat</span>
            <strong>{lastOrder.orderId}</strong>
            <em>{lastOrder.status} - {lastOrder.paymentStatus}</em>
          </div>
        ) : null}
      </form>
    </section>
  );
}
