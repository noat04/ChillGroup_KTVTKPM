import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Eye, Loader2, PackagePlus, RefreshCw, Search, Trash2, Upload } from "lucide-react";
import { apiBaseUrl } from "../config.js";
import { formatMoney } from "../utils/format.js";

const emptyProduct = {
  productId: "",
  name: "",
  description: "",
  category: "Trái cây Việt Nam",
  price: 0,
  imageUrl: "",
  unit: "kg",
  origin: "Việt Nam",
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
    let response;
    try {
      response = await fetch(`${apiBaseUrl}${path}`, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          ...(options.headers || {})
        }
      });
    } catch {
      setMessage?.("Service đang tạm ngưng. Bạn có thể chuyển trang khác và thử lại.", "warning");
      return null;
    }

    if (response.status === 401) {
      setMessage("Phiên đăng nhập admin đã hết hạn. Vui lòng đăng nhập lại.", "warning");
      onUnauthorized?.();
      return null;
    }

    if (!response.ok) {
      const result = await response.json().catch(() => ({}));
      setMessage?.(
        result.error || "Không tải được dữ liệu. Vui lòng thử lại.",
        response.status === 503 ? "warning" : "error"
      );
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
    setMessage("Đã ẩn sản phẩm.", "warning");
    await loadAdminProducts();
    await loadProducts();
  }

  async function saveProduct(productForm) {
    const authToken = localStorage.getItem("fruitweb_token") || token;
    const productPayload = {
      ...productForm,
      price: Number(productForm.price),
      stock: Number(productForm.stock)
    };

    if (!productPayload.productId) {
      delete productPayload.productId;
    }

    const response = await fetch(`${apiBaseUrl}/products`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
      body: JSON.stringify(productPayload)
    });

    const result = await response.json();
    if (response.status === 401) {
      setMessage("Phiên đăng nhập admin đã hết hạn. Vui lòng đăng nhập lại.", "warning");
      onUnauthorized?.();
      return;
    }

    if (!response.ok) {
      setMessage(result.error || "Không lưu được sản phẩm.", "error");
      return;
    }

    const productId = result.productId || productForm.productId;
    await adminFetch(`/admin/inventory/${productId}`, {
      method: "PATCH",
      body: JSON.stringify({ stock: Number(productForm.stock) })
    });

    setMessage("Đã cập nhật sản phẩm.", "success");
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
    <main className="container py-4 py-lg-5">
      <section className="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center gap-3 mb-4">
        <div>
          <span className="badge rounded-pill text-bg-success mb-2">Admin</span>
          <h1 className="fw-bold text-success mb-1">Quản lý sản phẩm</h1>
          <p className="text-secondary mb-0">Thêm, chỉnh sửa, lọc và quản lý tồn kho sản phẩm.</p>
        </div>

        <div className="d-flex flex-wrap gap-2">
          <button type="button" className="btn btn-outline-success rounded-pill px-4" onClick={loadAdminProducts}>
            <RefreshCw size={18} className="me-2" />
            Tải lại
          </button>
          <button type="button" className="btn btn-success rounded-pill px-4" onClick={openCreate}>
            <PackagePlus size={18} className="me-2" />
            Thêm sản phẩm
          </button>
        </div>
      </section>

      <section className="card border-0 shadow-sm rounded-5 mb-4">
        <div className="card-body p-4">
          <div className="row g-3 align-items-end">
            <div className="col-lg-5">
              <label className="form-label fw-semibold">Tìm kiếm</label>
              <div className="input-group">
                <span className="input-group-text bg-white">
                  <Search size={18} />
                </span>
                <input
                  className="form-control"
                  placeholder="Tìm mã, tên, xuất xứ..."
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    resetPaging();
                  }}
                />
              </div>
            </div>

            <div className="col-sm-6 col-lg-2">
              <label className="form-label fw-semibold">Danh mục</label>
              <select
                className="form-select"
                value={category}
                onChange={(event) => {
                  setCategory(event.target.value);
                  resetPaging();
                }}
              >
                {categories.map((item) => (
                  <option key={item} value={item}>{item === "Tat ca" ? "Tất cả" : item}</option>
                ))}
              </select>
            </div>

            <div className="col-sm-6 col-lg-2">
              <label className="form-label fw-semibold">Trạng thái</label>
              <select
                className="form-select"
                value={status}
                onChange={(event) => {
                  setStatus(event.target.value);
                  resetPaging();
                }}
              >
                <option value="active">Đang bán</option>
                <option value="inactive">Đã ẩn</option>
                <option value="all">Tất cả</option>
              </select>
            </div>

            <div className="col-sm-6 col-lg-3">
              <label className="form-label fw-semibold">Mỗi trang</label>
              <select
                className="form-select"
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
            </div>
          </div>
        </div>
      </section>

      <section className="card border-0 shadow-sm rounded-5">
        <div className="card-body p-4">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h2 className="h4 fw-bold mb-0">Danh sách sản phẩm</h2>
            <span className="badge text-bg-light border rounded-pill">{filteredProducts.length} sản phẩm</span>
          </div>

          <div className="table-responsive">
            <table className="table align-middle table-hover mb-0">
              <thead className="table-light">
                <tr>
                  <th>Sản phẩm</th>
                  <th>Danh mục</th>
                  <th>Giá</th>
                  <th>Tồn</th>
                  <th>Trạng thái</th>
                  <th className="text-end">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {pagedProducts.map((product) => (
                  <tr key={product.productId}>
                    <td>
                      <div className="d-flex align-items-center gap-3">
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="rounded-4 object-fit-cover"
                          width="70"
                          height="70"
                        />
                        <div>
                          <h6 className="fw-bold mb-1">{product.name}</h6>
                          <small className="text-secondary">{product.productId}</small>
                        </div>
                      </div>
                    </td>
                    <td>{product.category}</td>
                    <td className="fw-bold text-danger">{formatMoney(product.price)}</td>
                    <td>{product.stock}</td>
                    <td>
                      <span className={`badge rounded-pill ${product.active === false ? "text-bg-secondary" : "text-bg-success"}`}>
                        {product.active === false ? "Đã ẩn" : "Đang bán"}
                      </span>
                    </td>
                    <td className="text-end">
                      <div className="btn-group">
                        <button type="button" className="btn btn-sm btn-outline-success" onClick={() => openDetail(product)} title="Chi tiết">
                          <Eye size={16} />
                        </button>
                        <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => deleteProduct(product.productId)} title="Ẩn sản phẩm">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {pagedProducts.length === 0 && (
                  <tr>
                    <td colSpan="6">
                      <div className="alert alert-light border rounded-4 mb-0 text-center">
                        Không có sản phẩm phù hợp.
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <nav className="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center gap-3 mt-4" aria-label="Phân trang sản phẩm admin">
        <span className="text-secondary">
          Hiển thị {startItem}-{endItem} / {filteredProducts.length} sản phẩm | Trang {currentPage}/{totalPages}
        </span>

        <ul className="pagination mb-0 flex-wrap">
          <li className={`page-item ${currentPage === 1 ? "disabled" : ""}`}>
            <button className="page-link" onClick={() => setPage(1)}>Đầu</button>
          </li>
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
          <li className={`page-item ${currentPage === totalPages ? "disabled" : ""}`}>
            <button className="page-link" onClick={() => setPage(totalPages)}>Cuối</button>
          </li>
        </ul>
      </nav>
    </main>
  );
}

function AdminProductDetail({ product, token, setMessage, onBack, onSave }) {
  const [form, setForm] = useState(product);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState("");
  const isNew = !product.productId;

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function submit(event) {
    event.preventDefault();

    if (isUploading) {
      setMessage("Vui lòng đợi upload ảnh hoàn tất.", "warning");
      return;
    }

    if (!form.imageUrl) {
      setMessage("Vui lòng upload ảnh sản phẩm trước khi lưu.", "warning");
      return;
    }

    void onSave(form);
  }

  async function uploadImage(file) {
    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setMessage("Vui lòng chọn file ảnh.", "warning");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setMessage("Ảnh không được vượt quá 5MB.", "warning");
      return;
    }

    setIsUploading(true);
    try {
      const authToken = localStorage.getItem("fruitweb_token") || token;
      if (!authToken) {
        setMessage("Không tìm thấy token admin. Vui lòng đăng nhập lại.", "warning");
        return;
      }

      const dataUrl = await readFileAsDataUrl(file);
      const response = await fetch(`${apiBaseUrl}/admin/uploads/product-image`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({ dataUrl, fileName: file.name })
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        const detail = Array.isArray(result.missing) ? ` Thiếu: ${result.missing.join(", ")}.` : "";
        setMessage(`${result.error || "Không upload được ảnh."}${detail}`, "error");
        return;
      }

      update("imageUrl", result.imageUrl);
      setUploadedFileName(file.name);
      setMessage("Đã upload ảnh sản phẩm.", "success");
    } catch {
      setMessage("Không upload được ảnh. Kiểm tra Cloudinary và thử lại.", "error");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <main className="container py-4 py-lg-5">
      <section className="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center gap-3 mb-4">
        <div>
          <span className="badge rounded-pill text-bg-success mb-2">Chi tiết sản phẩm</span>
          <h1 className="fw-bold text-success mb-1">{isNew ? "Thêm sản phẩm" : form.name}</h1>
          <p className="text-secondary mb-0">Cập nhật thông tin, ảnh, giá bán và tồn kho.</p>
        </div>

        <button type="button" className="btn btn-outline-success rounded-pill px-4" onClick={onBack}>
          <ArrowLeft size={18} className="me-2" />
          Quay lại danh sách
        </button>
      </section>

      <section className="row g-4">
        <div className="col-lg-8">
          <form className="card border-0 shadow-sm rounded-5" onSubmit={submit}>
            <div className="card-body p-4">
              <h2 className="h4 fw-bold mb-4">Thông tin sản phẩm</h2>

              <div className="mb-3">
                <label className="form-label fw-semibold">productId</label>
                <input className="form-control" value={isNew ? "Tự động tạo khi lưu" : form.productId} disabled />
              </div>

              <div className="mb-3">
                <label className="form-label fw-semibold">Tên sản phẩm</label>
                <input
                  className="form-control"
                  value={form.name || ""}
                  onChange={(event) => update("name", event.target.value)}
                  required
                />
              </div>

              <div className="mb-3">
                <label className="form-label fw-semibold">Mô tả</label>
                <textarea
                  className="form-control"
                  value={form.description || ""}
                  onChange={(event) => update("description", event.target.value)}
                  rows={5}
                  required
                />
              </div>

              <div className="row g-3">
                <div className="col-md-4">
                  <label className="form-label fw-semibold">Danh mục</label>
                  <input className="form-control" value={form.category || ""} onChange={(event) => update("category", event.target.value)} required />
                </div>

                <div className="col-md-4">
                  <label className="form-label fw-semibold">Đơn vị</label>
                  <input className="form-control" value={form.unit || ""} onChange={(event) => update("unit", event.target.value)} required />
                </div>

                <div className="col-md-4">
                  <label className="form-label fw-semibold">Xuất xứ</label>
                  <input className="form-control" value={form.origin || ""} onChange={(event) => update("origin", event.target.value)} required />
                </div>
              </div>

              <div className="mt-3">
                <label className="form-label fw-semibold">Ảnh sản phẩm</label>
                <div className="input-group">
                  <label className="btn btn-outline-success mb-0">
                    <input type="file" accept="image/*" className="d-none" onChange={(event) => void uploadImage(event.target.files?.[0])} />
                    {isUploading ? <Loader2 size={18} className="me-2" /> : <Upload size={18} className="me-2" />}
                    {isUploading ? "Đang upload" : "Chọn ảnh"}
                  </label>
                  <input
                    className="form-control"
                    value={form.imageUrl || ""}
                    onChange={(event) => update("imageUrl", event.target.value)}
                    placeholder="Cloudinary URL sẽ tự điền sau khi upload"
                    required
                  />
                </div>
                <small className={form.imageUrl ? "text-success" : "text-secondary"}>
                  {form.imageUrl ? uploadedFileName || "Đã có ảnh sản phẩm" : "Chưa upload ảnh"}
                </small>
              </div>

              <div className="row g-3 mt-1">
                <div className="col-md-4">
                  <label className="form-label fw-semibold">Giá</label>
                  <input className="form-control" value={form.price} onChange={(event) => update("price", event.target.value)} inputMode="decimal" required />
                </div>

                <div className="col-md-4">
                  <label className="form-label fw-semibold">Tồn kho</label>
                  <input className="form-control" value={form.stock} onChange={(event) => update("stock", event.target.value)} inputMode="numeric" required />
                </div>

                <div className="col-md-4">
                  <label className="form-label fw-semibold">Trạng thái</label>
                  <select className="form-select" value={String(form.active !== false)} onChange={(event) => update("active", event.target.value === "true")}>
                    <option value="true">Đang bán</option>
                    <option value="false">Ẩn sản phẩm</option>
                  </select>
                </div>
              </div>

              <div className="mt-4">
                <button className="btn btn-success btn-lg rounded-pill px-4" disabled={isUploading}>
                  {isUploading ? "Đang upload ảnh" : "Lưu thay đổi"}
                </button>
              </div>
            </div>
          </form>
        </div>

        <div className="col-lg-4">
          <aside className="card border-0 shadow-sm rounded-5 position-sticky top-0">
            <div className="card-body p-4">
              <h2 className="h4 fw-bold mb-4">Xem trước</h2>

              {form.imageUrl ? (
                <div className="ratio ratio-4x3 bg-light rounded-4 overflow-hidden mb-3">
                  <img src={form.imageUrl} alt={form.name} className="img-fluid object-fit-cover" />
                </div>
              ) : (
                <div className="ratio ratio-4x3 bg-light rounded-4 mb-3 d-flex align-items-center justify-content-center">
                  <span className="text-secondary">Ảnh sản phẩm</span>
                </div>
              )}

              <h5 className="fw-bold mb-1">{form.name || "Tên sản phẩm"}</h5>
              <span className="badge text-bg-light border rounded-pill mb-3">{form.category}</span>
              <p className="text-secondary">{form.description || "Mô tả sản phẩm"}</p>
              <strong className="fs-4 text-danger d-block">{formatMoney(Number(form.price) || 0)}</strong>
              <span className="text-secondary">Tồn kho: {form.stock || 0}</span>
            </div>
          </aside>
        </div>
      </section>
    </main>
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
