/* ============================================================
   Reachmore Studio  —  visual editor engine
   ============================================================ */
(function () {
  const $ = s => document.querySelector(s);
  const RB = window.RB;

  // Inject render styles (shared block CSS) into the document
  const st = document.createElement('style'); st.textContent = RB.STYLES; document.head.appendChild(st);

  const STORE = 'rm-site-v1';
  const ICONS = RB.ICONS;

  /* ---------- State ---------- */
  let site = { name: 'Mit website', theme: { mode: 'dark', p: '#8b5cf6', p2: '#f97316', rad: 16, font: "'Inter',system-ui,sans-serif" }, blocks: [] };
  let selected = null, device = 'desktop', preview = false;
  let history = [], hi = -1, textTimer = null;
  let projectId = null; // current project when logged in (multi-site)

  const frame = $('#frame');

  /* ---------- Persistence ---------- */
  // Logged in -> save into the user's project (multi-site). Always keep a local draft too.
  function ensureProject() {
    if (projectId || !window.RM || !RM.isLoggedIn()) return;
    if (!site.blocks.length) return;
    const p = RM.createProject({ name: site.name, theme: site.theme, blocks: site.blocks });
    if (p) { projectId = p.id; setUrlId(p.id); }
  }
  function setUrlId(id) { try { const u = new URL(location.href); u.searchParams.set('id', id); u.searchParams.delete('prompt'); window.history.replaceState({}, '', u); } catch (e) {} }
  function persist() {
    try { localStorage.setItem(STORE, JSON.stringify(site)); } catch (e) {}
    if (window.RM && RM.isLoggedIn()) { ensureProject(); if (projectId) RM.saveProject(projectId, { name: site.name, theme: site.theme, blocks: site.blocks, hideBadge: site.hideBadge }); }
  }
  function snapshot() { return JSON.stringify(site); }
  function commit() {
    const s = snapshot();
    if (history[hi] === s) return;
    history = history.slice(0, hi + 1); history.push(s);
    if (history.length > 60) history.shift();
    hi = history.length - 1; updateHistBtns(); persist();
  }
  function updateHistBtns() { $('#undoBtn').disabled = hi <= 0; $('#redoBtn').disabled = hi >= history.length - 1; }
  function undo() { if (hi > 0) { hi--; site = JSON.parse(history[hi]); selected = null; renderAll(); persist(); updateHistBtns(); } }
  function redo() { if (hi < history.length - 1) { hi++; site = JSON.parse(history[hi]); selected = null; renderAll(); persist(); updateHistBtns(); } }

  /* ---------- Toast ---------- */
  let toastT;
  function toast(msg) { $('#toastMsg').innerHTML = msg; $('#toast').classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => $('#toast').classList.remove('show'), 2600); }

  /* ============================================================
     RENDER
     ============================================================ */
  function renderCanvas() {
    if (!site.blocks.length) {
      frame.className = 'frame ' + device;
      frame.innerHTML = `<div class="empty">
        <div class="big"><svg viewBox="0 0 24 24" fill="none"><path d="M12 2l1.6 5.2L19 9l-5.4 1.8L12 16l-1.6-5.2L5 9l5.4-1.8L12 2z" fill="currentColor"/></svg></div>
        <h2>Lad os bygge dit website</h2>
        <p>Beskriv dit site i AI-feltet foroven, vælg en sektion til venstre, eller spørg Reachmore AI nederst i højre hjørne.</p>
        <button class="btn btn-primary" id="emptyGen">Generér et eksempel-site ✨</button>
      </div>`;
      $('#emptyGen').onclick = () => generate('Et moderne website til min virksomhed med funktioner og priser');
      return;
    }
    frame.className = 'frame ' + device + (preview ? ' preview' : '');
    frame.innerHTML = RB.renderSite(site.blocks, site.theme, { editable: true });

    if (preview) return;

    frame.querySelectorAll('.rb-block').forEach(el => {
      const idx = +el.dataset.block;
      el.addEventListener('click', e => {
        if (e.target.closest('.blk-toolbar')) return;
        if (e.target.closest('[contenteditable]')) { select(idx, true); return; }
        e.preventDefault(); select(idx);
      });
    });
    // prevent links/buttons inside the rendered site from navigating
    frame.querySelectorAll('a').forEach(a => a.addEventListener('click', e => e.preventDefault()));

    if (selected != null) decorateSelected();
  }

  function decorateSelected() {
    const el = frame.querySelector(`.rb-block[data-block="${selected}"]`);
    if (!el) return;
    el.classList.add('selected');

    // toolbar
    const tb = document.createElement('div');
    tb.className = 'blk-toolbar';
    tb.innerHTML = `
      <button data-a="up" title="Flyt op"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 19V5M5 12l7-7 7 7"/></svg></button>
      <button data-a="down" title="Flyt ned"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12l7 7 7-7"/></svg></button>
      <button data-a="dup" title="Dupliker"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 012-2h10"/></svg></button>
      <button data-a="del" class="danger" title="Slet"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 7h16M9 7V5a2 2 0 012-2h2a2 2 0 012 2v2M6 7l1 13a2 2 0 002 2h6a2 2 0 002-2l1-13"/></svg></button>`;
    tb.querySelectorAll('button').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); e.preventDefault(); blockAction(b.dataset.a); }));
    el.appendChild(tb);

    // inline editing
    el.querySelectorAll('[data-edit],[data-edit-list]').forEach(node => {
      node.setAttribute('contenteditable', 'true');
      node.addEventListener('keydown', e => { if (e.key === 'Enter' && node.tagName !== 'TEXTAREA' && !node.dataset.multiline) { /* allow */ } });
      node.addEventListener('input', () => {
        const val = node.innerText;
        if (node.dataset.edit) site.blocks[selected].data[node.dataset.edit] = val;
        else { const i = +node.dataset.i, f = node.dataset.f, key = node.dataset.editList; site.blocks[selected].data[key][i][f] = val; }
        clearTimeout(textTimer); textTimer = setTimeout(() => { commit(); buildInspector(); }, 700);
      });
    });

    // on-canvas per-item delete (framer-style "remove this little thing")
    el.querySelectorAll('[data-item]').forEach(item => {
      if (getComputedStyle(item).position === 'static') item.style.position = 'relative';
      const del = document.createElement('button');
      del.className = 'item-del'; del.type = 'button'; del.innerHTML = '×'; del.title = 'Fjern dette element';
      del.addEventListener('click', e => {
        e.stopPropagation(); e.preventDefault();
        const key = item.dataset.item, idx = +item.dataset.idx;
        const arr = site.blocks[selected].data[key];
        if (arr && arr.length > 1) { arr.splice(idx, 1); commit(); renderAll(); }
        else toast('Mindst ét element skal blive — slet hele sektionen i stedet.');
      });
      item.appendChild(del);
    });
  }

  function renderLayers() {
    const list = $('#layerList');
    if (!site.blocks.length) { list.innerHTML = `<div class="insp-empty">Ingen sektioner endnu</div>`; return; }
    list.innerHTML = '';
    let dragFrom = -1;
    site.blocks.forEach((b, i) => {
      const def = RB.BLOCKS[b.type];
      const row = document.createElement('div');
      row.className = 'layer' + (i === selected ? ' active' : '');
      row.draggable = true; row.dataset.li = i;
      row.innerHTML = `<div class="lh" title="Træk for at flytte sektion">⠿</div><div class="ic">${ICONS[def.icon] || ''}</div><div class="nm">${def.name}</div>
        <div class="acts">
          <button data-a="up" title="Op"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 19V5M5 12l7-7 7 7"/></svg></button>
          <button data-a="down" title="Ned"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12l7 7 7-7"/></svg></button>
          <button data-a="del" title="Slet"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 7h16M6 7l1 13a2 2 0 002 2h6a2 2 0 002-2l1-13"/></svg></button>
        </div>`;
      row.addEventListener('click', e => { if (e.target.closest('.acts')) return; select(i); scrollToBlock(i); });
      row.querySelectorAll('.acts button').forEach(btn => btn.addEventListener('click', e => { e.stopPropagation(); selected = i; blockAction(btn.dataset.a); }));
      row.addEventListener('dragstart', e => { dragFrom = i; row.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; });
      row.addEventListener('dragend', () => row.classList.remove('dragging'));
      row.addEventListener('dragover', e => { e.preventDefault(); row.classList.add('drop-into'); });
      row.addEventListener('dragleave', () => row.classList.remove('drop-into'));
      row.addEventListener('drop', e => {
        e.preventDefault(); row.classList.remove('drop-into');
        const to = +row.dataset.li;
        if (dragFrom < 0 || dragFrom === to) return;
        const moved = site.blocks[dragFrom];
        reorder(site.blocks, dragFrom, to);
        selected = site.blocks.indexOf(moved);
        commit(); renderAll();
      });
      list.appendChild(row);
    });
  }

  function scrollToBlock(i) { const el = frame.querySelector(`.rb-block[data-block="${i}"]`); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }

  function renderAll() { renderCanvas(); renderLayers(); buildInspector(); }

  /* ============================================================
     SELECTION + BLOCK ACTIONS
     ============================================================ */
  function select(idx, keepFocus) {
    if (selected === idx) { if (!keepFocus) {} return; }
    selected = idx; renderCanvas(); renderLayers(); buildInspector();
    if (!keepFocus) scrollToBlock(idx);
    switchRightTab('design');
  }

  function blockAction(a) {
    if (selected == null) return;
    if (a === 'up' && selected > 0) { swap(selected, selected - 1); selected--; }
    else if (a === 'down' && selected < site.blocks.length - 1) { swap(selected, selected + 1); selected++; }
    else if (a === 'dup') { const copy = JSON.parse(JSON.stringify(site.blocks[selected])); site.blocks.splice(selected + 1, 0, copy); selected++; }
    else if (a === 'del') { site.blocks.splice(selected, 1); selected = site.blocks.length ? Math.min(selected, site.blocks.length - 1) : null; }
    commit(); renderAll();
  }
  function swap(a, b) { const t = site.blocks[a]; site.blocks[a] = site.blocks[b]; site.blocks[b] = t; }

  function addBlock(type) {
    const b = RB.blankBlock(type);
    const at = selected == null ? site.blocks.length : selected + 1;
    site.blocks.splice(at, 0, b); selected = at;
    commit(); renderAll(); scrollToBlock(at);
    toast(`${RB.BLOCKS[type].name} tilføjet`);
  }

  /* ============================================================
     INSPECTOR (schema-driven)
     ============================================================ */
  function buildInspector() {
    const box = $('#inspector');
    if (selected == null || !site.blocks[selected]) { box.innerHTML = `<div class="insp-empty">Vælg en sektion på lærredet for at redigere dens indhold og udseende.</div>`; return; }
    const b = site.blocks[selected], def = RB.BLOCKS[b.type];
    let html = `<div style="font-weight:800;font-size:16px;margin-bottom:4px">${def.name}</div><div class="muted" style="font-size:12.5px;margin-bottom:18px">Redigér felterne herunder — alt opdateres live.</div>`;
    def.schema.forEach(f => { html += fieldHTML(f, b.data[f.k], f.k); });
    html += stylePanelHTML(b);
    box.innerHTML = html;
    bindInspector(box, b, def);
  }

  function stylePanelHTML(b) {
    const s = b.style || {};
    return `<div class="insp-sep">🎨 Sektionens stil</div>
      <div class="insp-field"><label>Baggrundsfarve</label><div class="color-row"><input type="color" data-sref="bg" value="${s.bg || '#14141d'}"><input type="text" class="hex" data-sref="bg" value="${escapeAttr(s.bg || '')}" placeholder="auto"></div></div>
      <div class="insp-field"><label>Tekstfarve</label><div class="color-row"><input type="color" data-sref="text" value="${s.text || '#ffffff'}"><input type="text" class="hex" data-sref="text" value="${escapeAttr(s.text || '')}" placeholder="auto"></div></div>
      <div class="insp-field"><label>Skrifttype</label><select data-sref="font"><option value="">Brug sidens font</option>${RB.FONTS.map(fo => `<option value="${escapeAttr(fo.value)}" ${s.font === fo.value ? 'selected' : ''}>${fo.label}</option>`).join('')}</select></div>
      <div class="insp-field"><label>Justering</label><div class="seg" data-salign><button data-al="left" class="${s.align === 'left' ? 'on' : ''}">⟸</button><button data-al="center" class="${s.align === 'center' ? 'on' : ''}">≡</button><button data-al="right" class="${s.align === 'right' ? 'on' : ''}">⟹</button></div></div>
      <div class="insp-field"><label>Lodret luft (padding)</label><div class="range-row"><input type="range" data-spad min="0" max="160" step="8" value="${s.pad || 0}"><span class="val" data-padv>${s.pad ? s.pad + 'px' : 'auto'}</span></div></div>
      <button class="add-item" data-styreset>Nulstil sektionens stil</button>`;
  }

  function fieldHTML(f, val, path) {
    if (f.t === 'list') {
      let h = `<div class="insp-field"><label>${f.l}</label>`;
      (val || []).forEach((item, i) => {
        h += `<div class="list-item" draggable="true" data-dragkey="${path}" data-dragidx="${i}"><div class="li-head"><b><span class="drag" title="Træk for at flytte">⠿</span> #${i + 1}</b><button data-rm="${path}" data-i="${i}">Fjern</button></div>`;
        f.fields.forEach(sf => { h += subFieldHTML(sf, item[sf.k], path, i); });
        h += `</div>`;
      });
      h += `<button class="add-item" data-add="${path}">＋ Tilføj</button></div>`;
      return h;
    }
    return `<div class="insp-field"><label>${f.l}</label>${controlHTML(f, val, `d:${path}`)}</div>`;
  }
  function subFieldHTML(sf, val, path, i) {
    return `<div class="insp-field" style="margin-bottom:9px"><label>${sf.l}</label>${controlHTML(sf, val, `l:${path}:${i}:${sf.k}`)}</div>`;
  }
  function controlHTML(f, val, ref) {
    val = val == null ? '' : val;
    if (f.t === 'textarea') return `<textarea data-ref="${ref}">${escapeAttr(val)}</textarea>`;
    if (f.t === 'select') return `<select data-ref="${ref}">${f.options.map(o => `<option ${o === val ? 'selected' : ''}>${o}</option>`).join('')}</select>`;
    if (f.t === 'color') return `<div class="color-row"><input type="color" data-ref="${ref}" value="${val}"><input type="text" class="hex" data-ref="${ref}" value="${escapeAttr(val)}"></div>`;
    if (f.t === 'icon') return `<select data-ref="${ref}">${Object.keys(ICONS).map(k => `<option ${k === val ? 'selected' : ''}>${k}</option>`).join('')}</select>`;
    if (f.t === 'font') return `<select data-ref="${ref}">${RB.FONTS.map(fo => `<option value="${escapeAttr(fo.value)}" ${fo.value === val ? 'selected' : ''}>${fo.label}</option>`).join('')}</select>`;
    if (f.t === 'image') return `<div class="img-ctl" data-imgref="${ref}">${val ? `<div class="img-prev" style="background-image:url('${escapeAttr(val)}')"></div>` : ''}<div class="img-btns"><button class="mini" data-imgpick>${val ? '🖼 Skift billede' : '⬆ Upload billede'}</button>${val ? `<button class="mini danger" data-imgclear>Fjern</button>` : ''}</div></div>`;
    return `<input type="text" data-ref="${ref}" value="${escapeAttr(val)}">`;
  }

  // File -> downscaled JPEG data URL (keeps localStorage small)
  function pickImage(cb) {
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*';
    inp.onchange = () => {
      const file = inp.files[0]; if (!file) return;
      const fr = new FileReader();
      fr.onload = () => {
        const img = new Image();
        img.onload = () => {
          const max = 1280; let w = img.width, h = img.height;
          if (w > max || h > max) { const r = Math.min(max / w, max / h); w = Math.round(w * r); h = Math.round(h * r); }
          const c = document.createElement('canvas'); c.width = w; c.height = h;
          c.getContext('2d').drawImage(img, 0, 0, w, h);
          try { cb(c.toDataURL('image/jpeg', 0.82)); } catch (e) { cb(fr.result); }
        };
        img.onerror = () => cb(fr.result);
        img.src = fr.result;
      };
      fr.readAsDataURL(file);
    };
    inp.click();
  }
  function reorder(arr, from, to) { if (from === to || from < 0 || to < 0 || from >= arr.length || to >= arr.length) return; const it = arr.splice(from, 1)[0]; arr.splice(to, 0, it); }
  function escapeAttr(s) { return String(s).replace(/"/g, '&quot;').replace(/</g, '&lt;'); }

  function setByRef(ref, value) {
    const b = site.blocks[selected];
    if (ref.startsWith('d:')) b.data[ref.slice(2)] = value;
    else { const [, key, i, sub] = ref.split(':'); b.data[key][+i][sub] = value; }
  }
  function bindInspector(box, b, def) {
    box.querySelectorAll('[data-ref]').forEach(inp => {
      const ev = inp.type === 'color' || inp.tagName === 'SELECT' ? 'input' : 'input';
      inp.addEventListener(ev, () => {
        setByRef(inp.dataset.ref, inp.value);
        // keep paired color hex/picker in sync
        if (inp.type === 'color' || inp.classList.contains('hex')) box.querySelectorAll(`[data-ref="${CSS.escape(inp.dataset.ref)}"]`).forEach(o => { if (o !== inp) o.value = inp.value; });
        renderCanvas(); renderLayers();
        clearTimeout(textTimer); textTimer = setTimeout(commit, 600);
      });
    });
    box.querySelectorAll('[data-add]').forEach(btn => btn.addEventListener('click', () => {
      const key = btn.dataset.add, f = def.schema.find(x => x.k === key);
      const tmpl = (b.data[key] && b.data[key][0]) ? JSON.parse(JSON.stringify(b.data[key][0])) : {};
      f.fields.forEach(sf => { if (!(sf.k in tmpl)) tmpl[sf.k] = ''; });
      b.data[key].push(tmpl); commit(); renderCanvas(); buildInspector();
    }));
    box.querySelectorAll('[data-rm]').forEach(btn => btn.addEventListener('click', () => {
      b.data[btn.dataset.rm].splice(+btn.dataset.i, 1); commit(); renderCanvas(); buildInspector();
    }));

    // Image upload / swap / remove
    box.querySelectorAll('.img-ctl').forEach(ctl => {
      const ref = ctl.dataset.imgref;
      const pick = ctl.querySelector('[data-imgpick]'); if (pick) pick.onclick = () => pickImage(url => { setByRef(ref, url); commit(); renderCanvas(); buildInspector(); });
      const clr = ctl.querySelector('[data-imgclear]'); if (clr) clr.onclick = () => { setByRef(ref, ''); commit(); renderCanvas(); buildInspector(); };
    });

    // Per-section style controls
    const ensureStyle = () => { b.style = b.style || {}; return b.style; };
    box.querySelectorAll('[data-sref]').forEach(inp => inp.addEventListener('input', () => {
      const s = ensureStyle(), k = inp.dataset.sref; s[k] = inp.value || ''; if (!s[k]) delete s[k];
      box.querySelectorAll(`[data-sref="${k}"]`).forEach(o => { if (o !== inp && o.value !== inp.value) o.value = inp.value; });
      renderCanvas(); clearTimeout(textTimer); textTimer = setTimeout(commit, 500);
    }));
    const alignSeg = box.querySelector('[data-salign]');
    if (alignSeg) alignSeg.querySelectorAll('button').forEach(btn => btn.onclick = () => { const s = ensureStyle(); s.align = s.align === btn.dataset.al ? undefined : btn.dataset.al; if (!s.align) delete s.align; commit(); renderCanvas(); buildInspector(); });
    const pad = box.querySelector('[data-spad]');
    if (pad) pad.oninput = () => { const s = ensureStyle(); s.pad = +pad.value || 0; if (!s.pad) delete s.pad; const v = box.querySelector('[data-padv]'); if (v) v.textContent = s.pad ? s.pad + 'px' : 'auto'; renderCanvas(); clearTimeout(textTimer); textTimer = setTimeout(commit, 400); };
    const reset = box.querySelector('[data-styreset]'); if (reset) reset.onclick = () => { b.style = {}; commit(); renderCanvas(); buildInspector(); };

    // Drag-to-reorder list items
    let dragKey = null, dragFrom = -1;
    box.querySelectorAll('.list-item[draggable]').forEach(item => {
      item.addEventListener('dragstart', e => { dragKey = item.dataset.dragkey; dragFrom = +item.dataset.dragidx; item.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; });
      item.addEventListener('dragend', () => { item.classList.remove('dragging'); });
      item.addEventListener('dragover', e => { e.preventDefault(); });
      item.addEventListener('drop', e => {
        e.preventDefault();
        if (item.dataset.dragkey !== dragKey) return;
        const to = +item.dataset.dragidx;
        reorder(b.data[dragKey], dragFrom, to); commit(); renderCanvas(); buildInspector();
      });
    });
  }

  /* ============================================================
     THEME PANE
     ============================================================ */
  const PALETTES = [
    ['#8b5cf6', '#f97316'], ['#6366f1', '#06b6d4'], ['#ec4899', '#8b5cf6'],
    ['#10b981', '#3b82f6'], ['#f59e0b', '#ef4444'], ['#84cc16', '#10b981'],
    ['#3b82f6', '#8b5cf6'], ['#ef4444', '#f59e0b']
  ];
  function buildThemePane() {
    const t = site.theme, box = $('#themePane');
    box.innerHTML = `
      <div class="insp-field"><label>Tilstand</label>
        <div class="seg" id="modeSeg"><button data-m="dark" class="${t.mode === 'dark' ? 'on' : ''}">🌙 Mørk</button><button data-m="light" class="${t.mode === 'light' ? 'on' : ''}">☀️ Lys</button></div></div>
      <div class="insp-field"><label>Farvetema</label><div class="swatches" id="swatches">
        ${PALETTES.map((p, i) => `<div class="swatch" data-i="${i}" style="background:linear-gradient(135deg,${p[1]},${p[0]});${t.p === p[0] && t.p2 === p[1] ? 'border-color:var(--text)' : ''}"></div>`).join('')}
      </div></div>
      <div class="insp-field"><label>Primær farve</label><div class="color-row"><input type="color" id="cp" value="${t.p}"><input type="text" class="hex" id="cpx" value="${t.p}"></div></div>
      <div class="insp-field"><label>Accent / gradient-farve</label><div class="color-row"><input type="color" id="cp2" value="${t.p2}"><input type="text" class="hex" id="cp2x" value="${t.p2}"></div></div>
      <div class="insp-field"><label>Hjørne-rundhed</label><div class="range-row"><input type="range" id="rad" min="0" max="32" value="${t.rad}"><span class="val" id="radv">${t.rad}px</span></div></div>
      <div class="insp-field"><label>Skrifttype (hele siden)</label>
        <select id="font">${RB.FONTS.map(fo => `<option value="${escapeAttr(fo.value)}" ${t.font === fo.value ? 'selected' : ''}>${fo.label}</option>`).join('')}</select></div>
      <details class="adv"><summary>Avanceret</summary>
        <label class="adv-toggle"><input type="checkbox" id="hideBadge" ${site.hideBadge ? 'checked' : ''}><span>Fjern "Bygget med Reachmore"-mærket på udgivne sider</span></label>
        <p class="adv-note">Mærket giver dig gratis eksponering — men du kan slå det fra her.</p>
      </details>`;
    box.querySelectorAll('#modeSeg button').forEach(btn => btn.onclick = () => { t.mode = btn.dataset.m; commit(); renderCanvas(); buildThemePane(); });
    box.querySelectorAll('#swatches .swatch').forEach(s => s.onclick = () => { const p = PALETTES[+s.dataset.i]; t.p = p[0]; t.p2 = p[1]; commit(); renderCanvas(); buildThemePane(); });
    const bind = (id, key) => { const e = box.querySelector('#' + id); e.oninput = () => { t[key] = e.value; box.querySelectorAll('#' + id + ', #' + id + 'x').forEach(o => o.value = e.value); renderCanvas(); clearTimeout(textTimer); textTimer = setTimeout(commit, 500); }; };
    box.querySelector('#cp').oninput = e => { t.p = e.target.value; box.querySelector('#cpx').value = t.p; renderCanvas(); clearTimeout(textTimer); textTimer = setTimeout(commit, 500); };
    box.querySelector('#cpx').oninput = e => { t.p = e.target.value; box.querySelector('#cp').value = t.p; renderCanvas(); clearTimeout(textTimer); textTimer = setTimeout(commit, 500); };
    box.querySelector('#cp2').oninput = e => { t.p2 = e.target.value; box.querySelector('#cp2x').value = t.p2; renderCanvas(); clearTimeout(textTimer); textTimer = setTimeout(commit, 500); };
    box.querySelector('#cp2x').oninput = e => { t.p2 = e.target.value; box.querySelector('#cp2').value = t.p2; renderCanvas(); clearTimeout(textTimer); textTimer = setTimeout(commit, 500); };
    box.querySelector('#rad').oninput = e => { t.rad = +e.target.value; box.querySelector('#radv').textContent = t.rad + 'px'; renderCanvas(); clearTimeout(textTimer); textTimer = setTimeout(commit, 400); };
    box.querySelector('#font').onchange = e => { t.font = e.target.value; commit(); renderCanvas(); };
    const hb = box.querySelector('#hideBadge'); if (hb) hb.onchange = e => { site.hideBadge = e.target.checked; commit(); toast(e.target.checked ? 'Reachmore-mærket fjernes på udgivne sider' : 'Reachmore-mærket vises på udgivne sider'); };
  }

  /* ============================================================
     AI GENERATION
     ============================================================ */
  const GEN_COLORS = { auto: null, 'Blå': ['#3b82f6', '#06b6d4'], 'Grøn': ['#10b981', '#059669'], 'Lilla': ['#8b5cf6', '#6d28d9'], 'Pink': ['#ec4899', '#f472b6'], 'Orange': ['#f97316', '#ef4444'], 'Sort': ['#3f3f46', '#71717a'], 'Guld': ['#c0a062', '#b45309'] };

  // Entry point — opens the AI build experience
  function generate(prompt, force) {
    prompt = (prompt || $('#aiInput').value || '').trim();
    if (!prompt) { $('#aiInput').focus(); return; }
    if (force && force.skipAsk) { runGenerate(prompt, force); return; }
    openGenie(prompt);
  }

  // Actually build (spends tokens, renders with progressive reveal)
  function runGenerate(prompt, opts) {
    opts = opts || {};
    if (window.RMTokens && !RMTokens.spend(RMTokens.COSTS.generate, 'generate')) { closeGenie(); return; }
    const res = RB.generateSite(prompt, opts);
    site.theme = res.theme; site.blocks = res.blocks; selected = null;
    site.name = ((res.meta && res.meta.brand) || 'Mit website'); $('#projName').value = site.name;
    if (window.ReachmoreBot) { window.ReachmoreBot.remember('topic', (res.meta && res.meta.topic) || prompt); window.ReachmoreBot.remember('brand', res.meta && res.meta.brand); }
    commit(); renderAll();
    frame.classList.add('just-generated');
    setTimeout(() => frame.classList.remove('just-generated'), 1700);
  }

  /* ---- Generation experience overlay (thinking + follow-up questions) ---- */
  let genie;
  function ensureGenie() {
    if (genie) return genie;
    genie = document.createElement('div');
    genie.className = 'rm-genie';
    genie.innerHTML = `<div class="rm-genie-box">
      <div class="gh"><span class="sp"><svg viewBox="0 0 24 24" fill="none"><path d="M12 2l1.6 5.2L19 9l-5.4 1.8L12 16l-1.6-5.2L5 9l5.4-1.8L12 2z" fill="currentColor"/></svg></span> Reachmore AI</div>
      <div data-step="ask">
        <h2>Lad os bygge dit website ✨</h2>
        <p class="echo" data-echo></p>
        <p class="hintq">Et par hurtige valg, så jeg bygger det helt rigtige til dig (valgfrit):</p>
        <div class="ask-g"><label>Stemning</label><div class="chiprow" data-vibe></div></div>
        <div class="ask-g"><label>Farve</label><div class="chiprow" data-color></div></div>
        <div class="ask-g"><label>Tag med</label><div class="chiprow" data-inc></div></div>
        <div class="ask-actions"><button class="btn btn-primary" data-build>Byg mit website →</button><button class="btn btn-ghost" data-skip>Byg automatisk</button></div>
      </div>
      <div data-step="think" hidden>
        <div class="genie-orb"></div>
        <h2 data-thinktitle>Bygger dit website…</h2>
        <div class="think-log" data-log></div>
        <div class="think-bar"><i data-bar></i></div>
      </div>
    </div>`;
    document.body.appendChild(genie);
    // vibe chips
    const vr = genie.querySelector('[data-vibe]');
    vr.innerHTML = `<button class="gchip on" data-v="">Auto</button>` + Object.keys(RB.VIBES).map(k => `<button class="gchip" data-v="${k}">${RB.VIBES[k].label}</button>`).join('');
    const cr = genie.querySelector('[data-color]');
    cr.innerHTML = Object.keys(GEN_COLORS).map((k, i) => `<button class="gchip${i === 0 ? ' on' : ''}" data-c="${k}">${k === 'auto' ? 'Auto' : k}</button>`).join('');
    const ir = genie.querySelector('[data-inc]');
    ir.innerHTML = [['pricing', 'Priser'], ['gallery', 'Galleri'], ['team', 'Team'], ['steps', 'Proces']].map(x => `<button class="gchip" data-inc="${x[0]}">${x[1]}</button>`).join('');
    genie.addEventListener('click', e => {
      const g = e.target.closest('.gchip'); if (!g) return;
      if (g.dataset.v !== undefined && g.parentElement === vr) { vr.querySelectorAll('.gchip').forEach(x => x.classList.remove('on')); g.classList.add('on'); }
      else if (g.dataset.c !== undefined) { cr.querySelectorAll('.gchip').forEach(x => x.classList.remove('on')); g.classList.add('on'); }
      else if (g.dataset.inc !== undefined) { g.classList.toggle('on'); }
    });
    genie.querySelector('[data-build]').onclick = () => beginThinking(collectOpts());
    genie.querySelector('[data-skip]').onclick = () => beginThinking({});
    return genie;
  }
  function collectOpts() {
    const v = genie.querySelector('[data-vibe] .on').dataset.v;
    const cKey = genie.querySelector('[data-color] .on').dataset.c;
    const include = {};
    genie.querySelectorAll('[data-inc] .gchip.on').forEach(x => include[x.dataset.inc] = true);
    const opts = {};
    if (v) opts.vibe = v;
    if (cKey && cKey !== 'auto' && GEN_COLORS[cKey]) opts.color = GEN_COLORS[cKey];
    if (Object.keys(include).length) opts.include = include;
    return opts;
  }
  let geniePrompt = '';
  function openGenie(prompt) {
    ensureGenie(); geniePrompt = prompt;
    genie.querySelector('[data-echo]').textContent = '“' + prompt + '”';
    genie.querySelector('[data-step="ask"]').hidden = false;
    genie.querySelector('[data-step="think"]').hidden = true;
    requestAnimationFrame(() => genie.classList.add('open'));
  }
  function closeGenie() { if (genie) genie.classList.remove('open'); }
  function beginThinking(opts) {
    const ind = RB.pickIndustry(geniePrompt);
    const vibeKey = opts.vibe || (RB.VIBES[ind.key] ? ind.key : null);
    const vibeLabel = opts.vibe && RB.VIBES[opts.vibe] ? RB.VIBES[opts.vibe].label.toLowerCase() : 'en passende';
    genie.querySelector('[data-step="ask"]').hidden = true;
    genie.querySelector('[data-step="think"]').hidden = false;
    const log = genie.querySelector('[data-log]'); log.innerHTML = '';
    const bar = genie.querySelector('[data-bar]'); bar.style.width = '0%';
    const steps = [
      'Læser din beskrivelse…',
      'Genkender område: ' + (ind.eyebrow || 'virksomhed'),
      'Vælger ' + vibeLabel + ' stil',
      'Sammensætter en unik farvepalette…',
      'Skriver tekster på dansk…',
      'Designer og placerer sektioner…',
      'Finpudser layout & detaljer…',
      'Færdig! ✨'
    ];
    let i = 0;
    (function step() {
      if (i >= steps.length) { runGenerate(geniePrompt, opts); setTimeout(closeGenie, 350); return; }
      const line = document.createElement('div'); line.className = 'tl'; line.innerHTML = (i === steps.length - 1 ? '✅ ' : '<span class="tl-dot"></span> ') + steps[i];
      log.appendChild(line); log.scrollTop = log.scrollHeight;
      bar.style.width = Math.round((i + 1) / steps.length * 100) + '%';
      i++;
      setTimeout(step, 200 + Math.random() * 230);
    })();
  }

  function addSectionByText(text) {
    const t = text.toLowerCase();
    const map = { pris: 'pricing', plan: 'pricing', funktion: 'features', feature: 'features', galleri: 'gallery', billed: 'gallery', kontakt: 'contact', faq: 'faq', spørgsmål: 'faq', udtalelse: 'testimonial', anmeldelse: 'testimonial', citat: 'testimonial', proces: 'steps', trin: 'steps', team: 'team', 'hold bag': 'team', tal: 'stats', stat: 'stats', hero: 'hero', cta: 'cta', footer: 'footer', menu: 'features' };
    for (const k in map) if (t.includes(k)) { addBlock(map[k]); return map[k]; }
    return null;
  }

  /* ============================================================
     EXPORT / PUBLISH
     ============================================================ */
  // "Drevet af Reachmore" badge — a little free advertising on every published site.
  // Removable, but tucked away under Tema → Avanceret (site.hideBadge).
  function badgeHTML() {
    if (site.hideBadge) return '';
    return `<a href="https://reachmore.dk" target="_blank" rel="noopener" data-rm-badge style="position:fixed;right:16px;bottom:16px;z-index:99999;display:inline-flex;align-items:center;gap:7px;padding:8px 13px;border-radius:99px;background:linear-gradient(95deg,#f97316,#d8519e,#8b5cf6);color:#fff;font-family:'Inter',system-ui,sans-serif;font-size:13px;font-weight:700;text-decoration:none;box-shadow:0 8px 24px -8px rgba(216,81,158,.7)">⚡ Bygget med Reachmore</a>`;
  }
  function buildStandalone() {
    const body = RB.renderSite(site.blocks, site.theme, {});
    return `<!DOCTYPE html>
<html lang="da">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${site.name}</title>
<link href="${RB.FONTS_HREF}" rel="stylesheet">
<style>*{margin:0;padding:0;box-sizing:border-box}body{background:${site.theme.mode === 'light' ? '#fff' : '#0b0b12'}}${RB.STYLES}</style>
</head>
<body>
${body}
${badgeHTML()}
<!-- Bygget med Reachmore — https://reachmore.dk -->
</body>
</html>`;
  }
  function exportSite() {
    if (!site.blocks.length) { toast('Tilføj indhold før du eksporterer'); return; }
    if (window.RMTokens && !RMTokens.canPublish()) { RMTokens.openUpgrade('publish'); return; }
    const blob = new Blob([buildStandalone()], { type: 'text/html' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = site.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '.html';
    a.click(); URL.revokeObjectURL(a.href);
    toast('Website eksporteret som HTML ⬇');
  }
  function publishSite() {
    if (!site.blocks.length) { toast('Tilføj indhold før du udgiver'); return; }
    if (window.RMTokens && !RMTokens.canPublish()) { RMTokens.openUpgrade('publish'); return; }
    const blob = new Blob([buildStandalone()], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    const slug = site.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    if (window.RM && RM.isLoggedIn()) { ensureProject(); if (projectId) RM.saveProject(projectId, { status: 'published' }); }
    toast(`🚀 Udgivet! Forhåndsvisning åbnet · ${slug}.reachmore.app`);
  }

  /* ============================================================
     TOPBAR + TABS + KEYBOARD
     ============================================================ */
  function setDevice(d) { device = d; $('#devSeg').querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.dev === d)); renderCanvas(); }
  function togglePreview() { preview = !preview; $('#previewBtn').classList.toggle('on', preview); if (preview) selected = null; renderCanvas(); renderLayers(); buildInspector(); toast(preview ? 'Forhåndsvisning til 👀' : 'Tilbage til redigering'); }

  function switchTab(panel, tab) {
    const root = panel === 'left' ? $('.panel.left') : $('.panel.right');
    root.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
    root.querySelectorAll('.tabpane').forEach(p => p.classList.toggle('active', p.dataset.pane === tab));
  }
  function switchRightTab(tab) { switchTab('right', tab); }

  function buildPalette() {
    const grid = $('#blkGrid');
    RB.order.forEach(type => {
      const def = RB.BLOCKS[type];
      const el = document.createElement('div');
      el.className = 'blk-item';
      el.innerHTML = `<div class="ic">${ICONS[def.icon] || ''}</div><span>${def.name}</span>`;
      el.onclick = () => addBlock(type);
      grid.appendChild(el);
    });
  }

  function bindUI() {
    $('#devSeg').querySelectorAll('button').forEach(b => b.onclick = () => setDevice(b.dataset.dev));
    $('#undoBtn').onclick = undo; $('#redoBtn').onclick = redo;
    $('#previewBtn').onclick = togglePreview;
    $('#exportBtn').onclick = exportSite; $('#publishBtn').onclick = publishSite;
    $('#aiGen').onclick = () => generate();
    $('#aiInput').addEventListener('keydown', e => { if (e.key === 'Enter') generate(); });
    $('#projName').addEventListener('input', e => { site.name = e.target.value; clearTimeout(textTimer); textTimer = setTimeout(commit, 600); });
    $('#themeBtn').onclick = () => { const cur = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light'; document.documentElement.setAttribute('data-theme', cur); localStorage.setItem('rm-theme', cur); };

    document.querySelectorAll('.panel.left .tab').forEach(t => t.onclick = () => switchTab('left', t.dataset.tab));
    document.querySelectorAll('.panel.right .tab').forEach(t => t.onclick = () => switchTab('right', t.dataset.tab));

    document.addEventListener('keydown', e => {
      const typing = /INPUT|TEXTAREA/.test(document.activeElement.tagName) || document.activeElement.isContentEditable;
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { if (!typing) { e.preventDefault(); undo(); } }
      else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) { if (!typing) { e.preventDefault(); redo(); } }
      else if (e.key === 'Delete' && selected != null && !typing) { blockAction('del'); }
      else if (e.key === 'Escape') { selected = null; renderAll(); }
    });
  }

  /* ============================================================
     BOT INTEGRATION (studio-aware commands)
     ============================================================ */
  function wireBot() {
    window.__RM_BOT_GREETING__ = `Hej! 👋 Jeg er din <strong>Reachmore Studio</strong>-assistent. Jeg kan bygge hele sites og tilføje sektioner for dig.<br>Prøv: <em>"byg et site til en café"</em> eller <em>"tilføj en prissektion"</em> ✨`;
    window.__RM_BOT_SUGG__ = ['Byg et site til en café', 'Tilføj en prissektion', 'Gør temaet lilla', 'Skift til lyst tema'];

    window.ReachmoreBot.registerGenerator((topic, raw) => { generate(raw || topic, { skipAsk: true }); return { reply: `Færdig! ✨ Jeg har bygget et unikt "${topic || 'nyt'}" website på lærredet. Klik på en sektion for at finpudse — eller bed mig om at tilføje mere.` }; });

    window.ReachmoreBot.registerCommand('studio', (t) => {
      // add section (AI action — costs tokens)
      if (/(tilføj|add|indsæt|sæt|lav).*(sektion|pris|funktion|galleri|kontakt|faq|udtalelse|tal|hero|cta|footer|menu|hold|billed|proces|trin|team|hold bag)/.test(t)) {
        if (window.RMTokens && RMTokens.balance() < RMTokens.COSTS.section) { RMTokens.openUpgrade('tokens'); return { reply: 'Du er løbet tør for AI-tokens ✨ — opgradér for at tilføje flere sektioner med AI.' }; }
        const added = addSectionByText(t);
        if (added) { if (window.RMTokens) RMTokens.spend(RMTokens.COSTS.section, 'section'); return { reply: `Tilføjet en <strong>${RB.BLOCKS[added].name}</strong>-sektion nederst. Du kan redigere den i panelet til højre. 👍` }; }
      }
      // theme color by name
      const colors = { lilla: ['#8b5cf6', '#6d28d9'], purple: ['#8b5cf6', '#6d28d9'], blå: ['#3b82f6', '#06b6d4'], blue: ['#3b82f6', '#06b6d4'], grøn: ['#10b981', '#3b82f6'], green: ['#10b981', '#3b82f6'], rød: ['#ef4444', '#f59e0b'], red: ['#ef4444', '#f59e0b'], orange: ['#f97316', '#ef4444'], pink: ['#ec4899', '#8b5cf6'], rosa: ['#ec4899', '#8b5cf6'] };
      if (/(farve|tema|gør den|skift.*farve|color)/.test(t)) {
        for (const c in colors) if (t.includes(c)) { site.theme.p = colors[c][0]; site.theme.p2 = colors[c][1]; commit(); renderCanvas(); buildThemePane(); return { reply: `Temaet er nu ${c}. 🎨` }; }
      }
      if (/(lyst|light|lys tema)/.test(t)) { site.theme.mode = 'light'; commit(); renderCanvas(); buildThemePane(); return { reply: 'Skiftet til lyst tema ☀️' }; }
      if (/(mørkt|dark|mørk tema)/.test(t)) { site.theme.mode = 'dark'; commit(); renderCanvas(); buildThemePane(); return { reply: 'Skiftet til mørkt tema 🌙' }; }
      if (/(eksport|download.*kode|hent kode)/.test(t)) { exportSite(); return { reply: (window.RMTokens && !RMTokens.canPublish()) ? 'Eksport kræver en plan — jeg har åbnet planerne for dig ✨' : 'Jeg har downloadet dit site som HTML ⬇' }; }
      if (/(udgiv|publi|gå live)/.test(t)) { publishSite(); return { reply: (window.RMTokens && !RMTokens.canPublish()) ? 'For at udgive skal du vælge en plan — jeg har åbnet planerne for dig 🚀' : 'Dit site er udgivet — forhåndsvisningen er åbnet i en ny fane 🚀' }; }
      if (/(token|kredit|hvor mange|løbet tør|opgrad)/.test(t)) { if (window.RMTokens) { const b = RMTokens.balance(); RMTokens.openUpgrade('tokens'); return { reply: `Du har <strong>${b} AI-tokens</strong> tilbage. Generering koster 250, en sektion 60. Jeg har åbnet planerne, hvis du vil have flere ✨` }; } }
      return null;
    });
  }

  /* ============================================================
     INIT
     ============================================================ */
  function init() {
    const saved = localStorage.getItem('rm-theme'); if (saved) document.documentElement.setAttribute('data-theme', saved);
    buildPalette(); bindUI(); wireBot();

    if (window.RMTokens) {
      RMTokens.mountMeter($('#tokenMeter'));
      window.__RM_onUpgrade = (pl) => toast(`🎉 Du er nu på <strong>${pl.name}</strong> — udgivelse er låst op og du fik ${pl.tokens.toLocaleString('da-DK')} tokens!`);
    }
    if (window.RMAuth) window.RMAuth.mountAccount($('#acct'));

    const params = new URLSearchParams(location.search);
    const prompt = params.get('prompt');
    const id = params.get('id');
    const isNew = params.get('new');
    if (isNew) { try { localStorage.removeItem(STORE); } catch (e) {} }
    const stored = isNew ? null : localStorage.getItem(STORE);

    // Open an existing project (multi-site) when logged in
    let loadedProject = null;
    if (id && window.RM && RM.isLoggedIn()) {
      const pr = RM.getProject(id);
      if (pr && pr.userId === (RM.currentUser() || {}).id) { loadedProject = pr; projectId = pr.id; }
    }

    if (loadedProject) {
      site = { name: loadedProject.name, theme: loadedProject.theme, blocks: JSON.parse(JSON.stringify(loadedProject.blocks || [])), hideBadge: loadedProject.hideBadge };
      $('#projName').value = site.name || 'Mit website';
      if (prompt) { $('#aiInput').value = prompt; }
      history = [snapshot()]; hi = 0;
      renderAll(); buildThemePane(); updateHistBtns();
    } else if (prompt) {
      $('#aiInput').value = prompt;
      history = [snapshot()]; hi = 0;
      buildThemePane();
      generate(prompt);
    } else if (stored) {
      try { site = JSON.parse(stored); } catch (e) {}
      $('#projName').value = site.name || 'Mit website';
      history = [snapshot()]; hi = 0;
      renderAll(); buildThemePane(); updateHistBtns();
    } else {
      history = [snapshot()]; hi = 0;
      renderAll(); buildThemePane(); updateHistBtns();
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
