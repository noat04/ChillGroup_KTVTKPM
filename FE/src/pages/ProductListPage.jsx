import React, { useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCw, Search, ShoppingCart, Sparkles } from "lucide-react";
import { apiBaseUrl } from "../config.js";
import { formatMoney } from "../utils/format.js";

export function ProductListPage({ products, addToCart, loadProducts, setMessage, selectedCategory, setSelectedCategory, openProductDetail }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState(selectedCategory || "Tat ca");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiResults, setAiResults] = useState([]);
  const [aiCriteria, setAiCriteria] = useState(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

  const categories = useMemo(
    () => ["Tat ca", ...new Set(products.map((product) => product.category).filter(Boolean))],
    [products]
  );

  useEffect(() => {
    const nextCategory = categories.includes(selectedCategory) ? selectedCategory : "Tat ca";
    setCategory(nextCategory);
    setPage(1);
  }, [categories, selectedCategory]);

  const visibleProducts = useMemo(() => {
    return products.filter((product) => {
      const text = `${product.name} ${product.origin} ${product.description}`.toLowerCase();
      return text.includes(query.toLowerCase()) && (category === "Tat ca" || product.category === category);
    });
  }, [category, products, query]);

  const totalPages = Math.max(1, Math.ceil(visibleProducts.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedProducts = visibleProducts.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  function updateQuery(value) {
    setQuery(value);
    setPage(1);
  }

  function updateCategory(value) {
    setCategory(value);
    setSelectedCategory?.(value);
    setPage(1);
  }

  function updatePageSize(value) {
    setPageSize(Number(value));
    setPage(1);
  }

  async function seedProducts() {
    try {
      const response = await fetch(`${apiBaseUrl}/products/seed`, { method: "POST" });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage(result.error || "Không seed được sản phẩm. Vui lòng thử lại.", "warning");
        return;
      }
      setMessage("Đã seed sản phẩm vào MongoDB.", "success");
      setTimeout(loadProducts, 600);
    } catch {
      setMessage("product-service đang tạm ngưng. Vui lòng thử lại sau.", "warning");
    }
  }

  async function askAi(event) {
    event.preventDefault();
    if (aiPrompt.trim().length < 3) {
      setMessage("Nhập mô tả sản phẩm cần tìm.", "warning");
      return;
    }

    setIsAiLoading(true);
    try {
      const response = await fetch(`${apiBaseUrl}/ai/product-suggestions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: aiPrompt })
      });
      const result = await response.json();
      if (!response.ok) {
        setMessage(result.error || "AI không gợi ý được sản phẩm.", "error");
        return;
      }
      setAiResults(result.products || []);
      setAiCriteria(result.criteria || null);
      if ((result.products || []).length === 0) {
        setMessage("AI chưa tìm thấy sản phẩm phù hợp. Thử mô tả ngắn hơn hoặc bỏ bớt điều kiện giá/xuất xứ.", "warning");
        return;
      }
      setMessage(`AI tìm thấy ${(result.products || []).length} sản phẩm phù hợp.`, "success");
    } catch {
      setMessage("AI đang không sẵn sàng. Vui lòng thử lại sau.", "error");
    } finally {
      setIsAiLoading(false);
    }
  }

  return (
    <main className="container py-4 py-lg-5">
      <section className="d-flex flex-column flex-lg-row justify-content-between align-items-lg-end gap-3 mb-4">
        <div>
          <span className="badge rounded-pill text-bg-success mb-2">Trái ngon hôm nay</span>
          <h1 className="display-6 fw-bold text-success mb-2">Danh sách sản phẩm</h1>
          <p className="text-secondary mb-0">Chọn trái cây tươi, giỏ quà và các sản phẩm theo mùa.</p>
        </div>

        <button type="button" className="btn btn-outline-success rounded-pill px-4" onClick={loadProducts}>
          <RefreshCw size={18} className="me-2" />
          Tải lại
        </button>
      </section>

      <section className="card border-0 shadow-sm rounded-5 mb-4">
        <div className="card-body p-4">
          <div className="d-flex flex-column flex-lg-row justify-content-between gap-3 mb-3">
            <div>
              <span className="badge rounded-pill text-bg-warning mb-2">
                <Sparkles size={14} className="me-1" />
                Gemini AI
              </span>
              <h2 className="h4 fw-bold mb-1">Gợi ý sản phẩm bằng mô tả</h2>
              <p className="text-secondary mb-0">Nhập nhu cầu, AI sẽ lọc sản phẩm phù hợp.</p>
            </div>
          </div>

          <form className="row g-3" onSubmit={askAi}>
            <div className="col-lg-10">
              <div className="input-group input-group-lg">
                <span className="input-group-text bg-white">
                  <Sparkles size={18} />
                </span>
                <input
                  className="form-control"
                  placeholder="VD: các loại cam mới hôm nay có xuất xứ từ Đà Lạt, giá 50000 đến 100000"
                  value={aiPrompt}
                  onChange={(event) => setAiPrompt(event.target.value)}
                />
              </div>
            </div>

            <div className="col-lg-2">
              <button className="btn btn-success btn-lg rounded-pill w-100" disabled={isAiLoading}>
                {isAiLoading ? <Loader2 size={18} className="me-2" /> : <Sparkles size={18} className="me-2" />}
                Gợi ý
              </button>
            </div>
          </form>

          {aiCriteria && (
            <div className="d-flex flex-wrap gap-2 mt-3">
              <span className="badge text-bg-light border rounded-pill">Từ khóa: {aiCriteria.keywords?.join(", ") || "không có"}</span>
              <span className="badge text-bg-light border rounded-pill">Xuất xứ: {aiCriteria.origins?.join(", ") || "tất cả"}</span>
              <span className="badge text-bg-light border rounded-pill">Giá: {aiCriteria.minPrice ?? "bất kỳ"} - {aiCriteria.maxPrice ?? "bất kỳ"}</span>
            </div>
          )}
        </div>
      </section>

      {aiResults.length > 0 && (
        <section className="mb-5">
          <div className="d-flex justify-content-between align-items-end gap-3 mb-4">
            <div>
              <span className="badge text-bg-light border rounded-pill mb-2">AI đề xuất</span>
              <h2 className="fw-bold text-success mb-0">Sản phẩm AI gợi ý</h2>
            </div>
            <button type="button" className="btn btn-outline-secondary rounded-pill" onClick={() => setAiResults([])}>
              Ẩn gợi ý
            </button>
          </div>
          <ProductGrid products={aiResults} addToCart={addToCart} openProductDetail={openProductDetail} />
        </section>
      )}

      <section className="card border-0 shadow-sm rounded-5 mb-4">
        <div className="card-body p-4">
          <div className="row g-3 align-items-end">
            <div className="col-lg-8">
              <label className="form-label fw-semibold">Danh mục</label>
              <div className="d-flex flex-wrap gap-2">
                {categories.map((item) => (
                  <button
                    type="button"
                    className={`btn rounded-pill ${item === category ? "btn-success" : "btn-outline-success"}`}
                    key={item}
                    onClick={() => updateCategory(item)}
                  >
                    {item === "Tat ca" ? "Tất cả" : item}
                  </button>
                ))}
                <button type="button" className="btn btn-outline-secondary rounded-pill" onClick={seedProducts}>Seed</button>
              </div>
            </div>

            <div className="col-lg-4">
              <label className="form-label fw-semibold">Tìm kiếm</label>
              <div className="input-group">
                <span className="input-group-text bg-white">
                  <Search size={18} />
                </span>
                <input
                  className="form-control"
                  placeholder="Tìm trái cây, xuất xứ..."
                  value={query}
                  onChange={(event) => updateQuery(event.target.value)}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <span className="text-secondary">
          Hiển thị {pagedProducts.length} / {visibleProducts.length} sản phẩm
        </span>

        <label className="d-flex align-items-center gap-2">
          <span className="text-secondary text-nowrap">Mỗi trang</span>
          <select className="form-select" value={pageSize} onChange={(event) => updatePageSize(event.target.value)}>
            <option value="8">8</option>
            <option value="12">12</option>
            <option value="16">16</option>
            <option value="24">24</option>
          </select>
        </label>
      </section>

      <ProductGrid products={pagedProducts} addToCart={addToCart} openProductDetail={openProductDetail} />

      <nav className="d-flex justify-content-center mt-4" aria-label="Phân trang sản phẩm">
        <ul className="pagination mb-0 flex-wrap">
          <li className={`page-item ${currentPage === 1 ? "disabled" : ""}`}>
            <button className="page-link" onClick={() => setPage((value) => Math.max(1, value - 1))}>Trước</button>
          </li>

          {Array.from({ length: totalPages }, (_, index) => index + 1).map((item) => (
            <li className={`page-item ${item === currentPage ? "active" : ""}`} key={item}>
              <button className="page-link" onClick={() => setPage(item)}>{item}</button>
            </li>
          ))}

          <li className={`page-item ${currentPage === totalPages ? "disabled" : ""}`}>
            <button className="page-link" onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>Sau</button>
          </li>
        </ul>
      </nav>
    </main>
  );
}

function ProductGrid({ products, addToCart, openProductDetail }) {
  if (products.length === 0) {
    return <div className="alert alert-light border rounded-4">Không có sản phẩm phù hợp.</div>;
  }

  return (
    <section className="row g-4">
      {products.map((product) => (
        <div className="col-12 col-sm-6 col-lg-4 col-xl-3" key={product.id || product.productId}>
          <ProductCard product={product} addToCart={addToCart} openProductDetail={openProductDetail} />
        </div>
      ))}
    </section>
  );
}

function ProductCard({ product, addToCart, openProductDetail }) {
  const isOutOfStock = Number(product.stock || 0) <= 0;

  return (
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
          <img src={product.imageUrl} alt={product.name} className="img-fluid object-fit-cover" />
        </div>

        <span className={`position-absolute top-0 start-0 m-3 badge rounded-pill ${isOutOfStock ? "text-bg-danger" : "text-bg-success"}`}>
          {isOutOfStock ? "Hết hàng" : "Còn hàng"}
        </span>
      </div>

      <div className="card-body d-flex flex-column p-4">
        <button
          type="button"
          className="btn btn-link text-start text-dark text-decoration-none fw-bold fs-5 p-0 mb-2"
          onClick={() => openProductDetail(product)}
        >
          {product.name}
        </button>

        <p className="text-secondary small mb-3">
          {product.description}
        </p>

        <div className="d-flex flex-wrap gap-2 mb-3">
          <span className="badge text-bg-light border rounded-pill">{product.origin}</span>
          <span className="badge text-bg-light border rounded-pill">{product.category}</span>
        </div>

        <div className="mt-auto">
          <p className="fw-bold fs-5 text-danger mb-1">{formatMoney(product.price)}</p>
          <p className="text-secondary small mb-3">Tồn kho: {product.stock}</p>

          <button
            type="button"
            className="btn btn-success rounded-pill w-100"
            disabled={isOutOfStock}
            onClick={(event) => {
              event.stopPropagation();
              addToCart(product);
            }}
          >
            <ShoppingCart size={18} className="me-2" />
            Chọn mua
          </button>
        </div>
      </div>
    </article>
  );
}
