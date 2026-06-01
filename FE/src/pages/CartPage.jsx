import React, { useEffect, useState } from "react";
import { CheckCircle2, Loader2, ShoppingCart, Trash2 } from "lucide-react";
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
      setMessage("Bạn cần đăng nhập để đặt hàng.", "warning");
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
        setMessage(result.error || "Không tạo được đơn hàng", "error");
        return;
      }

      await clearCart();
      setMessage(`Đã tạo đơn ${result.orderId}.`, "success", 5000);

      setTimeout(async () => {
        await loadProducts();
        try {
          const orderResponse = await fetch(`${apiBaseUrl}/orders/${result.orderId}`);
          if (orderResponse.ok) {
            setLastOrder(await orderResponse.json());
          }
        } catch {
          setMessage("Đã tạo đơn nhưng tạm thời chưa tải được chi tiết đơn.", "warning");
        }
      }, 900);
    } catch {
      setMessage("order-service đang tạm ngưng. Đơn hàng chưa được tạo, bạn có thể thử lại sau.", "warning");
    } finally {
      setIsCheckingOut(false);
    }
  }

  return (
    <main className="container py-4 py-lg-5">
      <section className="row g-4">
        <div className="col-lg-8">
          <div className="card border-0 shadow-sm rounded-5">
            <div className="card-body p-4">
              <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                  <span className="badge rounded-pill text-bg-success mb-2">Giỏ hàng</span>
                  <h1 className="h3 fw-bold mb-0">Sản phẩm đã chọn</h1>
                </div>
                <span className="badge text-bg-light border rounded-pill">{cartItems.length} sản phẩm</span>
              </div>

              {cartItems.length === 0 ? (
                <div className="alert alert-light border rounded-4 mb-0">
                  Giỏ hàng đang trống.
                </div>
              ) : (
                <div className="list-group list-group-flush">
                  {cartItems.map((item) => (
                    <div className="list-group-item px-0 py-3" key={item.id}>
                      <div className="row g-3 align-items-center">
                        <div className="col-auto">
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="rounded-4 object-fit-cover"
                            width="86"
                            height="86"
                          />
                        </div>

                        <div className="col">
                          <h6 className="fw-bold mb-1">{item.name}</h6>
                          <p className="text-secondary mb-0">{formatMoney(item.price)} / {item.unit}</p>
                        </div>

                        <div className="col-5 col-md-2">
                          <label className="form-label small text-secondary">Số lượng</label>
                          <input
                            className="form-control"
                            aria-label={`Số lượng ${item.name}`}
                            type="number"
                            min="1"
                            max={item.stock}
                            value={item.quantity}
                            onChange={(event) => updateCartQuantity(item.id, event.target.value)}
                          />
                        </div>

                        <div className="col-7 col-md-2 text-md-end">
                          <strong className="text-danger">{formatMoney(item.price * item.quantity)}</strong>
                        </div>

                        <div className="col-auto">
                          <button
                            type="button"
                            className="btn btn-outline-danger rounded-circle"
                            onClick={() => removeFromCart(item.id)}
                            title="Xóa"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="col-lg-4">
          <form className="card border-0 shadow-sm rounded-5 position-sticky top-0" onSubmit={checkout}>
            <div className="card-body p-4">
              <h2 className="h4 fw-bold mb-4">
                <ShoppingCart size={22} className="me-2 text-success" />
                Thông tin giao hàng
              </h2>

              <div className="mb-3">
                <label className="form-label fw-semibold">Tên khách</label>
                <input
                  className="form-control"
                  value={form.customerName}
                  onChange={(event) => update("customerName", event.target.value)}
                  required
                />
              </div>

              <div className="mb-3">
                <label className="form-label fw-semibold">Số điện thoại</label>
                <input
                  className="form-control"
                  value={form.phone}
                  onChange={(event) => update("phone", event.target.value)}
                  required
                />
              </div>

              <div className="mb-3">
                <label className="form-label fw-semibold">Địa chỉ</label>
                <input
                  className="form-control"
                  value={form.address}
                  onChange={(event) => update("address", event.target.value)}
                  required
                />
              </div>

              <div className="mb-3">
                <label className="form-label fw-semibold">Ghi chú</label>
                <input
                  className="form-control"
                  value={form.note}
                  onChange={(event) => update("note", event.target.value)}
                />
              </div>

              <div className="mb-4">
                <label className="form-label fw-semibold">Thanh toán</label>
                <select
                  className="form-select"
                  value={form.paymentMethod}
                  onChange={(event) => update("paymentMethod", event.target.value)}
                >
                  <option value="cod">COD</option>
                  <option value="bank">Chuyển khoản</option>
                  <option value="card">Thẻ nội địa</option>
                </select>
              </div>

              <div className="d-flex justify-content-between align-items-center border-top pt-3 mb-4">
                <span className="text-secondary">Tổng</span>
                <strong className="fs-4 text-danger">{formatMoney(total)}</strong>
              </div>

              <button className="btn btn-success btn-lg rounded-pill w-100" disabled={cartItems.length === 0 || isCheckingOut}>
                {isCheckingOut ? (
                  <>
                    <Loader2 size={18} className="me-2" />
                    Đang thanh toán
                  </>
                ) : (
                  "Thanh toán"
                )}
              </button>

              {lastOrder && (
                <div className="alert alert-success rounded-4 mt-4 mb-0">
                  <div className="d-flex gap-2">
                    <CheckCircle2 size={20} />
                    <div>
                      <span className="d-block">Đơn gần nhất</span>
                      <strong className="d-block">{lastOrder.orderId}</strong>
                      <small>{lastOrder.status} - {lastOrder.paymentStatus}</small>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}
