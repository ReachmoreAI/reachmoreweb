/* Reachmore landing page interactions */
(function () {
  const $ = s => document.querySelector(s);
  const ICONS = window.RB ? window.RB.ICONS : {};

  /* ---- Theme toggle (persisted) ---- */
  const saved = localStorage.getItem('rm-theme');
  if (saved) document.documentElement.setAttribute('data-theme', saved);
  $('#themeToggle')?.addEventListener('click', () => {
    const cur = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', cur);
    localStorage.setItem('rm-theme', cur);
  });

  /* ---- AI prompt -> studio ---- */
  function generate() {
    const v = $('#prompt').value.trim();
    const btn = $('#genBtn');
    btn.textContent = 'Genererer…';
    btn.disabled = true;
    setTimeout(() => {
      location.href = 'studio.html' + (v ? ('?prompt=' + encodeURIComponent(v)) : '?prompt=' + encodeURIComponent('Et moderne website til min virksomhed'));
    }, 650);
  }
  $('#genBtn')?.addEventListener('click', generate);
  $('#prompt')?.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); generate(); } });
  document.querySelectorAll('.chip[data-p]').forEach(c => c.addEventListener('click', () => {
    $('#prompt').value = c.dataset.p; $('#prompt').focus();
  }));
  // template cards -> open studio pre-filled
  document.querySelectorAll('.tpl-card[data-p]').forEach(c => c.addEventListener('click', () => {
    location.href = 'studio.html?prompt=' + encodeURIComponent(c.dataset.p);
  }));

  /* ---- Feature grid ---- */
  const FEATURES = [
    ['spark', 'AI-generering', 'Beskriv dit website i ord — få et komplet, redigerbart design på sekunder.'],
    ['layers', 'Træk & slip editor', 'Flyt sektioner, redigér tekst inline og se ændringer live.'],
    ['palette', 'Smukke temaer', 'Skift farver, fonte og stil på hele sitet med ét klik.'],
    ['globe', 'Responsivt design', 'Alt ser perfekt ud på mobil, tablet og desktop automatisk.'],
    ['rocket', 'Udgiv med ét klik', 'Gå live på dit eget domæne uden teknisk opsætning.'],
    ['heart', 'AI-assistent', 'En indbygget hjælpebot der bygger, forklarer og finpudser for dig.']
  ];
  const fg = $('#featGrid');
  if (fg) FEATURES.forEach(([ic, t, d]) => {
    const el = document.createElement('div');
    el.className = 'fcard card reveal';
    el.innerHTML = `<div class="ic">${ICONS[ic] || ''}</div><h3>${t}</h3><p>${d}</p>`;
    fg.appendChild(el);
  });

  /* ---- Templates grid ---- */
  const TPLS = [
    ['Café & Restaurant', 'Mad & drikke', 'linear-gradient(135deg,#f59e0b,#ef4444)', 'En hjemmeside til min café med menu, galleri og booking'],
    ['Bureau', 'Agentur', 'linear-gradient(135deg,#8b5cf6,#3b82f6)', 'Et website til mit marketingbureau med portfolio og priser'],
    ['Portfolio', 'Personlig', 'linear-gradient(135deg,#ec4899,#8b5cf6)', 'En personlig portfolio til en designer med galleri'],
    ['Webshop', 'E-commerce', 'linear-gradient(135deg,#10b981,#3b82f6)', 'En webshop til tøj med produkter og gratis fragt'],
    ['SaaS App', 'Software', 'linear-gradient(135deg,#6366f1,#06b6d4)', 'En SaaS landingsside til min nye app med priser'],
    ['Fitness', 'Sundhed', 'linear-gradient(135deg,#84cc16,#10b981)', 'Et website til mit fitnesscenter med hold og medlemskaber']
  ];
  const tg = $('#tplGrid');
  if (tg) TPLS.forEach(([name, cat, grad, prompt]) => {
    const el = document.createElement('div');
    el.className = 'tcard reveal';
    el.innerHTML = `<div class="thumb" style="background:${grad}"><div class="mini"></div></div><div class="meta"><b>${name}</b><span>${cat}</span></div>`;
    el.addEventListener('click', () => location.href = 'studio.html?prompt=' + encodeURIComponent(prompt));
    tg.appendChild(el);
  });

  /* ---- Reveal on scroll ---- */
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { threshold: 0.12 });
  document.querySelectorAll('.reveal').forEach(el => io.observe(el));

  /* ---- Bot suggestions for landing ---- */
  window.__RM_BOT_SUGG__ = ['Byg et site til min café', 'Er det gratis?', 'Hvad er tokens?', 'Hvordan udgiver jeg?'];

  /* ---- Account menu in nav ---- */
  if (window.RMAuth) window.RMAuth.mountAccount($('#acct'));
})();
