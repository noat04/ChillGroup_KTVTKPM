import React, { useMemo } from "react";
import { ShoppingCart, Store } from "lucide-react";
import { formatMoney } from "../utils/format.js";

const HOME_CATEGORY_LIMIT = 4;

export function HomePage({ products, addToCart, openProducts, openProductDetail }) {
  const activeProducts = products.filter((product) => product.active !== false);
  const featured = activeProducts.slice(0, 3);
  const categoryGroups = useMemo(() => groupProductsByCategory(activeProducts), [activeProducts]);
  const categories = categoryGroups.map((group) => group.category);

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
          <button onClick={() => openProducts()}>
            <Store size={18} />
            Mua trai cay ngay
          </button>
        </div>
        <div className="hero-products">
          {featured.map((product) => (
            <article className="clickable-product" key={product.id} role="button" tabIndex="0" onClick={() => openProductDetail(product)} onKeyDown={(event) => event.key === "Enter" && openProductDetail(product)}>
              <img src={product.imageUrl} alt={product.name} />
              <strong>{product.name}</strong>
              <span>{formatMoney(product.price)}</span>
            </article>
          ))}
        </div>
      </section>

      <CategoryStrip categories={categories} openProducts={openProducts} />
      {categoryGroups.map((group) => (
        <ProductSection
          key={group.category}
          title={group.category}
          products={group.products}
          addToCart={addToCart}
          openProducts={openProducts}
          openProductDetail={openProductDetail}
        />
      ))}
    </>
  );
}

function CategoryStrip({ categories, openProducts }) {
  return (
    <section className="category-strip">
      {categories.map((item) => (
        <button key={item} onClick={() => openProducts(item)}>
          {item}
        </button>
      ))}
    </section>
  );
}

function ProductSection({ title, products, addToCart, openProducts, openProductDetail }) {
  return (
    <section className="home-section">
      <div className="section-heading">
        <h2>{title}</h2>
        <button className="link-button" onClick={() => openProducts(title)}>Xem them san pham</button>
      </div>
      <div className="products home-products">
        {products.map((product) => (
          <article className="product clickable-product" key={`${title}-${product.id}`} role="button" tabIndex="0" onClick={() => openProductDetail(product)} onKeyDown={(event) => event.key === "Enter" && openProductDetail(product)}>
            <img src={product.imageUrl} alt={product.name} />
            <div className="product-body">
              <h2>{product.name}</h2>
              <p className="price">{formatMoney(product.price)}</p>
              <button disabled={product.stock === 0} onClick={(event) => { event.stopPropagation(); addToCart(product); }}>
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

function groupProductsByCategory(products) {
  const groups = new Map();

  products.forEach((product) => {
    const category = product.category || "Trai cay tuoi";
    if (!groups.has(category)) {
      groups.set(category, []);
    }

    if (groups.get(category).length < HOME_CATEGORY_LIMIT) {
      groups.get(category).push(product);
    }
  });

  return [...groups.entries()].map(([category, items]) => ({
    category,
    products: items
  }));
}
