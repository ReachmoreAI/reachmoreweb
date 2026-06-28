/* ============================================================
   Reachmore AI Helper Bot  —  framer.ai-style assistant
   Works fully offline (smart intent matching). Pages can register
   commands via window.ReachmoreBot.registerCommand(name, fn).
   ============================================================ */
(function () {
  const SVG_SPARK = '<svg viewBox="0 0 24 24" fill="none"><path d="M12 2l1.6 5.2L19 9l-5.4 1.8L12 16l-1.6-5.2L5 9l5.4-1.8L12 2z" fill="currentColor"/><path d="M19 14l.8 2.4L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.6L19 14z" fill="currentColor" opacity=".7"/></svg>';
  const SVG_SEND = '<svg viewBox="0 0 24 24" fill="none"><path d="M4 12l16-8-6 16-2.5-6L4 12z" fill="currentColor"/></svg>';

  const commands = {};
  let booted = false, opened = false;

  // ---- Conversation memory (persists across reloads) ----
  const MEMKEY = 'rm-bot-mem';
  let memory = loadMem();
  function loadMem() { try { const m = JSON.parse(localStorage.getItem(MEMKEY)); if (m) return m; } catch (e) {} return { topic: null, brand: null, turns: 0, history: [] }; }
  function saveMem() { try { memory.history = memory.history.slice(-12); localStorage.setItem(MEMKEY, JSON.stringify(memory)); } catch (e) {} }
  function remember(k, v) { memory[k] = v; saveMem(); }
  function firstName() { try { const u = window.RM && window.RM.currentUser(); return u ? (u.name || '').split(' ')[0] : null; } catch (e) { return null; } }

  // ---- Knowledge base: intent -> response (offline "AI") ----
  const KB = [
    {
      k: ['pris', 'pricing', 'koster', 'cost', 'plan', 'abonnement', 'betaling', 'gratis', 'fri'],
      a: () => `Det er <strong>gratis at bygge</strong> så meget du vil! 🎉 Du skal kun betale når du vil <strong>udgive</strong> dit website live:<br><strong>Start — 99 kr/md</strong> (1 udgivet site, 5.000 tokens/md)<br><strong>Pro — 199 kr/md</strong> (ubegrænset, eget domæne, 20.000 tokens) ⭐<br><strong>Business — 399 kr/md</strong> (team, 100.000 tokens).<br>Skriv "vis priser" for at se dem.`
    },
    {
      k: ['token', 'tokens', 'kredit', 'credit', 'forbrug'],
      a: () => `Reachmore AI kører på <strong>tokens</strong>. Du starter med <strong>1.500 gratis tokens</strong>. Et helt website koster 250, en enkelt sektion 60. Når du løber tør, kan du opgradere til en plan og få mange flere hver måned. Du kan se din saldo øverst i Studio ✨`
    },
    {
      k: ['publi', 'udgiv', 'deploy', 'live', 'domæne', 'domain'],
      a: () => `Du kan bygge gratis — men for at <strong>udgive</strong> live skal du have en plan (fra 99 kr/md). Klik <strong>Udgiv</strong> i Studio's topbar; har du en plan, går dit site live på <em>navn.reachmore.app</em> eller dit eget domæne. 🚀`
    },
    {
      k: ['eksport', 'export', 'download', 'kode', 'html', 'code'],
      a: () => `Du kan eksportere hele dit site som ren HTML/CSS via <strong>Eksportér</strong> i topbaren. Det kræver en plan (ligesom udgivelse), så du ejer og kan hoste din kode hvor som helst.`
    },
    {
      k: ['template', 'skabelon', 'eksempel', 'inspiration'],
      a: () => `Vi har skabeloner til startups, portfolio, webshop, café, agentur og events. Åbn en i Studio og tilpas alt med AI. Skriv "vis skabeloner" for at se dem.`
    },
    {
      k: ['drag', 'træk', 'flyt', 'editor', 'rediger', 'redigér'],
      a: () => `I Studio kan du klikke på enhver sektion for at vælge den, redigere tekst direkte, ændre farver i højre panel, og trække sektioner op/ned. Alt er live. 🎨`
    },
    {
      k: ['responsive', 'mobil', 'tablet', 'telefon'],
      a: () => `Alt du bygger i Reachmore er automatisk responsivt. Brug enheds-knapperne (💻 📱) i Studio's topbar for at se desktop, tablet og mobil.`
    },
    {
      k: ['hjælp', 'help', 'hvad kan du', 'guide', 'start', 'hvordan'],
      a: () => `Jeg er din Reachmore-assistent! Jeg kan:<br>• Generere et helt site fra en beskrivelse<br>• Tilføje sektioner ("tilføj priser")<br>• Skifte tema/farver ("gør den lilla")<br>• Forklare alle funktioner<br>Prøv: <em>"byg et site til min café"</em> ✨`
    },
    {
      k: ['hej', 'hello', 'hi', 'yo', 'goddag', 'hallo'],
      a: () => `Hej! 👋 Jeg er Reachmore AI. Beskriv det website du drømmer om, så bygger jeg det for dig. Hvad skal vi lave i dag?`
    },
    {
      k: ['tak', 'thanks', 'thank you', 'fedt', 'super', 'perfekt'],
      a: () => `Selv tak! 💜 Sig til hvis du vil tilføje flere sektioner eller finpudse designet.`
    },
    {
      k: ['ai', 'kunstig', 'hvordan virker', 'magi'],
      a: () => `Reachmore bruger AI til at omdanne din tekst til et færdigt, redigerbart website — sektion for sektion. Du beskriver, vi designer, du finpudser. Helt som framer.ai, bare på dansk. 🤖`
    }
  ];

  function respond(text) {
    const t = (text || '').toLowerCase().trim();
    memory.turns = (memory.turns || 0) + 1; memory.history.push({ u: text }); saveMem();

    // 0) Context-aware follow-ups using memory
    if (/^(ja|gør det|kør|fortsæt|ok|yes)\b/.test(t) && memory.topic && commands._generate) {
      const r = commands._generate(memory.topic, memory.topic); if (r) return r;
    }
    if (/(mere|også|tilføj noget|flere sektioner|byg videre)/.test(t) && !/(pris|sektion|funktion|galleri|kontakt|faq|tal|team|proces)/.test(t)) {
      return { reply: `Vil du have mig til at tilføje en bestemt sektion${memory.brand ? ' til ' + memory.brand : ''}? Sig fx <em>"tilføj en prissektion"</em>, <em>"tilføj et galleri"</em> eller <em>"tilføj et team"</em>. 👍` };
    }

    // 1) Try registered page commands first (e.g. studio actions).
    //    Skip internal handlers (prefixed with "_", e.g. the site generator),
    //    which are invoked explicitly by intent below — not on every message.
    for (const name in commands) {
      if (name[0] === '_') continue;
      const res = commands[name](t, text);
      if (res) return res; // {reply, handled}
    }

    // 2) "generate / build a site" intent
    if (/(byg|lav|generer|generér|opret|create|build|generate|make).*(site|website|hjemmeside|landing|side|webshop|portfolio)/.test(t)
        || /^(byg|lav|generer|opret) /.test(t)) {
      const topic = extractTopic(text);
      remember('topic', topic || text);
      try { if (window.RB && window.RB.generateSite) remember('brand', (window.RB.generateSite(text).meta || {}).brand); } catch (e) {}
      // If a page registered a generator, let it handle
      if (commands._generate) {
        const r = commands._generate(topic, text);
        if (r) return r;
      }
      return { reply: `God idé! ✨ For at generere et komplet "${topic || 'dit'}" website skal vi over i <strong>Studio</strong>. <a href="studio.html?prompt=${encodeURIComponent(text)}">Åbn Studio og byg det →</a>` };
    }

    // 3) Navigation intents
    if (/(åbn|open|gå til|vis).*(studio|editor|byg)/.test(t)) {
      return { reply: `Åbner Reachmore Studio for dig… <a href="studio.html">Klik her hvis intet sker →</a>`, after: () => setTimeout(() => location.href = 'studio.html', 600) };
    }
    if (/(vis|se).*(pris|pricing)/.test(t)) { jump('#pricing'); return { reply: 'Her er vores priser 👇 (scroller ned)' }; }
    if (/(vis|se).*(skabelon|template)/.test(t)) { jump('#templates'); return { reply: 'Her er skabelonerne 👇' }; }
    if (/(vis|se).*(feature|funktion)/.test(t)) { jump('#features'); return { reply: 'Her er funktionerne 👇' }; }

    // 4) Knowledge base
    for (const item of KB) {
      if (item.k.some(kw => t.includes(kw))) return { reply: item.a() };
    }

    // 5) Fallback
    return { reply: `Godt spørgsmål! 🤔 Jeg er bedst til at hjælpe med at <strong>bygge og designe websites</strong>. Prøv fx:<br>• "byg et site til mit firma"<br>• "tilføj en prissektion"<br>• "hvad koster Reachmore?"` };
  }

  function extractTopic(text) {
    const m = (text || '').match(/(?:til|for|about|om)\s+(.+)$/i);
    if (m) return m[1].replace(/[.!?]+$/, '').trim();
    return '';
  }
  function jump(sel) { const el = document.querySelector(sel); if (el) el.scrollIntoView({ behavior: 'smooth' }); }

  // ---- UI ----
  function build() {
    if (booted) return; booted = true;

    const fab = document.createElement('div');
    fab.className = 'rm-bot-fab';
    fab.innerHTML = SVG_SPARK + '<span class="nudge">Spørg Reachmore AI ✨</span>';

    const panel = document.createElement('div');
    panel.className = 'rm-bot-panel';
    panel.innerHTML = `
      <div class="rm-bot-head">
        <div class="ava">${SVG_SPARK}</div>
        <div><h4>Reachmore AI</h4><div class="st">Online · klar til at hjælpe</div></div>
        <div class="x" title="Luk">×</div>
      </div>
      <div class="rm-bot-body" id="rmBotBody"></div>
      <div class="rm-bot-sugg" id="rmBotSugg"></div>
      <div class="rm-bot-foot">
        <input id="rmBotInput" placeholder="Skriv en besked…" autocomplete="off">
        <button class="send" title="Send">${SVG_SEND}</button>
      </div>`;

    document.body.appendChild(fab);
    document.body.appendChild(panel);

    const body = panel.querySelector('#rmBotBody');
    const sugg = panel.querySelector('#rmBotSugg');
    const input = panel.querySelector('#rmBotInput');

    const SUGG = window.__RM_BOT_SUGG__ || ['Byg et site til min café', 'Hvad koster det?', 'Vis skabeloner', 'Hvordan udgiver jeg?'];
    SUGG.forEach(s => { const b = document.createElement('button'); b.textContent = s; b.onclick = () => send(s); sugg.appendChild(b); });

    function addMsg(html, who) {
      const m = document.createElement('div');
      m.className = 'rm-msg ' + who;
      m.innerHTML = `<div class="b">${html}</div>`;
      body.appendChild(m); body.scrollTop = body.scrollHeight;
      return m;
    }
    function typing() {
      const m = document.createElement('div');
      m.className = 'rm-msg bot';
      m.innerHTML = `<div class="b"><div class="rm-typing"><span></span><span></span><span></span></div></div>`;
      body.appendChild(m); body.scrollTop = body.scrollHeight; return m;
    }
    function send(text) {
      text = (text || input.value).trim(); if (!text) return;
      addMsg(escapeHtml(text), 'user'); input.value = '';
      const t = typing();
      const result = respond(text);
      setTimeout(() => {
        t.remove();
        addMsg(result.reply, 'bot');
        if (result.after) result.after();
      }, 480 + Math.random() * 420);
    }
    function escapeHtml(s) { return s.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c])); }

    // open/close
    function toggle(open) {
      opened = open === undefined ? !opened : open;
      panel.classList.toggle('open', opened);
      if (opened) {
        input.focus();
        if (!body.dataset.greeted) {
          body.dataset.greeted = '1';
          const nm = firstName();
          let greet = window.__RM_BOT_GREETING__ || `Hej! 👋 Jeg er <strong>Reachmore AI</strong>. Beskriv det website du vil have, så bygger jeg det. ✨`;
          if (nm) greet = `Hej igen, <strong>${nm}</strong>! 👋 ` + greet.replace(/^Hej!?\s*👋?\s*/i, '');
          if (memory.topic) greet += `<br><span class="muted" style="font-size:13px">Sidst talte vi om <em>${escapeHtml(String(memory.topic))}</em> — skal vi fortsætte?</span>`;
          const t = typing(); setTimeout(() => { t.remove(); addMsg(greet, 'bot'); }, 500);
        }
      }
    }
    fab.addEventListener('click', () => toggle());
    panel.querySelector('.x').addEventListener('click', () => toggle(false));
    panel.querySelector('.send').addEventListener('click', () => send());
    input.addEventListener('keydown', e => { if (e.key === 'Enter') send(); });

    window.ReachmoreBot.open = () => toggle(true);
    window.ReachmoreBot.say = (html) => { if (!opened) toggle(true); addMsg(html, 'bot'); };
    window.ReachmoreBot.ask = (text) => { if (!opened) toggle(true); setTimeout(() => send(text), 300); };
  }

  window.ReachmoreBot = {
    registerCommand: (name, fn) => { commands[name] = fn; },
    registerGenerator: (fn) => { commands._generate = fn; },
    remember, getMemory: () => memory,
    open: () => {}, say: () => {}, ask: () => {}
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  else build();
})();
