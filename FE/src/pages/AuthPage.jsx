import React, { useEffect, useState } from "react";
import { KeyRound, LogIn, Mail, UserPlus } from "lucide-react";
import { apiBaseUrl } from "../config.js";

export function AuthPage({ mode, saveSession, setMessage }) {
  const [form, setForm] = useState({ name: "", email: "", password: "", token: "", confirmPassword: "" });
  const [authMode, setAuthMode] = useState(mode);

  useEffect(() => {
    setAuthMode(mode);
  }, [mode]);

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submit(event) {
    event.preventDefault();

    const path =
      authMode === "login"
        ? "/auth/login"
        : authMode === "register"
          ? "/auth/register"
          : authMode === "forgot"
            ? "/auth/forgot-password"
            : "/auth/reset-password";

    const payload =
      authMode === "login"
        ? { email: form.email, password: form.password }
        : authMode === "register"
          ? { name: form.name, email: form.email, password: form.password }
          : authMode === "forgot"
            ? { email: form.email }
            : { token: form.token, password: form.password };

    if (authMode === "reset" && form.password !== form.confirmPassword) {
      setMessage("Mật khẩu mới không khớp.", "warning");
      return;
    }

    let response;
    let result;
    try {
      response = await fetch(`${apiBaseUrl}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      result = await response.json().catch(() => ({}));
    } catch {
      setMessage("user-service đang tạm ngưng. Bạn có thể qua trang khác và thử lại sau.", "warning");
      return;
    }

    if (!response.ok) {
      setMessage(result.error || "Thao tác thất bại", response.status === 503 ? "warning" : "error");
      return;
    }

    if (result.token) {
      saveSession(result.user, result.token);
      setMessage(result.user.role === "admin" ? "Đăng nhập admin thành công." : "Đăng nhập thành công.", "success");
      return;
    }

    if (authMode === "forgot") {
      setAuthMode("reset");
      setMessage(result.otp ? `Mã OTP dev: ${result.otp}` : result.message || "OTP đã được gửi tới email.", "success", 8000);
      return;
    }

    setMessage(result.message || "Thành công.", "success", 6000);
  }

  const title =
    authMode === "register"
      ? "Tạo tài khoản khách hàng"
      : authMode === "forgot"
        ? "Lấy lại mật khẩu"
        : authMode === "reset"
          ? "Đặt lại mật khẩu"
          : "Đăng nhập để mua hàng";

  return (
    <main className="container py-4 py-lg-5">
      <section className="row justify-content-center align-items-stretch g-4">
        <div className="col-lg-5">
          <div className="h-100 card border-0 shadow-sm rounded-5 bg-success text-white">
            <div className="card-body p-4 p-lg-5 d-flex flex-column justify-content-between">
              <div>
                <span className="badge rounded-pill text-bg-light text-success mb-3">Tài khoản Fruitweb</span>
                <h1 className="display-6 fw-bold mb-3">{title}</h1>
                <p className="lead opacity-75 mb-0">
                  Khách hàng có giỏ hàng riêng, lịch sử đơn hàng rõ ràng và có thể cập nhật thông tin giao hàng nhanh chóng.
                </p>
              </div>

              <div className="row g-3 mt-4">
                <div className="col-12">
                  <div className="d-flex align-items-center gap-2">
                    <Mail size={20} />
                    <span>OTP qua Gmail khi quên mật khẩu</span>
                  </div>
                </div>
                <div className="col-12">
                  <div className="d-flex align-items-center gap-2">
                    <KeyRound size={20} />
                    <span>Bảo mật thông tin tài khoản</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-lg-6">
          <div className="card border-0 shadow-sm rounded-5">
            <div className="card-body p-4 p-lg-5">
              <div className="btn-group w-100 mb-4" role="group" aria-label="Chọn chế độ xác thực">
                <button
                  type="button"
                  className={`btn ${authMode === "login" ? "btn-success" : "btn-outline-success"}`}
                  onClick={() => setAuthMode("login")}
                >
                  <LogIn size={18} className="me-2" />
                  Đăng nhập
                </button>

                <button
                  type="button"
                  className={`btn ${authMode === "register" ? "btn-success" : "btn-outline-success"}`}
                  onClick={() => setAuthMode("register")}
                >
                  <UserPlus size={18} className="me-2" />
                  Đăng ký
                </button>
              </div>

              <form className="row g-3" onSubmit={submit}>
                {authMode === "register" && (
                  <div className="col-12">
                    <label className="form-label fw-semibold">Họ tên</label>
                    <input
                      className="form-control form-control-lg"
                      value={form.name}
                      onChange={(event) => update("name", event.target.value)}
                      required
                    />
                  </div>
                )}

                {authMode !== "reset" && (
                  <div className="col-12">
                    <label className="form-label fw-semibold">Email</label>
                    <input
                      className="form-control form-control-lg"
                      type="email"
                      value={form.email}
                      onChange={(event) => update("email", event.target.value)}
                      required
                    />
                  </div>
                )}

                {authMode === "reset" && (
                  <div className="col-12">
                    <label className="form-label fw-semibold">Mã OTP</label>
                    <input
                      className="form-control form-control-lg"
                      inputMode="numeric"
                      maxLength={6}
                      value={form.token}
                      onChange={(event) => update("token", event.target.value)}
                      required
                    />
                  </div>
                )}

                {authMode !== "forgot" && (
                  <div className="col-12">
                    <label className="form-label fw-semibold">Mật khẩu</label>
                    <input
                      className="form-control form-control-lg"
                      type="password"
                      value={form.password}
                      onChange={(event) => update("password", event.target.value)}
                      required
                    />
                  </div>
                )}

                {authMode === "reset" && (
                  <div className="col-12">
                    <label className="form-label fw-semibold">Nhập lại mật khẩu mới</label>
                    <input
                      className="form-control form-control-lg"
                      type="password"
                      value={form.confirmPassword}
                      onChange={(event) => update("confirmPassword", event.target.value)}
                      required
                    />
                  </div>
                )}

                <div className="col-12">
                  <button className="btn btn-success btn-lg rounded-pill w-100" type="submit">
                    {authMode === "forgot" ? "Gửi OTP" : authMode === "reset" ? "Đặt lại mật khẩu" : "Xác nhận"}
                  </button>
                </div>
              </form>

              <div className="d-flex flex-wrap justify-content-center gap-2 mt-4">
                <button type="button" className="btn btn-link text-success text-decoration-none" onClick={() => setAuthMode("forgot")}>
                  Quên mật khẩu
                </button>
                <button type="button" className="btn btn-link text-success text-decoration-none" onClick={() => setAuthMode("reset")}>
                  Đặt lại mật khẩu
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
