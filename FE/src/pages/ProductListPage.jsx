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
    await fetch(`${apiBaseUrl}/products/seed`, { method: "POST" });
    setMessage("Da seed san pham vao MongoDB.", "success");
    setTimeout(loadProducts, 600);
  }

  async function askAi(event) {
    event.preventDefault();
    if (aiPrompt.trim().length < 3) {
      setMessage("Nhap mo ta san pham can tim.", "warning");
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
        setMessage(result.error || "AI khong goi y duoc san pham.", "error");
        return;
      }
      setAiResults(result.products || []);
      setAiCriteria(result.criteria || null);
      if ((result.products || []).length === 0) {
        setMessage("AI chua tim thay san pham phu hop. Thu mo ta ngan hon hoac bo bot dieu kien gia/xuat xu.", "warning");
        return;
      }
      setMessage(`AI tim thay ${(result.products || []).length} san pham phu hop.`, "success");
    } catch {
      setMessage("AI dang khong san sang. Vui long thu lai sau.", "error");
    } finally {
      setIsAiLoading(false);
    }
  }

  return (
    <>
      <section className="page-heading">
        <p className="eyebrow">Trai ngon hom nay</p>
        <h1>Danh sach san pham</h1>
        <span>Chon trai cay tuoi, gio qua va cac san pham theo mua.</span>
      </section>
      <section className="panel ai-search-panel">
        <div>
          <p className="eyebrow">Gemini AI</p>
          <h2>Goi y san pham bang mo ta</h2>
        </div>
        <form className="ai-search-form" onSubmit={askAi}>
          <label className="search">
            <Sparkles size={18} />
            <input
              placeholder="VD: cac loai cam moi hom nay co xuat xu tu Da Lat, gia 50000 den 100000"
              value={aiPrompt}
              onChange={(event) => setAiPrompt(event.target.value)}
            />
          </label>
          <button disabled={isAiLoading}>
            {isAiLoading ? <Loader2 className="spin" size={18} /> : <Sparkles size={18} />}
            Goi y
          </button>
        </form>
        {aiCriteria ? (
          <div className="ai-criteria">
            <span>Tu khoa: {aiCriteria.keywords?.join(", ") || "khong co"}</span>
            <span>Xuat xu: {aiCriteria.origins?.join(", ") || "tat ca"}</span>
            <span>
              Gia: {aiCriteria.minPrice ?? "bat ky"} - {aiCriteria.maxPrice ?? "bat ky"}
            </span>
          </div>
        ) : null}
      </section>
      {aiResults.length > 0 ? (
        <section className="home-section">
          <div className="section-heading">
            <h2>San pham AI goi y</h2>
            <button className="link-button" onClick={() => setAiResults([])}>An goi y</button>
          </div>
          <section className="products">
            {aiResults.map((product) => (
              <ProductCard key={`ai-${product.id || product.productId}`} product={product} addToCart={addToCart} openProductDetail={openProductDetail} />
            ))}
          </section>
        </section>
      ) : null}
      <section className="filters product-tools">
        <div className="tabs">
          {categories.map((item) => (
            <button className={item === category ? "active" : ""} key={item} onClick={() => updateCategory(item)}>
              {item}
            </button>
          ))}
          <button onClick={loadProducts} title="Tai lai">
            <RefreshCw size={18} />
          </button>
          <button onClick={seedProducts}>Seed</button>
        </div>
        <label className="search">
          <Search size={18} />
          <input
            placeholder="Tim trai cay, xuat xu..."
            value={query}
            onChange={(event) => updateQuery(event.target.value)}
          />
        </label>
      </section>
      <section className="pagination-bar">
        <span>
          Hien thi {pagedProducts.length} / {visibleProducts.length} san pham
        </span>
        <label>
          Moi trang
          <select value={pageSize} onChange={(event) => updatePageSize(event.target.value)}>
            <option value="8">8</option>
            <option value="12">12</option>
            <option value="16">16</option>
            <option value="24">24</option>
          </select>
        </label>
      </section>
      <section className="products">
        {pagedProducts.map((product) => (
          <ProductCard key={product.id} product={product} addToCart={addToCart} openProductDetail={openProductDetail} />
        ))}
      </section>
      <nav className="pagination" aria-label="Phan trang san pham">
        <button disabled={currentPage === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>
          Truoc
        </button>
        {Array.from({ length: totalPages }, (_, index) => index + 1).map((item) => (
          <button className={item === currentPage ? "active" : ""} key={item} onClick={() => setPage(item)}>
            {item}
          </button>
        ))}
        <button disabled={currentPage === totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>
          Sau
        </button>
      </nav>
    </>
  );
}

function ProductCard({ product, addToCart, openProductDetail }) {
  return (
    <article className="product clickable-product" role="button" tabIndex="0" onClick={() => openProductDetail(product)} onKeyDown={(event) => event.key === "Enter" && openProductDetail(product)}>
      <img src={product.imageUrl} alt={product.name} />
      <div className="product-body">
        <h2>{product.name}</h2>
        <p className="desc">{product.description}</p>
        <div className="meta">
          <span>{product.origin}</span>
          <span>{product.category}</span>
        </div>
        <p className="price">{formatMoney(product.price)}</p>
        <span>Ton kho: {product.stock}</span>
        <button disabled={product.stock === 0} onClick={(event) => { event.stopPropagation(); addToCart(product); }}>
          <ShoppingCart size={18} />
          Chon mua
        </button>
      </div>
    </article>
  );
}
