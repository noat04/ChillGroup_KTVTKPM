import React, { useEffect, useState } from "react";
import { ArrowLeft, Edit2, Loader2, Plus, Search, Trash2, UserPlus } from "lucide-react";
import { apiBaseUrl } from "../config.js";

const emptyUser = {
  name: "",
  email: "",
  password: "",
  phone: "",
  address: "",
  role: "customer"
};

export function AdminUsers({ token, setMessage, onUnauthorized }) {
  const [users, setUsers] = useState([]);
  const [mode, setMode] = useState("list");
  const [selectedUser, setSelectedUser] = useState(null);
  const [formData, setFormData] = useState(emptyUser);
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("all");
  const [loading, setLoading] = useState(false);
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
      setMessage("Phiên đăng nhập admin đã hết hạn. Vui lòng đăng nhập lại.", "warning");
      onUnauthorized?.();
      return null;
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || "Lỗi không xác định");
    }

    return response.json();
  }

  async function loadUsers() {
    try {
      setLoading(true);
      const data = await adminFetch("/admin/users");
      setUsers(Array.isArray(data) ? data : []);
    } catch (error) {
      setMessage(error.message || "Lỗi tải danh sách user", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadUsers();
  }, []);

  const filteredUsers = users.filter((u) => {
    const text = `${u.name} ${u.email} ${u.phone}`.toLowerCase();
    const matchesQuery = text.includes(query.toLowerCase());
    const matchesRole = role === "all" || u.role === role;
    return matchesQuery && matchesRole;
  });

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedUsers = filteredUsers.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const startItem = filteredUsers.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, filteredUsers.length);

  function openCreate() {
    setSelectedUser(null);
    setFormData(emptyUser);
    setMode("form");
  }

  function openEdit(user) {
    setSelectedUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      phone: user.phone,
      address: user.address,
      role: user.role
    });
    setMode("form");
  }

  async function handleSave() {
    try {
      setLoading(true);
      if (selectedUser) {
        await adminFetch(`/admin/users/${selectedUser.id}`, {
          method: "PATCH",
          body: JSON.stringify(formData)
        });
        setMessage("Cập nhật user thành công", "success");
      } else {
        if (!formData.password || formData.password.length < 6) {
          setMessage("Mật khẩu phải có ít nhất 6 ký tự", "error");
          return;
        }

        await adminFetch("/admin/users", {
          method: "POST",
          body: JSON.stringify(formData)
        });
        setMessage("Tạo user mới thành công", "success");
      }

      await loadUsers();
      setMode("list");
    } catch (error) {
      setMessage(error.message || "Lỗi khi lưu user", "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(userId) {
    if (!window.confirm("Bạn chắc chắn muốn xóa user này?")) {
      return;
    }

    try {
      setLoading(true);
      await adminFetch(`/admin/users/${userId}`, { method: "DELETE" });
      setMessage("Xóa user thành công", "success");
      await loadUsers();
    } catch (error) {
      setMessage(error.message || "Lỗi khi xóa user", "error");
    } finally {
      setLoading(false);
    }
  }

  if (mode === "form") {
    return (
      <main className="container py-4 py-lg-5">
        <section className="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center gap-3 mb-4">
          <div>
            <span className="badge rounded-pill text-bg-success mb-2">Admin</span>
            <h1 className="fw-bold text-success mb-1">{selectedUser ? "Chỉnh sửa người dùng" : "Tạo người dùng mới"}</h1>
            <p className="text-secondary mb-0">Quản lý thông tin tài khoản và vai trò người dùng.</p>
          </div>

          <button type="button" className="btn btn-outline-success rounded-pill px-4" onClick={() => setMode("list")}>
            <ArrowLeft size={18} className="me-2" />
            Quay lại danh sách
          </button>
        </section>

        <form className="card border-0 shadow-sm rounded-5" onSubmit={(e) => { e.preventDefault(); void handleSave(); }}>
          <div className="card-body p-4">
            <h2 className="h4 fw-bold mb-4">Thông tin người dùng</h2>

            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label fw-semibold">Tên*</label>
                <input
                  className="form-control form-control-lg"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Họ và tên đầy đủ"
                  disabled={loading}
                  required
                />
              </div>

              <div className="col-md-6">
                <label className="form-label fw-semibold">Email*</label>
                <input
                  className="form-control form-control-lg"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="email@example.com"
                  disabled={loading}
                  required
                />
              </div>

              {!selectedUser && (
                <div className="col-md-6">
                  <label className="form-label fw-semibold">Mật khẩu*</label>
                  <input
                    className="form-control form-control-lg"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Tối thiểu 6 ký tự"
                    disabled={loading}
                    required
                  />
                </div>
              )}

              <div className="col-md-6">
                <label className="form-label fw-semibold">Điện thoại</label>
                <input
                  className="form-control form-control-lg"
                  type="tel"
                  value={formData.phone || ""}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="0123456789"
                  disabled={loading}
                />
              </div>

              <div className="col-md-8">
                <label className="form-label fw-semibold">Địa chỉ</label>
                <input
                  className="form-control form-control-lg"
                  type="text"
                  value={formData.address || ""}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Địa chỉ đầy đủ"
                  disabled={loading}
                />
              </div>

              <div className="col-md-4">
                <label className="form-label fw-semibold">Vai trò</label>
                <select
                  className="form-select form-select-lg"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  disabled={loading}
                >
                  <option value="customer">Khách hàng</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>

            <div className="d-flex flex-wrap gap-2 mt-4">
              <button className="btn btn-success btn-lg rounded-pill px-4" disabled={loading} type="submit">
                {loading ? <Loader2 size={18} className="me-2" /> : <Plus size={18} className="me-2" />}
                {selectedUser ? "Cập nhật" : "Tạo"}
              </button>

              <button className="btn btn-outline-secondary btn-lg rounded-pill px-4" type="button" onClick={() => setMode("list")} disabled={loading}>
                Hủy
              </button>
            </div>
          </div>
        </form>
      </main>
    );
  }

  return (
    <main className="container py-4 py-lg-5">
      <section className="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center gap-3 mb-4">
        <div>
          <span className="badge rounded-pill text-bg-success mb-2">Admin</span>
          <h1 className="fw-bold text-success mb-1">Quản lý tài khoản</h1>
          <p className="text-secondary mb-0">Tìm kiếm, phân quyền và chỉnh sửa tài khoản người dùng.</p>
        </div>

        <div className="bg-success text-white rounded-circle d-inline-flex align-items-center justify-content-center p-3">
          <UserPlus size={34} />
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
                  placeholder="Tìm tên, email, điện thoại..."
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setPage(1);
                  }}
                />
              </div>
            </div>

            <div className="col-sm-6 col-lg-2">
              <label className="form-label fw-semibold">Vai trò</label>
              <select
                className="form-select"
                value={role}
                onChange={(e) => {
                  setRole(e.target.value);
                  setPage(1);
                }}
              >
                <option value="all">Tất cả</option>
                <option value="customer">Khách hàng</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <div className="col-sm-6 col-lg-2">
              <label className="form-label fw-semibold">Mỗi trang</label>
              <select className="form-select" value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={30}>30</option>
              </select>
            </div>

            <div className="col-lg-3">
              <div className="d-flex gap-2">
                <button type="button" className="btn btn-outline-success rounded-pill w-50" onClick={loadUsers}>
                  <Loader2 size={18} className="me-2" />
                  Tải lại
                </button>
                <button type="button" className="btn btn-success rounded-pill w-50" onClick={openCreate}>
                  <Plus size={18} className="me-2" />
                  Tạo mới
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="card border-0 shadow-sm rounded-5">
        <div className="card-body p-4">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h2 className="h4 fw-bold mb-0">Danh sách người dùng</h2>
            <span className="badge text-bg-light border rounded-pill">{filteredUsers.length} người dùng</span>
          </div>

          <div className="table-responsive">
            <table className="table align-middle table-hover mb-0">
              <thead className="table-light">
                <tr>
                  <th>Người dùng</th>
                  <th>Điện thoại</th>
                  <th>Vai trò</th>
                  <th>Ngày tạo</th>
                  <th className="text-end">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {loading && pagedUsers.length === 0 ? (
                  <tr>
                    <td colSpan="5">
                      <div className="text-center py-5">
                        <Loader2 size={32} className="text-success mb-2" />
                        <p className="text-secondary mb-0">Đang tải...</p>
                      </div>
                    </td>
                  </tr>
                ) : pagedUsers.length === 0 ? (
                  <tr>
                    <td colSpan="5">
                      <div className="alert alert-light border rounded-4 mb-0 text-center">
                        Không có user nào.
                      </div>
                    </td>
                  </tr>
                ) : (
                  pagedUsers.map((user) => (
                    <tr key={user.id}>
                      <td>
                        <div className="d-flex align-items-center gap-3">
                          <div className="rounded-circle bg-success text-white d-inline-flex align-items-center justify-content-center fw-bold p-3">
                            {(user.name || "?")[0]}
                          </div>
                          <div>
                            <h6 className="fw-bold mb-1">{user.name}</h6>
                            <small className="text-secondary">{user.email}</small>
                          </div>
                        </div>
                      </td>
                      <td>{user.phone || "-"}</td>
                      <td>
                        <span className={`badge rounded-pill ${user.role === "admin" ? "text-bg-danger" : "text-bg-success"}`}>
                          {user.role === "admin" ? "Admin" : "Khách hàng"}
                        </span>
                      </td>
                      <td>{user.createdAt ? new Date(user.createdAt).toLocaleDateString("vi-VN") : "-"}</td>
                      <td className="text-end">
                        <div className="btn-group">
                          <button type="button" className="btn btn-sm btn-outline-success" onClick={() => openEdit(user)} title="Chỉnh sửa">
                            <Edit2 size={16} />
                          </button>
                          <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(user.id)} title="Xóa">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {totalPages > 1 && (
        <nav className="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center gap-3 mt-4">
          <span className="text-secondary">
            {startItem} - {endItem} / {filteredUsers.length}
          </span>

          <ul className="pagination mb-0">
            <li className={`page-item ${page === 1 || loading ? "disabled" : ""}`}>
              <button className="page-link" onClick={() => setPage(Math.max(1, page - 1))}>Trái</button>
            </li>
            <li className="page-item disabled">
              <span className="page-link">{currentPage} / {totalPages}</span>
            </li>
            <li className={`page-item ${page === totalPages || loading ? "disabled" : ""}`}>
              <button className="page-link" onClick={() => setPage(Math.min(totalPages, page + 1))}>Phải</button>
            </li>
          </ul>
        </nav>
      )}
    </main>
  );
}
