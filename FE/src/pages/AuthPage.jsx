import React, { useEffect, useState } from "react";
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
      setMessage("Mat khau moi khong khop.", "warning");
      return;
    }

    const response = await fetch(`${apiBaseUrl}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const result = await response.json();
    if (!response.ok) {
      setMessage(result.error || "Thao tac that bai", "error");
      return;
    }
    if (result.token) {
      saveSession(result.user, result.token);
      setMessage(result.user.role === "admin" ? "Dang nhap admin thanh cong." : "Dang nhap thanh cong.", "success");
      return;
    }
    if (authMode === "forgot") {
      setAuthMode("reset");
      setMessage(result.otp ? `Ma OTP dev: ${result.otp}` : result.message || "OTP da duoc gui toi email.", "success", 8000);
      return;
    }
    setMessage(result.message || "Thanh cong.", "success", 6000);
  }

  return (
    <section className="auth-layout">
      <div className="auth-intro">
        <p className="eyebrow">Tai khoan Fruitweb</p>
        <h1>{authMode === "register" ? "Tao tai khoan khach hang" : "Dang nhap de mua hang"}</h1>
        <p>Khach hang co gio hang rieng va lich su don hang. Quen mat khau se nhan OTP qua Gmail.</p>
      </div>
      <div className="auth-panel">
        <div className="tabs">
          <button className={authMode === "login" ? "active" : ""} onClick={() => setAuthMode("login")}>
            Dang nhap
          </button>
          <button className={authMode === "register" ? "active" : ""} onClick={() => setAuthMode("register")}>
            Dang ky
          </button>
        </div>
        <form className="form" onSubmit={submit}>
          {authMode === "register" ? (
            <label>
              Ho ten
              <input value={form.name} onChange={(event) => update("name", event.target.value)} required />
            </label>
          ) : null}
          {authMode !== "reset" ? (
            <label>
              Email
              <input type="email" value={form.email} onChange={(event) => update("email", event.target.value)} required />
            </label>
          ) : null}
          {authMode === "reset" ? (
            <label>
              Ma OTP
              <input
                inputMode="numeric"
                maxLength={6}
                value={form.token}
                onChange={(event) => update("token", event.target.value)}
                required
              />
            </label>
          ) : null}
          {authMode !== "forgot" ? (
            <label>
              Mat khau
              <input
                type="password"
                value={form.password}
                onChange={(event) => update("password", event.target.value)}
                required
              />
            </label>
          ) : null}
          {authMode === "reset" ? (
            <label>
              Nhap lai mat khau moi
              <input
                type="password"
                value={form.confirmPassword}
                onChange={(event) => update("confirmPassword", event.target.value)}
                required
              />
            </label>
          ) : null}
          <button>{authMode === "forgot" ? "Gui OTP" : authMode === "reset" ? "Dat lai mat khau" : "Xac nhan"}</button>
        </form>
        <div className="auth-links">
          <button className="link-button" onClick={() => setAuthMode("forgot")}>Quen mat khau</button>
          <button className="link-button" onClick={() => setAuthMode("reset")}>Dat lai mat khau</button>
        </div>
      </div>
    </section>
  );
}
