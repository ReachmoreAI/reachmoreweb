/* ============================================================
   Reachmore backend — data layer (JSON file persistence).
   No native deps: passwords hashed with Node's built-in scrypt.
   ============================================================ */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DB_PATH = path.join(__dirname, 'data', 'db.json');

const PLANS = {
  free:     { key: 'free',     name: 'Gratis',   price: 0,   tokens: 1500 },
  start:    { key: 'start',    name: 'Start',    price: 99,  tokens: 50000 },
  pro:      { key: 'pro',      name: 'Pro',      price: 199, tokens: 200000 },
  business: { key: 'business', name: 'Business', price: 399, tokens: 1000000 }
};
const COSTS = { generate: 250, section: 60, rewrite: 50 };

const uid = p => (p || 'id') + '_' + crypto.randomBytes(6).toString('hex');
const now = () => Date.now();

/* ---- password hashing (scrypt) ---- */
function hashPassword(pw) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(String(pw), salt, 64).toString('hex');
  return salt + ':' + hash;
}
function verifyPassword(pw, stored) {
  if (!stored || stored.indexOf(':') < 0) return false;
  const [salt, hash] = stored.split(':');
  const test = crypto.scryptSync(String(pw), salt, 64).toString('hex');
  const a = Buffer.from(hash, 'hex'), b = Buffer.from(test, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

let data = load();

function load() {
  try { return JSON.parse(fs.readFileSync(DB_PATH, 'utf8')); }
  catch (e) { const seeded = seed(); persist(seeded); return seeded; }
}
function persist(d) {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(DB_PATH, JSON.stringify(d || data, null, 2));
}
function save() { persist(data); }

function seed() {
  const adminEmail = (process.env.ADMIN_EMAIL || 'marcushnn21@gmail.com').toLowerCase();
  const admin = {
    id: uid('usr'), name: process.env.ADMIN_NAME || 'Marcus', email: adminEmail,
    pass: hashPassword(process.env.ADMIN_PASSWORD || 'mivs1232'),
    provider: 'email', role: 'admin', plan: 'business', tokens: PLANS.business.tokens,
    status: 'active', createdAt: now(), lastLogin: now(), stripeCustomer: null
  };
  return { v: 1, users: [admin], projects: [], domains: [], audit: [{ id: uid('a'), ts: now(), actor: 'system', action: 'seed', detail: 'DB initialiseret' }] };
}

function log(actor, action, detail) {
  data.audit.unshift({ id: uid('a'), ts: now(), actor: actor || 'system', action, detail: detail || '' });
  if (data.audit.length > 500) data.audit.pop();
}

/* ---- public surface for users (never leak password hash) ---- */
function publicUser(u) {
  if (!u) return null;
  return { id: u.id, name: u.name, email: u.email, role: u.role, plan: u.plan, tokens: u.tokens, status: u.status, provider: u.provider, createdAt: u.createdAt, lastLogin: u.lastLogin };
}

module.exports = {
  PLANS, COSTS, uid, now, hashPassword, verifyPassword, save, log, publicUser,
  get data() { return data; },
  findUser: id => data.users.find(u => u.id === id),
  findEmail: e => data.users.find(u => u.email === String(e || '').toLowerCase())
};
