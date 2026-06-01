import React, { useEffect, useState } from "react";
import { ArrowLeft, Plus, Loader2, Search, Trash2, Edit2, UserPlus } from "lucide-react";
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
            setMessage("Phien dang nhap admin da het han. Vui long dang nhap lai.", "warning");
            onUnauthorized?.();
            return null;
        }
        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.error || "Loi khong xac dinh");
        }
        return response.json();
    }

    async function loadUsers() {
        try {
            setLoading(true);
            const data = await adminFetch("/admin/users");
            setUsers(Array.isArray(data) ? data : []);
        } catch (error) {
            setMessage(error.message || "Loi tai danh sach user", "error");
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
                // Cap nhat
                await adminFetch(`/admin/users/${selectedUser.id}`, {
                    method: "PATCH",
                    body: JSON.stringify(formData)
                });
                setMessage("Cap nhat user thanh cong", "success");
            } else {
                // Tao moi
                if (!formData.password || formData.password.length < 6) {
                    setMessage("Mat khau phai co it nhat 6 ky tu", "error");
                    return;
                }
                await adminFetch("/admin/users", {
                    method: "POST",
                    body: JSON.stringify(formData)
                });
                setMessage("Tao user moi thanh cong", "success");
            }
            await loadUsers();
            setMode("list");
        } catch (error) {
            setMessage(error.message || "Loi khi luu user", "error");
        } finally {
            setLoading(false);
        }
    }

    async function handleDelete(userId) {
        if (!window.confirm("Ban chac chan muon xoa user nay?")) {
            return;
        }
        try {
            setLoading(true);
            await adminFetch(`/admin/users/${userId}`, { method: "DELETE" });
            setMessage("Xoa user thanh cong", "success");
            await loadUsers();
        } catch (error) {
            setMessage(error.message || "Loi khi xoa user", "error");
        } finally {
            setLoading(false);
        }
    }

    if (mode === "form") {
        return (
            <section className="admin-page">
                <div className="section-title">
                    <div>
                        <p className="eyebrow">Admin</p>
                        <h1>{selectedUser ? "Chinh sua nguoi dung" : "Tao nguoi dung moi"}</h1>
                    </div>
                    <button onClick={() => setMode("list")}>
                        <ArrowLeft size={18} />
                        Quay lai danh sach
                    </button>
                </div>

                <form className="panel form admin-form" onSubmit={(e) => { e.preventDefault(); void handleSave(); }}>
                    <h2>Thong tin nguoi dung</h2>
                    <label>
                        Ten*
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="Ho va ten day du"
                            disabled={loading}
                            required
                        />
                    </label>

                    <label>
                        Email*
                        <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            placeholder="email@example.com"
                            disabled={loading}
                            required
                        />
                    </label>

                    {!selectedUser && (
                        <label>
                            Mat khau*
                            <input
                                type="password"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                placeholder="Toi thieu 6 ky tu"
                                disabled={loading}
                                required
                            />
                        </label>
                    )}

                    <label>
                        Dien thoai
                        <input
                            type="tel"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            placeholder="0123456789"
                            disabled={loading}
                        />
                    </label>

                    <label>
                        Dia chi
                        <input
                            type="text"
                            value={formData.address}
                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                            placeholder="Dia chi day du"
                            disabled={loading}
                        />
                    </label>

                    <label>
                        Vai tro
                        <select
                            value={formData.role}
                            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                            disabled={loading}
                        >
                            <option value="customer">Khach hang</option>
                            <option value="admin">Admin</option>
                        </select>
                    </label>

                    <div>
                        <button className="btn btn-primary" disabled={loading} type="submit">
                            {loading ? <Loader2 className="spin" size={18} /> : <Plus size={18} />} {selectedUser ? "Cap nhat" : "Tao"}
                        </button>
                        <button className="btn" type="button" onClick={() => setMode("list")} disabled={loading}>
                            Huy
                        </button>
                    </div>
                </form>
            </section>
        );
    }

    return (
        <section className="admin-page">
            <div className="admin-title">
                <div>
                    <p className="eyebrow">Admin</p>
                    <h1>Quan ly tai khoan</h1>
                </div>
                <UserPlus size={34} />
            </div>

            <section className="panel admin-product-filters">
                <label className="search">
                    <Search size={18} />
                    <input
                        placeholder="Tim ten, email, dien thoai..."
                        value={query}
                        onChange={(e) => {
                            setQuery(e.target.value);
                            setPage(1);
                        }}
                    />
                </label>

                <label>
                    Vai tro
                    <select
                        value={role}
                        onChange={(e) => {
                            setRole(e.target.value);
                            setPage(1);
                        }}
                    >
                        <option value="all">Tat ca</option>
                        <option value="customer">Khach hang</option>
                        <option value="admin">Admin</option>
                    </select>
                </label>

                <label>
                    Moi trang
                    <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}>
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={30}>30</option>
                    </select>
                </label>

                <div className="admin-title-actions">
                    <button onClick={loadUsers}>
                        <Loader2 size={18} />
                        Tai lai
                    </button>
                    <button onClick={openCreate} className="btn btn-primary">
                        <Plus size={18} />
                        Tao user moi
                    </button>
                </div>
            </section>

            <section className="panel">
                <div className="section-title">
                    <h2>Danh sach nguoi dung</h2>
                    <span>{filteredUsers.length} nguoi dung</span>
                </div>

                <div className="admin-product-table">
                    {loading && pagedUsers.length === 0 ? (
                        <div className="empty">
                            <Loader2 size={32} className="spin" />
                            <p>Dang tai...</p>
                        </div>
                    ) : pagedUsers.length === 0 ? (
                        <div className="empty">
                            <p>Khong co user nao</p>
                        </div>
                    ) : (
                        pagedUsers.map((user) => (
                            <div className="admin-product-row" key={user.id}>
                                <div className="image-placeholder">{(user.name || "?")[0]}</div>
                                <div>
                                    <strong>{user.name}</strong>
                                    <span>{user.email}</span>
                                </div>
                                <span>{user.phone || "-"}</span>
                                <strong>{user.role === "admin" ? "Admin" : "Khach hang"}</strong>
                                <span>{new Date(user.createdAt).toLocaleDateString("vi-VN")}</span>
                                <button className="icon" onClick={() => openEdit(user)} title="Chinh sua">
                                    <Edit2 size={16} />
                                </button>
                                <button className="icon" onClick={() => handleDelete(user.id)} title="Xoa">
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </section>

            {totalPages > 1 && (
                <div className="pagination">
                    <span>
                        {startItem} - {endItem} / {filteredUsers.length}
                    </span>
                    <div>
                        <button
                            onClick={() => setPage(Math.max(1, page - 1))}
                            disabled={page === 1 || loading}
                            className="btn btn-sm"
                        >
                            Trai
                        </button>
                        <span className="page-info">
                            {currentPage} / {totalPages}
                        </span>
                        <button
                            onClick={() => setPage(Math.min(totalPages, page + 1))}
                            disabled={page === totalPages || loading}
                            className="btn btn-sm"
                        >
                            Phai
                        </button>
                    </div>
                </div>
            )}
        </section>
    );
}
