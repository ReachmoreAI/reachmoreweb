/* ============================================================
   Reachmore shared page chrome — injects the standard nav +
   footer (with working links + account menu) on content pages.
   ============================================================ */
(function () {
  const year = new Date().getFullYear();
  const nav = document.querySelector('#rm-nav');
  if (nav) {
    nav.className = 'site-nav';
    nav.innerHTML = `<div class="inner">
      <a href="index.html" aria-label="Reachmore"><img class="logo" src="assets/img/reachmore-logo.png" alt="Reachmore"></a>
      <nav class="links">
        <a href="index.html#features">Funktioner</a>
        <a href="index.html#templates">Skabeloner</a>
        <a href="index.html#pricing">Priser</a>
        <a href="domaener.html">Domæner</a>
        <a href="om-os.html">Om os</a>
      </nav>
      <div class="right"><div id="acct"></div><a class="btn btn-primary" href="studio.html">Åbn Studio</a></div>
    </div>`;
    if (window.RMAuth) window.RMAuth.mountAccount(nav.querySelector('#acct'));
  }
  const foot = document.querySelector('#rm-footer');
  if (foot) {
    foot.className = 'site-foot';
    foot.innerHTML = `<div class="inner">
      <div class="grid">
        <div>
          <img class="logo" src="assets/img/reachmore-logo.png" alt="Reachmore">
          <p class="muted" style="max-width:32ch">Den danske AI website-builder. Byg mere. Nå længere.</p>
        </div>
        <div><h5>Produkt</h5><a href="index.html#features">Funktioner</a><a href="index.html#templates">Skabeloner</a><a href="index.html#pricing">Priser</a><a href="domaener.html">Domæner &amp; hosting</a><a href="studio.html">Studio</a></div>
        <div><h5>Virksomhed</h5><a href="om-os.html">Om os</a><a href="blog.html">Blog</a><a href="karriere.html">Karriere</a><a href="kontakt.html">Kontakt</a></div>
        <div><h5>Ressourcer</h5><a href="index.html#faq">FAQ</a><a href="hjaelp.html">Hjælp</a><a href="privatliv.html">Privatliv</a><a href="vilkaar.html">Vilkår</a></div>
      </div>
      <div class="bottom">
        <span class="co">© ${year} Reachmore — et produkt fra Lindeholm Ltd (HE 482155), Ακαμαντίδος 26, 8016 Paphos, Cypern.</span>
        <span>Lavet med 💜 i Danmark</span>
      </div>
    </div>`;
  }
})();
