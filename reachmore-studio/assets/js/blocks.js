/* ============================================================
   Reachmore Block Library + AI Generation Engine
   Inspired by Builder.io's content model: a site is an array of
   block instances { type, data }, each rendered by a registered
   block definition. Fully self-contained (no external assets).
   Exposes: window.RB = { STYLES, BLOCKS, order, renderSite, generateSite, blankBlock }
   ============================================================ */
(function () {
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const ed = (key, val, tag = 'span') => `<${tag} data-edit="${key}">${esc(val)}</${tag}>`;
  const icon = (name) => ICONS[name] || ICONS.spark;

  const ICONS = {
    spark: '<svg viewBox="0 0 24 24" fill="none"><path d="M12 3l1.8 5.4L19 10l-5.2 1.6L12 17l-1.8-5.4L5 10l5.2-1.6L12 3z" fill="currentColor"/></svg>',
    bolt: '<svg viewBox="0 0 24 24" fill="none"><path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z" fill="currentColor"/></svg>',
    layers: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3l9 5-9 5-9-5 9-5z"/><path d="M3 13l9 5 9-5"/></svg>',
    palette: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><circle cx="8.5" cy="10" r="1.3" fill="currentColor"/><circle cx="12" cy="8" r="1.3" fill="currentColor"/><circle cx="15.5" cy="10" r="1.3" fill="currentColor"/></svg>',
    rocket: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 15c-1 1-1 4-1 4s3 0 4-1m6.5-9.5a4 4 0 11-1.5-1.5"/><path d="M14 4c4 1 6 5 6 9-2 0-5-1-6-2s-2-4-2-6c0 0 1-1 2-1z"/></svg>',
    shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z"/></svg>',
    chart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>',
    heart: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 21s-7-4.5-9.5-9C1 9 2.5 5.5 6 5.5c2 0 3.2 1.2 4 2.3.8-1.1 2-2.3 4-2.3 3.5 0 5 3.5 3.5 6.5C19 16.5 12 21 12 21z"/></svg>',
    globe: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/></svg>',
    star: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3l2.5 6.5L21 10l-5 4.5 1.5 6.5L12 17l-5.5 4 1.5-6.5L3 10l6.5-.5L12 3z"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M5 13l4 4L19 7"/></svg>',
    phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 4h4l2 5-3 2a12 12 0 005 5l2-3 5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2z"/></svg>',
    mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg>',
    pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 21s7-6 7-11a7 7 0 10-14 0c0 5 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>',
    coffee: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 8h13v5a4 4 0 01-4 4H8a4 4 0 01-4-4V8z"/><path d="M17 9h2a2 2 0 010 4h-2M7 3v2M11 3v2"/></svg>',
    cart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/><path d="M3 4h2l2.5 12h11l2-8H6"/></svg>',
    dumbbell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6.5 6.5l11 11M4 9l2-2 2 2-2 2zM16 17l2-2 2 2-2 2zM7 13l6-6"/></svg>',
    camera: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="7" width="18" height="13" rx="2"/><circle cx="12" cy="13" r="3.5"/><path d="M8 7l1.5-2h5L16 7"/></svg>'
  };

  /* ---------- Render-time styles (used in studio canvas AND export) ---------- */
  const STYLES = `
  .rb-site{--p:#8b5cf6;--p2:#f97316;--rad:16px;--bg:#0b0b12;--fg:#f4f4f7;--mut:rgba(244,244,247,.66);--card:#13131c;--line:rgba(255,255,255,.09);font-family:'Inter',system-ui,sans-serif;background:var(--bg);color:var(--fg);line-height:1.55}
  .rb-site[data-mode="light"]{--bg:#ffffff;--fg:#14141d;--mut:rgba(20,20,29,.62);--card:#f6f6fb;--line:rgba(10,10,30,.10)}
  .rb-site *{box-sizing:border-box}
  .rb-site h1,.rb-site h2,.rb-site h3{font-family:'Outfit','Inter',sans-serif;line-height:1.08;letter-spacing:-.02em;margin:0}
  .rb-wrap{max-width:1140px;margin:0 auto;padding:0 28px}
  .rb-grad{background:linear-gradient(95deg,var(--p2),var(--p));-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent}
  .rb-btn{display:inline-flex;align-items:center;gap:8px;padding:13px 24px;border-radius:calc(var(--rad) - 4px);font-weight:600;font-size:15px;cursor:pointer;border:1px solid transparent;transition:transform .15s,box-shadow .2s}
  .rb-btn.primary{background:linear-gradient(95deg,var(--p2),var(--p));color:#fff;box-shadow:0 12px 30px -12px var(--p)}
  .rb-btn.primary:hover{transform:translateY(-2px)}
  .rb-btn.ghost{border-color:var(--line);color:var(--fg);background:transparent}
  .rb-sec{padding:88px 0}
  .rb-eyebrow{display:inline-flex;align-items:center;gap:8px;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;color:var(--mut);border:1px solid var(--line);padding:6px 13px;border-radius:99px;margin-bottom:20px}
  .rb-eyebrow b{width:7px;height:7px;border-radius:50%;background:linear-gradient(95deg,var(--p2),var(--p))}
  /* nav */
  .rb-nav{display:flex;align-items:center;justify-content:space-between;padding:18px 28px;max-width:1180px;margin:0 auto}
  .rb-nav .brand{font-family:'Outfit';font-weight:800;font-size:22px}
  .rb-nav .links{display:flex;gap:26px;color:var(--mut);font-size:15px;font-weight:500}
  .rb-nav .links a:hover{color:var(--fg)}
  @media(max-width:760px){.rb-nav .links{display:none}}
  /* hero */
  .rb-hero{text-align:center;padding:96px 0 80px}
  .rb-hero h1{font-size:clamp(38px,6vw,72px);font-weight:800;margin:0 auto 22px;max-width:14ch}
  .rb-hero p.sub{font-size:clamp(17px,2vw,21px);color:var(--mut);max-width:60ch;margin:0 auto 34px}
  .rb-hero .cta{display:flex;gap:14px;justify-content:center;flex-wrap:wrap}
  .rb-hero .visual{margin:60px auto 0;max-width:900px;height:380px;border-radius:calc(var(--rad) + 8px);border:1px solid var(--line);background:
     radial-gradient(circle at 20% 20%,color-mix(in srgb,var(--p2) 40%,transparent),transparent 45%),
     radial-gradient(circle at 80% 60%,color-mix(in srgb,var(--p) 45%,transparent),transparent 45%),var(--card);
     position:relative;overflow:hidden;box-shadow:0 40px 80px -30px rgba(0,0,0,.5)}
  .rb-hero .visual .pill{position:absolute;background:rgba(255,255,255,.08);backdrop-filter:blur(8px);border:1px solid var(--line);border-radius:12px;padding:12px 16px;font-size:13px;font-weight:600}
  /* grids */
  .rb-head{text-align:center;max-width:680px;margin:0 auto 52px}
  .rb-head h2{font-size:clamp(28px,4vw,46px);font-weight:800;margin-bottom:14px}
  .rb-head p{color:var(--mut);font-size:18px}
  .rb-grid{display:grid;gap:20px}
  .rb-g3{grid-template-columns:repeat(3,1fr)}
  .rb-g4{grid-template-columns:repeat(4,1fr)}
  .rb-g2{grid-template-columns:repeat(2,1fr)}
  @media(max-width:900px){.rb-g3,.rb-g4{grid-template-columns:repeat(2,1fr)}}
  @media(max-width:600px){.rb-g2,.rb-g3,.rb-g4{grid-template-columns:1fr}}
  .rb-feat{background:var(--card);border:1px solid var(--line);border-radius:var(--rad);padding:28px;transition:transform .2s,border-color .2s}
  .rb-feat:hover{transform:translateY(-4px)}
  .rb-feat .ic{width:48px;height:48px;border-radius:13px;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,var(--p2),var(--p));color:#fff;margin-bottom:18px}
  .rb-feat .ic svg{width:24px;height:24px}
  .rb-feat h3{font-size:20px;margin-bottom:9px;font-weight:700}
  .rb-feat p{color:var(--mut);font-size:15px}
  /* stats */
  .rb-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:18px;text-align:center}
  @media(max-width:600px){.rb-stats{grid-template-columns:repeat(2,1fr)}}
  .rb-stat .n{font-family:'Outfit';font-size:clamp(34px,5vw,52px);font-weight:900}
  .rb-stat .l{color:var(--mut);font-size:15px;margin-top:4px}
  /* split */
  .rb-split{display:grid;grid-template-columns:1fr 1fr;gap:54px;align-items:center}
  @media(max-width:820px){.rb-split{grid-template-columns:1fr;gap:32px}}
  .rb-split h2{font-size:clamp(26px,3.4vw,40px);margin-bottom:16px}
  .rb-split p{color:var(--mut);font-size:17px;margin-bottom:18px}
  .rb-split ul{list-style:none;padding:0;display:flex;flex-direction:column;gap:11px}
  .rb-split li{display:flex;gap:11px;align-items:flex-start;font-size:15.5px}
  .rb-split li .c{width:22px;height:22px;border-radius:7px;background:linear-gradient(135deg,var(--p2),var(--p));color:#fff;display:flex;align-items:center;justify-content:center;flex-shrink:0}
  .rb-split li .c svg{width:13px;height:13px}
  .rb-shot{height:360px;border-radius:var(--rad);border:1px solid var(--line);background:radial-gradient(circle at 30% 30%,color-mix(in srgb,var(--p) 40%,transparent),transparent 50%),var(--card)}
  /* gallery */
  .rb-gal{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
  @media(max-width:760px){.rb-gal{grid-template-columns:repeat(2,1fr)}}
  .rb-gal .it{aspect-ratio:1;border-radius:var(--rad);border:1px solid var(--line);position:relative;overflow:hidden;display:flex;align-items:flex-end;padding:16px;color:#fff;font-weight:600;font-size:15px}
  /* pricing */
  .rb-price{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;align-items:stretch}
  @media(max-width:820px){.rb-price{grid-template-columns:1fr}}
  .rb-tier{background:var(--card);border:1px solid var(--line);border-radius:var(--rad);padding:30px;display:flex;flex-direction:column}
  .rb-tier.hi{border-color:transparent;background:linear-gradient(var(--card),var(--card)) padding-box,linear-gradient(135deg,var(--p2),var(--p)) border-box;border:2px solid transparent;position:relative;transform:scale(1.03)}
  .rb-tier .tag{position:absolute;top:-12px;left:50%;transform:translateX(-50%);background:linear-gradient(95deg,var(--p2),var(--p));color:#fff;font-size:12px;font-weight:700;padding:5px 14px;border-radius:99px}
  .rb-tier h3{font-size:20px;margin-bottom:6px}
  .rb-tier .amt{font-family:'Outfit';font-size:44px;font-weight:900;margin:8px 0}
  .rb-tier .amt small{font-size:15px;font-weight:500;color:var(--mut)}
  .rb-tier ul{list-style:none;padding:0;margin:18px 0 24px;display:flex;flex-direction:column;gap:11px;flex:1}
  .rb-tier li{display:flex;gap:10px;color:var(--mut);font-size:14.5px}
  .rb-tier li .c{color:var(--p)}.rb-tier li .c svg{width:17px;height:17px}
  /* testimonial */
  .rb-quote{max-width:820px;margin:0 auto;text-align:center}
  .rb-quote .stars{color:#f5b301;display:flex;gap:3px;justify-content:center;margin-bottom:18px}
  .rb-quote .stars svg{width:22px;height:22px}
  .rb-quote blockquote{font-family:'Outfit';font-size:clamp(22px,3vw,32px);font-weight:600;line-height:1.32;margin:0 0 24px}
  .rb-quote .who{color:var(--mut);font-weight:500}
  /* cta */
  .rb-ctab{text-align:center;border-radius:calc(var(--rad) + 10px);padding:64px 32px;background:linear-gradient(120deg,var(--p2),var(--p));color:#fff;position:relative;overflow:hidden}
  .rb-ctab h2{font-size:clamp(28px,4vw,44px);margin-bottom:14px}
  .rb-ctab p{opacity:.92;font-size:18px;margin-bottom:28px}
  .rb-ctab .rb-btn.primary{background:#fff;color:#111}
  /* faq */
  .rb-faq{max-width:760px;margin:0 auto;display:flex;flex-direction:column;gap:12px}
  .rb-faq details{background:var(--card);border:1px solid var(--line);border-radius:var(--rad);padding:18px 22px}
  .rb-faq summary{font-weight:700;font-size:17px;cursor:pointer;list-style:none;display:flex;justify-content:space-between;align-items:center}
  .rb-faq summary::-webkit-details-marker{display:none}
  .rb-faq summary::after{content:'+';font-size:22px;color:var(--mut)}
  .rb-faq details[open] summary::after{content:'–'}
  .rb-faq p{color:var(--mut);margin-top:12px;font-size:15.5px}
  /* contact */
  .rb-contact{max-width:560px;margin:0 auto}
  .rb-contact .row{display:flex;flex-direction:column;gap:14px}
  .rb-contact input,.rb-contact textarea{width:100%;padding:14px 16px;background:var(--card);border:1px solid var(--line);border-radius:calc(var(--rad) - 4px);color:var(--fg);font:inherit;outline:none}
  .rb-contact textarea{min-height:120px;resize:vertical}
  .rb-info{display:flex;gap:24px;justify-content:center;flex-wrap:wrap;margin-top:26px;color:var(--mut);font-size:15px}
  .rb-info span{display:inline-flex;gap:8px;align-items:center}.rb-info svg{width:18px;height:18px;color:var(--p)}
  /* footer */
  .rb-foot{border-top:1px solid var(--line);padding:40px 0;text-align:center;color:var(--mut)}
  .rb-foot .brand{font-family:'Outfit';font-weight:800;font-size:22px;color:var(--fg);margin-bottom:10px}
  .rb-foot .fl{display:flex;gap:22px;justify-content:center;margin:14px 0;flex-wrap:wrap}
  .rb-steps{display:grid;grid-template-columns:repeat(3,1fr);gap:22px}
  @media(max-width:760px){.rb-steps{grid-template-columns:1fr}}
  .rb-step{background:var(--card);border:1px solid var(--line);border-radius:var(--rad);padding:28px;position:relative}
  .rb-step-n{width:46px;height:46px;border-radius:13px;background:linear-gradient(135deg,var(--p2),var(--p));color:#fff;font-family:'Outfit';font-weight:800;font-size:21px;display:flex;align-items:center;justify-content:center;margin-bottom:16px}
  .rb-step h3{font-size:20px;margin-bottom:8px}
  .rb-step p{color:var(--mut);font-size:15px}
  .rb-member{text-align:center}
  .rb-ava{width:84px;height:84px;border-radius:50%;margin:0 auto 14px;background:linear-gradient(135deg,var(--p2),var(--p));color:#fff;display:flex;align-items:center;justify-content:center;font-family:'Outfit';font-weight:800;font-size:26px}
  .rb-member h3{font-size:18px;margin-bottom:2px}
  .rb-member p{color:var(--mut);font-size:14px}
  .rb-image{border:1px solid var(--line);border-radius:6px;background:var(--card);background-size:cover;background-position:center;display:flex;align-items:center;justify-content:center;color:var(--mut);font-size:14px}
  .rb-image.r{border-radius:var(--rad)}
  .rb-cap{text-align:center;color:var(--mut);font-size:14px;margin-top:12px}
  `;

  /* ---------- Block definitions ---------- */
  const BLOCKS = {
    navbar: {
      name: 'Navigation', icon: 'layers', cat: 'Struktur',
      schema: [
        { k: 'brand', l: 'Brand', t: 'text' },
        { k: 'l1', l: 'Link 1', t: 'text' }, { k: 'l2', l: 'Link 2', t: 'text' },
        { k: 'l3', l: 'Link 3', t: 'text' }, { k: 'cta', l: 'Knap', t: 'text' }
      ],
      defaults: { brand: 'Reachmore', l1: 'Funktioner', l2: 'Priser', l3: 'Kontakt', cta: 'Kom i gang' },
      render: d => `<nav class="rb-nav"><div class="brand rb-grad">${ed('brand', d.brand)}</div>
        <div class="links"><a>${ed('l1', d.l1)}</a><a>${ed('l2', d.l2)}</a><a>${ed('l3', d.l3)}</a></div>
        <button class="rb-btn primary">${ed('cta', d.cta)}</button></nav>`
    },
    hero: {
      name: 'Hero', icon: 'spark', cat: 'Sektioner',
      schema: [
        { k: 'eyebrow', l: 'Eyebrow', t: 'text' },
        { k: 'headline', l: 'Overskrift', t: 'textarea' },
        { k: 'sub', l: 'Undertekst', t: 'textarea' },
        { k: 'cta1', l: 'Primær knap', t: 'text' }, { k: 'cta2', l: 'Sekundær knap', t: 'text' },
        { k: 'image', l: 'Hero-billede', t: 'image' },
        { k: 'visual', l: 'Vis billede-mockup', t: 'select', options: ['ja', 'nej'] }
      ],
      defaults: { eyebrow: 'Nyhed', headline: 'Byg noget folk elsker', sub: 'Den hurtigste måde at lancere et professionelt website på.', cta1: 'Kom i gang gratis', cta2: 'Se demo', image: '', visual: 'ja' },
      render: d => `<header class="rb-hero"><div class="rb-wrap">
        ${d.eyebrow ? `<div class="rb-eyebrow"><b></b>${ed('eyebrow', d.eyebrow)}</div>` : ''}
        <h1>${ed('headline', d.headline, 'span')}</h1>
        <p class="sub">${ed('sub', d.sub)}</p>
        <div class="cta"><button class="rb-btn primary">${ed('cta1', d.cta1)}</button>${d.cta2 ? `<button class="rb-btn ghost">${ed('cta2', d.cta2)}</button>` : ''}</div>
        ${d.image ? `<div class="visual" style="background:url('${d.image}') center/cover;border:0"></div>` : (d.visual === 'ja' ? `<div class="visual"><div class="pill" style="top:24px;left:24px">✨ AI</div><div class="pill" style="bottom:24px;right:24px">🎨 Live preview</div><div class="pill" style="top:50%;left:50%;transform:translate(-50%,-50%);font-size:15px">Dit website</div></div>` : '')}
      </div></header>`
    },
    logos: {
      name: 'Logo-bjælke', icon: 'globe', cat: 'Sektioner',
      schema: [{ k: 'label', l: 'Tekst', t: 'text' }, { k: 'items', l: 'Navne (komma)', t: 'text' }],
      defaults: { label: 'Brugt af teams hos', items: 'Nordisk, Lumen, Vega, Atlas, Forma, Kvist' },
      render: d => `<section class="rb-sec" style="padding:48px 0"><div class="rb-wrap" style="text-align:center">
        <p style="color:var(--mut);font-size:14px;margin-bottom:22px">${ed('label', d.label)}</p>
        <div style="display:flex;gap:40px;justify-content:center;flex-wrap:wrap;opacity:.7;font-family:'Outfit';font-weight:800;font-size:22px">
        ${(d.items || '').split(',').map(s => `<span>${esc(s.trim())}</span>`).join('')}</div></div></section>`
    },
    features: {
      name: 'Funktioner', icon: 'bolt', cat: 'Sektioner',
      schema: [
        { k: 'eyebrow', l: 'Eyebrow', t: 'text' }, { k: 'title', l: 'Titel', t: 'text' }, { k: 'sub', l: 'Undertekst', t: 'textarea' },
        { k: 'items', l: 'Kort', t: 'list', fields: [{ k: 'icon', l: 'Ikon', t: 'icon' }, { k: 'title', l: 'Titel', t: 'text' }, { k: 'text', l: 'Tekst', t: 'textarea' }] }
      ],
      defaults: {
        eyebrow: 'Funktioner', title: 'Alt du har brug for', sub: 'Kraftfulde værktøjer i en enkel pakke.',
        items: [
          { icon: 'bolt', title: 'Lynhurtig', text: 'Optimeret til hastighed ud af boksen.' },
          { icon: 'palette', title: 'Smukt design', text: 'Færdige temaer der bare virker.' },
          { icon: 'shield', title: 'Sikker', text: 'SSL og hosting inkluderet.' },
          { icon: 'chart', title: 'Analytics', text: 'Følg dine besøgende i realtid.' },
          { icon: 'globe', title: 'Globalt CDN', text: 'Hurtig levering over hele verden.' },
          { icon: 'rocket', title: 'Et klik live', text: 'Udgiv på sekunder, ikke dage.' }
        ]
      },
      render: d => `<section class="rb-sec"><div class="rb-wrap">
        <div class="rb-head">${d.eyebrow ? `<div class="rb-eyebrow"><b></b>${ed('eyebrow', d.eyebrow)}</div>` : ''}<h2>${ed('title', d.title)}</h2><p>${ed('sub', d.sub)}</p></div>
        <div class="rb-grid rb-g3">${(d.items || []).map((it, i) => `<div class="rb-feat" data-item="items" data-idx="${i}"><div class="ic">${icon(it.icon)}</div>
          <h3 data-edit-list="items" data-i="${i}" data-f="title">${esc(it.title)}</h3>
          <p data-edit-list="items" data-i="${i}" data-f="text">${esc(it.text)}</p></div>`).join('')}</div>
      </div></section>`
    },
    stats: {
      name: 'Tal / Stats', icon: 'chart', cat: 'Sektioner',
      schema: [{ k: 'items', l: 'Tal', t: 'list', fields: [{ k: 'n', l: 'Tal', t: 'text' }, { k: 'l', l: 'Label', t: 'text' }] }],
      defaults: { items: [{ n: '12k+', l: 'Sites bygget' }, { n: '99.9%', l: 'Oppetid' }, { n: '4.9★', l: 'Bedømmelse' }, { n: '24/7', l: 'Support' }] },
      render: d => `<section class="rb-sec" style="padding:56px 0"><div class="rb-wrap"><div class="rb-stats">
        ${(d.items || []).map((it, i) => `<div class="rb-stat" data-item="items" data-idx="${i}"><div class="n rb-grad" data-edit-list="items" data-i="${i}" data-f="n">${esc(it.n)}</div><div class="l" data-edit-list="items" data-i="${i}" data-f="l">${esc(it.l)}</div></div>`).join('')}
      </div></div></section>`
    },
    split: {
      name: 'Billede + Tekst', icon: 'layers', cat: 'Sektioner',
      schema: [
        { k: 'title', l: 'Titel', t: 'text' }, { k: 'text', l: 'Tekst', t: 'textarea' },
        { k: 'cta', l: 'Knap', t: 'text' }, { k: 'flip', l: 'Spejlvend', t: 'select', options: ['nej', 'ja'] },
        { k: 'image', l: 'Billede', t: 'image' },
        { k: 'items', l: 'Punkter', t: 'list', fields: [{ k: 'text', l: 'Punkt', t: 'text' }] }
      ],
      defaults: { title: 'Designet til at imponere', text: 'Skab oplevelser der konverterer — uden at skrive en linje kode.', cta: 'Læs mere', flip: 'nej', image: '', items: [{ text: 'Ubegrænsede sider' }, { text: 'Tilpassede komponenter' }, { text: 'SEO indbygget' }] },
      render: d => { const shot = `<div class="rb-shot"${d.image ? ` style="background:url('${d.image}') center/cover"` : ''}></div>`; const txt = `<div><h2>${ed('title', d.title)}</h2><p>${ed('text', d.text)}</p>
        <ul>${(d.items || []).map((it, i) => `<li data-item="items" data-idx="${i}"><span class="c">${icon('check')}</span><span data-edit-list="items" data-i="${i}" data-f="text">${esc(it.text)}</span></li>`).join('')}</ul>
        ${d.cta ? `<div style="margin-top:22px"><button class="rb-btn primary">${ed('cta', d.cta)}</button></div>` : ''}</div>`;
        return `<section class="rb-sec"><div class="rb-wrap"><div class="rb-split">${d.flip === 'ja' ? shot + txt : txt + shot}</div></div></section>`; }
    },
    gallery: {
      name: 'Galleri', icon: 'camera', cat: 'Sektioner',
      schema: [{ k: 'title', l: 'Titel', t: 'text' }, { k: 'items', l: 'Felter', t: 'list', fields: [{ k: 'img', l: 'Billede', t: 'image' }, { k: 'label', l: 'Tekst', t: 'text' }] }],
      defaults: { title: 'Galleri', items: [{ label: 'Projekt 01' }, { label: 'Projekt 02' }, { label: 'Projekt 03' }, { label: 'Projekt 04' }, { label: 'Projekt 05' }, { label: 'Projekt 06' }] },
      render: d => { const g = ['linear-gradient(135deg,#f97316,#d8519e)', 'linear-gradient(135deg,#8b5cf6,#3b82f6)', 'linear-gradient(135deg,#d8519e,#8b5cf6)', 'linear-gradient(135deg,#f59e0b,#ef4444)', 'linear-gradient(135deg,#10b981,#3b82f6)', 'linear-gradient(135deg,#8b5cf6,#f97316)'];
        return `<section class="rb-sec"><div class="rb-wrap"><div class="rb-head"><h2>${ed('title', d.title)}</h2></div>
        <div class="rb-gal">${(d.items || []).map((it, i) => `<div class="it" data-item="items" data-idx="${i}" style="background:${it.img ? `url('${it.img}') center/cover` : g[i % g.length]}"><span data-edit-list="items" data-i="${i}" data-f="label">${esc(it.label)}</span></div>`).join('')}</div></div></section>`; }
    },
    pricing: {
      name: 'Priser', icon: 'star', cat: 'Sektioner',
      schema: [
        { k: 'eyebrow', l: 'Eyebrow', t: 'text' }, { k: 'title', l: 'Titel', t: 'text' }, { k: 'sub', l: 'Undertekst', t: 'textarea' },
        { k: 'items', l: 'Planer', t: 'list', fields: [{ k: 'name', l: 'Navn', t: 'text' }, { k: 'price', l: 'Pris', t: 'text' }, { k: 'per', l: 'Per', t: 'text' }, { k: 'feats', l: 'Punkter (komma)', t: 'text' }, { k: 'hi', l: 'Fremhæv (ja/nej)', t: 'text' }, { k: 'cta', l: 'Knap', t: 'text' }] }
      ],
      defaults: {
        eyebrow: 'Priser', title: 'Enkel, gennemskuelig pris', sub: 'Vælg den plan der passer dig.',
        items: [
          { name: 'Start', price: '99', per: 'kr/md', feats: 'Alt det basale, 1 bruger, E-mail support', hi: 'nej', cta: 'Kom i gang' },
          { name: 'Pro', price: '199', per: 'kr/md', feats: 'Alt i Start, Op til 5 brugere, Avanceret statistik, Prioritet support', hi: 'ja', cta: 'Vælg Pro' },
          { name: 'Business', price: '399', per: 'kr/md', feats: 'Alt i Pro, Ubegrænset team, Dedikeret rådgiver, SLA', hi: 'nej', cta: 'Kontakt salg' }
        ]
      },
      render: d => `<section class="rb-sec"><div class="rb-wrap">
        <div class="rb-head">${d.eyebrow ? `<div class="rb-eyebrow"><b></b>${ed('eyebrow', d.eyebrow)}</div>` : ''}<h2>${ed('title', d.title)}</h2><p>${ed('sub', d.sub)}</p></div>
        <div class="rb-price">${(d.items || []).map((it, i) => `<div class="rb-tier ${it.hi === 'ja' ? 'hi' : ''}" data-item="items" data-idx="${i}">${it.hi === 'ja' ? '<div class="tag">Mest populær</div>' : ''}
          <h3 data-edit-list="items" data-i="${i}" data-f="name">${esc(it.name)}</h3>
          <div class="amt"><span data-edit-list="items" data-i="${i}" data-f="price">${esc(it.price)}</span> <small data-edit-list="items" data-i="${i}" data-f="per">${esc(it.per)}</small></div>
          <ul>${(it.feats || '').split(',').map(f => `<li><span class="c">${icon('check')}</span>${esc(f.trim())}</li>`).join('')}</ul>
          <button class="rb-btn ${it.hi === 'ja' ? 'primary' : 'ghost'}" data-edit-list="items" data-i="${i}" data-f="cta">${esc(it.cta)}</button></div>`).join('')}</div>
      </div></section>`
    },
    testimonial: {
      name: 'Udtalelse', icon: 'heart', cat: 'Sektioner',
      schema: [{ k: 'quote', l: 'Citat', t: 'textarea' }, { k: 'who', l: 'Navn / firma', t: 'text' }],
      defaults: { quote: '"Reachmore sparede os uger. Vi beskrev bare hvad vi ville have, og sitet stod der."', who: 'Mette K. — Grundlægger, Nordisk Studio' },
      render: d => `<section class="rb-sec"><div class="rb-wrap"><div class="rb-quote">
        <div class="stars">${icon('star').repeat(5)}</div>
        <blockquote>${ed('quote', d.quote)}</blockquote>
        <div class="who">${ed('who', d.who)}</div></div></div></section>`
    },
    cta: {
      name: 'Call to action', icon: 'rocket', cat: 'Sektioner',
      schema: [{ k: 'title', l: 'Titel', t: 'text' }, { k: 'sub', l: 'Undertekst', t: 'textarea' }, { k: 'cta', l: 'Knap', t: 'text' }],
      defaults: { title: 'Klar til at komme i gang?', sub: 'Byg dit website i dag — det er gratis at starte.', cta: 'Byg mit website' },
      render: d => `<section class="rb-sec"><div class="rb-wrap"><div class="rb-ctab">
        <h2>${ed('title', d.title)}</h2><p>${ed('sub', d.sub)}</p>
        <button class="rb-btn primary">${ed('cta', d.cta)}</button></div></div></section>`
    },
    faq: {
      name: 'FAQ', icon: 'shield', cat: 'Sektioner',
      schema: [{ k: 'title', l: 'Titel', t: 'text' }, { k: 'items', l: 'Spørgsmål', t: 'list', fields: [{ k: 'q', l: 'Spørgsmål', t: 'text' }, { k: 'a', l: 'Svar', t: 'textarea' }] }],
      defaults: { title: 'Ofte stillede spørgsmål', items: [{ q: 'Skal jeg kunne kode?', a: 'Nej — alt sker visuelt med AI og træk-og-slip.' }, { q: 'Kan jeg bruge eget domæne?', a: 'Ja, på Pro-planen kobler du nemt dit domæne på.' }, { q: 'Er der binding?', a: 'Nej, du kan opsige når som helst.' }] },
      render: d => `<section class="rb-sec"><div class="rb-wrap"><div class="rb-head"><h2>${ed('title', d.title)}</h2></div>
        <div class="rb-faq">${(d.items || []).map((it, i) => `<details ${i === 0 ? 'open' : ''} data-item="items" data-idx="${i}"><summary data-edit-list="items" data-i="${i}" data-f="q">${esc(it.q)}</summary><p data-edit-list="items" data-i="${i}" data-f="a">${esc(it.a)}</p></details>`).join('')}</div></div></section>`
    },
    contact: {
      name: 'Kontakt', icon: 'mail', cat: 'Sektioner',
      schema: [{ k: 'title', l: 'Titel', t: 'text' }, { k: 'sub', l: 'Undertekst', t: 'textarea' }, { k: 'phone', l: 'Telefon', t: 'text' }, { k: 'email', l: 'Email', t: 'text' }, { k: 'addr', l: 'Adresse', t: 'text' }, { k: 'cta', l: 'Knap', t: 'text' }],
      defaults: { title: 'Kontakt os', sub: 'Vi vender tilbage inden for 24 timer.', phone: '+45 12 34 56 78', email: 'support@reachmore.dk', addr: 'København, DK', cta: 'Send besked' },
      render: d => `<section class="rb-sec"><div class="rb-wrap"><div class="rb-head"><h2>${ed('title', d.title)}</h2><p>${ed('sub', d.sub)}</p></div>
        <div class="rb-contact"><div class="row"><input placeholder="Dit navn"><input placeholder="Din email"><textarea placeholder="Din besked"></textarea><button class="rb-btn primary" style="justify-content:center">${ed('cta', d.cta)}</button></div></div>
        <div class="rb-info"><span>${icon('phone')}${ed('phone', d.phone)}</span><span>${icon('mail')}${ed('email', d.email)}</span><span>${icon('pin')}${ed('addr', d.addr)}</span></div>
      </div></section>`
    },
    footer: {
      name: 'Footer', icon: 'layers', cat: 'Struktur',
      schema: [{ k: 'brand', l: 'Brand', t: 'text' }, { k: 'tagline', l: 'Tagline', t: 'text' }, { k: 'links', l: 'Links (komma)', t: 'text' }, { k: 'copy', l: 'Copyright', t: 'text' }],
      defaults: { brand: 'Reachmore', tagline: 'Byg mere. Nå længere.', links: 'Funktioner, Priser, Blog, Kontakt, Privatliv', copy: '© 2026 Reachmore. Alle rettigheder forbeholdes.' },
      render: d => `<footer class="rb-foot"><div class="rb-wrap"><div class="brand rb-grad">${ed('brand', d.brand)}</div>
        <p>${ed('tagline', d.tagline)}</p>
        <div class="fl">${(d.links || '').split(',').map(s => `<a>${esc(s.trim())}</a>`).join('')}</div>
        <p style="font-size:13px">${ed('copy', d.copy)}</p></div></footer>`
    },
    steps: {
      name: 'Proces', icon: 'rocket', cat: 'Sektioner',
      schema: [
        { k: 'eyebrow', l: 'Eyebrow', t: 'text' }, { k: 'title', l: 'Titel', t: 'text' }, { k: 'sub', l: 'Undertekst', t: 'textarea' },
        { k: 'items', l: 'Trin', t: 'list', fields: [{ k: 'title', l: 'Titel', t: 'text' }, { k: 'text', l: 'Tekst', t: 'textarea' }] }
      ],
      defaults: {
        eyebrow: 'Sådan virker det', title: 'Tre enkle trin', sub: 'Fra start til mål — uden besvær.',
        items: [{ title: 'Tag kontakt', text: 'Vi taler om dine behov og mål.' }, { title: 'Vi går i gang', text: 'Du får en klar plan og fast kontakt.' }, { title: 'Se resultater', text: 'Vi følger op og optimerer løbende.' }]
      },
      render: d => `<section class="rb-sec"><div class="rb-wrap">
        <div class="rb-head">${d.eyebrow ? `<div class="rb-eyebrow"><b></b>${ed('eyebrow', d.eyebrow)}</div>` : ''}<h2>${ed('title', d.title)}</h2><p>${ed('sub', d.sub)}</p></div>
        <div class="rb-steps">${(d.items || []).map((it, i) => `<div class="rb-step" data-item="items" data-idx="${i}"><div class="rb-step-n">${i + 1}</div><h3 data-edit-list="items" data-i="${i}" data-f="title">${esc(it.title)}</h3><p data-edit-list="items" data-i="${i}" data-f="text">${esc(it.text)}</p></div>`).join('')}</div>
      </div></section>`
    },
    team: {
      name: 'Team', icon: 'heart', cat: 'Sektioner',
      schema: [
        { k: 'eyebrow', l: 'Eyebrow', t: 'text' }, { k: 'title', l: 'Titel', t: 'text' }, { k: 'sub', l: 'Undertekst', t: 'textarea' },
        { k: 'items', l: 'Personer', t: 'list', fields: [{ k: 'img', l: 'Foto', t: 'image' }, { k: 'name', l: 'Navn', t: 'text' }, { k: 'role', l: 'Titel', t: 'text' }] }
      ],
      defaults: {
        eyebrow: 'Teamet', title: 'Mød holdet bag', sub: 'Erfarne mennesker der brænder for det de laver.',
        items: [{ name: 'Anna Holm', role: 'Stifter & CEO' }, { name: 'Mads Berg', role: 'Kreativ leder' }, { name: 'Sofie Lund', role: 'Rådgiver' }, { name: 'Jonas Krag', role: 'Specialist' }]
      },
      render: d => `<section class="rb-sec"><div class="rb-wrap">
        <div class="rb-head">${d.eyebrow ? `<div class="rb-eyebrow"><b></b>${ed('eyebrow', d.eyebrow)}</div>` : ''}<h2>${ed('title', d.title)}</h2><p>${ed('sub', d.sub)}</p></div>
        <div class="rb-grid rb-g4">${(d.items || []).map((it, i) => { const init = esc((it.name || '?').split(' ').map(w => w[0] || '').join('').slice(0, 2).toUpperCase()); return `<div class="rb-member" data-item="items" data-idx="${i}"><div class="rb-ava"${it.img ? ` style="background:url('${it.img}') center/cover"` : ''}>${it.img ? '' : init}</div><h3 data-edit-list="items" data-i="${i}" data-f="name">${esc(it.name)}</h3><p data-edit-list="items" data-i="${i}" data-f="role">${esc(it.role)}</p></div>`; }).join('')}</div>
      </div></section>`
    },
    image: {
      name: 'Billede', icon: 'camera', cat: 'Sektioner',
      schema: [{ k: 'image', l: 'Billede', t: 'image' }, { k: 'caption', l: 'Billedtekst', t: 'text' }, { k: 'rounded', l: 'Runde hjørner', t: 'select', options: ['ja', 'nej'] }, { k: 'height', l: 'Højde (px)', t: 'text' }],
      defaults: { image: '', caption: '', rounded: 'ja', height: '420' },
      render: d => `<section class="rb-sec"><div class="rb-wrap">
        <div class="rb-image${d.rounded === 'ja' ? ' r' : ''}" style="height:${parseInt(d.height) || 420}px;${d.image ? `background-image:url('${d.image}')` : ''}">${d.image ? '' : '<span>📷 Upload et billede i panelet til højre</span>'}</div>
        ${d.caption ? `<p class="rb-cap">${ed('caption', d.caption)}</p>` : ''}
      </div></section>`
    }
  };

  const order = ['navbar', 'hero', 'logos', 'features', 'steps', 'stats', 'split', 'team', 'gallery', 'image', 'pricing', 'testimonial', 'faq', 'cta', 'contact', 'footer'];

  function blankBlock(type) { return { type, data: JSON.parse(JSON.stringify(BLOCKS[type].defaults)) }; }

  // Per-section style overrides (background, text colour, font, alignment, padding)
  function blockStyleCss(s) {
    if (!s) return '';
    let css = '';
    if (s.text) css += `--fg:${s.text};--mut:color-mix(in srgb,${s.text} 62%,transparent);color:${s.text};`;
    if (s.bg) { css += `background:${s.bg};`; if (!s.text) css += `--card:color-mix(in srgb,${s.bg} 88%,#fff);`; }
    if (s.font) css += `font-family:${s.font};`;
    if (s.align) css += `text-align:${s.align};`;
    if (s.pad) css += `padding-top:${s.pad}px;padding-bottom:${s.pad}px;`;
    return css;
  }

  const FONTS = [
    { label: 'Inter — moderne', value: "'Inter',system-ui,sans-serif" },
    { label: 'Outfit — geometrisk', value: "'Outfit',sans-serif" },
    { label: 'Poppins — rund', value: "'Poppins',sans-serif" },
    { label: 'Montserrat', value: "'Montserrat',sans-serif" },
    { label: 'DM Sans', value: "'DM Sans',sans-serif" },
    { label: 'Space Grotesk — tech', value: "'Space Grotesk',sans-serif" },
    { label: 'Playfair Display — elegant', value: "'Playfair Display',serif" },
    { label: 'Lora — serif', value: "'Lora',serif" },
    { label: 'Fraunces — display', value: "'Fraunces',serif" },
    { label: 'Georgia — klassisk', value: "Georgia,'Times New Roman',serif" },
    { label: 'JetBrains Mono', value: "'JetBrains Mono',monospace" }
  ];
  // Google Fonts URL for studio + export (all selectable fonts)
  const FONTS_HREF = 'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,800&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;700&family=Lora:wght@400;500;600;700&family=Montserrat:wght@400;600;800&family=Outfit:wght@400;600;700;800;900&family=Playfair+Display:wght@400;600;800&family=Poppins:wght@400;600;800&family=Space+Grotesk:wght@400;600;700&display=swap';

  function renderSite(blocks, theme, opts = {}) {
    const t = Object.assign({ mode: 'dark', p: '#8b5cf6', p2: '#f97316', rad: 16, font: "'Inter',system-ui,sans-serif" }, theme || {});
    const inner = blocks.map((b, i) => {
      const def = BLOCKS[b.type]; if (!def) return '';
      return `<div class="rb-block" data-block="${i}" data-type="${b.type}" style="--i:${i};${blockStyleCss(b.style)}">${def.render(b.data)}</div>`;
    }).join('');
    return `<div class="rb-site" data-mode="${t.mode}" style="--p:${t.p};--p2:${t.p2};--rad:${t.rad}px;font-family:${t.font}">${inner}</div>`;
  }

  /* ============================================================
     AI SITE GENERATION  — prompt -> {theme, blocks}
     ============================================================ */
  const INDUSTRIES = {
    cafe: {
      keys: ['café', 'cafe', 'kaffe', 'coffee', 'restaurant', 'mad', 'bager', 'bistro', 'spise', 'menu', 'bar'],
      theme: { mode: 'dark', p: '#f59e0b', p2: '#ef4444' }, icon: 'coffee',
      brand: 'Bønne & Brew', eyebrow: 'Nyåbnet i centrum',
      head: 'Byens bedste kaffe, brygget med kærlighed',
      sub: 'Lokalristet kaffe, friskbagt brød og en hyggelig atmosfære midt i byen.',
      feats: [{ icon: 'coffee', title: 'Lokalristet', text: 'Friske bønner ristet hver morgen.' }, { icon: 'heart', title: 'Hjemmebag', text: 'Alt bages fra bunden dagligt.' }, { icon: 'globe', title: 'Bæredygtig', text: 'Fair trade og økologisk.' }],
      gallery: true, pricing: false, menu: true
    },
    agency: {
      keys: ['bureau', 'agency', 'marketing', 'reklame', 'konsulent', 'consulting', 'agentur', 'brand'],
      theme: { mode: 'dark', p: '#8b5cf6', p2: '#3b82f6' }, icon: 'rocket',
      brand: 'Atlas Agency', eyebrow: 'Digital bureau',
      head: 'Vi skaber brands der bliver husket',
      sub: 'Strategi, design og udvikling der får din virksomhed til at vokse.',
      feats: [{ icon: 'palette', title: 'Branding', text: 'Identiteter der skiller sig ud.' }, { icon: 'chart', title: 'Vækst', text: 'Datadrevet markedsføring.' }, { icon: 'rocket', title: 'Udvikling', text: 'Hjemmesider der konverterer.' }],
      gallery: true, pricing: true
    },
    portfolio: {
      keys: ['portfolio', 'cv', 'freelancer', 'designer', 'udvikler', 'kunstner', 'fotograf', 'photographer', 'personlig'],
      theme: { mode: 'dark', p: '#ec4899', p2: '#8b5cf6' }, icon: 'camera',
      brand: 'Studio Vega', eyebrow: 'Designer & Skaber',
      head: 'Hej, jeg laver smukke ting',
      sub: 'Freelance designer med fokus på brand-identitet, web og digitale oplevelser.',
      feats: [{ icon: 'palette', title: 'Design', text: 'Visuelle identiteter & UI.' }, { icon: 'camera', title: 'Foto', text: 'Produkt- og brandfotografi.' }, { icon: 'globe', title: 'Web', text: 'Responsive websites.' }],
      gallery: true, pricing: false
    },
    shop: {
      keys: ['shop', 'webshop', 'butik', 'e-commerce', 'ecommerce', 'sælg', 'produkt', 'tøj', 'store'],
      theme: { mode: 'light', p: '#10b981', p2: '#3b82f6' }, icon: 'cart',
      brand: 'Forma Store', eyebrow: 'Ny kollektion',
      head: 'Produkter du vil elske at eje',
      sub: 'Nøje udvalgte produkter af høj kvalitet — leveret direkte til din dør.',
      feats: [{ icon: 'cart', title: 'Gratis fragt', text: 'Over 499 kr i Danmark.' }, { icon: 'shield', title: 'Sikker betaling', text: 'Krypteret checkout.' }, { icon: 'heart', title: '30 dages retur', text: 'Ingen spørgsmål stillet.' }],
      gallery: true, pricing: false
    },
    fitness: {
      keys: ['fitness', 'gym', 'træning', 'sport', 'yoga', 'sundhed', 'coach', 'personlig træner'],
      theme: { mode: 'dark', p: '#84cc16', p2: '#10b981' }, icon: 'dumbbell',
      brand: 'Pulse Gym', eyebrow: 'Træningscenter',
      head: 'Bliv den bedste udgave af dig selv',
      sub: 'Moderne træningscenter med personlige programmer og holdtræning for alle niveauer.',
      feats: [{ icon: 'dumbbell', title: 'Topudstyr', text: 'Markedets bedste maskiner.' }, { icon: 'heart', title: 'Holdtræning', text: 'Over 40 hold om ugen.' }, { icon: 'chart', title: 'Resultater', text: 'Personlig opfølgning.' }],
      gallery: false, pricing: true
    },
    saas: {
      keys: ['app', 'saas', 'software', 'platform', 'startup', 'tech', 'produkt', 'værktøj', 'system', 'ai'],
      theme: { mode: 'dark', p: '#6366f1', p2: '#06b6d4' }, icon: 'bolt',
      brand: 'Lumen', eyebrow: 'Ny platform',
      head: 'Arbejd smartere, ikke hårdere',
      sub: 'Alt-i-en platformen der hjælper dit team med at få mere fra hånden — hurtigere.',
      feats: [{ icon: 'bolt', title: 'Automatisér', text: 'Spar timer hver uge.' }, { icon: 'chart', title: 'Indsigt', text: 'Realtids-dashboards.' }, { icon: 'shield', title: 'Sikkert', text: 'Enterprise-grade sikkerhed.' }, { icon: 'globe', title: 'Integrationer', text: '100+ apps forbundet.' }, { icon: 'rocket', title: 'Skalerbart', text: 'Vokser med dit team.' }, { icon: 'heart', title: 'Elsket', text: '4.9/5 fra 2.000+ brugere.' }],
      gallery: false, pricing: true, steps: true
    },
    restaurant: {
      keys: ['restaurant', 'spisested', 'gourmet', 'middag', 'menukort', 'køkken', 'a la carte', 'frokost', 'brasserie'],
      theme: { mode: 'dark', p: '#d4a574', p2: '#b45309' }, icon: 'coffee',
      brand: 'Restaurant Egn', eyebrow: 'Nordisk køkken',
      head: 'Smag årstiderne på din tallerken',
      sub: 'Sæsonens råvarer forvandlet til mindeværdige måltider.',
      feats: [{ icon: 'star', title: 'Sæsonmenu', text: 'Friske, lokale råvarer hver dag.' }, { icon: 'heart', title: 'Stemning', text: 'Intim atmosfære og varm service.' }, { icon: 'check', title: 'Book bord', text: 'Nem online reservation.' }],
      gallery: true, pricing: false
    },
    photographer: {
      keys: ['fotograf', 'photography', 'bryllupsfoto', 'portræt', 'fotostudie'],
      theme: { mode: 'dark', p: '#a78bfa', p2: '#6366f1' }, icon: 'camera',
      brand: 'Lys & Linse', eyebrow: 'Fotograf',
      head: 'Øjeblikke der varer ved',
      sub: 'Bryllup, portræt og erhverv — fanget med et kunstnerisk blik.',
      feats: [{ icon: 'camera', title: 'Bryllup', text: 'Hele dagen foreviget smukt.' }, { icon: 'heart', title: 'Portræt', text: 'Personlige sessioner i studie.' }, { icon: 'star', title: 'Erhverv', text: 'Profil- og produktfoto.' }],
      gallery: true, pricing: true
    },
    realestate: {
      keys: ['ejendom', 'bolig', 'mægler', 'lejlighed', 'real estate', 'sælg bolig', 'til salg', 'boligsalg'],
      theme: { mode: 'light', p: '#0ea5e9', p2: '#0f766e' }, icon: 'pin',
      brand: 'Bolig & Co', eyebrow: 'Ejendomsmægler',
      head: 'Find dit næste hjem',
      sub: 'Vi gør bolighandlen tryg, enkel og personlig — fra fremvisning til nøgler.',
      feats: [{ icon: 'pin', title: 'Lokalkendskab', text: 'Vi kender dit område bedst.' }, { icon: 'chart', title: 'Bedste pris', text: 'Skarp og ærlig vurdering.' }, { icon: 'shield', title: 'Tryg handel', text: 'Vi guider hele vejen.' }],
      gallery: true, pricing: false, team: true
    },
    beauty: {
      keys: ['frisør', 'salon', 'skønhed', 'spa', 'negle', 'makeup', 'beauty', 'wellness', 'massage', 'kosmetolog'],
      theme: { mode: 'dark', p: '#ec4899', p2: '#f472b6' }, icon: 'heart',
      brand: 'Glow Studio', eyebrow: 'Skønhedssalon',
      head: 'Forkæl dig selv — du fortjener det',
      sub: 'Hår, hud og velvære i rolige, smukke omgivelser.',
      feats: [{ icon: 'heart', title: 'Erfarne hænder', text: 'Dygtige specialister.' }, { icon: 'star', title: 'Topprodukter', text: 'Kun det bedste til din hud.' }, { icon: 'check', title: 'Online booking', text: 'Book din tid på sekunder.' }],
      gallery: true, pricing: true
    },
    clinic: {
      keys: ['klinik', 'tandlæge', 'læge', 'fysioterapi', 'kiropraktor', 'psykolog', 'behandling', 'patient', 'sundhedsklinik'],
      theme: { mode: 'light', p: '#0ea5e9', p2: '#14b8a6' }, icon: 'shield',
      brand: 'Sund Klinik', eyebrow: 'Klinik',
      head: 'Din sundhed i trygge hænder',
      sub: 'Professionel behandling med fokus på dig og din hverdag.',
      feats: [{ icon: 'shield', title: 'Erfarne behandlere', text: 'Autoriseret personale.' }, { icon: 'heart', title: 'Nærvær', text: 'Tid til den enkelte patient.' }, { icon: 'check', title: 'Nem tidsbestilling', text: 'Book online døgnet rundt.' }],
      gallery: false, pricing: false, team: true
    },
    law: {
      keys: ['advokat', 'jura', 'juridisk', 'retssag', 'erhvervsret', 'familieret', 'advokatfirma'],
      theme: { mode: 'dark', p: '#c0a062', p2: '#475569' }, icon: 'shield',
      brand: 'Advokat & Partnere', eyebrow: 'Advokatfirma',
      head: 'Stærk rådgivning, når det gælder',
      sub: 'Specialiseret juridisk bistand til private og virksomheder.',
      feats: [{ icon: 'shield', title: 'Erfaring', text: 'Mange års specialviden.' }, { icon: 'check', title: 'Klar tale', text: 'Jura uden volapyk.' }, { icon: 'star', title: 'Resultater', text: 'Vi kæmper for din sag.' }],
      gallery: false, pricing: false, team: true
    },
    event: {
      keys: ['event', 'bryllup', 'fest', 'konference', 'arrangement', 'festival', 'gallafest', 'eventbureau'],
      theme: { mode: 'dark', p: '#a855f7', p2: '#ec4899' }, icon: 'star',
      brand: 'Højdepunkt Events', eyebrow: 'Eventbureau',
      head: 'Vi skaber øjeblikke der huskes',
      sub: 'Fra intim fest til stor konference — vi står for det hele.',
      feats: [{ icon: 'star', title: 'Helhedsløsning', text: 'Vi planlægger alt fra A til Z.' }, { icon: 'heart', title: 'Personligt', text: 'Skræddersyet til jer.' }, { icon: 'rocket', title: 'Eksekvering', text: 'Alt kører på dagen.' }],
      gallery: true, pricing: false, steps: true
    },
    construction: {
      keys: ['håndværker', 'tømrer', 'maler', 'murer', 'vvs', 'elektriker', 'renovering', 'entreprenør', 'snedker', 'byggefirma'],
      theme: { mode: 'dark', p: '#f97316', p2: '#eab308' }, icon: 'bolt',
      brand: 'Solid Byg', eyebrow: 'Håndværk',
      head: 'Kvalitet du kan bygge på',
      sub: 'Fra renovering til nybyg — solidt håndværk og aftaler der holder.',
      feats: [{ icon: 'check', title: 'Fast pris', text: 'Ingen overraskelser.' }, { icon: 'shield', title: 'Garanti', text: 'Vi står ved vores arbejde.' }, { icon: 'star', title: 'Erfaring', text: 'Tilfredse kunder i hele landet.' }],
      gallery: true, pricing: false, steps: true
    },
    consulting: {
      keys: ['rådgiv', 'revisor', 'bogføring', 'finans', 'økonomi', 'virksomhedsrådgivning', 'erhvervsrådgivning'],
      theme: { mode: 'light', p: '#2563eb', p2: '#0891b2' }, icon: 'chart',
      brand: 'Vækst Rådgivning', eyebrow: 'Rådgivning',
      head: 'Klare tal, kloge beslutninger',
      sub: 'Vi hjælper din virksomhed med at vokse sundt og sikkert.',
      feats: [{ icon: 'chart', title: 'Overblik', text: 'Styr på økonomien.' }, { icon: 'rocket', title: 'Vækst', text: 'Strategi der virker.' }, { icon: 'shield', title: 'Tryghed', text: 'Altid compliant.' }],
      gallery: false, pricing: true, team: true, steps: true
    },
    education: {
      keys: ['kursus', 'skole', 'undervisning', 'uddannelse', 'læring', 'workshop', 'coaching', 'efteruddannelse', 'akademi'],
      theme: { mode: 'light', p: '#6366f1', p2: '#8b5cf6' }, icon: 'star',
      brand: 'Lær Mere Akademi', eyebrow: 'Kurser & uddannelse',
      head: 'Invester i dig selv',
      sub: 'Praktiske kurser der giver dig færdigheder du kan bruge fra dag ét.',
      feats: [{ icon: 'star', title: 'Erfarne undervisere', text: 'Eksperter fra branchen.' }, { icon: 'check', title: 'Fleksibelt', text: 'Online og fysisk.' }, { icon: 'rocket', title: 'Bevis', text: 'Diplom efter endt kursus.' }],
      gallery: false, pricing: true, steps: true
    },
    travel: {
      keys: ['rejse', 'rejser', 'hotel', 'ferie', 'oplevelse', 'destination', 'overnatning', 'bed and breakfast'],
      theme: { mode: 'dark', p: '#14b8a6', p2: '#f97316' }, icon: 'globe',
      brand: 'Bortrejst', eyebrow: 'Rejser & oplevelser',
      head: 'Oplevelser der bliver til minder',
      sub: 'Nøje udvalgte rejser og destinationer — book dit næste eventyr.',
      feats: [{ icon: 'globe', title: 'Unikke steder', text: 'Håndplukkede destinationer.' }, { icon: 'heart', title: 'Personlig service', text: 'Vi planlægger din drømmerejse.' }, { icon: 'shield', title: 'Tryg booking', text: 'Sikker betaling og support.' }],
      gallery: true, pricing: false
    },
    business: {
      keys: ['virksomhed', 'firma', 'company', 'erhverv', 'forretning'],
      theme: { mode: 'dark', p: '#8b5cf6', p2: '#f97316' }, icon: 'rocket',
      brand: 'Din Virksomhed', eyebrow: 'Velkommen',
      head: 'Bygget til at gøre en forskel',
      sub: 'Vi leverer løsninger der skaber værdi for vores kunder hver dag.',
      feats: [{ icon: 'bolt', title: 'Hurtig', text: 'Vi leverer til tiden.' }, { icon: 'shield', title: 'Pålidelig', text: 'Kvalitet du kan stole på.' }, { icon: 'heart', title: 'Personlig', text: 'Vi sætter dig først.' }],
      gallery: false, pricing: true, steps: true, team: true
    }
  };

  /* ---- Prompt understanding ---- */
  const COLOR_WORDS = {
    'lilla': ['#8b5cf6', '#6d28d9'], 'purple': ['#8b5cf6', '#6d28d9'], 'violet': ['#8b5cf6', '#6d28d9'],
    'blå': ['#3b82f6', '#06b6d4'], 'blue': ['#3b82f6', '#06b6d4'],
    'grøn': ['#10b981', '#059669'], 'green': ['#10b981', '#059669'],
    'rød': ['#ef4444', '#f97316'], 'red': ['#ef4444', '#f97316'],
    'orange': ['#f97316', '#ef4444'],
    'pink': ['#ec4899', '#8b5cf6'], 'rosa': ['#ec4899', '#f472b6'], 'magenta': ['#d8519e', '#8b5cf6'],
    'gul': ['#eab308', '#f97316'], 'guld': ['#c0a062', '#b45309'], 'gold': ['#c0a062', '#b45309'],
    'turkis': ['#14b8a6', '#06b6d4'], 'teal': ['#14b8a6', '#0891b2'], 'cyan': ['#06b6d4', '#3b82f6']
  };
  const CITIES = ['københavn', 'aarhus', 'århus', 'odense', 'aalborg', 'esbjerg', 'randers', 'kolding', 'vejle', 'horsens', 'roskilde', 'herning', 'silkeborg', 'næstved', 'frederiksberg', 'helsingør', 'viborg', 'fredericia', 'hillerød', 'holstebro', 'slagelse', 'amager', 'valby'];
  const cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
  const slug = s => (s || 'site').toLowerCase().replace(/æ/g, 'ae').replace(/ø/g, 'oe').replace(/å/g, 'aa').replace(/[^a-z0-9]/g, '').slice(0, 24) || 'site';

  function parsePrompt(prompt) {
    const raw = prompt || '', t = raw.toLowerCase();
    let brand = null;
    const m = raw.match(/(?:kaldet|ved navn|hedder|navngivet|kaldt|called|named|firma der hedder|virksomhed der hedder)\s+["'«]?([A-Za-zÆØÅæøå0-9&.\-]+(?:\s+[A-Za-zÆØÅæøå0-9&.\-]+){0,2})["'»]?/i);
    if (m) brand = m[1].trim().split(/\s+(?:i|med|på|som|der|til|hvor)\s+/i)[0].replace(/\s+/g, ' ').replace(/[.,!?]+$/, '').trim();
    let color = null;
    for (const c in COLOR_WORDS) if (new RegExp('(^|[^a-zæøå])' + c).test(t)) { color = COLOR_WORDS[c]; break; }
    let mode = null;
    if (/(luksus|eksklusiv|elegant|premium|mørk|sort|nat|stilfuld|dramatisk)/.test(t)) mode = 'dark';
    if (/(lys tema|minimalist|minimalistisk|ren stil|enkel stil|frisk|hvid|luftig)/.test(t)) mode = 'light';
    let loc = null;
    for (const city of CITIES) if (t.includes(city)) { loc = cap(city); break; }
    return { brand, color, mode, loc };
  }

  function pickIndustry(prompt) {
    const t = (prompt || '').toLowerCase();
    let best = null, score = 0;
    for (const key in INDUSTRIES) {
      if (key === 'business') continue; // business is a fallback only, never competes
      let s = 0;
      for (const kw of INDUSTRIES[key].keys) if (t.includes(kw)) s += kw.length; // longer / more specific matches weigh more
      if (s > score) { score = s; best = key; }
    }
    best = best || 'business';
    return Object.assign({ key: best }, INDUSTRIES[best]);
  }

  /* ============================================================
     UNIQUENESS ENGINE — seeded RNG, design vibes, hue-rotated
     palettes, varied layouts, per-section accents & copy pools.
     Combinations: 8 vibes × ~continuous hue × 2 modes × 11 fonts
     × 12 headline templates × 5 layouts × accent placement × …
     => far more than 10.000 distinct, personal sites.
     ============================================================ */
  function hashStr(s) { let h = 2166136261 >>> 0; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rngFrom(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  // hex <-> hsl for palette hue rotation (effectively unlimited colour variety)
  function hexToHsl(hex) { hex = hex.replace('#', ''); if (hex.length === 3) hex = hex.split('').map(c => c + c).join(''); const r = parseInt(hex.slice(0, 2), 16) / 255, g = parseInt(hex.slice(2, 4), 16) / 255, b = parseInt(hex.slice(4, 6), 16) / 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b); let h, s, l = (mx + mn) / 2; if (mx === mn) { h = s = 0; } else { const d = mx - mn; s = l > .5 ? d / (2 - mx - mn) : d / (mx + mn); switch (mx) { case r: h = (g - b) / d + (g < b ? 6 : 0); break; case g: h = (b - r) / d + 2; break; default: h = (r - g) / d + 4; } h /= 6; } return [h * 360, s, l]; }
  function hslToHex(h, s, l) { h /= 360; const f = n => { const k = (n + h * 12) % 12; const a = s * Math.min(l, 1 - l); return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)); }; const to = v => ('0' + Math.round(f(v) * 255).toString(16)).slice(-2); return '#' + to(0) + to(8) + to(4); }
  function rotate(hex, deg) { try { const c = hexToHsl(hex); return hslToHex((c[0] + deg + 360) % 360, Math.min(1, c[1]), c[2]); } catch (e) { return hex; } }

  // Design "vibes" — a coherent personality driving font, shape, spacing & accents
  const VIBES = {
    bold:      { label: 'Dristig',        font: "'Space Grotesk',sans-serif", rad: 8,  accent: .55, hero: 'mock' },
    minimal:   { label: 'Minimalistisk',  font: "'Inter',system-ui,sans-serif", rad: 6, accent: .12, hero: 'plain' },
    elegant:   { label: 'Elegant',        font: "'Playfair Display',serif", rad: 14, accent: .3,  hero: 'mock' },
    playful:   { label: 'Legende',        font: "'Poppins',sans-serif", rad: 26, accent: .6,  hero: 'mock' },
    corporate: { label: 'Professionel',   font: "'DM Sans',sans-serif", rad: 10, accent: .22, hero: 'mock' },
    editorial: { label: 'Redaktionel',    font: "'Fraunces',serif", rad: 12, accent: .35, hero: 'plain' },
    warm:      { label: 'Varm',           font: "'Lora',serif", rad: 18, accent: .4,  hero: 'mock' },
    techno:    { label: 'Teknisk',        font: "'JetBrains Mono',monospace", rad: 4, accent: .3, hero: 'plain' }
  };
  const VIBE_KEYS = Object.keys(VIBES);
  function pickVibe(t, rnd) {
    if (/luksus|eksklusiv|elegant|premium|fin /.test(t)) return 'elegant';
    if (/leg|sjov|børn|farverig|fest|ung/.test(t)) return 'playful';
    if (/professionel|erhverv|seriøs|advokat|revisor|finans|b2b/.test(t)) return 'corporate';
    if (/minimal|enkel|ren stil|clean|stilren/.test(t)) return 'minimal';
    if (/tech|app|saas|software|\bai\b|developer|kode/.test(t)) return 'techno';
    if (/hygge|varm|café|cafe|bager|hjemlig|familie/.test(t)) return 'warm';
    if (/magasin|blog|historie|fortæl|redaktion/.test(t)) return 'editorial';
    return VIBE_KEYS[Math.floor(rnd() * VIBE_KEYS.length)];
  }

  const TAGLINES = ['få mere fra hånden', 'skabt til vækst', 'enkelt og effektivt', 'kvalitet i hver detalje', 'din partner i hverdagen', 'tænkt forfra', 'gjort ordentligt', 'bygget på tillid', 'med omtanke', 'uden besvær', 'der gør en forskel', 'til dig der vil mere'];
  const CTA1 = ['Kom i gang', 'Book et møde', 'Prøv gratis', 'Få et tilbud', 'Start i dag', 'Kontakt os', 'Bestil nu', 'Kom godt fra start'];
  const CTA2 = ['Læs mere', 'Se hvordan', 'Mød os', 'Se mere', 'Vores arbejde', 'Se priser', 'Hør mere'];
  const FEAT_TITLES = ['Det her kan vi', 'Sådan hjælper vi dig', 'Hvad vi tilbyder', 'Derfor vælger de os', 'Vores styrker', 'Det får du'];
  const STAT_SETS = [
    [{ n: '12k+', l: 'Glade kunder' }, { n: '99.9%', l: 'Oppetid' }, { n: '4.9★', l: 'Bedømmelse' }, { n: '24/7', l: 'Support' }],
    [{ n: '8 år', l: 'På markedet' }, { n: '350+', l: 'Projekter' }, { n: '98%', l: 'Anbefaler os' }, { n: '15', l: 'Eksperter' }],
    [{ n: '2.4k', l: 'Kunder' }, { n: '4.8★', l: 'Anmeldelser' }, { n: '48t', l: 'Svartid' }, { n: '100%', l: 'Tilfredshed' }],
    [{ n: '#1', l: 'I området' }, { n: '500+', l: 'Opgaver løst' }, { n: '10 år', l: 'Erfaring' }, { n: '5★', l: 'På Google' }],
    [{ n: '20k+', l: 'Leverede ordrer' }, { n: '4.9★', l: 'Trustpilot' }, { n: '1-2 dage', l: 'Levering' }, { n: '0 kr', l: 'Opstart' }],
    [{ n: '120+', l: 'Samarbejder' }, { n: '92%', l: 'Genkøb' }, { n: '< 1t', l: 'Svartid' }, { n: 'A+', l: 'Anbefaling' }]
  ];
  const TESTI = [
    { q: '"Bedste beslutning vi har taget. Professionelt fra start til slut."', w: 'Tilfreds kunde' },
    { q: '"{B} leverede præcis det vi håbede på — og mere til. Klar anbefaling."', w: 'Anmeldelse · Google' },
    { q: '"Hurtige, dygtige og til at stole på. Vi kommer helt sikkert igen."', w: 'Loyal kunde' },
    { q: '"Fra første kontakt følte vi os i trygge hænder hos {B}."', w: 'Anmeldelse · Trustpilot' },
    { q: '"Resultaterne talte for sig selv. {B} overgik alle vores forventninger."', w: 'Samarbejdspartner' },
    { q: '"Personlig service i topklasse. Man mærker at de brænder for det."', w: 'Fast kunde gennem 3 år' }
  ];
  const SPLIT_TITLES = ['Hvorfor vælge {B}?', 'Det her gør os anderledes', 'Bygget på tillid', 'Mere end bare en leverandør', 'Din fordel med {B}', 'Sådan skaber vi værdi'];
  const HEAD_TEMPLATES = ['{IND}', '{BRAND} — {TAG}', '{TOPIC_CAP}, gjort enkelt', 'Velkommen til {BRAND}', 'Vi gør {TOPIC} nemt', 'Din partner i {TOPIC}', '{BRAND}: {TAG}', 'Oplev {BRAND}', '{TAG_CAP}', 'Mød {BRAND}', 'Alt inden for {TOPIC}', 'Skab mere med {BRAND}'];

  function extractTopic(raw, brand, loc) {
    let t = ' ' + (raw || '').toLowerCase() + ' ';
    t = t.replace(/\b(lav|byg|opret|generer|generér|design|skab|kan du lave|jeg vil have|jeg har brug for|jeg skal bruge)\b/g, ' ');
    t = t.replace(/\b(et|en|mit|min|mine|vores|noget)\b/g, ' ');
    t = t.replace(/\b(websted|website|hjemmeside|landingsside|webside|side|web)\b/g, ' ');
    t = t.replace(/\b(til|om|for|der handler om|med)\b/g, ' ');
    if (brand) t = t.replace(new RegExp(brand.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), ' ');
    if (loc) t = t.replace(new RegExp(loc.toLowerCase(), 'g'), ' ');
    t = t.replace(/\b(kaldet|ved navn|hedder|navngivet|kaldt|i|på|som|der|hvor)\b/g, ' ');
    t = t.replace(/[^a-zæøåäöüéèáàóíú0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
    const stop = new Set(['og', 'eller', 'meget', 'flot', 'flere', 'mere', 'gerne', 'lige']);
    const words = t.split(' ').filter(w => w.length > 2 && !stop.has(w)).slice(0, 4);
    return words.join(' ').trim();
  }

  function generateSite(prompt, opts) {
    opts = opts || {};
    const ind = pickIndustry(prompt);
    const p = parsePrompt(prompt);
    const t = (prompt || '').toLowerCase();
    const brand = opts.brand || p.brand || ind.brand;
    const seed = opts.seed != null ? opts.seed : (hashStr(prompt || '') ^ Math.floor(Math.random() * 1e9));
    const rnd = rngFrom(seed >>> 0);
    const pick = arr => arr[Math.floor(rnd() * arr.length)];
    const chance = pr => rnd() < pr;
    const topic = extractTopic(prompt, p.brand, p.loc);
    const isGeneric = ind.key === 'business';

    const vibe = VIBES[opts.vibe] ? opts.vibe : pickVibe(t, rnd);
    const V = VIBES[vibe];

    // Palette: explicit colour > industry, then hue-rotate for uniqueness
    let pc = (opts.color && opts.color[0]) || (p.color && p.color[0]) || ind.theme.p;
    let pc2 = (opts.color && opts.color[1]) || (p.color && p.color[1]) || ind.theme.p2;
    const rot = Math.round((rnd() * 2 - 1) * (isGeneric ? 70 : 26));
    pc = rotate(pc, rot); pc2 = rotate(pc2, rot + Math.round((rnd() * 2 - 1) * 16));

    const theme = {
      mode: opts.mode || p.mode || ind.theme.mode,
      p: pc, p2: pc2,
      rad: opts.rad != null ? opts.rad : V.rad + Math.round(rnd() * 6),
      font: opts.font || V.font
    };

    // Headline via templates
    const tagPick = pick(TAGLINES);
    const fill = tpl => tpl
      .replace('{IND}', ind.head)
      .replace('{BRAND}', cap(brand))
      .replace('{TAG_CAP}', cap(tagPick)).replace('{TAG}', tagPick)
      .replace('{TOPIC_CAP}', topic ? cap(topic) : cap(brand)).replace('{TOPIC}', topic || 'dit projekt');
    const headline = fill(pick(HEAD_TEMPLATES.filter(tpl => topic || !tpl.includes('{TOPIC'))));

    let sub = ind.sub;
    if (isGeneric && topic) sub = 'Din partner inden for ' + topic + '. ' + ind.sub;
    if (p.loc) sub = sub.replace(/\.\s*$/, '') + ' — midt i ' + p.loc + '.';
    const eyebrow = p.loc ? (ind.eyebrow + ' · ' + p.loc) : ind.eyebrow;

    // Section composition (opts override > industry flag > prompt hint > chance)
    const inc = opts.include || {};
    const want = (key, flag, re, ch) => inc[key] != null ? inc[key] : (flag || re.test(t) || chance(ch));
    const has = {
      stats: chance(.85),
      steps: want('steps', ind.steps, /proces|sådan virker|trin|forløb/, .3),
      team: want('team', ind.team, /team|medarbejder|hold bag|os bag|personale/, .25),
      gallery: want('gallery', ind.gallery, /galleri|billed|portfolio|foto|vis frem/, .3),
      pricing: want('pricing', ind.pricing, /pris|abonnement|pakke|medlemskab|priser/, .3),
      logos: chance(.7),
      faq: chance(.8),
      testimonial: chance(.85)
    };

    // Layout — order of the middle sections (structural variety)
    const MIDDLE_LAYOUTS = [
      ['logos', 'features', 'steps', 'stats', 'split', 'team', 'gallery', 'pricing', 'testimonial', 'faq'],
      ['features', 'split', 'stats', 'gallery', 'team', 'testimonial', 'pricing', 'faq', 'logos'],
      ['stats', 'features', 'split', 'steps', 'gallery', 'pricing', 'testimonial', 'faq'],
      ['logos', 'split', 'features', 'gallery', 'steps', 'team', 'testimonial', 'pricing', 'faq'],
      ['features', 'stats', 'testimonial', 'split', 'gallery', 'pricing', 'faq']
    ];
    const layout = pick(MIDDLE_LAYOUTS).filter(s => (s === 'features' || s === 'split') ? true : has[s]);

    const blocks = [];
    const push = (type, over, style) => { const b = blankBlock(type); if (over) deepMerge(b.data, over); if (style) b.style = style; blocks.push(b); };
    const tint = amt => `color-mix(in srgb, ${pc} ${amt}%, ${theme.mode === 'dark' ? '#0b0b12' : '#ffffff'})`;
    const accent = () => ({ bg: tint(theme.mode === 'dark' ? 14 : 9) });

    push('navbar', { brand });
    push('hero', { eyebrow: chance(.85) ? eyebrow : '', headline, sub, cta1: pick(CTA1), cta2: chance(.7) ? pick(CTA2) : '', visual: V.hero === 'plain' ? 'nej' : 'ja' });

    const builders = {
      logos: () => push('logos'),
      features: () => push('features', { title: ind.featTitle || pick(FEAT_TITLES), items: ind.feats }, chance(V.accent) ? accent() : null),
      steps: () => push('steps', null, chance(V.accent * .6) ? accent() : null),
      stats: () => push('stats', { items: pick(STAT_SETS) }, chance(V.accent) ? accent() : null),
      split: () => push('split', { title: pick(SPLIT_TITLES).replace('{B}', brand), text: sub, flip: chance(.5) ? 'ja' : 'nej' }),
      team: () => push('team'),
      gallery: () => push('gallery'),
      pricing: () => push('pricing'),
      testimonial: () => { const q = pick(TESTI); push('testimonial', { quote: q.q.replace('{B}', brand), who: q.w }, chance(V.accent * .5) ? accent() : null); },
      faq: () => push('faq')
    };
    layout.forEach(sec => builders[sec] && builders[sec]());

    push('cta', { cta: pick(CTA1) });
    push('contact', { email: 'hej@' + slug(brand) + '.dk', addr: p.loc ? (p.loc + ', Danmark') : 'Danmark' });
    push('footer', { brand, copy: '© ' + new Date().getFullYear() + ' ' + cap(brand) + '. Alle rettigheder forbeholdes.' });

    return { theme, blocks, meta: { industry: ind.key, brand, topic, vibe, seed } };
  }

  function deepMerge(a, b) { for (const k in b) { if (Array.isArray(b[k])) a[k] = b[k]; else if (b[k] && typeof b[k] === 'object') { a[k] = a[k] || {}; deepMerge(a[k], b[k]); } else a[k] = b[k]; } return a; }

  window.RB = { STYLES, BLOCKS, ICONS, FONTS, FONTS_HREF, VIBES, order, renderSite, generateSite, blankBlock, pickIndustry, parsePrompt, COLOR_WORDS, blockStyleCss };
})();
