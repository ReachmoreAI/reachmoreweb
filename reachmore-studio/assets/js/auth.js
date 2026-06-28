/* ============================================================
   Reachmore Auth — login / signup modal + account menu.
   Social login (Google/Facebook) is simulated locally (a real
   build needs a backend + OAuth credentials). window.RMAuth
   ============================================================ */
(function () {
  const RM = window.RM;
  const G_ICON = '<svg viewBox="0 0 24 24"><path fill="#4285F4" d="M22.5 12.2c0-.7-.1-1.4-.2-2H12v3.9h5.9a5 5 0 01-2.2 3.3v2.7h3.6c2.1-2 3.2-4.9 3.2-7.9z"/><path fill="#34A853" d="M12 23c2.9 0 5.4-1 7.2-2.6l-3.6-2.7c-1 .7-2.3 1.1-3.6 1.1-2.8 0-5.1-1.9-6-4.4H2.3v2.8A11 11 0 0012 23z"/><path fill="#FBBC05" d="M6 14.4a6.6 6.6 0 010-4.2V7.4H2.3a11 11 0 000 9.8L6 14.4z"/><path fill="#EA4335" d="M12 5.4c1.6 0 3 .5 4.1 1.6l3.1-3.1A11 11 0 002.3 7.4L6 10.2C6.9 7.7 9.2 5.4 12 5.4z"/></svg>';
  const F_ICON = '<svg viewBox="0 0 24 24"><path fill="#1877F2" d="M24 12a12 12 0 10-13.9 11.9v-8.4H7.1V12h3V9.4c0-3 1.8-4.6 4.5-4.6 1.3 0 2.7.2 2.7.2v2.9h-1.5c-1.5 0-1.9.9-1.9 1.8V12h3.3l-.5 3.5h-2.8v8.4A12 12 0 0024 12z"/></svg>';
  const I = {
    grid: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>',
    globe: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/></svg>',
    shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z"/></svg>',
    out: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>',
    spark: '<svg viewBox="0 0 24 24" fill="none"><path d="M12 3l1.6 5.4L19 10l-5.4 1.6L12 17l-1.6-5.4L5 10l5.4-1.6L12 3z" fill="currentColor"/></svg>'
  };
  const LOGO = 'assets/img/reachmore-logo.png';
  const initials = u => (u.name || u.email || '?').split(/[ @.]/).filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase();

  let overlay, onDone = null, mode = 'login';

  function build() {
    overlay = document.createElement('div');
    overlay.className = 'rm-auth';
    overlay.innerHTML = `<div class="rm-auth-box">
      <button class="x" data-close>×</button>
      <img class="rm-auth-logo" src="${LOGO}" alt="Reachmore">
      <h2 data-h>Velkommen tilbage</h2>
      <p class="sub" data-sub>Log ind for at fortsætte</p>
      <div class="rm-social">
        <button data-prov="google">${G_ICON} Fortsæt med Google</button>
        <button data-prov="facebook">${F_ICON} Fortsæt med Facebook</button>
      </div>
      <div class="rm-divider">eller med e-mail</div>
      <div class="err" data-err></div>
      <div class="fld" data-namefld style="display:none"><label>Navn</label><input data-name placeholder="Dit navn" autocomplete="name"></div>
      <div class="fld"><label>E-mail</label><input data-email type="email" placeholder="dig@eksempel.dk" autocomplete="email"></div>
      <div class="fld"><label>Adgangskode</label><input data-pass type="password" placeholder="••••••••" autocomplete="current-password"></div>
      <button class="btn btn-primary btn-block" data-submit style="margin-top:6px">Log ind</button>
      <div class="switch" data-switch></div>
      <div class="hint" data-hint></div>
    </div>`;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', e => { if (e.target === overlay || e.target.closest('[data-close]')) close(); });
    overlay.querySelectorAll('[data-prov]').forEach(b => b.onclick = () => { const r = RM.loginProvider(b.dataset.prov); if (r.ok) finish(); });
    overlay.querySelector('[data-submit]').onclick = submit;
    overlay.querySelectorAll('input').forEach(i => i.addEventListener('keydown', e => { if (e.key === 'Enter') submit(); }));
    overlay.querySelector('[data-switch]').addEventListener('click', e => { if (e.target.tagName === 'A') setMode(mode === 'login' ? 'signup' : 'login'); });
  }

  function setMode(m) {
    mode = m;
    const q = s => overlay.querySelector(s);
    q('[data-h]').textContent = m === 'login' ? 'Velkommen tilbage' : 'Opret din konto';
    q('[data-sub]').textContent = m === 'login' ? 'Log ind for at fortsætte' : 'Gratis · ingen betalingskort påkrævet';
    q('[data-namefld]').style.display = m === 'login' ? 'none' : 'block';
    q('[data-submit]').textContent = m === 'login' ? 'Log ind' : 'Opret konto';
    q('[data-pass]').setAttribute('autocomplete', m === 'login' ? 'current-password' : 'new-password');
    q('[data-switch]').innerHTML = m === 'login'
      ? 'Ny her? <a>Opret en gratis konto</a>'
      : 'Har du allerede en konto? <a>Log ind</a>';
    q('[data-hint]').innerHTML = m === 'login'
      ? 'Demo-login: <b>admin@reachmore.dk</b> / <b>admin123</b>'
      : 'Du får <b>5.000 gratis AI-tokens</b> med det samme ✨';
    q('[data-err]').classList.remove('show');
  }

  function err(msg) { const e = overlay.querySelector('[data-err]'); e.textContent = msg; e.classList.add('show'); }

  function submit() {
    const q = s => overlay.querySelector(s).value;
    let r;
    if (mode === 'signup') r = RM.signup({ name: q('[data-name]'), email: q('[data-email]'), pass: q('[data-pass]') });
    else r = RM.login(q('[data-email]'), q('[data-pass]'));
    if (r.error) { err(r.error); return; }
    finish();
  }
  function finish() { close(); const cb = onDone; onDone = null; if (cb) cb(); }

  function open(m, cb) {
    if (!overlay) build();
    onDone = cb || null;
    setMode(m || 'login');
    overlay.querySelector('[data-email]').value = '';
    overlay.querySelector('[data-pass]').value = '';
    overlay.querySelector('[data-name]').value = '';
    requestAnimationFrame(() => overlay.classList.add('open'));
    setTimeout(() => overlay.querySelector(mode === 'signup' ? '[data-name]' : '[data-email]').focus(), 80);
  }
  function close() { if (overlay) overlay.classList.remove('open'); }

  /* ---------- Account menu in nav ---------- */
  function mountAccount(el, opts) {
    opts = opts || {};
    function render() {
      const u = RM.currentUser();
      if (!u) {
        el.innerHTML = `<button class="btn btn-ghost" data-login>Log ind</button>`;
        el.querySelector('[data-login]').onclick = () => open('login');
        return;
      }
      const pl = RM.plan(); const plName = pl ? RM.PLANS[pl].name : 'Gratis';
      el.innerHTML = `<div class="rm-acct">
        <button class="btn-acct" data-toggle><span class="av">${initials(u)}</span><span class="nm">${u.name || u.email}</span></button>
        <div class="rm-acct-menu" data-menu>
          <div class="head"><b>${u.name || ''}</b><span>${u.email}</span><br><span class="pill ${pl ? '' : 'free'}">${plName}</span></div>
          <div class="tok">${I.spark} ${window.RMTokens ? window.RMTokens.fmt(RM.tokens()) : RM.tokens()} AI-tokens</div>
          <a data-go="dashboard.html">${I.grid} Mine websites</a>
          <a data-go="studio.html">${I.spark} Åbn Studio</a>
          <a data-go="account.html">${I.globe} Konto & domæner</a>
          ${RM.isAdmin() ? `<a data-go="admin.html">${I.shield} Admin panel</a>` : ''}
          <a class="danger" data-logout>${I.out} Log ud</a>
        </div>
      </div>`;
      const menu = el.querySelector('[data-menu]');
      el.querySelector('[data-toggle]').onclick = (e) => { e.stopPropagation(); menu.classList.toggle('open'); };
      el.querySelectorAll('[data-go]').forEach(a => a.onclick = () => location.href = a.dataset.go);
      el.querySelector('[data-logout]').onclick = () => {
        RM.logout(); menu.classList.remove('open');
        const appPages = ['studio.html', 'dashboard.html', 'account.html', 'admin.html'];
        if (appPages.some(p => location.pathname.endsWith(p))) location.href = 'index.html';
        else if (opts.onLogout) opts.onLogout();
      };
      document.addEventListener('click', () => menu.classList.remove('open'));
    }
    render(); RM.on(render);
  }

  window.RMAuth = { open, close, mountAccount, initials };
})();
