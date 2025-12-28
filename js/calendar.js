(function(){
  "use strict";
  if(!window.KBJPS) return;
  const { dom, ui, auth, users, activities } = window.KBJPS;

  function pad(n){ return String(n).padStart(2,"0"); }
  function ymd(d){ return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; }
  function startOfWeek(d){
    const x = new Date(d);
    const day = x.getDay();
    const diff = (day + 6) % 7;
    x.setDate(x.getDate() - diff);
    x.setHours(0,0,0,0);
    return x;
  }
  function addDays(d,n){ const x=new Date(d); x.setDate(x.getDate()+n); return x; }

  let viewMode="month";
  let cursor=new Date(); cursor.setHours(0,0,0,0);

  function title(){
    const m = cursor.toLocaleString("ms-MY",{month:"long"});
    return viewMode==="month" ? `${m.toUpperCase()} ${cursor.getFullYear()}` :
      `MINGGU ${ymd(startOfWeek(cursor))} → ${ymd(addDays(startOfWeek(cursor),6))}`;
  }

  function shift(n){
    if(viewMode==="month") cursor.setMonth(cursor.getMonth()+n);
    else cursor = addDays(cursor, n*7);
    render();
  }
  function shiftYear(n){ cursor.setFullYear(cursor.getFullYear()+n); render(); }

  function render(){
    document.getElementById("calTitle").textContent = title();
    if(viewMode==="month") renderMonth(); else renderWeek();
    renderRecent();
    document.getElementById("btnToggleView").textContent = viewMode==="month" ? "Paparan Mingguan" : "Paparan Bulanan";
  }

  function renderMonth(){
    const grid=document.getElementById("calGrid"); grid.innerHTML="";
    ["Isn","Sel","Rab","Kha","Jum","Sab","Aha"].forEach(x=>{
      const el=document.createElement("div"); el.className="dow"; el.textContent=x; grid.appendChild(el);
    });
    const y=cursor.getFullYear(), m=cursor.getMonth();
    const first=new Date(y,m,1);
    const firstDow=(first.getDay()+6)%7;
    const start=new Date(y,m,1-firstDow);
    const today=new Date(); today.setHours(0,0,0,0);

    for(let i=0;i<42;i++){
      const d=addDays(start,i);
      const cell=document.createElement("div"); cell.className="day";
      if(d.getMonth()!==m) cell.style.opacity="0.45";
      if(d.getTime()===today.getTime()) cell.classList.add("today");

      const num=document.createElement("div"); num.className="num"; num.textContent=d.getDate(); cell.appendChild(num);

      activities.byDate(ymd(d)).slice(0,3).forEach(a=>{
        const ev=document.createElement("div"); ev.className="ev";
        ev.innerHTML=`<b>${dom.esc(a.title)}</b><small>${dom.esc(a.time||"")} ${dom.esc(a.location||"")}</small>`;
        ev.addEventListener("click",(e)=>{e.stopPropagation(); openView(a.id);});
        cell.appendChild(ev);
      });

      cell.addEventListener("click",()=>openCreate({date: ymd(d)}));
      grid.appendChild(cell);
    }
  }

  function renderWeek(){
    const grid=document.getElementById("calGrid"); grid.innerHTML="";
    ["Isn","Sel","Rab","Kha","Jum","Sab","Aha"].forEach(x=>{
      const el=document.createElement("div"); el.className="dow"; el.textContent=x; grid.appendChild(el);
    });
    const start=startOfWeek(cursor);
    const today=new Date(); today.setHours(0,0,0,0);
    for(let i=0;i<7;i++){
      const d=addDays(start,i);
      const cell=document.createElement("div"); cell.className="day";
      if(d.getTime()===today.getTime()) cell.classList.add("today");
      const num=document.createElement("div"); num.className="num"; num.textContent=`${d.getDate()} (${ymd(d)})`; cell.appendChild(num);

      activities.byDate(ymd(d)).forEach(a=>{
        const ev=document.createElement("div"); ev.className="ev";
        ev.innerHTML=`<b>${dom.esc(a.title)}</b><small>${dom.esc(a.time||"")} ${dom.esc(a.location||"")}</small>`;
        ev.addEventListener("click",(e)=>{e.stopPropagation(); openView(a.id);});
        cell.appendChild(ev);
      });

      cell.addEventListener("click",()=>openCreate({date: ymd(d)}));
      grid.appendChild(cell);
    }
  }

  function openCreate(preset={}){
    const listUsers = users.all().filter(u => String(u.status||"ACTIVE").toUpperCase()==="ACTIVE");
    const options = listUsers.map(u=>{
      const label = `${u.name} (${u.role}) — ${u.email}`;
      return `<label style="display:flex; gap:10px; align-items:flex-start; margin:8px 0">
        <input type="checkbox" class="invChk" value="${dom.esc(u.email)}" style="margin-top:3px">
        <span>${dom.esc(label)}</span>
      </label>`;
    }).join("");

    const html = `
      <h2>Cipta Aktiviti</h2>
      <p>Admin/Superadmin boleh jemput semua atau pilih pengguna (offline demo).</p>
      <div class="grid">
        <div class="col-6"><div class="field"><label>Tajuk</label><input class="input" id="aTitle"></div></div>
        <div class="col-3"><div class="field"><label>Tarikh</label><input class="input" id="aDate" type="date" value="${dom.esc(preset.date||"")}"></div></div>
        <div class="col-3"><div class="field"><label>Masa</label><input class="input" id="aTime" type="time"></div></div>
        <div class="col-6"><div class="field"><label>Lokasi</label><input class="input" id="aLoc"></div></div>
        <div class="col-6"><div class="field"><label>Catatan</label><input class="input" id="aNotes"></div></div>

        <div class="col-12">
          <div class="field"><label>Jemputan pengguna</label>
            <div class="card" style="padding:14px; background:rgba(0,0,0,.15)">
              <div class="btnrow" style="margin-bottom:10px">
                <button class="btn secondary" type="button" id="invAll">Pilih Semua</button>
                <button class="btn secondary" type="button" id="invNone">Buang</button>
                <span class="pill" id="invCount">0 dipilih</span>
              </div>
              <div style="max-height:240px; overflow:auto; padding-right:6px">
                ${options || "<small>Tiada user ACTIVE. Gunakan User Management untuk ACTIVE-kan STAFF.</small>"}
              </div>
            </div>
          </div>
        </div>
      </div>
      <hr class="sep">
      <div class="btnrow">
        <button class="btn" type="button" id="btnSaveAct">Simpan</button>
        <button class="btn danger" type="button" id="btnCloseModal">Tutup</button>
      </div>
    `;
    ui.openModal(html);

    const invChks = dom.qsa(".invChk");
    const invCount = document.getElementById("invCount");
    const update = ()=> invCount.textContent = `${invChks.filter(c=>c.checked).length} dipilih`;
    invChks.forEach(c=>c.addEventListener("change", update));
    update();

    document.getElementById("invAll")?.addEventListener("click", ()=>{ invChks.forEach(c=>c.checked=true); update(); });
    document.getElementById("invNone")?.addEventListener("click", ()=>{ invChks.forEach(c=>c.checked=false); update(); });
    document.getElementById("btnCloseModal")?.addEventListener("click", ()=> ui.closeModal());

    document.getElementById("btnSaveAct")?.addEventListener("click", ()=>{
      const title=document.getElementById("aTitle").value.trim();
      const date=document.getElementById("aDate").value.trim();
      const time=document.getElementById("aTime").value.trim();
      const location=document.getElementById("aLoc").value.trim();
      const notes=document.getElementById("aNotes").value.trim();
      const invites=invChks.filter(c=>c.checked).map(c=>c.value);

      const res=activities.create({ title, date, time, location, notes, invites });
      if(!res.ok){ ui.toast(res.message||"Gagal.", "err"); return; }
      ui.toast("Aktiviti disimpan.", "ok");
      ui.closeModal(); render();
    });
  }

  function openView(id){
    const a=activities.all().find(x=>x.id===id);
    if(!a){ ui.toast("Aktiviti tidak dijumpai.", "err"); return; }
    const inviteLabels=(a.invites||[]).map(e=>{
      const u=users.find(e);
      return u ? `${u.name} (${u.role})` : e;
    });

    const html=`
      <h2>Butiran Aktiviti</h2>
      <div class="grid">
        <div class="col-6"><div class="kpi"><small>Tajuk</small><b>${dom.esc(a.title)}</b></div></div>
        <div class="col-3"><div class="kpi"><small>Tarikh</small><b>${dom.esc(a.date)}</b></div></div>
        <div class="col-3"><div class="kpi"><small>Masa</small><b>${dom.esc(a.time||"-")}</b></div></div>
        <div class="col-6"><div class="kpi"><small>Lokasi</small><b>${dom.esc(a.location||"-")}</b></div></div>
        <div class="col-6"><div class="kpi"><small>Dicipta oleh</small><b>${dom.esc(a.createdBy||"-")}</b></div></div>
        <div class="col-12"><div class="kpi"><small>Catatan</small><b style="font-size:14px; font-weight:700">${dom.esc(a.notes||"-")}</b></div></div>
        <div class="col-12"><div class="kpi"><small>Jemputan</small><div style="margin-top:8px;color:var(--muted)">${inviteLabels.length? inviteLabels.map(dom.esc).join("<br>"):"Tiada"}</div></div></div>
      </div>
      <hr class="sep">
      <div class="btnrow">
        <button class="btn danger" type="button" id="btnDel">Padam</button>
        <button class="btn secondary" type="button" id="btnClose">Tutup</button>
      </div>
    `;
    ui.openModal(html);
    document.getElementById("btnClose")?.addEventListener("click", ()=> ui.closeModal());
    document.getElementById("btnDel")?.addEventListener("click", ()=>{
      if(!confirm("Padam aktiviti ini?")) return;
      const r=activities.remove(id);
      if(!r.ok){ ui.toast(r.message||"Gagal.", "err"); return; }
      ui.toast("Aktiviti dipadam.", "ok");
      ui.closeModal(); render();
    });
  }

  function renderRecent(){
    const box=document.getElementById("recentBox");
    if(!box) return;
    const list=activities.recent(10);
    if(!list.length){ box.innerHTML=`<div class="kpi"><small>Aktiviti terkini</small><b>Tiada.</b></div>`; return; }
    box.innerHTML = list.map(a=>`
      <div class="ev" style="cursor:pointer" data-id="${dom.esc(a.id)}">
        <b>${dom.esc(a.title)}</b>
        <small>${dom.esc(a.date)} ${dom.esc(a.time||"")} • ${dom.esc(a.location||"")}</small>
      </div>
    `).join("");
    dom.qsa(".ev[data-id]", box).forEach(el=> el.addEventListener("click", ()=> openView(el.getAttribute("data-id"))));
  }

  function mount(){
    auth.requireAuth("./index.html");
    render();
    document.getElementById("btnPrev")?.addEventListener("click", ()=>shift(-1));
    document.getElementById("btnNext")?.addEventListener("click", ()=>shift(1));
    document.getElementById("btnPrevYear")?.addEventListener("click", ()=>shiftYear(-1));
    document.getElementById("btnNextYear")?.addEventListener("click", ()=>shiftYear(1));
    document.getElementById("btnToggleView")?.addEventListener("click", ()=>{ viewMode=viewMode==="month"?"week":"month"; render(); });
    document.getElementById("btnCreate")?.addEventListener("click", ()=>openCreate());
    document.getElementById("btnBackDash")?.addEventListener("click", ()=>location.href="./menu.html");
  }

  document.addEventListener("DOMContentLoaded", mount);
})();
