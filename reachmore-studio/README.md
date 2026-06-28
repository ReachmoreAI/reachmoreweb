# Reachmore Studio

**Den danske AI website-builder — byg mere, nå længere.**

Reachmore Studio er et framer.ai-inspireret produkt: beskriv dit website i ord,
så genererer AI'en et komplet, redigerbart site, som du finpudser visuelt med
træk-og-slip og udgiver med ét klik. Konceptet bygger på Builder.io's
open source content-model (et site = en liste af "blocks" med en komponent-registrering).

## Funktioner

- 🤖 **AI-generering** — skriv en sætning, få et helt website (café, bureau, portfolio, webshop, SaaS, fitness …).
- 🎨 **Visuel editor** — komponent-panel, live lærred med markering, inline tekst-redigering og en egenskabs-inspektør.
- 🧩 **13 sektionstyper** — navigation, hero, logo-bjælke, funktioner, tal, billede+tekst, galleri, priser, udtalelse, FAQ, CTA, kontakt, footer.
- 🌗 **Tema-motor** — mørk/lys tilstand, farvepaletter, primær/accent-farve, hjørne-rundhed og skrifttype — alt live.
- 💬 **Reachmore AI-bot** — en framer.ai-agtig hjælpebot på alle skærme, der kan bygge sites, tilføje sektioner og skifte farver via chat (virker offline).
- 📱 **Responsiv forhåndsvisning** — desktop / tablet / mobil.
- ↩️ **Fortryd/gentag**, automatisk gem (localStorage), **eksport til ren HTML** og **udgiv** (forhåndsvisning).

## Kør lokalt

Appen er ren HTML/CSS/JS uden byggetrin. Start en lokal server fra denne mappe:

```bash
# Python
python -m http.server 8123

# eller Node
npx serve .
```

Åbn derefter <http://127.0.0.1:8123/> i din browser.
(Du kan også bare åbne `index.html` direkte, men en lokal server anbefales.)

## Struktur

```
reachmore-studio/
├── index.html              # Landingsside (marketing, AI-prompt)
├── studio.html             # Den visuelle AI-editor
├── assets/
│   ├── css/reachmore.css   # Design-system (brand-gradient, temaer, bot-UI)
│   ├── js/blocks.js        # Blok-bibliotek + AI-genereringsmotor
│   ├── js/bot.js           # Reachmore AI-hjælpebot (delt widget)
│   ├── js/studio.js        # Editor-logik (markering, inspektør, tema, eksport)
│   ├── js/landing.js       # Landingsside-interaktioner
│   └── img/reachmore-logo.png
└── README.md
```

## Brand

Reachmore-gradienten går fra orange → pink → lilla
(`#f97316 → #f7556b → #d8519e → #8b5cf6`), med Outfit til overskrifter og Inter til brødtekst.
