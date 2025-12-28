/* =========================================================
   KB-JPS (Android/Web) - utils.js (FULL)
   - Offline (LocalStorage) + Online (API optional)
   - Plain-text password (ikut permintaan projek)
   - GitHub Pages safe
   ========================================================= */

"use strict";

/* -------------------- GLOBAL NAMESPACE -------------------- */
window.KBJPS = window.KBJPS || {};
(function (K) {
  K.VERSION = "KBJPS-UTILS-1.0.0";

  /* -------------------- STORAGE KEYS -------------------- */
  const KEY_USERS = "kbjps_users";
  const KEY_SESSION = "kbjps_session";
  const KEY_API_BASE = "kbjps_api_base";
  const KEY_ACTIVITIES = "kbjps_activities";
  const KEY_AUDIT = "kbjps_audit";
  const KEY_SETTINGS = "kbjps_settings";

  /* -------------------- BASIC HELPERS -------------------- */
  function safeParseJSON(str, fallback) {
    try {
      const v = JSON.parse(str);
      return v === undefined ? fallback : v;
    } catch (e) {
      return fallback;
    }
  }

  function safeStringifyJSON(obj, fallbackStr = "[]") {
    try {
      return JSON.stringify(obj);
    } catch (e) {
      return fallbackStr;
    }
  }

  function nowISO() {
    return new Date().toISOString();
  }

  function uid(prefix = "id") {
    return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function normalizeEmail(email) {
    return String(email || "").trim().toLowerCase();
  }

  function normalizeText(t) {
    return String(t || "").trim();
  }

  function getLS(key, fallback) {
    const raw = localStorage.getItem(key);
    if (raw === null || raw === undefined) return fallback;
    return safeParseJSON(raw, fallback);
  }

  function setLS(key, value) {
    localStorage.setItem(key, safeStringifyJSON(value, "{}"));
  }

  function getArr(key) {
    const v = getLS(key, []);
    return Array.isArray(v) ? v : [];
  }

  function setArr(key, arr) {
    setLS(key, Array.isArray(arr) ? arr : []);
  }

  /* -------------------- UI HELPERS -------------------- */
  function qs(sel, root) {
    return (root || document).querySelector(sel);
  }
  function qsa(sel, root) {
    return Array.from((root || document).querySelectorAll(sel));
  }

  function showMsg(text, type = "info") {
    // Cari elemen mesej jika ada
    const el =
      qs("#msg") ||
      qs(".msg") ||
      qs("[data-msg]");

    if (el) {
      el.textContent = text || "";
      el.style.display = text ? "block" : "none";
      el.style.borderColor = type === "error" ? "#ff5a5a" : "#2bd26f";
      el.style.color = type === "error" ? "#ffdfdf" : "#dbffea";
      return;
    }
    // fallback
    if (text) alert(text);
  }

  /* -------------------- AUDIT LOG -------------------- */
  function audit(action, detail) {
    const logs = getArr(KEY_AUDIT);
    const session = getSession();
    logs.unshift({
      id: uid("audit"),
      at: nowISO(),
      action: String(action || "").toUpperCase(),
      userEmail: session?.email || "",
      detail: detail || ""
    });
    // limit size
    if (logs.length > 500) logs.length = 500;
    setArr(KEY_AUDIT, logs);
  }

  K.getAuditLogs = function () {
    return getArr(KEY_AUDIT);
  };

  /* -------------------- API BASE (ONLINE MODE) -------------------- */
  K.setApiBase = function (url) {
    const clean = normalizeText(url);
    localStorage.setItem(KEY_API_BASE, clean);
    return clean;
  };

  K.getApiBase = function () {
    return normalizeText(localStorage.getItem(KEY_API_BASE) || "");
  };

  K.isOnlineMode = function () {
    return !!K.getApiBase();
  };

  async function apiFetch(path, opts = {}) {
    const base = K.getApiBase();
    if (!base) throw new Error("API belum diset. Mode Offline.");
    const url = base.replace(/\/+$/, "") + "/" + String(path || "").replace(/^\/+/, "");
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 15000);

    try {
      const res = await fetch(url, {
        method: opts.method || "GET",
        headers: Object.assign({ "Content-Type": "application/json" }, opts.headers || {}),
        body: opts.body ? JSON.stringify(opts.body) : undefined,
        signal: controller.signal
      });
      const text = await res.text();
      const data = safeParseJSON(text, { raw: text });

      if (!res.ok) {
        const msg = data?.message || data?.error || `HTTP ${res.status}`;
        throw new Error(msg);
      }
      return data;
    } finally {
      clearTimeout(t);
    }
  }

  K.apiFetch = apiFetch;

  /* -------------------- USERS / AUTH (OFFLINE STORE) -------------------- */
  function loadUsers() {
    return getArr(KEY_USERS);
  }

  function saveUsers(users) {
    setArr(KEY_USERS, users);
  }

  function findUserByEmail(email) {
    const e = normalizeEmail(email);
    return loadUsers().find(u => normalizeEmail(u.email) === e) || null;
  }

  function upsertUser(user) {
    const users = loadUsers();
    const e = normalizeEmail(user.email);
    const idx = users.findIndex(u => normalizeEmail(u.email) === e);
    if (idx >= 0) users[idx] = user;
    else users.push(user);
    saveUsers(users);
    return user;
  }

  // ====== WAJIB: SUPERADMIN SENTIASA ADA ======
  function ensureSeed(force = false) {
    if (force) {
      localStorage.removeItem(KEY_USERS);
      localStorage.removeItem(KEY_SESSION);
      localStorage.removeItem(KEY_ACTIVITIES);
      localStorage.removeItem(KEY_AUDIT);
      localStorage.removeItem(KEY_SETTINGS);
    }

    const users = loadUsers();

    const hasSuper =
      users.some(u => (u.role || "").toLowerCase() === "superadmin") ||
      users.some(u => normalizeEmail(u.email) === "superadmin@superadmin.com");

    if (!hasSuper) {
      users.push({
        id: "u-superadmin",
        name: "SUPERADMIN",
        email: "superadmin@superadmin.com",
        password: "123456", // plain text
        role: "superadmin",
        wilayah: "HQ",
        daerah: "HQ Sandakan",
        phone: "",
        createdAt: nowISO()
      });
    }

    // contoh admin/staff (optional, senang test)
    const hasAdmin = users.some(u => normalizeEmail(u.email) === "admin@kbjps.com");
    if (!hasAdmin) {
      users.push({
        id: "u-admin",
        name: "ADMIN WILAYAH",
        email: "admin@kbjps.com",
        password: "123456",
        role: "admin",
        wilayah: "Tawau",
        daerah: "Serudong",
        phone: "",
        createdAt: nowISO()
      });
    }

    const hasStaff = users.some(u => normalizeEmail(u.email) === "staff@kbjps.com");
    if (!hasStaff) {
      users.push({
        id: "u-staff",
        name: "STAFF",
        email: "staff@kbjps.com",
        password: "123456",
        role: "staff",
        wilayah: "Sandakan",
        daerah: "HQ Sandakan",
        phone: "",
        createdAt: nowISO()
      });
    }

    saveUsers(users);
    return users;
  }

  K.ensureSeed = ensureSeed;

  function getSession() {
    return getLS(KEY_SESSION, null);
  }

  function setSession(sess) {
    setLS(KEY_SESSION, sess);
  }

  K.getSession = getSession;

  K.getCurrentUser = function () {
    const s = getSession();
    if (!s?.email) return null;
    return findUserByEmail(s.email);
  };

  K.logout = function (redirectTo = "index.html") {
    audit("LOGOUT", "User logout");
    localStorage.removeItem(KEY_SESSION);
    window.location.href = redirectTo;
  };

  K.requireAuth = function (allowedRoles) {
    const u = K.getCurrentUser();
    if (!u) {
      window.location.href = "index.html";
      return null;
    }
    if (Array.isArray(allowedRoles) && allowedRoles.length) {
      const r = String(u.role || "").toLowerCase();
      const ok = allowedRoles.map(x => String(x).toLowerCase()).includes(r);
      if (!ok) {
        showMsg("Akses ditolak (role tidak dibenarkan).", "error");
        setTimeout(() => (window.location.href = "calendar.html"), 800);
        return null;
      }
    }
    return u;
  };

  // LOGIN (OFFLINE / ONLINE placeholder)
  K.login = async function (email, password) {
    const e = normalizeEmail(email);
    const p = String(password || "");

    if (!e || !p) {
      throw new Error("Sila isi email dan kata laluan.");
    }

    // Pastikan seed wujud dulu
    ensureSeed(false);

    // OFFLINE login (LocalStorage)
    const user = findUserByEmail(e);
    if (!user) throw new Error("Login gagal: Pengguna tidak wujud.");
    if (String(user.password || "") !== p) throw new Error("Login gagal: Kata laluan salah.");

    // create session
    const token = "kbjps-" + uid("jwt"); // token pseudo untuk frontend
    setSession({
      token,
      email: user.email,
      role: user.role,
      name: user.name,
      loginAt: nowISO()
    });

    audit("LOGIN", `Login berjaya (${user.email})`);
    return user;
  };

  // REGISTER (buat staff / admin — superadmin biasanya tak daftar)
  K.register = function (payload) {
    ensureSeed(false);

    const name = normalizeText(payload?.name);
    const email = normalizeEmail(payload?.email);
    const password = String(payload?.password || "");
    const role = normalizeText(payload?.role || "staff") || "staff";
    const wilayah = normalizeText(payload?.wilayah || "");
    const daerah = normalizeText(payload?.daerah || "");
    const phone = normalizeText(payload?.phone || "");

    if (!name || !email || !password) throw new Error("Nama, email, dan kata laluan wajib diisi.");

    if (findUserByEmail(email)) throw new Error("Email ini sudah wujud.");

    const user = {
      id: uid("u"),
      name,
      email,
      password,
      role: role.toLowerCase(),
      wilayah,
      daerah,
      phone,
      createdAt: nowISO()
    };

    upsertUser(user);
    audit("REGISTER", `Daftar pengguna (${email})`);
    return user;
  };

  // RESET PASSWORD (OFFLINE)
  K.resetPassword = function (email, newPassword) {
    ensureSeed(false);

    const e = normalizeEmail(email);
    const np = String(newPassword || "");
    if (!e || !np) throw new Error("Email dan kata laluan baru wajib.");

    const user = findUserByEmail(e);
    if (!user) throw new Error("Pengguna tidak wujud.");

    user.password = np;
    user.updatedAt = nowISO();
    upsertUser(user);

    audit("RESET_PASSWORD", `Reset kata laluan (${e})`);
    return true;
  };

  // LIST USERS
  K.listUsers = function () {
    ensureSeed(false);
    return loadUsers();
  };

  // DELETE USER (optional)
  K.deleteUser = function (email) {
    const e = normalizeEmail(email);
    const users = loadUsers().filter(u => normalizeEmail(u.email) !== e);
    saveUsers(users);
    audit("DELETE_USER", `Delete user (${e})`);
    return true;
  };

  /* -------------------- DATA RESET / FIX LOGIN -------------------- */
  K.resetData = function () {
    // Reset semua data KBJPS
    localStorage.removeItem(KEY_USERS);
    localStorage.removeItem(KEY_SESSION);
    localStorage.removeItem(KEY_ACTIVITIES);
    localStorage.removeItem(KEY_AUDIT);
    localStorage.removeItem(KEY_SETTINGS);

    // Jangan buang API base kecuali mahu
    // localStorage.removeItem(KEY_API_BASE);

    ensureSeed(false);
    audit("RESET_DATA", "Reset Data (Fix Login)");
    return true;
  };

  /* -------------------- ACTIVITIES (BASIC) -------------------- */
  K.listActivities = function () {
    return getArr(KEY_ACTIVITIES);
  };

  K.saveActivity = function (activity) {
    const arr = getArr(KEY_ACTIVITIES);
    const a = Object.assign({}, activity);

    if (!a.id) a.id = uid("act");
    if (!a.createdAt) a.createdAt = nowISO();
    a.updatedAt = nowISO();

    const idx = arr.findIndex(x => x.id === a.id);
    if (idx >= 0) arr[idx] = a;
    else arr.push(a);

    setArr(KEY_ACTIVITIES, arr);
    audit("SAVE_ACTIVITY", a.title || a.id);
    return a;
  };

  K.deleteActivity = function (id) {
    const arr = getArr(KEY_ACTIVITIES).filter(x => x.id !== id);
    setArr(KEY_ACTIVITIES, arr);
    audit("DELETE_ACTIVITY", id);
    return true;
  };

  /* -------------------- HEADER/FOOTER AUTO LOAD -------------------- */
  K.loadPartials = function () {
    const headerHost = qs("#header");
    if (headerHost) {
      fetch("header.html")
        .then(r => r.text())
        .then(html => (headerHost.innerHTML = html))
        .catch(() => {});
    }
    const footerHost = qs("#footer");
    if (footerHost) {
      fetch("footer.html")
        .then(r => r.text())
        .then(html => (footerHost.innerHTML = html))
        .catch(() => {});
    }
  };

  /* -------------------- SAFE INIT ON EVERY PAGE -------------------- */
  document.addEventListener("DOMContentLoaded", function () {
    // Pastikan tiada error "KBJPS not defined" & superadmin sentiasa ada
    ensureSeed(false);

    // auto load header/footer jika ada placeholder
    K.loadPartials();

    // auto wire logout button jika ada
    const btnLogout = qs("[data-logout]");
    if (btnLogout) {
      btnLogout.addEventListener("click", function (e) {
        e.preventDefault();
        K.logout("index.html");
      });
    }

    // auto wire fix login button jika ada
    const btnFix = qs("[data-fix-login]");
    if (btnFix) {
      btnFix.addEventListener("click", function (e) {
        e.preventDefault();
        K.resetData();
        showMsg("Reset Data selesai. Cuba login: superadmin@superadmin.com / 123456", "info");
      });
    }
  });

})(window.KBJPS);
