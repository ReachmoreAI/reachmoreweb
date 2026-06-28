/* ============================================================
   Reachmore Token UI — meter + upgrade modal.
   Backed by the central store (window.RM): tokens & plan belong
   to the current user (or the guest pool when logged out).
   Keeps the window.RMTokens API used across the app.
   ============================================================ */
(function () {
  const RM = window.RM;
  const PLANS = RM.PLANS;
  const COSTS = RM.COSTS;
  const PLAN_FEATS = {
    start:    ['<b>50.000</b> AI-tokens hver måned', '<b>1</b> udgivet website', 'Eget .reachmore.dk-domæne', 'E-mail support'],
    pro:      ['<b>200.000</b> AI-tokens hver måned', '<b>Ubegrænsede</b> udgivelser', 'Eget domæne + ingen badge', 'Avanceret statistik', 'Prioritet support'],
    business: ['<b>1.000.000</b> AI-tokens hver måned', 'Alt i Pro', 'Team-samarbejde & flere brugere', 'Dedikeret rådgiver & SLA']
  };
  const PLAN_LBL = { start: 'Til den der starter', pro: 'Til seriøse skabere', business: 'Til teams & bureauer' };
  const CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M5 13l4 4L19 7"/></svg>';
  const SPARK = '<svg viewBox="0 0 24 24" fill="none"><path d="M12 3l1.6 5.4L19 10l-5.4 1.6L12 17l-1.6-5.4L5 10l5.4-1.6L12 3z" fill="currentColor"/></svg>';

  function fmt(n) {
    if (n >= 1e6) return (Math.round(n / 1e5) / 10).toString().replace('.0', '') + 'M';
    if (n >= 1000) return (Math.round(n / 100) / 10).toString().replace('.0', '') + 'k';
    return String(n);
  }
  function balance() { return RM.tokens(); }
  function poolMax() { return RM.poolMax(); }
  function planMeta() { return RM.plan() ? PLANS[RM.plan()] : null; }
  function canPublish() { return RM.canPublish(); }

  function spend(n) {
    n = n || 0;
    if (RM.spendTokens(n)) return true;
    openUpgrade('tokens'); return false;
  }
  function upgrade(planKey) {
    if (!RM.isLoggedIn()) {
      closeUpgrade();
      if (window.RMAuth) window.RMAuth.open('signup', () => setTimeout(() => upgrade(planKey), 120));
      return;
    }
    const res = RM.setPlan(null, planKey);
    closeUpgrade();
    if (res && res.ok && window.__RM_onUpgrade) window.__RM_onUpgrade(PLANS[planKey]);
  }

  /* ---------- Meter ---------- */
  function mountMeter(el) {
    el.classList.add('rm-meter');
    function render() {
      const pl = planMeta();
      const max = poolMax() || 1;
      const pct = Math.max(4, Math.min(100, Math.round(balance() / max * 100)));
      const low = balance() <= Math.round(max * 0.15);
      el.innerHTML =
        `<span class="tk">${SPARK}${fmt(balance())}</span>` +
        `<span class="bar${low ? ' low' : ''}"><i style="width:${pct}%"></i></span>` +
        (pl ? `<span class="plan">${pl.name}</span>` : `<button class="up" data-up>Opgradér</button>`);
      const up = el.querySelector('[data-up]'); if (up) up.onclick = () => openUpgrade('tokens');
    }
    render(); RM.on(render);
  }

  /* ---------- Upgrade modal ---------- */
  let overlay;
  function buildModal() {
    overlay = document.createElement('div');
    overlay.className = 'rm-upsell';
    const plansHtml = ['start', 'pro', 'business'].map(k => {
      const pl = PLANS[k]; const pop = k === 'pro';
      return `<div class="rm-plan ${pop ? 'pop' : ''}">${pop ? '<div class="badge">Mest populær</div>' : ''}
        <h3>${pl.name}</h3><div class="lbl">${PLAN_LBL[k]}</div>
        <div class="price">${pl.price} <small>kr/md</small></div>
        <ul>${PLAN_FEATS[k].map(f => `<li>${CHECK}<span>${f}</span></li>`).join('')}</ul>
        <button class="btn ${pop ? 'btn-primary' : 'btn-ghost'} btn-block" data-plan="${k}">Vælg ${pl.name}</button>
      </div>`;
    }).join('');
    overlay.innerHTML = `<div class="rm-upsell-box">
      <button class="x" data-close>×</button>
      <div class="uh">
        <div class="eyebrow"><span class="dot"></span> <span data-eyebrow>Opgradér din plan</span></div>
        <h2 data-title>Klar til at udgive?</h2>
        <p class="usub" data-sub></p>
      </div>
      <div class="rm-plans">${plansHtml}</div>
      <div class="rm-cross">
        <div class="rm-cross-ic">🌐</div>
        <div class="rm-cross-tx"><b>Få dit eget domæne med</b><span>Et professionelt website fortjener et professionelt domæne. Tilføj domæne + hosting fra <b>49 kr/år</b> — alt samlet ét sted.</span></div>
        <button class="btn btn-ghost btn-sm" data-cross>Se domæner →</button>
      </div>
      <div class="rm-free-note"><button data-close>Nej tak — fortsæt med at bygge gratis</button></div>
    </div>`;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', e => { if (e.target === overlay || e.target.closest('[data-close]')) closeUpgrade(); });
    overlay.querySelectorAll('[data-plan]').forEach(b => b.onclick = () => upgrade(b.dataset.plan));
    const cross = overlay.querySelector('[data-cross]'); if (cross) cross.onclick = () => location.href = 'domaener.html';
  }
  function openUpgrade(ctx) {
    if (!overlay || !document.body.contains(overlay)) { overlay = null; buildModal(); }
    const t = overlay.querySelector('[data-title]'), s = overlay.querySelector('[data-sub]'), e = overlay.querySelector('[data-eyebrow]');
    if (ctx === 'tokens') {
      e.textContent = 'Du er løbet tør for AI-tokens';
      t.textContent = 'Få flere AI-tokens';
      s.innerHTML = 'Din pulje af AI-tokens er brugt. Vælg en plan for at fortsætte med at bygge med AI — og lås udgivelse op samtidig.';
    } else {
      e.textContent = 'Udgiv dit website';
      t.textContent = 'Byg gratis. Udgiv med en plan.';
      s.innerHTML = 'Du kan bygge og redigere så meget du vil — helt gratis. For at <strong>udgive</strong> dit website live skal du vælge en af planerne herunder.';
    }
    requestAnimationFrame(() => overlay.classList.add('open'));
  }
  function closeUpgrade() { if (overlay) overlay.classList.remove('open'); }

  window.RMTokens = {
    PLANS, PLAN_FEATS, COSTS,
    spend, canPublish, planMeta, upgrade, openUpgrade, closeUpgrade, mountMeter, fmt,
    balance, poolMax, onChange: RM.on
  };
})();
