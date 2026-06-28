/* ============================================================
   Reachmore Store — single source of truth for the whole app
   Users, sessions, plans, tokens, domains, employees, audit.
   localStorage-backed (demo). window.RM
   NOTE: This is a client-side demo. A production version would
   move auth, billing and DNS to a secure backend.
   ============================================================ */
(function () {
  const KEY = 'rm-app-v2';

  const PLANS = {
    free:     { key: 'free',     name: 'Gratis',   price: 0,   tokens: 1500,    publish: 0,        color: '#6b7280' },
    start:    { key: 'start',    name: 'Start',    price: 99,  tokens: 50000,   publish: 1,        color: '#f97316' },
    pro:      { key: 'pro',      name: 'Pro',      price: 199, tokens: 200000,  publish: Infinity, color: '#8b5cf6' },
    business: { key: 'business', name: 'Business', price: 399, tokens: 1000000, publish: Infinity, color: '#ec4899' }
  };
  const COSTS = { generate: 250, section: 60, rewrite: 50 };

  const uid = (p) => (p || 'id') + '_' + Math.random().toString(36).slice(2, 9);
  const now = () => Date.now();
  const slug = s => (s || '').toLowerCase().replace(/æ/g, 'ae').replace(/ø/g, 'oe').replace(/å/g, 'aa').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30);
  const hash = s => { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0; return 'h' + h.toString(36); };

  let data = load();
  const listeners = [];

  function seed() {
    const mk = (o) => Object.assign({ id: uid('usr'), provider: 'email', role: 'user', plan: null, tokens: PLANS.free.tokens, status: 'active', createdAt: now() - Math.floor(Math.random() * 9e9), lastLogin: now() - Math.floor(Math.random() * 8e8), domains: [], note: '' }, o);
    const users = [
      mk({ name: 'Marcus', email: 'marcushnn21@gmail.com', pass: hash('mivs1232'), role: 'admin', plan: 'business', tokens: PLANS.business.tokens }),
      mk({ name: 'Admin', email: 'admin@reachmore.dk', pass: hash('admin123'), role: 'admin', plan: 'business', tokens: PLANS.business.tokens }),
      mk({ name: 'Emma Sørensen', email: 'emma@reachmore.dk', pass: hash('emma123'), role: 'employee', plan: 'business', tokens: 500000 }),
      mk({ name: 'Mette Krøyer', email: 'mette@solhjornet.dk', pass: hash('test1234'), plan: 'pro', tokens: 142300 }),
      mk({ name: 'Jonas Berg', email: 'jonas@bergdesign.dk', pass: hash('test1234'), plan: 'start', tokens: 38120 }),
      mk({ name: 'Sofie Lund', email: 'sofie@glowstudio.dk', pass: hash('test1234'), plan: null, tokens: 3400, provider: 'google' }),
      mk({ name: 'Anders Holm', email: 'anders@nordiskbyg.dk', pass: hash('test1234'), plan: 'business', tokens: 870500 }),
      mk({ name: 'Lars Nielsen', email: 'lars@example.dk', pass: hash('test1234'), plan: null, tokens: 0, status: 'suspended', provider: 'facebook' }),
      mk({ name: 'Camilla Vntz', email: 'camilla@vega.dk', pass: hash('test1234'), plan: 'pro', tokens: 188000 })
    ];
    const byEmail = e => users.find(u => u.email === e);
    const domains = [
      { id: uid('dom'), host: 'solhjornet.reachmore.dk', kind: 'subdomain', userId: byEmail('mette@solhjornet.dk').id, status: 'active', createdAt: now() - 5e8 },
      { id: uid('dom'), host: 'solhjornet.dk', kind: 'custom', userId: byEmail('mette@solhjornet.dk').id, status: 'active', createdAt: now() - 4e8 },
      { id: uid('dom'), host: 'bergdesign.reachmore.dk', kind: 'subdomain', userId: byEmail('jonas@bergdesign.dk').id, status: 'active', createdAt: now() - 3e8 },
      { id: uid('dom'), host: 'nordiskbyg.reachmore.dk', kind: 'subdomain', userId: byEmail('anders@nordiskbyg.dk').id, status: 'active', createdAt: now() - 2e8 },
      { id: uid('dom'), host: 'vega.reachmore.dk', kind: 'subdomain', userId: byEmail('camilla@vega.dk').id, status: 'pending', createdAt: now() - 1e8 }
    ];
    return { v: 1, users, domains, projects: [], audit: [{ id: uid('a'), ts: now(), actor: 'system', action: 'seed', detail: 'Demo-data oprettet' }], session: { userId: null }, guest: { tokens: PLANS.free.tokens, plan: null } };
  }

  function load() {
    try { const d = JSON.parse(localStorage.getItem(KEY)); if (d && d.users) { if (!d.projects) d.projects = []; return d; } } catch (e) {}
    const s = seed(); try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} return s;
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) {} notify(); }
  function notify() { listeners.forEach(f => { try { f(data); } catch (e) {} }); }
  function on(f) { listeners.push(f); return () => { const i = listeners.indexOf(f); if (i >= 0) listeners.splice(i, 1); }; }

  function log(action, detail) { data.audit.unshift({ id: uid('a'), ts: now(), actor: (currentUser() || {}).email || 'guest', action, detail }); if (data.audit.length > 200) data.audit.pop(); }

  /* ---------- Session / auth ---------- */
  function currentUser() { return data.session.userId ? data.users.find(u => u.id === data.session.userId) || null : null; }
  function isLoggedIn() { return !!currentUser(); }
  function isAdmin() { const u = currentUser(); return !!u && (u.role === 'admin' || u.role === 'employee'); }

  function signup({ name, email, pass }) {
    email = (email || '').trim().toLowerCase();
    if (!name || !email || !pass) return { error: 'Udfyld venligst alle felter.' };
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: 'Indtast en gyldig e-mail.' };
    if (pass.length < 6) return { error: 'Adgangskoden skal være mindst 6 tegn.' };
    if (data.users.some(u => u.email === email)) return { error: 'Der findes allerede en bruger med denne e-mail.' };
    const u = { id: uid('usr'), name: name.trim(), email, pass: hash(pass), provider: 'email', role: 'user', plan: null, tokens: PLANS.free.tokens, status: 'active', createdAt: now(), lastLogin: now(), domains: [], note: '' };
    data.users.push(u); data.session.userId = u.id; log('signup', email); save();
    return { ok: true, user: u };
  }
  function login(email, pass) {
    email = (email || '').trim().toLowerCase();
    const u = data.users.find(x => x.email === email);
    if (!u) return { error: 'Ingen bruger med denne e-mail.' };
    if (u.pass !== hash(pass)) return { error: 'Forkert adgangskode.' };
    if (u.status === 'suspended') return { error: 'Din konto er midlertidigt spærret. Kontakt support.' };
    u.lastLogin = now(); data.session.userId = u.id; log('login', email); save();
    return { ok: true, user: u };
  }
  function loginProvider(provider) {
    // Simulated social login (no real OAuth without a backend + app credentials)
    const names = ['Alex Jensen', 'Maja Holm', 'Noah Berg', 'Ida Lund', 'Oscar Vinter', 'Freja Krag'];
    const name = names[Math.floor(Math.random() * names.length)];
    const email = slug(name) + '@' + (provider === 'google' ? 'gmail.com' : 'facebook-user.dk');
    let u = data.users.find(x => x.email === email);
    if (!u) { u = { id: uid('usr'), name, email, pass: hash(uid('p')), provider, role: 'user', plan: null, tokens: PLANS.free.tokens, status: 'active', createdAt: now(), lastLogin: now(), domains: [], note: '' }; data.users.push(u); }
    u.lastLogin = now(); data.session.userId = u.id; log('login_' + provider, email); save();
    return { ok: true, user: u };
  }
  function logout() { log('logout'); data.session.userId = null; save(); }

  /* ---------- Tokens ---------- */
  function pool() { return currentUser() || data.guest; }
  function tokens() { return pool().tokens; }
  function plan() { const u = currentUser(); return u ? u.plan : null; }
  function planMeta() { const p = plan(); return p ? PLANS[p] : PLANS.free; }
  function poolMax() { const p = plan(); return p ? PLANS[p].tokens : PLANS.free.tokens; }
  function canPublish() { const u = currentUser(); return !!u && !!u.plan; }
  function spendTokens(n) { n = n || 0; const p = pool(); if (p.tokens >= n) { p.tokens -= n; save(); return true; } return false; }
  function addTokens(userId, n) { const u = userId ? data.users.find(x => x.id === userId) : pool(); if (u) { u.tokens += n; log('add_tokens', (u.email || 'guest') + ' +' + n); save(); } }

  /* ---------- Plans (billing) ---------- */
  function setPlan(userId, planKey) {
    const u = userId ? data.users.find(x => x.id === userId) : currentUser();
    if (!u) return { error: 'Log ind for at opgradere.' };
    const pl = PLANS[planKey];
    if (!pl) return { error: 'Ukendt plan.' };
    const prev = u.plan;
    u.plan = planKey === 'free' ? null : planKey;
    if (planKey !== 'free') u.tokens = Math.max(u.tokens, 0) + pl.tokens;
    // auto-give a subdomain on first paid plan
    if (planKey !== 'free' && !prev && !data.domains.some(d => d.userId === u.id)) {
      data.domains.push({ id: uid('dom'), host: slug(u.name || u.email.split('@')[0]) + '.reachmore.dk', kind: 'subdomain', userId: u.id, status: 'active', createdAt: now() });
    }
    log('plan_change', (u.email) + ': ' + (prev || 'gratis') + ' → ' + (u.plan || 'gratis'));
    save(); return { ok: true, user: u };
  }

  /* ---------- Admin ops ---------- */
  function listUsers() { return data.users.slice(); }
  function getUser(id) { return data.users.find(u => u.id === id) || null; }
  function setRole(id, role) { const u = getUser(id); if (u) { u.role = role; log('set_role', u.email + ' → ' + role); save(); } }
  function setStatus(id, status) { const u = getUser(id); if (u) { u.status = status; log('set_status', u.email + ' → ' + status); save(); } }
  function deleteUser(id) { const u = getUser(id); if (u) { data.users = data.users.filter(x => x.id !== id); data.domains = data.domains.filter(d => d.userId !== id); log('delete_user', u.email); save(); } }
  function updateUser(id, patch) { const u = getUser(id); if (u) { Object.assign(u, patch); log('update_user', u.email); save(); } }

  /* ---------- Domains ---------- */
  function listDomains() { return data.domains.slice(); }
  function userDomains(id) { return data.domains.filter(d => d.userId === id); }
  function addSubdomain(userId, label) {
    let host = slug(label) + '.reachmore.dk';
    if (data.domains.some(d => d.host === host)) host = slug(label) + '-' + Math.floor(Math.random() * 99) + '.reachmore.dk';
    const d = { id: uid('dom'), host, kind: 'subdomain', userId, status: 'active', createdAt: now() };
    data.domains.push(d); log('add_subdomain', host); save(); return d;
  }
  function addCustomDomain(userId, host) {
    host = (host || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    if (!host) return { error: 'Indtast et domæne.' };
    if (data.domains.some(d => d.host === host)) return { error: 'Domænet findes allerede.' };
    const d = { id: uid('dom'), host, kind: 'custom', userId, status: 'pending', createdAt: now() };
    data.domains.push(d); log('add_domain', host); save(); return { ok: true, domain: d };
  }
  function setDomainStatus(id, status) { const d = data.domains.find(x => x.id === id); if (d) { d.status = status; log('domain_status', d.host + ' → ' + status); save(); } }
  function removeDomain(id) { const d = data.domains.find(x => x.id === id); if (d) { data.domains = data.domains.filter(x => x.id !== id); log('remove_domain', d.host); save(); } }

  /* ---------- Projects (multi-site) ---------- */
  function listProjects(userId) { const id = userId || (currentUser() || {}).id; return data.projects.filter(p => p.userId === id).sort((a, b) => b.updatedAt - a.updatedAt); }
  function getProject(id) { return data.projects.find(p => p.id === id) || null; }
  function createProject(site) {
    const u = currentUser(); if (!u) return null;
    site = site || {};
    const p = { id: uid('prj'), userId: u.id, name: site.name || 'Nyt website', theme: site.theme || {}, blocks: site.blocks || [], status: 'draft', createdAt: now(), updatedAt: now() };
    data.projects.push(p); log('project_create', p.name); save(); return p;
  }
  function saveProject(id, site) {
    const p = getProject(id); if (!p) return null;
    if (site.name != null) p.name = site.name;
    if (site.theme != null) p.theme = site.theme;
    if (site.blocks != null) p.blocks = site.blocks;
    if (site.hideBadge != null) p.hideBadge = site.hideBadge;
    if (site.status) p.status = site.status;
    p.updatedAt = now(); save(); return p;
  }
  function renameProject(id, name) { const p = getProject(id); if (p) { p.name = name; p.updatedAt = now(); save(); } }
  function duplicateProject(id) { const p = getProject(id); if (!p) return null; const c = JSON.parse(JSON.stringify(p)); c.id = uid('prj'); c.name = p.name + ' (kopi)'; c.status = 'draft'; c.createdAt = now(); c.updatedAt = now(); data.projects.push(c); log('project_duplicate', c.name); save(); return c; }
  function deleteProject(id) { const p = getProject(id); data.projects = data.projects.filter(x => x.id !== id); if (p) log('project_delete', p.name); save(); }

  /* ---------- Stats ---------- */
  function stats() {
    const paying = data.users.filter(u => u.plan);
    const mrr = paying.reduce((s, u) => s + (PLANS[u.plan] ? PLANS[u.plan].price : 0), 0);
    return {
      users: data.users.length,
      paying: paying.length,
      free: data.users.filter(u => !u.plan).length,
      suspended: data.users.filter(u => u.status === 'suspended').length,
      employees: data.users.filter(u => u.role === 'admin' || u.role === 'employee').length,
      domains: data.domains.length,
      mrr,
      arr: mrr * 12,
      byPlan: { start: data.users.filter(u => u.plan === 'start').length, pro: data.users.filter(u => u.plan === 'pro').length, business: data.users.filter(u => u.plan === 'business').length }
    };
  }
  function audit() { return data.audit.slice(); }
  function resetAll() { data = seed(); save(); }

  window.RM = {
    PLANS, COSTS,
    on, save,
    currentUser, isLoggedIn, isAdmin, signup, login, loginProvider, logout,
    tokens, plan, planMeta, poolMax, canPublish, spendTokens, addTokens, setPlan,
    listUsers, getUser, setRole, setStatus, deleteUser, updateUser,
    listDomains, userDomains, addSubdomain, addCustomDomain, setDomainStatus, removeDomain,
    listProjects, getProject, createProject, saveProject, renameProject, duplicateProject, deleteProject,
    stats, audit, resetAll, slug
  };
})();
