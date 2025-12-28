(function () {
  "use strict";
  if (!window.KBJPS) return;

  const { dom, ui, auth, users, seed, includes } = window.KBJPS;

  function pageName() {
    return ((location.pathname || "").split("/").pop() || "index.html").toLowerCase();
  }
  function isPublic(p) {
    return ["index.html", "", "register.html", "reset-password.html"].includes(p);
  }

  async function loadHeaderFooter() {
    const fallbackHeader = `
      <div class="headerbar"><div class="headerinner">
        <div class="brand"><img src="./assets/logo-jps.png" alt="Logo"><div>
          <div class="title">KB-JPS</div><div class="sub">Sistem Kalendar Bersepadu</div>
        </div></div>
        <div class="nav">
          <a href="./menu.html">Dashboard</a>
          <a href="./calendar.html">Kalendar</a>
          <a href="./audit.html">Audit</a>
          <a href="./profile.html">Profil</a>
          <button class="btn secondary" data-logout type="button">LOGOUT</button>
          <div class="userpill"><div><div style="font-weight:800" id="currentUserName">—</div><small id="currentUserRole">—</small></div></div>
        </div>
      </div></div>`;
    await includes.loadInto("#header", "./header.html", fallbackHeader);
    await includes.loadInto("#footer", "./footer.html", "");
  }

  function wireLogout() {
    dom.qsa("[data-logout]").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        auth.logout("./index.html");
      });
    });
  }

  function fillUserPill() {
    const s = auth.session();
    if (!s) return;
    const n = document.getElementById("currentUserName");
    const r = document.getElementById("currentUserRole");
    if (n) n.textContent = s.name || s.email;
    if (r) r.textContent = (s.role || "").toUpperCase();
  }

  function protect() {
    const p = pageName();
    if (isPublic(p)) return;
    auth.requireAuth("./index.html");
  }

  function initLogin() {
    const form = document.getElementById("loginForm");
    if (!form) return;

    seed.run(false);

    document.getElementById("btnFixLogin")?.addEventListener("click", (e) => {
      e.preventDefault();
      seed.run(true);
      ui.toast("Reset Data siap. Login: superadmin@superadmin.com / 123456", "ok");
      setTimeout(()=>location.reload(), 400);
    });

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const email = document.getElementById("email")?.value || "";
      const password = document.getElementById("password")?.value || "";
      const res = auth.loginLocal(email, password);
      if (!res.ok) { ui.toast(res.message || "Login gagal.", "err"); return; }
      ui.toast("Berjaya log masuk.", "ok");
      const url = new URL(location.href);
      location.href = url.searchParams.get("next") || "./menu.html";
    });

    document.getElementById("toRegister")?.addEventListener("click", (e)=>{ e.preventDefault(); location.href="./register.html"; });
    document.getElementById("toReset")?.addEventListener("click", (e)=>{ e.preventDefault(); location.href="./reset-password.html"; });
  }

  function initRegister() {
    if (pageName() !== "register.html") return;
    seed.run(false);

    const form = document.getElementById("registerForm");
    if (!form) return;

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = document.getElementById("name")?.value || "";
      const email = document.getElementById("email")?.value || "";
      const password = document.getElementById("password")?.value || "";
      const r = users.create({ name, email, password });
      if (!r.ok) { ui.toast(r.message || "Daftar gagal.", "err"); return; }
      ui.toast("Berjaya daftar. Akaun PENDING. Admin/Superadmin perlu ACTIVE-kan.", "ok");
      setTimeout(()=>location.href="./index.html", 900);
    });

    document.getElementById("btnBack")?.addEventListener("click", (e)=>{ e.preventDefault(); location.href="./index.html"; });
  }

  function initResetPassword() {
    if (pageName() !== "reset-password.html") return;
    seed.run(false);

    const form = document.getElementById("resetForm");
    if (!form) return;

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const email = document.getElementById("email")?.value || "";
      const newPassword = document.getElementById("newPassword")?.value || "";
      const r = users.resetPassword(email, newPassword);
      if (!r.ok) { ui.toast(r.message || "Reset gagal.", "err"); return; }
      ui.toast("Reset berjaya. Sila login.", "ok");
      setTimeout(()=>location.href="./index.html", 800);
    });

    document.getElementById("btnBack")?.addEventListener("click", (e)=>{ e.preventDefault(); location.href="./index.html"; });
  }

  document.addEventListener("DOMContentLoaded", async () => {
    seed.run(false);
    await loadHeaderFooter();
    protect();
    wireLogout();
    fillUserPill();
    initLogin();
    initRegister();
    initResetPassword();
  });

})();
