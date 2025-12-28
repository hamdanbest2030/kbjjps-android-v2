/* =========================================================
   KB-JPS (Android/Web) - utils.js (FULL) - GitHub Pages Safe
   - Offline (LocalStorage) first
   - Online API placeholder (set API base later)
   - Superadmin always exists
   ========================================================= */
"use strict";

window.KBJPS = window.KBJPS || {};
(function (K) {
  K.VERSION = "KBJPS-UTILS-GHP-1.0.0";

  // Timezone helper (avoid "TZ is not defined")
  var TZ = (Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kuala_Lumpur");
  window.TZ = TZ;

  const KEY_USERS = "kbjps_users";
  const KEY_SESSION = "kbjps_session";
  const KEY_ACTIVITIES = "kbjps_activities";
  const KEY_AUDIT = "kbjps_audit";
  const KEY_API_BASE = "kbjps_api_base";

  function safeParse(str, fallback) {
    try { return JSON.parse(str); } catch (e) { return fallback; }
  }
  function getArr(key) {
    const raw = localStorage.getItem(key);
    const v = raw ? safeParse(raw, []) : [];
    return Array.isArray(v) ? v : [];
  }
  function setArr(key, arr) {
    localStorage.setItem(key, JSON.stringify(Array.isArray(arr) ? arr : []));
  }
  function getObj(key, fallback) {
    const raw = localStorage.getItem(key);
    return raw ? safeParse(raw, fallback) : fallback;
  }
  function setObj(key, obj) {
    localStorage.setItem(key, JSON.stringify(obj ?? null));
  }

  function uid(prefix) { return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`; }
  function normEmail(e) { return String(e || "").trim().toLowerCase(); }
  function esc(s) {
    return String(s ?? "").replace(/[&<>"']/g, m => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[m]));
  }

  K.dom = {
    qs: (s, r) => (r || document).querySelector(s),
    qsa: (s, r) => Array.from((r || document).querySelectorAll(s)),
    esc
  };

  K.ui = (function () {
    let el = null;
    function ensure() {
      if (el) return el;
      el = document.createElement("div");
      el.className = "toast";
      el.innerHTML = '<div class="t"></div><div class="m"></div>';
      document.body.appendChild(el);
      return el;
    }
    function toast(msg, type) {
      const t = ensure();
      t.className = "toast show " + (type || "");
      t.querySelector(".t").textContent = (type || "info").toUpperCase();
      t.querySelector(".m").textContent = msg || "";
      clearTimeout(toast._t);
      toast._t = setTimeout(() => (t.className = "toast"), 2600);
    }
    function openModal(html) {
      let back = document.getElementById("kbjpsModalBack");
      if (!back) {
        back = document.createElement("div");
        back.id = "kbjpsModalBack";
        back.className = "modalback";
        back.innerHTML = '<div class="card modal" id="kbjpsModal"></div>';
        document.body.appendChild(back);
        back.addEventListener("click", (e) => { if (e.target === back) closeModal(); });
      }
      document.getElementById("kbjpsModal").innerHTML = html || "";
      back.classList.add("show");
    }
    function closeModal() {
      const back = document.getElementById("kbjpsModalBack");
      if (back) back.classList.remove("show");
    }
    return { toast, openModal, closeModal };
  })();

  K.audit = (function () {
    function add(action, detail) {
      const list = getArr(KEY_AUDIT);
      const sess = getObj(KEY_SESSION, null);
      list.unshift({
        id: uid("audit"),
        at: new Date().toISOString(),
        action: String(action || "UNKNOWN").toUpperCase(),
        detail: detail || "",
        by: sess?.email || "GUEST",
        role: sess?.role || ""
      });
      if (list.length > 800) list.length = 800;
      setArr(KEY_AUDIT, list);
    }
    function list() { return getArr(KEY_AUDIT); }
    return { add, list };
  })();

  K.setApiBase = function (url) {
    localStorage.setItem(KEY_API_BASE, String(url || "").trim());
  };
  K.getApiBase = function () {
    return String(localStorage.getItem(KEY_API_BASE) || "").trim();
  };

  K.seed = (function () {
    function run(force = false) {
      if (force) {
        localStorage.removeItem(KEY_USERS);
        localStorage.removeItem(KEY_SESSION);
        localStorage.removeItem(KEY_ACTIVITIES);
        localStorage.removeItem(KEY_AUDIT);
      }
      const users = getArr(KEY_USERS);

      const hasSuper = users.some(u => normEmail(u.email) === "superadmin@superadmin.com" || String(u.role||"").toUpperCase()==="SUPERADMIN");
      if (!hasSuper) {
        users.push({ id:"u-superadmin", name:"SUPERADMIN", email:"superadmin@superadmin.com", password:"123456", role:"SUPERADMIN", status:"ACTIVE", createdAt:Date.now() });
      }

      const hasAdmin = users.some(u => normEmail(u.email) === "admin@kbjps.com");
      if (!hasAdmin) users.push({ id:"u-admin", name:"ADMIN WILAYAH", email:"admin@kbjps.com", password:"123456", role:"ADMIN", status:"ACTIVE", createdAt:Date.now() });

      const hasStaff = users.some(u => normEmail(u.email) === "staff@kbjps.com");
      if (!hasStaff) users.push({ id:"u-staff", name:"STAFF", email:"staff@kbjps.com", password:"123456", role:"STAFF", status:"ACTIVE", createdAt:Date.now() });

      setArr(KEY_USERS, users);
      if (!localStorage.getItem(KEY_ACTIVITIES)) setArr(KEY_ACTIVITIES, []);
      if (!localStorage.getItem(KEY_AUDIT)) setArr(KEY_AUDIT, []);
    }
    return { run };
  })();

  K.users = (function () {
    function all() { return getArr(KEY_USERS); }
    function save(list) { setArr(KEY_USERS, list); }

    function find(email) { return all().find(u => normEmail(u.email) === normEmail(email)) || null; }

    function create({ name, email, password }) {
      name = String(name || "").trim();
      email = normEmail(email);
      password = String(password || "");
      if (!name || !email || !password) return { ok:false, message:"Nama, emel, kata laluan wajib." };
      if (!email.includes("@")) return { ok:false, message:"Emel tidak sah." };
      if (find(email)) return { ok:false, message:"Emel sudah wujud." };

      const u = { id: uid("u"), name, email, password, role:"STAFF", status:"PENDING", createdAt:Date.now() };
      const list = all(); list.push(u); save(list);
      K.audit.add("REGISTER", `STAFF ${email} (PENDING)`);
      return { ok:true, user:u };
    }

    function setStatus(email, status) {
      const list = all();
      const idx = list.findIndex(u => normEmail(u.email) === normEmail(email));
      if (idx < 0) return { ok:false, message:"User tidak dijumpai." };
      list[idx].status = String(status||"").toUpperCase();
      save(list);
      K.audit.add("CHANGE_STATUS", `${email} => ${list[idx].status}`);
      return { ok:true };
    }

    function resetPassword(email, newPassword) {
      const list = all();
      const idx = list.findIndex(u => normEmail(u.email) === normEmail(email));
      if (idx < 0) return { ok:false, message:"Emel tidak dijumpai." };
      list[idx].password = String(newPassword || "");
      save(list);
      K.audit.add("RESET_PASSWORD_SUCCESS", `Reset password for ${email}`);
      return { ok:true };
    }

    return { all, find, create, setStatus, resetPassword };
  })();

  K.auth = (function () {
    function token() { return "kbjps_" + Math.random().toString(16).slice(2) + Date.now().toString(16); }
    function session() { return getObj(KEY_SESSION, null); }

    function loginLocal(email, password) {
      K.seed.run(false);
      email = normEmail(email);
      password = String(password || "");
      const u = K.users.find(email);
      if (!u) { K.audit.add("LOGIN_FAIL", `User not found: ${email}`); return { ok:false, message:"Login gagal: Pengguna tidak wujud." }; }
      if (String(u.password) !== password) { K.audit.add("LOGIN_FAIL", `Wrong password: ${email}`); return { ok:false, message:"Login gagal: Kata laluan salah." }; }
      if (String(u.status || "ACTIVE").toUpperCase() !== "ACTIVE") { K.audit.add("LOGIN_FAIL", `Status not ACTIVE: ${email}`); return { ok:false, message:"Akaun belum ACTIVE." }; }

      const sess = { email:u.email, name:u.name, role:u.role, token:token(), at:Date.now() };
      setObj(KEY_SESSION, sess);
      K.audit.add("LOGIN", `Login ${email} (${u.role})`);
      return { ok:true, session:sess };
    }

    function logout(redirectTo) {
      const s = session();
      if (s) K.audit.add("LOGOUT", `Logout ${s.email}`);
      localStorage.removeItem(KEY_SESSION);
      if (redirectTo) window.location.href = redirectTo;
    }

    function requireAuth(redirectTo) {
      const s = session();
      if (!s?.token) {
        const next = encodeURIComponent((location.pathname || "").split("/").pop() || "menu.html");
        window.location.href = (redirectTo || "./index.html") + "?next=" + next;
        return false;
      }
      return true;
    }

    return { session, loginLocal, logout, requireAuth };
  })();

  K.activities = (function () {
    function all() { return getArr(KEY_ACTIVITIES); }
    function save(list) { setArr(KEY_ACTIVITIES, list); }
    function create(data) {
      const sess = K.auth.session();
      if (!sess) return { ok:false, message:"Sila login." };
      const item = {
        id: uid("a"),
        title: String(data.title||"").trim(),
        date: String(data.date||"").trim(),
        time: String(data.time||"").trim(),
        location: String(data.location||"").trim(),
        notes: String(data.notes||"").trim(),
        invites: Array.isArray(data.invites) ? data.invites : [],
        createdBy: sess.email,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        status: "AKTIF"
      };
      if (!item.title || !item.date) return { ok:false, message:"Tajuk & tarikh wajib." };
      const list = all(); list.push(item); save(list);
      K.audit.add("CREATE_ACTIVITY", `${item.title} on ${item.date}`);
      return { ok:true, activity:item };
    }
    function remove(id) {
      const list = all();
      const idx = list.findIndex(a => a.id === id);
      if (idx < 0) return { ok:false, message:"Aktiviti tidak dijumpai." };
      const title = list[idx].title;
      list.splice(idx, 1); save(list);
      K.audit.add("DELETE_ACTIVITY", `${title} (${id})`);
      return { ok:true };
    }
    function byDate(date) { return all().filter(a => a.date === date); }
    function recent(limit=10) {
      const list = all().slice().sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0));
      return list.slice(0, limit);
    }
    return { all, create, remove, byDate, recent };
  })();

  K.includes = {
    async loadInto(sel, file, fallbackHtml) {
      const el = document.querySelector(sel);
      if (!el) return;
      try {
        const res = await fetch(file, { cache: "no-store" });
        if (!res.ok) throw new Error("HTTP " + res.status);
        el.innerHTML = await res.text();
      } catch (e) {
        if (fallbackHtml) el.innerHTML = fallbackHtml;
      }
    }
  };

})(window.KBJPS);
