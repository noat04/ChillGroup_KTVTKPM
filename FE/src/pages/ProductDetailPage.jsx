import React, { useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, Package, ShoppingCart, Truck } from "lucide-react";
import { formatMoney } from "../utils/format.js";

export function ProductDetailPage({ product, products, addToCart, setView, openProductDetail }) {
  const [quantity, setQuantity] = useState(1);

  const relatedProducts = useMemo(() => {
    if (!product) {
      return [];
    }

    return products
      .filter((item) => item.id !== product.id && (item.category === product.category || item.origin === product.origin))
      .slice(0, 4);
  }, [product, products]);

  if (!product) {
    return (
      <main className="container py-4 py-lg-5">
        <div className="card border-0 shadow-sm rounded-5">
          <div className="card-body p-4 text-center">
            <h1 className="fw-bold">Không tìm thấy sản phẩm</h1>
            <button type="button" className="btn btn-outline-success rounded-pill mt-3" onClick={() => setView("products")}>
              <ArrowLeft size={18} className="me-2" />
              Quay lại danh sách
            </button>
          </div>
        </div>
      </main>
    );
  }

  const stock = Number(product.stock || 0);
  const safeQuantity = Math.max(1, Math.min(stock || 1, Number(quantity) || 1));

  function addSelectedQuantity() {
    addToCart(product, safeQuantity);
  }

  return (
    <main className="container py-4 py-lg-5">
      <button type="button" className="btn btn-link text-success text-decoration-none fw-semibold px-0 mb-3" onClick={() => setView("products")}>
        <ArrowLeft size={18} className="me-2" />
        Quay lại danh sách
      </button>

      <section className="card border-0 shadow-sm rounded-5 overflow-hidden mb-5">
        <div className="row g-0">
          <div className="col-lg-6 bg-light">
            <div className="ratio ratio-1x1">
              <img src={product.imageUrl} alt={product.name} className="img-fluid object-fit-cover" />
            </div>
          </div>

          <div className="col-lg-6">
            <div className="card-body p-4 p-lg-5">
              <span className="badge rounded-pill text-bg-success mb-3">
                {product.category || "Trái cây tươi"}
              </span>

              <h1 className="display-6 fw-bold mb-3">{product.name}</h1>

              <p className="text-secondary fs-5 lh-lg mb-4">
                {product.description}
              </p>

              <div className="d-flex flex-wrap gap-2 mb-4">
                <span className="badge text-bg-light border rounded-pill px-3 py-2">
                  {product.origin || "Xuất xứ đang cập nhật"}
                </span>
                <span className="badge text-bg-light border rounded-pill px-3 py-2">
                  Đơn vị: {product.unit || "đơn vị"}
                </span>
                <span className={`badge rounded-pill px-3 py-2 ${stock > 0 ? "text-bg-success" : "text-bg-danger"}`}>
                  {stock > 0 ? `Còn ${stock} sản phẩm` : "Tạm hết hàng"}
                </span>
              </div>

              <p className="display-6 fw-bold text-danger mb-4">
                {formatMoney(product.price)}
              </p>

              <div className="row g-3 align-items-end mb-4">
                <div className="col-sm-4">
                  <label className="form-label fw-semibold">Số lượng</label>
                  <input
                    className="form-control form-control-lg"
                    type="number"
                    min="1"
                    max={Math.max(1, stock)}
                    value={safeQuantity}
                    onChange={(event) => setQuantity(event.target.value)}
                    disabled={stock === 0}
                  />
                </div>

                <div className="col-sm-8">
                  <button className="btn btn-success btn-lg rounded-pill w-100" disabled={stock === 0} onClick={addSelectedQuantity}>
                    <ShoppingCart size={18} className="me-2" />
                    Thêm vào giỏ
                  </button>
                </div>
              </div>

              <div className="row g-3">
                <Benefit icon={<CheckCircle2 size={19} />} text="Chọn lọc theo ngày" />
                <Benefit icon={<Truck size={19} />} text="Giao nhanh trong khu vực" />
                <Benefit icon={<Package size={19} />} text="Đóng gói cẩn thận" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {relatedProducts.length > 0 && (
        <section>
          <div className="d-flex justify-content-between align-items-end gap-3 mb-4">
            <div>
              <span className="badge text-bg-light border rounded-pill mb-2">Gợi ý thêm</span>
              <h2 className="fw-bold text-success mb-0">Sản phẩm liên quan</h2>
            </div>
            <button type="button" className="btn btn-outline-success rounded-pill" onClick={() => setView("products")}>
              Xem tất cả
            </button>
          </div>

          <div className="row g-4">
            {relatedProducts.map((item) => (
              <div className="col-12 col-sm-6 col-lg-3" key={item.id}>
                <button type="button" className="card h-100 border-0 shadow-sm rounded-5 overflow-hidden text-start w-100" onClick={() => openProductDetail(item)}>
                  <div className="ratio ratio-4x3 bg-light">
                    <img src={item.imageUrl} alt={item.name} className="img-fluid object-fit-cover" />
                  </div>
                  <div className="card-body">
                    <h6 className="fw-bold mb-2">{item.name}</h6>
                    <strong className="text-danger">{formatMoney(item.price)}</strong>
                  </div>
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

function Benefit({ icon, text }) {
  return (
    <div className="col-sm-4">
      <div className="d-flex align-items-center gap-2 text-success fw-semibold">
        {icon}
        <span>{text}</span>
      </div>
    </div>
  );
}
