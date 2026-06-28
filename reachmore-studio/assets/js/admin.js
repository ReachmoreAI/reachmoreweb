/* ============================================================
   Reachmore Admin — manage users, billing, plans, domains, team.
   Backed entirely by window.RM (store). Admin/employee only.
   ============================================================ */
(function () {
  const RM = window.RM;
  const $ = (s, r) => (r || document).querySelector(s);
  const app = $('#app');
  let section = 'overview', query = '';

  const I = {
    chart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>',
    users: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="8" r="3.2"/><path d="M3 20a6 6 0 0112 0M16 5.5a3 3 0 010 5.8M21 20a6 6 0 00-5-5.9"/></svg>',
    globe: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/></svg>',
    team: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="3.4"/><path d="M5 21a7 7 0 0114 0"/></svg>',
    log: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 5h16M4 12h16M4 19h10"/></svg>',
    money: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v10M9.5 9.5a2.5 2 0 012.5-1.5c1.4 0 2.5.7 2.5 1.8 0 2.4-5 1.4-5 3.8 0 1.1 1.1 1.9 2.5 1.9a2.6 2 0 002.5-1.4"/></svg>',
    shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z"/></svg>',
    spark: '<svg viewBox="0 0 24 24" fill="none"><path d="M12 3l1.6 5.4L19 10l-5.4 1.6L12 17l-1.6-5.4L5 10l5.4-1.6L12 3z" fill="currentColor"/></svg>'
  };
  const initials = u => (u.name || u.email || '?').split(/[ @.]/).filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const tk = n => window.RMTokens ? window.RMTokens.fmt(n) : n;
  const kr = n => n.toLocaleString('da-DK') + ' kr';
  const date = ts => new Date(ts).toLocaleDateString('da-DK', { day: '2-digit', month: 'short', year: 'numeric' });
  const planBadge = p => { const m = p ? RM.PLANS[p] : RM.PLANS.free; return `<span class="pbadge" style="background:${m.color}">${m.name}</span>`; };

  let built = null; // 'panel' | 'denied'
  function ensureShell() {
    const admin = RM.isAdmin();
    const want = admin ? 'panel' : 'denied';
    if (built === want) { if (admin) { updateNav(); renderSection(); } return; }
    built = want;
    if (!admin) { renderDenied(); return; }
    app.innerHTML = `
      <div class="adm">
        <aside class="adm-side">
          <div class="brand"><img src="assets/img/reachmore-logo.png" alt="Reachmore"><span class="tag">ADMIN</span></div>
          <nav class="adm-nav">
            <a data-sec="overview">${I.chart}<span>Overblik</span></a>
            <a data-sec="users">${I.users}<span>Brugere</span></a>
            <a data-sec="domains">${I.globe}<span>Domæner</span></a>
            <a data-sec="team">${I.team}<span>Medarbejdere</span></a>
            <a data-sec="log">${I.log}<span>Aktivitet</span></a>
          </nav>
          <div class="foot">
            <a href="index.html">← Til website</a>
            <a href="studio.html">Åbn Studio</a>
            <a data-logout style="cursor:pointer">Log ud</a>
          </div>
        </aside>
        <main class="adm-main">
          <header class="adm-top">
            <h1 id="secTitle"></h1>
            <input class="search" id="search" placeholder="Søg…">
            <div id="admAcct"></div>
          </header>
          <div class="adm-content" id="admContent"></div>
        </main>
      </div>`;
    app.querySelectorAll('.adm-nav a').forEach(a => a.onclick = () => { section = a.dataset.sec; query = ''; const s = $('#search'); if (s) s.value = ''; updateNav(); renderSection(); });
    app.querySelector('[data-logout]').onclick = () => { RM.logout(); };
    const search = $('#search'); search.oninput = () => { query = search.value.toLowerCase(); renderSection(); };
    if (window.RMAuth) window.RMAuth.mountAccount($('#admAcct'));
    updateNav(); renderSection();
  }
  function updateNav() { app.querySelectorAll('.adm-nav a').forEach(a => a.classList.toggle('on', a.dataset.sec === section)); }

  function renderDenied() {
    app.innerHTML = `<div class="denied"><div class="box">
      <div class="lock">${I.shield}</div>
      <h1>Kun for administratorer</h1>
      <p>Du skal logge ind med en administrator-konto for at se admin-panelet.</p>
      <button class="btn btn-primary" id="al">Log ind som admin</button>
      <p style="margin-top:16px;font-size:13px;color:var(--text-faint)">Demo: <b>admin@reachmore.dk</b> / <b>admin123</b></p>
      <p style="margin-top:8px"><a href="index.html" style="color:var(--accent)">← Tilbage til forsiden</a></p>
    </div></div>`;
    $('#al').onclick = () => window.RMAuth.open('login');
  }

  const TITLES = { overview: 'Overblik', users: 'Brugere', domains: 'Domæner', team: 'Medarbejdere', log: 'Aktivitetslog' };
  function renderSection() {
    const title = $('#secTitle'); if (title) title.textContent = TITLES[section];
    const c = $('#admContent'); if (!c) return;
    if (section === 'overview') { c.innerHTML = viewOverview(); const g = c.querySelector('#goUsers'); if (g) g.onclick = () => { section = 'users'; updateNav(); renderSection(); }; }
    else if (section === 'users') { c.innerHTML = viewUsers(); wireUsers(c); }
    else if (section === 'domains') { c.innerHTML = viewDomains(); wireDomains(c); }
    else if (section === 'team') { c.innerHTML = viewTeam(); wireUsers(c); }
    else if (section === 'log') c.innerHTML = viewLog();
  }

  /* ---------- Overview ---------- */
  function viewOverview() {
    const s = RM.stats();
    const recent = RM.listUsers().slice().sort((a, b) => b.createdAt - a.createdAt).slice(0, 6);
    return `
      <div class="stat-grid">
        <div class="stat"><div class="k">${I.users} Brugere</div><div class="v">${s.users}</div><div class="sub">${s.free} gratis · ${s.paying} betalende</div></div>
        <div class="stat"><div class="k">${I.money} MRR</div><div class="v">${kr(s.mrr)}</div><div class="sub">ARR ≈ ${kr(s.arr)}</div></div>
        <div class="stat"><div class="k">${I.spark} Betalende</div><div class="v">${s.paying}</div><div class="sub">Start ${s.byPlan.start} · Pro ${s.byPlan.pro} · Business ${s.byPlan.business}</div></div>
        <div class="stat"><div class="k">${I.globe} Domæner</div><div class="v">${s.domains}</div><div class="sub">.reachmore.dk + custom</div></div>
        <div class="stat"><div class="k">${I.team} Medarbejdere</div><div class="v">${s.employees}</div><div class="sub">admin + support</div></div>
        <div class="stat"><div class="k">${I.shield} Spærrede</div><div class="v">${s.suspended}</div><div class="sub">konti på pause</div></div>
      </div>
      <div class="panel-card">
        <div class="ph"><h3>Nyeste brugere</h3><a class="mini" id="goUsers">Se alle →</a></div>
        <table class="tbl"><thead><tr><th>Bruger</th><th>Plan</th><th>Tokens</th><th>Oprettet</th></tr></thead><tbody>
        ${recent.map(u => `<tr><td><div class="u-cell"><div class="av">${initials(u)}</div><div><b>${esc(u.name)}</b><span>${esc(u.email)}</span></div></div></td><td>${planBadge(u.plan)}</td><td>${tk(u.tokens)}</td><td>${date(u.createdAt)}</td></tr>`).join('')}
        </tbody></table>
      </div>`;
  }

  /* ---------- Users ---------- */
  function userRows(list) {
    if (!list.length) return `<tr><td colspan="6"><div class="adm-empty">Ingen brugere fundet</div></td></tr>`;
    return list.map(u => `<tr data-id="${u.id}">
      <td><div class="u-cell"><div class="av">${initials(u)}</div><div><b>${esc(u.name)} ${u.provider !== 'email' ? `<span class="rbadge">${u.provider}</span>` : ''}</b><span>${esc(u.email)}</span></div></div></td>
      <td><select class="inline-sel" data-plan>
        <option value="free" ${!u.plan ? 'selected' : ''}>Gratis</option>
        <option value="start" ${u.plan === 'start' ? 'selected' : ''}>Start · 99</option>
        <option value="pro" ${u.plan === 'pro' ? 'selected' : ''}>Pro · 199</option>
        <option value="business" ${u.plan === 'business' ? 'selected' : ''}>Business · 399</option>
      </select></td>
      <td><div style="display:flex;align-items:center;gap:6px">${I.spark} ${tk(u.tokens)} <button class="mini" data-addtok title="Tilføj 25.000 tokens">+25k</button></div></td>
      <td><select class="inline-sel" data-role>
        <option value="user" ${u.role === 'user' ? 'selected' : ''}>Bruger</option>
        <option value="employee" ${u.role === 'employee' ? 'selected' : ''}>Medarbejder</option>
        <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Admin</option>
      </select></td>
      <td><span class="sbadge ${u.status}">${u.status === 'active' ? 'Aktiv' : 'Spærret'}</span></td>
      <td><div class="row-acts">
        <button class="mini" data-toggle>${u.status === 'active' ? 'Spær' : 'Aktivér'}</button>
        <button class="mini danger" data-del>Slet</button>
      </div></td>
    </tr>`).join('');
  }
  function viewUsers() {
    const list = filterUsers();
    return `<div class="panel-card">
      <div class="ph"><h3>Alle brugere (${list.length})</h3><span class="muted" style="font-size:13px">Skift plan, tokens, rolle & status live</span></div>
      <div style="overflow-x:auto"><table class="tbl"><thead><tr><th>Bruger</th><th>Plan / abonnement</th><th>AI-tokens</th><th>Rolle</th><th>Status</th><th>Handlinger</th></tr></thead>
      <tbody>${userRows(list)}</tbody></table></div></div>`;
  }
  function filterUsers() {
    let list = RM.listUsers().slice().sort((a, b) => b.createdAt - a.createdAt);
    if (query) list = list.filter(u => (u.name + ' ' + u.email + ' ' + (u.plan || 'gratis')).toLowerCase().includes(query));
    return list;
  }
  function wireUsers(c) {
    c.querySelectorAll('tr[data-id]').forEach(tr => {
      const id = tr.dataset.id;
      const pl = tr.querySelector('[data-plan]'); if (pl) pl.onchange = () => RM.setPlan(id, pl.value);
      const rl = tr.querySelector('[data-role]'); if (rl) rl.onchange = () => RM.setRole(id, rl.value);
      const at = tr.querySelector('[data-addtok]'); if (at) at.onclick = () => RM.addTokens(id, 25000);
      const tg = tr.querySelector('[data-toggle]'); if (tg) tg.onclick = () => { const u = RM.getUser(id); RM.setStatus(id, u.status === 'active' ? 'suspended' : 'active'); };
      const dl = tr.querySelector('[data-del]'); if (dl) dl.onclick = () => { const u = RM.getUser(id); if (confirm('Slet ' + u.email + '? Dette kan ikke fortrydes.')) RM.deleteUser(id); };
    });
    const g = c.querySelector('#goUsers'); if (g) g.onclick = () => { section = 'users'; render(); };
  }

  /* ---------- Domains ---------- */
  function viewDomains() {
    let list = RM.listDomains().slice().sort((a, b) => b.createdAt - a.createdAt);
    if (query) list = list.filter(d => d.host.toLowerCase().includes(query));
    const users = RM.listUsers();
    const opts = users.map(u => `<option value="${u.id}">${esc(u.name)} (${esc(u.email)})</option>`).join('');
    const rows = list.length ? list.map(d => {
      const u = RM.getUser(d.userId);
      return `<tr data-id="${d.id}">
        <td><b style="font-family:var(--display);font-weight:700">${esc(d.host)}</b></td>
        <td><span class="rbadge">${d.kind === 'subdomain' ? '.reachmore.dk' : 'eget domæne'}</span></td>
        <td>${u ? `<div class="u-cell"><div class="av">${initials(u)}</div><div><b>${esc(u.name)}</b><span>${esc(u.email)}</span></div></div>` : '<span class="muted">—</span>'}</td>
        <td><span class="sbadge ${d.status === 'active' ? 'active' : 'suspended'}">${d.status === 'active' ? 'Aktiv' : 'Afventer'}</span></td>
        <td><div class="row-acts">${d.status === 'pending' ? '<button class="mini" data-approve>Godkend</button>' : '<button class="mini" data-pend>Sæt på pause</button>'}<button class="mini danger" data-rem>Fjern</button></div></td>
      </tr>`;
    }).join('') : `<tr><td colspan="5"><div class="adm-empty">Ingen domæner fundet</div></td></tr>`;
    return `<div class="panel-card">
      <div class="ph"><h3>Opret domæne</h3></div>
      <div class="add-form">
        <div class="fg"><label>Bruger</label><select id="dUser">${opts}</select></div>
        <div class="fg"><label>.reachmore.dk subdomæne</label><input id="dLabel" placeholder="fx mitfirma"></div>
        <button class="btn btn-primary" id="dSub">Opret subdomæne</button>
        <div class="fg"><label>Eller eget domæne</label><input id="dCustom" placeholder="fx mitfirma.dk"></div>
        <button class="btn btn-ghost" id="dAdd">Tilknyt domæne</button>
      </div>
    </div>
    <div class="panel-card">
      <div class="ph"><h3>Alle domæner (${list.length})</h3></div>
      <div style="overflow-x:auto"><table class="tbl"><thead><tr><th>Domæne</th><th>Type</th><th>Ejer</th><th>Status</th><th>Handlinger</th></tr></thead><tbody>${rows}</tbody></table></div>
    </div>`;
  }
  function wireDomains(c) {
    const user = () => c.querySelector('#dUser').value;
    c.querySelector('#dSub').onclick = () => { const l = c.querySelector('#dLabel').value.trim(); if (!l) return; RM.addSubdomain(user(), l); };
    c.querySelector('#dAdd').onclick = () => { const h = c.querySelector('#dCustom').value.trim(); if (!h) return; const r = RM.addCustomDomain(user(), h); if (r.error) alert(r.error); };
    c.querySelectorAll('tr[data-id]').forEach(tr => {
      const id = tr.dataset.id;
      const ap = tr.querySelector('[data-approve]'); if (ap) ap.onclick = () => RM.setDomainStatus(id, 'active');
      const pe = tr.querySelector('[data-pend]'); if (pe) pe.onclick = () => RM.setDomainStatus(id, 'pending');
      const rm = tr.querySelector('[data-rem]'); if (rm) rm.onclick = () => { if (confirm('Fjern domæne?')) RM.removeDomain(id); };
    });
  }

  /* ---------- Team ---------- */
  function viewTeam() {
    const team = RM.listUsers().filter(u => u.role === 'admin' || u.role === 'employee');
    const list = query ? team.filter(u => (u.name + ' ' + u.email).toLowerCase().includes(query)) : team;
    return `<div class="panel-card">
      <div class="ph"><h3>Medarbejdere & administratorer (${list.length})</h3><span class="muted" style="font-size:13px">Skift rolle for at give/fjerne admin-adgang</span></div>
      <div style="overflow-x:auto"><table class="tbl"><thead><tr><th>Person</th><th>Plan</th><th>Tokens</th><th>Rolle</th><th>Status</th><th>Handlinger</th></tr></thead>
      <tbody>${userRows(list)}</tbody></table></div></div>
      <p class="muted" style="font-size:13.5px;margin-top:4px">💡 Vil du gøre en almindelig bruger til medarbejder? Find dem under <b>Brugere</b> og skift deres rolle.</p>`;
  }

  /* ---------- Log ---------- */
  function viewLog() {
    const a = RM.audit();
    return `<div class="panel-card"><div class="ph"><h3>Aktivitet (${a.length})</h3></div>
      ${a.length ? a.map(x => `<div class="log-item"><span class="t">${new Date(x.ts).toLocaleString('da-DK')}</span><span class="a">${esc(x.action)}</span><span>${esc(x.detail || '')} <span class="muted">· ${esc(x.actor)}</span></span></div>`).join('') : '<div class="adm-empty">Ingen aktivitet endnu</div>'}
    </div>`;
  }

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

  RM.on(ensureShell);
  ensureShell();
})();
