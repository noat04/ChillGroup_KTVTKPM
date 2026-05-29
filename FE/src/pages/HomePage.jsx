import React from "react";
import { ShoppingCart, Store } from "lucide-react";
import { formatMoney } from "../utils/format.js";

export function HomePage({ products, addToCart, setView }) {
  const giftProducts = products.filter((product) => product.category?.toLowerCase().includes("qua")).slice(0, 8);
  const todayProducts = products.slice(0, 8);
  const vietnamProducts = products.filter((product) => product.origin?.toLowerCase().includes("viet")).slice(0, 8);
  const featured = todayProducts.slice(0, 3);

  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Fruitweb - Trai cay chat luong cao</p>
          <h1>Trai cay tuoi, hop qua dep, giao nhanh moi ngay</h1>
          <p>
            Lua chon trai ngon trong ngay, gio qua trai cay va trai cay Viet Nam theo mua. Don hang duoc
            dong bo theo tai khoan de ban theo doi trang thai ro rang.
          </p>
          <button onClick={() => setView("products")}>
            <Store size={18} />
            Mua trai cay ngay
          </button>
        </div>
        <div className="hero-products">
          {featured.map((product) => (
            <article key={product.id}>
              <img src={product.imageUrl} alt={product.name} />
              <strong>{product.name}</strong>
              <span>{formatMoney(product.price)}</span>
            </article>
          ))}
        </div>
      </section>

      <CategoryStrip setView={setView} />
      <ProductSection title="Qua tang trai cay" products={giftProducts.length ? giftProducts : todayProducts} addToCart={addToCart} setView={setView} />
      <ProductSection title="Trai ngon hom nay" products={todayProducts} addToCart={addToCart} setView={setView} />
      <ProductSection title="Trai cay Viet Nam" products={vietnamProducts.length ? vietnamProducts : todayProducts.slice(0, 4)} addToCart={addToCart} setView={setView} />
    </>
  );
}

function CategoryStrip({ setView }) {
  const items = ["Qua tang trai cay", "Trai cay cat san", "Mam ngu qua", "Trai ngon hom nay", "Trai cay Viet Nam", "Trai cay nhap khau"];

  return (
    <section className="category-strip">
      {items.map((item) => (
        <button key={item} onClick={() => setView("products")}>
          {item}
        </button>
      ))}
    </section>
  );
}

function ProductSection({ title, products, addToCart, setView }) {
  return (
    <section className="home-section">
      <div className="section-heading">
        <h2>{title}</h2>
        <button className="link-button" onClick={() => setView("products")}>Xem them san pham</button>
      </div>
      <div className="products">
        {products.map((product) => (
          <article className="product" key={`${title}-${product.id}`}>
            <img src={product.imageUrl} alt={product.name} />
            <div className="product-body">
              <h2>{product.name}</h2>
              <p className="price">{formatMoney(product.price)}</p>
              <button disabled={product.stock === 0} onClick={() => addToCart(product)}>
                <ShoppingCart size={18} />
                Chon mua
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
