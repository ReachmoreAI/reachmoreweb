/* ============================================================
   Reachmore backend — Express API + static hosting.
   Security: helmet, rate limiting, scrypt password hashing,
   signed httpOnly session cookies, input validation, body limits.
   ============================================================ */
require('dotenv').config();
const path = require('path');
const crypto = require('crypto');
const express = require('express');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 4000;
const SECRET = process.env.SESSION_SECRET || 'dev-insecure-secret-change-me';
const PUBLIC_URL = process.env.PUBLIC_URL || ('http://localhost:' + PORT);
const COOKIE = 'rm_session';
const stripe = process.env.STRIPE_SECRET_KEY ? require('stripe')(process.env.STRIPE_SECRET_KEY) : null;

/* ---------------- Security middleware ---------------- */
app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      'default-src': ["'self'"],
      'script-src': ["'self'", "'unsafe-inline'", 'https://js.stripe.com'],
      'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      'font-src': ["'self'", 'https://fonts.gstatic.com'],
      'img-src': ["'self'", 'data:', 'blob:', 'https://images.pexels.com'],
      'connect-src': ["'self'", 'https://api.stripe.com'],
      'frame-src': ['https://js.stripe.com', 'https://hooks.stripe.com'],
      'object-src': ["'none'"]
    }
  },
  crossOriginEmbedderPolicy: false
}));
app.use(cookieParser());

// Stripe webhook needs the raw body — must be registered BEFORE express.json
app.post('/api/billing/webhook', express.raw({ type: 'application/json' }), handleWebhook);

app.use(express.json({ limit: '8mb' }));

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 40, standardHeaders: true, legacyHeaders: false, message: { error: 'For mange forsøg — prøv igen om lidt.' } });
const apiLimiter = rateLimit({ windowMs: 60 * 1000, max: 240, standardHeaders: true, legacyHeaders: false });
app.use('/api/', apiLimiter);

/* ---------------- Session helpers ---------------- */
function sign(userId) {
  const exp = Date.now() + 1000 * 60 * 60 * 24 * 30; // 30 days
  const payload = userId + '.' + exp;
  const sig = crypto.createHmac('sha256', SECRET).update(payload).digest('hex');
  return Buffer.from(payload).toString('base64') + '.' + sig;
}
function readToken(token) {
  if (!token) return null;
  const i = token.lastIndexOf('.');
  if (i < 0) return null;
  let payload;
  try { payload = Buffer.from(token.slice(0, i), 'base64').toString('utf8'); } catch (e) { return null; }
  const sig = token.slice(i + 1);
  const expect = crypto.createHmac('sha256', SECRET).update(payload).digest('hex');
  if (!safeEq(sig, expect)) return null;
  const [userId, exp] = payload.split('.');
  if (!exp || Date.now() > +exp) return null;
  return userId;
}
function safeEq(a, b) { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && crypto.timingSafeEqual(x, y); }
function setSession(res, userId) { res.cookie(COOKIE, sign(userId), { httpOnly: true, sameSite: 'lax', secure: PUBLIC_URL.startsWith('https'), maxAge: 1000 * 60 * 60 * 24 * 30, path: '/' }); }
function clearSession(res) { res.clearCookie(COOKIE, { path: '/' }); }
function currentUser(req) { const id = readToken(req.cookies[COOKIE]); return id ? db.findUser(id) : null; }
function requireAuth(req, res, next) { const u = currentUser(req); if (!u) return res.status(401).json({ error: 'Log ind for at fortsætte.' }); if (u.status === 'suspended') return res.status(403).json({ error: 'Kontoen er spærret.' }); req.user = u; next(); }
function requireAdmin(req, res, next) { requireAuth(req, res, () => { if (req.user.role !== 'admin' && req.user.role !== 'employee') return res.status(403).json({ error: 'Ingen adgang.' }); next(); }); }

const isEmail = e => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(e || ''));
const str = (v, max) => String(v == null ? '' : v).slice(0, max || 500);

/* ---------------- Auth ---------------- */
app.get('/api/health', (req, res) => res.json({ ok: true, stripe: !!stripe }));

app.post('/api/auth/signup', authLimiter, (req, res) => {
  const name = str(req.body.name, 80).trim(), email = str(req.body.email, 160).trim().toLowerCase(), pass = String(req.body.pass || '');
  if (!name || !email || !pass) return res.status(400).json({ error: 'Udfyld alle felter.' });
  if (!isEmail(email)) return res.status(400).json({ error: 'Ugyldig e-mail.' });
  if (pass.length < 6) return res.status(400).json({ error: 'Adgangskoden skal være mindst 6 tegn.' });
  if (db.findEmail(email)) return res.status(409).json({ error: 'Der findes allerede en bruger med denne e-mail.' });
  const u = { id: db.uid('usr'), name, email, pass: db.hashPassword(pass), provider: 'email', role: 'user', plan: null, tokens: db.PLANS.free.tokens, status: 'active', createdAt: db.now(), lastLogin: db.now(), stripeCustomer: null };
  db.data.users.push(u); db.log(email, 'signup'); db.save();
  setSession(res, u.id); res.json({ user: db.publicUser(u) });
});

app.post('/api/auth/login', authLimiter, (req, res) => {
  const email = str(req.body.email, 160).trim().toLowerCase(), pass = String(req.body.pass || '');
  const u = db.findEmail(email);
  if (!u || !db.verifyPassword(pass, u.pass)) return res.status(401).json({ error: 'Forkert e-mail eller adgangskode.' });
  if (u.status === 'suspended') return res.status(403).json({ error: 'Kontoen er spærret.' });
  u.lastLogin = db.now(); db.log(email, 'login'); db.save();
  setSession(res, u.id); res.json({ user: db.publicUser(u) });
});

app.post('/api/auth/logout', (req, res) => { clearSession(res); res.json({ ok: true }); });
app.get('/api/auth/me', (req, res) => { const u = currentUser(req); res.json({ user: db.publicUser(u) }); });

/* ---------------- Projects ---------------- */
app.get('/api/projects', requireAuth, (req, res) => {
  res.json({ projects: db.data.projects.filter(p => p.userId === req.user.id).sort((a, b) => b.updatedAt - a.updatedAt).map(meta) });
});
function meta(p) { return { id: p.id, name: p.name, status: p.status, mode: (p.theme || {}).mode, p: (p.theme || {}).p, p2: (p.theme || {}).p2, blocks: (p.blocks || []).length, createdAt: p.createdAt, updatedAt: p.updatedAt }; }

app.post('/api/projects', requireAuth, (req, res) => {
  const p = { id: db.uid('prj'), userId: req.user.id, name: str(req.body.name, 80) || 'Nyt website', theme: req.body.theme || {}, blocks: req.body.blocks || [], status: 'draft', createdAt: db.now(), updatedAt: db.now() };
  db.data.projects.push(p); db.save(); res.json({ project: p });
});
app.get('/api/projects/:id', requireAuth, (req, res) => {
  const p = db.data.projects.find(x => x.id === req.params.id && x.userId === req.user.id);
  if (!p) return res.status(404).json({ error: 'Projekt ikke fundet.' });
  res.json({ project: p });
});
app.put('/api/projects/:id', requireAuth, (req, res) => {
  const p = db.data.projects.find(x => x.id === req.params.id && x.userId === req.user.id);
  if (!p) return res.status(404).json({ error: 'Projekt ikke fundet.' });
  if (req.body.name != null) p.name = str(req.body.name, 80);
  if (req.body.theme != null) p.theme = req.body.theme;
  if (req.body.blocks != null) p.blocks = req.body.blocks;
  if (req.body.status === 'draft' || req.body.status === 'published') p.status = req.body.status;
  p.updatedAt = db.now(); db.save(); res.json({ project: meta(p) });
});
app.delete('/api/projects/:id', requireAuth, (req, res) => {
  const before = db.data.projects.length;
  db.data.projects = db.data.projects.filter(x => !(x.id === req.params.id && x.userId === req.user.id));
  if (db.data.projects.length === before) return res.status(404).json({ error: 'Projekt ikke fundet.' });
  db.save(); res.json({ ok: true });
});

/* ---------------- Tokens ---------------- */
app.post('/api/tokens/spend', requireAuth, (req, res) => {
  const n = Math.max(0, Math.min(1e7, +req.body.amount || 0));
  if (req.user.tokens < n) return res.status(402).json({ error: 'Ikke nok tokens', tokens: req.user.tokens });
  req.user.tokens -= n; db.save(); res.json({ tokens: req.user.tokens });
});

/* ---------------- Billing (Stripe) ---------------- */
app.get('/api/billing/config', (req, res) => res.json({ enabled: !!stripe, publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || null, plans: db.PLANS }));

app.post('/api/billing/checkout', requireAuth, async (req, res) => {
  if (!stripe) return res.status(400).json({ error: 'Stripe er ikke konfigureret. Tilføj dine nøgler i .env.' });
  const planKey = req.body.plan;
  const plan = db.PLANS[planKey];
  if (!plan || planKey === 'free') return res.status(400).json({ error: 'Ugyldig plan.' });
  const envPrice = { start: process.env.STRIPE_PRICE_START, pro: process.env.STRIPE_PRICE_PRO, business: process.env.STRIPE_PRICE_BUSINESS }[planKey];
  const line_items = [envPrice ? { price: envPrice, quantity: 1 } : {
    quantity: 1,
    price_data: { currency: 'dkk', unit_amount: plan.price * 100, recurring: { interval: 'month' }, product_data: { name: 'Reachmore ' + plan.name } }
  }];
  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription', line_items,
      client_reference_id: req.user.id,
      customer_email: req.user.email,
      metadata: { userId: req.user.id, plan: planKey },
      success_url: PUBLIC_URL + '/dashboard.html?paid=1',
      cancel_url: PUBLIC_URL + '/dashboard.html?canceled=1'
    });
    res.json({ url: session.url });
  } catch (e) { res.status(500).json({ error: 'Kunne ikke starte betaling: ' + e.message }); }
});

function handleWebhook(req, res) {
  if (!stripe) return res.status(400).end();
  const sigSecret = process.env.STRIPE_WEBHOOK_SECRET;
  let event;
  try { event = sigSecret ? stripe.webhooks.constructEvent(req.body, req.headers['stripe-signature'], sigSecret) : JSON.parse(req.body); }
  catch (e) { return res.status(400).send('Webhook error: ' + e.message); }
  if (event.type === 'checkout.session.completed') {
    // First payment — grant access to the purchased package immediately
    const s = event.data.object;
    const u = db.findUser((s.metadata && s.metadata.userId) || s.client_reference_id);
    const planKey = s.metadata && s.metadata.plan;
    if (u && db.PLANS[planKey]) {
      u.plan = planKey; u.tokens = (u.tokens || 0) + db.PLANS[planKey].tokens;
      u.stripeCustomer = s.customer || u.stripeCustomer;
      u.stripeSubscription = s.subscription || u.stripeSubscription;
      u.planRenewsAt = Date.now() + 31 * 864e5;
      db.log(u.email, 'payment', 'Stripe → ' + planKey + ' (' + db.PLANS[planKey].tokens + ' tokens/md)'); db.save();
    }
  } else if (event.type === 'invoice.paid') {
    // Monthly renewal — top the plan's tokens back up each cycle
    const inv = event.data.object;
    if (inv.billing_reason === 'subscription_cycle' || inv.billing_reason === 'subscription_create') {
      const u = db.data.users.find(x => x.stripeCustomer === inv.customer);
      if (u && u.plan && db.PLANS[u.plan]) {
        u.tokens = (u.tokens || 0) + db.PLANS[u.plan].tokens;
        u.planRenewsAt = Date.now() + 31 * 864e5;
        db.log(u.email, 'renewal', 'Månedlig fornyelse → +' + db.PLANS[u.plan].tokens + ' tokens'); db.save();
      }
    }
  } else if (event.type === 'customer.subscription.deleted') {
    const sub = event.data.object;
    const u = db.data.users.find(x => x.stripeCustomer === sub.customer);
    if (u) { u.plan = null; u.stripeSubscription = null; db.log(u.email, 'subscription_canceled'); db.save(); }
  }
  res.json({ received: true });
}

/* ---------------- Admin ---------------- */
app.get('/api/admin/stats', requireAdmin, (req, res) => {
  const users = db.data.users, paying = users.filter(u => u.plan);
  const mrr = paying.reduce((s, u) => s + (db.PLANS[u.plan] ? db.PLANS[u.plan].price : 0), 0);
  res.json({ users: users.length, paying: paying.length, free: users.filter(u => !u.plan).length, suspended: users.filter(u => u.status === 'suspended').length, projects: db.data.projects.length, domains: db.data.domains.length, mrr, arr: mrr * 12 });
});
app.get('/api/admin/users', requireAdmin, (req, res) => res.json({ users: db.data.users.map(db.publicUser) }));
app.put('/api/admin/users/:id', requireAdmin, (req, res) => {
  const u = db.findUser(req.params.id); if (!u) return res.status(404).json({ error: 'Ikke fundet.' });
  const b = req.body;
  if (b.plan !== undefined) { u.plan = b.plan === 'free' ? null : b.plan; if (db.PLANS[b.plan]) u.tokens += db.PLANS[b.plan].tokens; }
  if (b.role) u.role = b.role;
  if (b.status) u.status = b.status;
  if (typeof b.addTokens === 'number') u.tokens += Math.max(0, b.addTokens);
  db.log(req.user.email, 'admin_update', u.email); db.save(); res.json({ user: db.publicUser(u) });
});
app.delete('/api/admin/users/:id', requireAdmin, (req, res) => {
  db.data.users = db.data.users.filter(u => u.id !== req.params.id);
  db.data.projects = db.data.projects.filter(p => p.userId !== req.params.id);
  db.log(req.user.email, 'admin_delete', req.params.id); db.save(); res.json({ ok: true });
});
app.get('/api/admin/audit', requireAdmin, (req, res) => res.json({ audit: db.data.audit.slice(0, 200) }));

/* ---------------- Domains & hosting (GoDaddy reseller, white-label) ---------------- */
// Retail prices in DKK/year. With GoDaddy reseller keys we fetch live wholesale prices
// and apply GODADDY_MARKUP; without keys we serve these prices + simulated availability.
const TLD_RETAIL = { '.dk': 49, '.com': 99, '.net': 99, '.io': 399, '.shop': 129, '.online': 89, '.dev': 159, '.eu': 69 };
const GD_KEY = process.env.GODADDY_KEY, GD_SECRET = process.env.GODADDY_SECRET;
const GD_BASE = (process.env.GODADDY_ENV === 'prod') ? 'https://api.godaddy.com' : 'https://api.ote-godaddy.com';
const GD_MARKUP = parseFloat(process.env.GODADDY_MARKUP || '1.4');
const dslug = s => String(s || '').toLowerCase().replace(/[æ]/g, 'ae').replace(/[ø]/g, 'oe').replace(/[å]/g, 'aa').replace(/[^a-z0-9-]/g, '').slice(0, 60);

app.get('/api/domains/search', async (req, res) => {
  const name = dslug(req.query.q); if (!name) return res.status(400).json({ error: 'Indtast et domænenavn.' });
  const tlds = Object.keys(TLD_RETAIL);
  // Live lookup via GoDaddy reseller API when configured
  if (GD_KEY && GD_SECRET && typeof fetch === 'function') {
    try {
      const results = await Promise.all(tlds.map(async tld => {
        const r = await fetch(GD_BASE + '/v1/domains/available?domain=' + name + tld, { headers: { Authorization: 'sso-key ' + GD_KEY + ':' + GD_SECRET } });
        const j = await r.json();
        const retail = j.price ? Math.ceil((j.price / 1e6) * GD_MARKUP) : TLD_RETAIL[tld];
        return { domain: name + tld, available: !!j.available, price: retail };
      }));
      return res.json({ live: true, results });
    } catch (e) { /* fall through to simulated */ }
  }
  // Simulated (deterministic) availability so the storefront works before keys are added
  const results = tlds.map(tld => { let h = 0; const s = name + tld; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return { domain: name + tld, available: (h % 10) > 2, price: TLD_RETAIL[tld] }; });
  res.json({ live: false, results });
});

app.post('/api/domains/order', requireAuth, (req, res) => {
  const item = str(req.body.item, 120), kind = str(req.body.kind, 20) || 'domain', price = str(req.body.price, 30);
  if (!item) return res.status(400).json({ error: 'Mangler vare.' });
  db.data.orders = db.data.orders || [];
  const order = { id: db.uid('ord'), userId: req.user.id, kind, item, price, status: 'pending', createdAt: db.now() };
  db.data.orders.push(order);
  if (kind === 'domain') { db.data.domains.push({ id: db.uid('dom'), host: item, kind: 'custom', userId: req.user.id, status: 'pending', createdAt: db.now() }); }
  db.log(req.user.email, 'order_' + kind, item + ' (' + price + ')'); db.save();
  res.json({ ok: true, order });
});
app.get('/api/admin/orders', requireAdmin, (req, res) => res.json({ orders: (db.data.orders || []).slice().reverse() }));

/* ---------------- Static app ---------------- */
app.use(express.static(path.join(__dirname, '..'), { extensions: ['html'] }));

app.use('/api', (req, res) => res.status(404).json({ error: 'Ukendt endpoint.' }));

app.listen(PORT, () => {
  console.log('Reachmore backend kører på ' + PUBLIC_URL);
  console.log('Stripe: ' + (stripe ? 'aktiv' : 'ikke konfigureret (tilføj nøgler i .env)'));
});
