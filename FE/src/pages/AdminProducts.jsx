import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Eye, Loader2, PackagePlus, RefreshCw, Search, Trash2, Upload } from "lucide-react";
import { apiBaseUrl } from "../config.js";
import { formatMoney } from "../utils/format.js";

const emptyProduct = {
  productId: "",
  name: "",
  description: "",
  category: "Trai cay Viet Nam",
  price: 0,
  imageUrl: "",
  unit: "kg",
  origin: "Viet Nam",
  stock: 0,
  active: true
};

export function AdminProducts({ token, loadProducts, setMessage, onUnauthorized }) {
  const [products, setProducts] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [mode, setMode] = useState("list");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Tat ca");
  const [status, setStatus] = useState("active");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  async function adminFetch(path, options = {}) {
    const response = await fetch(`${apiBaseUrl}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(options.headers || {})
      }
    });
    if (response.status === 401) {
      setMessage("Phien dang nhap admin da het han. Vui long dang nhap lai.", "warning");
      onUnauthorized?.();
      return null;
    }
    if (!response.ok) {
      return null;
    }
    return response.json();
  }

  async function loadAdminProducts() {
    const [nextProducts, nextInventory] = await Promise.all([
      adminFetch("/admin/products"),
      adminFetch("/admin/inventory")
    ]);
    setProducts(Array.isArray(nextProducts) ? nextProducts : []);
    setInventory(Array.isArray(nextInventory) ? nextInventory : []);
  }

  useEffect(() => {
    void loadAdminProducts();
  }, []);

  const productsWithStock = useMemo(() => {
    return products.map((product) => {
      const inventoryItem = inventory.find((item) => item.productId === product.productId);
      return { ...product, stock: inventoryItem?.stock ?? product.stock ?? 0 };
    });
  }, [inventory, products]);

  const categories = useMemo(
    () => ["Tat ca", ...new Set(productsWithStock.map((product) => product.category).filter(Boolean))],
    [productsWithStock]
  );

  const filteredProducts = useMemo(() => {
    return productsWithStock.filter((product) => {
      const text = `${product.productId} ${product.name} ${product.origin} ${product.category}`.toLowerCase();
      const matchesQuery = text.includes(query.toLowerCase());
      const matchesCategory = category === "Tat ca" || product.category === category;
      const matchesStatus =
        status === "all" || (status === "active" ? product.active !== false : product.active === false);
      return matchesQuery && matchesCategory && matchesStatus;
    });
  }, [category, productsWithStock, query, status]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedProducts = filteredProducts.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const startItem = filteredProducts.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, filteredProducts.length);

  function resetPaging() {
    setPage(1);
  }

  function openDetail(product) {
    setSelectedProduct(product);
    setMode("detail");
  }

  function openCreate() {
    setSelectedProduct(emptyProduct);
    setMode("detail");
  }

  async function deleteProduct(productId) {
    await adminFetch(`/admin/products/${productId}`, { method: "DELETE" });
    setMessage("Da an san pham.", "warning");
    await loadAdminProducts();
    await loadProducts();
  }

  async function saveProduct(productForm) {
    await fetch(`${apiBaseUrl}/products`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        ...productForm,
        price: Number(productForm.price),
        stock: Number(productForm.stock)
      })
    });
    await adminFetch(`/admin/inventory/${productForm.productId}`, {
      method: "PATCH",
      body: JSON.stringify({ stock: Number(productForm.stock) })
    });
    setMessage("Da cap nhat san pham.", "success");
    await loadAdminProducts();
    await loadProducts();
    setMode("list");
  }

  if (mode === "detail" && selectedProduct) {
    return (
      <AdminProductDetail
        product={selectedProduct}
        token={token}
        setMessage={setMessage}
        onBack={() => setMode("list")}
        onSave={saveProduct}
      />
    );
  }

  return (
    <section className="admin-page">
      <div className="section-title">
        <div>
          <p className="eyebrow">Admin</p>
          <h1>Quan ly san pham</h1>
        </div>
        <div className="admin-title-actions">
          <button onClick={loadAdminProducts}>
            <RefreshCw size={18} />
            Tai lai
          </button>
          <button onClick={openCreate}>
            <PackagePlus size={18} />
            Them san pham
          </button>
        </div>
      </div>

      <section className="panel admin-product-filters">
        <label className="search">
          <Search size={18} />
          <input
            placeholder="Tim ma, ten, xuat xu..."
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              resetPaging();
            }}
          />
        </label>
        <label>
          Danh muc
          <select
            value={category}
            onChange={(event) => {
              setCategory(event.target.value);
              resetPaging();
            }}
          >
            {categories.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </label>
        <label>
          Trang thai
          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              resetPaging();
            }}
          >
            <option value="active">Dang ban</option>
            <option value="inactive">Da an</option>
            <option value="all">Tat ca</option>
          </select>
        </label>
        <label>
          Moi trang
          <select
            value={pageSize}
            onChange={(event) => {
              setPageSize(Number(event.target.value));
              resetPaging();
            }}
          >
            <option value="10">10</option>
            <option value="20">20</option>
            <option value="30">30</option>
          </select>
        </label>
      </section>

      <section className="panel">
        <div className="section-title">
          <h2>Danh sach san pham</h2>
          <span>{filteredProducts.length} san pham</span>
        </div>
        <div className="admin-product-table">
          {pagedProducts.map((product) => (
            <div className="admin-product-row" key={product.productId}>
              <img src={product.imageUrl} alt={product.name} />
              <div>
                <strong>{product.name}</strong>
                <span>{product.productId}</span>
              </div>
              <span>{product.category}</span>
              <strong>{formatMoney(product.price)}</strong>
              <span>Ton: {product.stock}</span>
              <button className="icon" onClick={() => openDetail(product)} title="Chi tiet">
                <Eye size={16} />
              </button>
              <button className="icon" onClick={() => deleteProduct(product.productId)} title="An san pham">
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      </section>

      <nav className="pagination" aria-label="Phan trang san pham admin">
        <span className="pagination-summary">
          Hien thi {startItem}-{endItem} / {filteredProducts.length} san pham | Trang {currentPage}/{totalPages}
        </span>
        <button disabled={currentPage === 1} onClick={() => setPage(1)}>
          Dau
        </button>
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
        <button disabled={currentPage === totalPages} onClick={() => setPage(totalPages)}>
          Cuoi
        </button>
      </nav>
    </section>
  );
}

function AdminProductDetail({ product, token, setMessage, onBack, onSave }) {
  const [form, setForm] = useState(product);
  const [isUploading, setIsUploading] = useState(false);
  const isNew = !product.productId;

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function submit(event) {
    event.preventDefault();
    void onSave(form);
  }

  async function uploadImage(file) {
    if (!file) {
      return;
    }
    if (!file.type.startsWith("image/")) {
      setMessage("Vui long chon file anh.", "warning");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setMessage("Anh khong duoc vuot qua 5MB.", "warning");
      return;
    }

    setIsUploading(true);
    try {
      const dataUrl = await readFileAsDataUrl(file);
      const response = await fetch(`${apiBaseUrl}/admin/uploads/product-image`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ dataUrl, fileName: file.name })
      });
      const result = await response.json();
      if (!response.ok) {
        setMessage(result.error || "Khong upload duoc anh.", "error");
        return;
      }
      update("imageUrl", result.imageUrl);
      setMessage("Da upload anh san pham.", "success");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <section className="admin-page">
      <div className="section-title">
        <div>
          <p className="eyebrow">Chi tiet san pham</p>
          <h1>{isNew ? "Them san pham" : form.name}</h1>
        </div>
        <button onClick={onBack}>
          <ArrowLeft size={18} />
          Quay lai danh sach
        </button>
      </div>

      <div className="admin-detail-layout">
        <form className="panel form admin-form product-detail-form" onSubmit={submit}>
          <h2>Thong tin san pham</h2>
          <label>
            productId
            <input
              value={form.productId}
              disabled={!isNew}
              onChange={(event) => update("productId", event.target.value)}
              required
            />
          </label>
          {["name", "description", "category", "imageUrl", "unit", "origin"].map((field) => (
            <label key={field}>
              {field}
              <input value={form[field] || ""} onChange={(event) => update(field, event.target.value)} required />
            </label>
          ))}
          <label>
            upload anh Cloudinary
            <span className="file-upload">
              <input type="file" accept="image/*" onChange={(event) => void uploadImage(event.target.files?.[0])} />
              <button type="button" disabled={isUploading}>
                {isUploading ? <Loader2 className="spin" size={18} /> : <Upload size={18} />}
                {isUploading ? "Dang upload" : "Chon anh"}
              </button>
            </span>
          </label>
          <label>
            price
            <input type="number" value={form.price} onChange={(event) => update("price", event.target.value)} required />
          </label>
          <label>
            stock
            <input type="number" value={form.stock} onChange={(event) => update("stock", event.target.value)} required />
          </label>
          <label>
            active
            <select value={String(form.active !== false)} onChange={(event) => update("active", event.target.value === "true")}>
              <option value="true">Dang ban</option>
              <option value="false">An san pham</option>
            </select>
          </label>
          <button>Luu thay doi</button>
        </form>

        <aside className="panel product-preview">
          <h2>Xem truoc</h2>
          {form.imageUrl ? <img src={form.imageUrl} alt={form.name} /> : <div className="image-placeholder">Anh san pham</div>}
          <strong>{form.name || "Ten san pham"}</strong>
          <span>{form.category}</span>
          <p>{form.description || "Mo ta san pham"}</p>
          <strong className="price">{formatMoney(Number(form.price) || 0)}</strong>
          <span>Ton kho: {form.stock || 0}</span>
        </aside>
      </div>
    </section>
  );
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
