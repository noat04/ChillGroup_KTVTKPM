import React, { useMemo } from "react";
import {
  ArrowRight,
  Leaf,
  ShieldCheck,
  ShoppingCart,
  Store,
  Truck,
} from "lucide-react";
import { formatMoney } from "../utils/format.js";

const HOME_CATEGORY_LIMIT = 4;

export function HomePage({ products, addToCart, openProducts, openProductDetail }) {
  const activeProducts = useMemo(
    () => products.filter((product) => product.active !== false),
    [products]
  );

  const featured = activeProducts.slice(0, 3);

  const categoryGroups = useMemo(
    () => groupProductsByCategory(activeProducts),
    [activeProducts]
  );

  const categories = categoryGroups.map((group) => group.category);

  return (
    <main className="container py-4 py-lg-5">
      <section className="row align-items-center g-4 mb-5 p-4 p-lg-5 bg-light rounded-5 shadow-sm">
        <div className="col-lg-7">
          <span className="badge rounded-pill text-bg-success mb-3 px-3 py-2">
            Fruitweb • Trái cây chất lượng cao
          </span>

          <h1 className="display-5 fw-bold text-success mb-3">
            Trái cây tươi mỗi ngày, đóng gói đẹp và giao nhanh tận nơi
          </h1>

          <p className="lead text-secondary mb-4">
            Chọn trái cây tươi ngon theo mùa, giỏ quà sang trọng và sản phẩm chất lượng.
            Đơn hàng được đồng bộ theo tài khoản để bạn dễ dàng theo dõi trạng thái.
          </p>

          <div className="d-flex flex-wrap gap-3 mb-4">
            <button className="btn btn-success btn-lg rounded-pill px-4" onClick={() => openProducts()}>
              <Store size={18} className="me-2" />
              Mua trái cây ngay
            </button>

            <button className="btn btn-outline-success btn-lg rounded-pill px-4" onClick={() => openProducts()}>
              Xem sản phẩm
              <ArrowRight size={18} className="ms-2" />
            </button>
          </div>

          <div className="row g-3">
            <TrustItem icon={<Truck size={20} />} text="Giao nhanh trong ngày" />
            <TrustItem icon={<ShieldCheck size={20} />} text="Đảm bảo chất lượng" />
            <TrustItem icon={<Leaf size={20} />} text="Tươi sạch theo mùa" />
          </div>
        </div>

        <div className="col-lg-5">
          <div className="card border-0 shadow rounded-5">
            <div className="card-body p-4">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="fw-bold mb-0">Sản phẩm nổi bật</h5>
                <span className="badge text-bg-success rounded-pill">
                  {featured.length} món
                </span>
              </div>

              <div className="d-flex flex-column gap-3">
                {featured.map((product) => (
                  <article
                    key={product.id}
                    className="card border-0 bg-light rounded-4 overflow-hidden"
                    role="button"
                    tabIndex="0"
                    onClick={() => openProductDetail(product)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        openProductDetail(product);
                      }
                    }}
                  >
                    <div className="row g-0 align-items-center">
                      <div className="col-4">
                        <div className="ratio ratio-1x1">
                          <img
                            src={product.imageUrl}
                            alt={product.name}
                            className="img-fluid object-fit-cover"
                          />
                        </div>
                      </div>

                      <div className="col-8">
                        <div className="card-body">
                          <h6 className="fw-bold mb-1">{product.name}</h6>
                          <p className="fw-bold text-danger mb-0">
                            {formatMoney(product.price)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>
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
    </main>
  );
}

function TrustItem({ icon, text }) {
  return (
    <div className="col-sm-4">
      <div className="d-flex align-items-center gap-2 text-success fw-semibold">
        {icon}
        <span>{text}</span>
      </div>
    </div>
  );
}

function CategoryStrip({ categories, openProducts }) {
  if (!categories.length) return null;

  return (
    <section className="card border-0 shadow-sm rounded-5 mb-5">
      <div className="card-body p-4">
        <div className="row align-items-center g-3">
          <div className="col-lg-3">
            <h4 className="fw-bold mb-1">Danh mục sản phẩm</h4>
            <p className="text-secondary mb-0">Chọn nhanh nhóm trái cây</p>
          </div>

          <div className="col-lg-9">
            <div className="d-flex flex-wrap gap-2">
              {categories.map((item) => (
                <button
                  key={item}
                  className="btn btn-outline-success rounded-pill px-3"
                  onClick={() => openProducts(item)}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ProductSection({
  title,
  products,
  addToCart,
  openProducts,
  openProductDetail,
}) {
  return (
    <section className="mb-5">
      <div className="d-flex justify-content-between align-items-end gap-3 mb-4">
        <div>
          <p className="text-uppercase text-danger fw-bold small mb-1">
            Sản phẩm theo danh mục
          </p>
          <h2 className="fw-bold text-success mb-0">{title}</h2>
        </div>

        <button
          className="btn btn-link text-success fw-bold text-decoration-none p-0"
          onClick={() => openProducts(title)}
        >
          Xem thêm
          <ArrowRight size={17} className="ms-1" />
        </button>
      </div>

      <div className="row g-4">
        {products.map((product) => {
          const isOutOfStock = (product.stock ?? 1) <= 0;

          return (
            <div className="col-12 col-sm-6 col-lg-3" key={`${title}-${product.id}`}>
              <article className="card h-100 border-0 shadow-sm rounded-5 overflow-hidden">
                <div
                  className="position-relative"
                  role="button"
                  tabIndex="0"
                  onClick={() => openProductDetail(product)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      openProductDetail(product);
                    }
                  }}
                >
                  <div className="ratio ratio-4x3 bg-light">
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="img-fluid object-fit-cover"
                    />
                  </div>

                  <span
                    className={`position-absolute top-0 start-0 m-3 badge rounded-pill ${
                      isOutOfStock ? "text-bg-danger" : "text-bg-success"
                    }`}
                  >
                    {isOutOfStock ? "Hết hàng" : "Còn hàng"}
                  </span>
                </div>

                <div className="card-body d-flex flex-column p-4">
                  <button
                    className="btn btn-link text-start text-dark text-decoration-none fw-bold fs-5 p-0 mb-1"
                    onClick={() => openProductDetail(product)}
                  >
                    {product.name}
                  </button>

                  <p className="text-secondary small mb-3">
                    {product.category || title}
                  </p>

                  <div className="mt-auto">
                    <p className="fw-bold fs-5 text-danger mb-3">
                      {formatMoney(product.price)}
                    </p>

                    <button
                      className="btn btn-success rounded-pill w-100"
                      disabled={isOutOfStock}
                      onClick={() => addToCart(product)}
                    >
                      <ShoppingCart size={18} className="me-2" />
                      Chọn mua
                    </button>
                  </div>
                </div>
              </article>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function groupProductsByCategory(products) {
  const groups = new Map();

  products.forEach((product) => {
    const category = product.category || "Trái cây tươi";

    if (!groups.has(category)) {
      groups.set(category, []);
    }

    if (groups.get(category).length < HOME_CATEGORY_LIMIT) {
      groups.get(category).push(product);
    }
  });

  return [...groups.entries()].map(([category, items]) => ({
    category,
    products: items,
  }));
}