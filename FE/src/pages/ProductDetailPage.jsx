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
      <section className="panel product-detail-empty">
        <h1>Khong tim thay san pham</h1>
        <button onClick={() => setView("products")}>
          <ArrowLeft size={18} />
          Quay lai danh sach
        </button>
      </section>
    );
  }

  const stock = Number(product.stock || 0);
  const safeQuantity = Math.max(1, Math.min(stock || 1, Number(quantity) || 1));

  function addSelectedQuantity() {
    addToCart(product, safeQuantity);
  }

  return (
    <>
      <section className="product-detail-toolbar">
        <button className="link-button" onClick={() => setView("products")}>
          <ArrowLeft size={18} />
          Quay lai danh sach
        </button>
      </section>

      <section className="product-detail-page">
        <div className="product-detail-media">
          <img src={product.imageUrl} alt={product.name} />
        </div>

        <div className="product-detail-info">
          <p className="eyebrow">{product.category || "Trai cay tuoi"}</p>
          <h1>{product.name}</h1>
          <p className="product-detail-description">{product.description}</p>

          <div className="product-detail-meta">
            <span>{product.origin || "Xuat xu dang cap nhat"}</span>
            <span>{product.unit || "don vi"}</span>
            <span>{stock > 0 ? `Con ${stock} san pham` : "Tam het hang"}</span>
          </div>

          <p className="product-detail-price">{formatMoney(product.price)}</p>

          <div className="product-detail-actions">
            <label>
              So luong
              <input
                type="number"
                min="1"
                max={Math.max(1, stock)}
                value={safeQuantity}
                onChange={(event) => setQuantity(event.target.value)}
                disabled={stock === 0}
              />
            </label>
            <button disabled={stock === 0} onClick={addSelectedQuantity}>
              <ShoppingCart size={18} />
              Them vao gio
            </button>
          </div>

          <div className="product-detail-benefits">
            <div>
              <CheckCircle2 size={19} />
              <span>Chon loc theo ngay</span>
            </div>
            <div>
              <Truck size={19} />
              <span>Giao nhanh trong khu vuc</span>
            </div>
            <div>
              <Package size={19} />
              <span>Dong goi can than</span>
            </div>
          </div>
        </div>
      </section>

      {relatedProducts.length > 0 ? (
        <section className="home-section product-detail-related">
          <div className="section-heading">
            <h2>San pham lien quan</h2>
            <button className="link-button" onClick={() => setView("products")}>Xem tat ca</button>
          </div>
          <div className="related-products">
            {relatedProducts.map((item) => (
              <button className="related-product" key={item.id} onClick={() => openProductDetail(item)}>
                <img src={item.imageUrl} alt={item.name} />
                <span>{item.name}</span>
                <strong>{formatMoney(item.price)}</strong>
              </button>
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}
