import React, { useEffect, useState } from "react";
import { KeyRound, Save, UserRound } from "lucide-react";
import { apiBaseUrl } from "../config.js";

export function ProfilePage({ user, token, saveSession, setMessage }) {
  const [form, setForm] = useState({
    name: user?.name || "",
    email: user?.email || "",
    phone: user?.phone || "",
    address: user?.address || ""
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });

  useEffect(() => {
    async function loadProfile() {
      let response;
      let result;
      try {
        response = await fetch(`${apiBaseUrl}/auth/profile`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        result = await response.json().catch(() => ({}));
      } catch {
        setMessage("user-service đang tạm ngưng. Thông tin cá nhân tạm thời chưa đồng bộ.", "warning");
        return;
      }

      if (!response.ok) {
        setMessage(result.error || "Không tải được thông tin cá nhân.", "warning");
        return;
      }

      setForm({
        name: result.user.name || "",
        email: result.user.email || "",
        phone: result.user.phone || "",
        address: result.user.address || ""
      });
    }

    if (token) {
      void loadProfile();
    }
  }, [token]);

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function updatePassword(field, value) {
    setPasswordForm((current) => ({ ...current, [field]: value }));
  }

  async function submit(event) {
    event.preventDefault();

    let response;
    let result;
    try {
      response = await fetch(`${apiBaseUrl}/auth/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: form.name,
          phone: form.phone,
          address: form.address
        })
      });
      result = await readJsonResponse(response);
    } catch {
      setMessage("user-service đang tạm ngưng. Không cập nhật được thông tin.", "warning");
      return;
    }

    if (!response.ok) {
      setMessage(result.error || "Không cập nhật được thông tin.", "error");
      return;
    }

    saveSession(result.user, result.token);
    setMessage("Đã cập nhật thông tin cá nhân.", "success");
  }

  async function submitPassword(event) {
    event.preventDefault();

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setMessage("Mật khẩu mới không khớp.", "warning");
      return;
    }

    let response;
    let result;
    try {
      response = await fetch(`${apiBaseUrl}/auth/password`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword
        })
      });
      result = await readJsonResponse(response);
    } catch {
      setMessage("user-service đang tạm ngưng. Không cập nhật được mật khẩu.", "warning");
      return;
    }

    if (!response.ok) {
      setMessage(result.error || "Không cập nhật được mật khẩu.", "error");
      return;
    }

    setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    setMessage("Đã cập nhật mật khẩu.", "success");
  }

  return (
    <main className="container py-4 py-lg-5">
      <section className="card border-0 shadow-sm rounded-5 mb-4">
        <div className="card-body p-4 d-flex flex-column flex-md-row align-items-md-center gap-3">
          <div className="bg-success text-white rounded-circle d-inline-flex align-items-center justify-content-center p-3">
            <UserRound size={42} />
          </div>

          <div>
            <span className="badge rounded-pill text-bg-success mb-2">Tài khoản khách hàng</span>
            <h1 className="fw-bold mb-1">Thông tin cá nhân</h1>
            <p className="text-secondary mb-0">{form.email}</p>
          </div>
        </div>
      </section>

      <section className="row g-4">
        <div className="col-lg-7">
          <form className="card border-0 shadow-sm rounded-5 h-100" onSubmit={submit}>
            <div className="card-body p-4">
              <h2 className="h4 fw-bold mb-4">Thông tin người dùng</h2>

              <div className="mb-3">
                <label className="form-label fw-semibold">Họ tên</label>
                <input
                  className="form-control form-control-lg"
                  value={form.name}
                  onChange={(event) => update("name", event.target.value)}
                  required
                />
              </div>

              <div className="mb-3">
                <label className="form-label fw-semibold">Email</label>
                <input className="form-control form-control-lg" type="email" value={form.email} disabled />
              </div>

              <div className="mb-3">
                <label className="form-label fw-semibold">Số điện thoại</label>
                <input
                  className="form-control form-control-lg"
                  value={form.phone}
                  onChange={(event) => update("phone", event.target.value)}
                />
              </div>

              <div className="mb-4">
                <label className="form-label fw-semibold">Địa chỉ giao hàng mặc định</label>
                <input
                  className="form-control form-control-lg"
                  value={form.address}
                  onChange={(event) => update("address", event.target.value)}
                />
              </div>

              <button className="btn btn-success btn-lg rounded-pill px-4">
                <Save size={18} className="me-2" />
                Lưu thông tin
              </button>
            </div>
          </form>
        </div>

        <div className="col-lg-5">
          <form className="card border-0 shadow-sm rounded-5 h-100" onSubmit={submitPassword}>
            <div className="card-body p-4">
              <h2 className="h4 fw-bold mb-4">
                <KeyRound size={22} className="me-2 text-success" />
                Đổi mật khẩu
              </h2>

              <div className="mb-3">
                <label className="form-label fw-semibold">Mật khẩu hiện tại</label>
                <input
                  className="form-control form-control-lg"
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(event) => updatePassword("currentPassword", event.target.value)}
                  required
                />
              </div>

              <div className="mb-3">
                <label className="form-label fw-semibold">Mật khẩu mới</label>
                <input
                  className="form-control form-control-lg"
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(event) => updatePassword("newPassword", event.target.value)}
                  required
                  minLength={6}
                />
              </div>

              <div className="mb-4">
                <label className="form-label fw-semibold">Nhập lại mật khẩu mới</label>
                <input
                  className="form-control form-control-lg"
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(event) => updatePassword("confirmPassword", event.target.value)}
                  required
                  minLength={6}
                />
              </div>

              <button className="btn btn-outline-success btn-lg rounded-pill px-4">
                <KeyRound size={18} className="me-2" />
                Cập nhật mật khẩu
              </button>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}

async function readJsonResponse(response) {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { error: "API không trả về JSON. Kiểm tra backend/gateway đã restart chưa." };
  }
}
