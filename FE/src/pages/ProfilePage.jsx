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
        setMessage("user-service dang tam ngung. Thong tin ca nhan tam thoi chua dong bo.", "warning");
        return;
      }
      if (!response.ok) {
        setMessage(result.error || "Khong tai duoc thong tin ca nhan.", "warning");
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
      setMessage("user-service dang tam ngung. Khong cap nhat duoc thong tin.", "warning");
      return;
    }
    if (!response.ok) {
      setMessage(result.error || "Khong cap nhat duoc thong tin.", "error");
      return;
    }

    saveSession(result.user, result.token);
    setMessage("Da cap nhat thong tin ca nhan.", "success");
  }

  async function submitPassword(event) {
    event.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setMessage("Mat khau moi khong khop.", "warning");
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
      setMessage("user-service dang tam ngung. Khong cap nhat duoc mat khau.", "warning");
      return;
    }
    if (!response.ok) {
      setMessage(result.error || "Khong cap nhat duoc mat khau.", "error");
      return;
    }

    setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    setMessage("Da cap nhat mat khau.", "success");
  }

  return (
    <section className="profile-layout">
      <div className="profile-summary">
        <UserRound size={42} />
        <div>
          <p className="eyebrow">Tai khoan khach hang</p>
          <h1>Thong tin ca nhan</h1>
          <span>{form.email}</span>
        </div>
      </div>

      <div className="profile-forms">
        <form className="panel form profile-form" onSubmit={submit}>
          <h2>Thong tin nguoi dung</h2>
          <label>
            Ho ten
            <input value={form.name} onChange={(event) => update("name", event.target.value)} required />
          </label>
          <label>
            Email
            <input type="email" value={form.email} disabled />
          </label>
          <label>
            So dien thoai
            <input value={form.phone} onChange={(event) => update("phone", event.target.value)} />
          </label>
          <label>
            Dia chi giao hang mac dinh
            <input value={form.address} onChange={(event) => update("address", event.target.value)} />
          </label>
          <button>
            <Save size={18} />
            Luu thong tin
          </button>
        </form>

        <form className="panel form profile-form" onSubmit={submitPassword}>
          <h2><KeyRound size={20} /> Doi mat khau</h2>
          <label>
            Mat khau hien tai
            <input
              type="password"
              value={passwordForm.currentPassword}
              onChange={(event) => updatePassword("currentPassword", event.target.value)}
              required
            />
          </label>
          <label>
            Mat khau moi
            <input
              type="password"
              value={passwordForm.newPassword}
              onChange={(event) => updatePassword("newPassword", event.target.value)}
              required
              minLength={6}
            />
          </label>
          <label>
            Nhap lai mat khau moi
            <input
              type="password"
              value={passwordForm.confirmPassword}
              onChange={(event) => updatePassword("confirmPassword", event.target.value)}
              required
              minLength={6}
            />
          </label>
          <button>
            <KeyRound size={18} />
            Cap nhat mat khau
          </button>
        </form>
      </div>
    </section>
  );
}

async function readJsonResponse(response) {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { error: "API khong tra ve JSON. Kiem tra backend/gateway da restart chua." };
  }
}
