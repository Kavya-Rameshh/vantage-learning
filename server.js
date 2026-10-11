'use strict';
/**
 * Vantage Learning backend.
 *
 * - Serves the static site from /public
 * - GET  /api/opportunities          published opportunities (curated + approved community ones)
 * - POST /api/submissions            a teacher, NGO or student suggests an opportunity (goes to review)
 * - POST /api/feedback               "was this useful?" signal, no personal data
 * - GET  /api/admin/submissions      list suggestions (needs ADMIN_TOKEN)
 * - POST /api/admin/submissions/:id  approve or reject (needs ADMIN_TOKEN)
 *
 * Optional student accounts (only used to keep a shortlist across devices):
 * - POST   /api/auth/signup           create an account, sign in
 * - POST   /api/auth/login            sign in
 * - POST   /api/auth/logout           sign out
 * - GET    /api/me                    who am I, plus my saved plan ({ user: null } when signed out)
 * - PUT    /api/me/plan               save my shortlist and progress
 * - DELETE /api/me                    delete my account (needs the password)
 *
 * Data is stored in plain JSON files (see db.js), in the data/ folder.
 *
 * Matching runs in the browser on purpose: a student's answers (income, caste, disability)
 * never leave their device.
 */
const express = require('express');
const path = require('path');
const crypto = require('crypto');
const { promisify } = require('util');

const PORT = process.env.PORT || 3000;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '';
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');

let db;
try {
  db = require('./db').open({ dataDir: DATA_DIR, curatedFile: path.join(__dirname, 'public', 'data', 'opportunities.json') });
} catch (e) {
  console.error(e.friendly ? '\n' + e.message + '\n' : e);
  process.exit(1);
}

const TYPES = ['scholarship', 'competition', 'mentorship', 'internship', 'learning'];
const STAGES = ['school', 'plus2', 'college', 'voc'];
const INTERESTS = ['tech', 'sci', 'health', 'biz', 'arts', 'skills'];

/* ---------- validation ---------- */
const clean = (v, max) => String(v == null ? '' : v).replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
function validateSubmission(b) {
  const errors = {};
  const o = {
    type: clean(b.type, 20),
    title: clean(b.title, 120),
    org: clean(b.org, 120),
    blurb: clean(b.blurb, 400),
    url: clean(b.url, 300),
    cost: clean(b.cost, 60),
    when: clean(b.when, 80),
    mode: clean(b.mode, 60)
  };
  if (!TYPES.includes(o.type)) errors.type = 'Choose a type.';
  if (o.title.length < 4) errors.title = 'Give it a name of at least 4 characters.';
  if (o.org.length < 2) errors.org = 'Tell us who runs it.';
  if (o.blurb.length < 20) errors.blurb = 'Describe it in at least 20 characters.';
  try {
    const u = new URL(o.url);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') throw new Error();
    o.url = u.toString();
  } catch (e) { errors.url = 'Enter the official website, starting with https://'; }
  const stages = Array.isArray(b.stages) ? b.stages.filter(s => STAGES.includes(s)) : [];
  if (!stages.length) errors.stages = 'Pick at least one study level.';
  o.stages = [...new Set(stages)];
  let interests = 'any';
  if (Array.isArray(b.interests) && b.interests.length) {
    const list = [...new Set(b.interests.filter(i => INTERESTS.includes(i)))];
    if (list.length && list.length < INTERESTS.length) interests = list;
  }
  o.interests = interests;
  o.rural = b.rural ? 1 : 0;
  const contact = clean(b.contact, 120); // kept private, never sent to the public API
  return { errors, value: o, contact };
}

/* ---------- small in-memory rate limiter ---------- */
function rateLimit(max, windowMs) {
  const hits = new Map();
  setInterval(() => { const now = Date.now(); for (const [k, v] of hits) if (v.reset < now) hits.delete(k); }, windowMs).unref();
  return (req, res, next) => {
    const key = req.ip;
    const now = Date.now();
    let h = hits.get(key);
    if (!h || h.reset < now) { h = { n: 0, reset: now + windowMs }; hits.set(key, h); }
    if (++h.n > max) return res.status(429).json({ error: 'Too many requests. Please try again in a few minutes.' });
    next();
  };
}

/* ---------- app ---------- */
const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use((req, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    'X-Frame-Options': 'DENY',
    'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'"
  });
  next();
});
app.use(express.json({ limit: '40kb' }));

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.get('/api/opportunities', (req, res, next) => {
  try {
    res.set('Cache-Control', 'public, max-age=60');
    res.json({ updated: new Date().toISOString(), items: db.listPublished() });
  } catch (e) { next(e); }
});

app.post('/api/submissions', rateLimit(5, 15 * 60 * 1000), (req, res, next) => {
  try {
    if (req.body && req.body.website) return res.status(201).json({ ok: true }); // honeypot for bots
    const { errors, value, contact } = validateSubmission(req.body || {});
    if (Object.keys(errors).length) return res.status(400).json({ error: 'Please fix the highlighted fields.', fields: errors });
    const id = 'c-' + crypto.randomBytes(5).toString('hex');
    db.addSubmission({ id, opportunity: Object.assign({ id }, value), contact });
    res.status(201).json({ ok: true, id });
  } catch (e) { next(e); }
});

app.post('/api/feedback', rateLimit(30, 15 * 60 * 1000), (req, res, next) => {
  try {
    const helpful = req.body && typeof req.body.helpful === 'boolean' ? req.body.helpful : null;
    if (helpful === null) return res.status(400).json({ error: 'helpful must be true or false.' });
    const stage = STAGES.includes(req.body.stage) ? req.body.stage : null;
    db.addFeedback({ helpful, stage, note: clean(req.body.note, 300) });
    res.status(201).json({ ok: true });
  } catch (e) { next(e); }
});

/* ---------- admin ---------- */
function admin(req, res, next) {
  if (!ADMIN_TOKEN) return res.status(503).json({ error: 'Admin is disabled. Set the ADMIN_TOKEN environment variable.' });
  const given = String(req.get('x-admin-token') || '');
  const a = Buffer.from(given), b = Buffer.from(ADMIN_TOKEN);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return res.status(401).json({ error: 'Wrong token.' });
  next();
}
const adminLimit = rateLimit(60, 15 * 60 * 1000);
app.get('/api/admin/submissions', adminLimit, admin, (req, res, next) => {
  try {
    res.json({ items: db.listSubmissions(clean(req.query.status || 'pending', 12)) });
  } catch (e) { next(e); }
});
app.post('/api/admin/submissions/:id', adminLimit, admin, (req, res, next) => {
  try {
    const decision = req.body && req.body.decision;
    if (!['approved', 'rejected'].includes(decision)) return res.status(400).json({ error: 'decision must be approved or rejected.' });
    if (!db.decideSubmission(req.params.id, decision)) return res.status(404).json({ error: 'Not found.' });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

/* ---------- optional student accounts ---------- */
// An account only keeps the shortlist in sync across devices. Matching answers (income, caste,
// disability) are never sent to the server. Stored per user: email, optional first name,
// a salted scrypt hash of the password, and the shortlist.
const scrypt = promisify(crypto.scrypt);
const SESSION_DAYS = 30;
const COOKIE = 'vl_session';
const ID_RE = /^[A-Za-z0-9_-]{1,60}$/;
const STATUSES = ['toapply', 'applying', 'applied', 'done'];
const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/;
const DUMMY_SALT = crypto.randomBytes(16).toString('hex');

const sha = v => crypto.createHash('sha256').update(v).digest('hex');
const hashPassword = async (pw, salt) => (await scrypt(pw, salt, 64)).toString('hex');
const publicUser = u => ({ email: u.email, name: u.name || '' });

function cleanPlan(b) {
  const saved = Array.isArray(b && b.saved)
    ? [...new Set(b.saved.filter(x => typeof x === 'string' && ID_RE.test(x)))].slice(0, 200) : [];
  const entries = [];
  if (b && b.track && typeof b.track === 'object' && !Array.isArray(b.track)) {
    for (const [k, v] of Object.entries(b.track).slice(0, 200)) {
      if (!ID_RE.test(k) || !v || typeof v !== 'object') continue;
      const status = STATUSES.includes(v.status) ? v.status : undefined;
      const deadline = typeof v.deadline === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v.deadline) ? v.deadline : undefined;
      if (status || deadline) entries.push([k, Object.assign({}, status ? { status } : {}, deadline ? { deadline } : {})]);
    }
  }
  return { saved, track: Object.fromEntries(entries) }; // fromEntries: safe even for a "__proto__" key
}

function getCookie(req, name) {
  const h = req.headers.cookie;
  if (!h) return null;
  for (const part of h.split(';')) {
    const i = part.indexOf('=');
    if (i > 0 && part.slice(0, i).trim() === name) {
      try { return decodeURIComponent(part.slice(i + 1).trim()); } catch (e) { return null; }
    }
  }
  return null;
}
const cookieFlags = req => 'HttpOnly; SameSite=Lax; Path=/' + (req.secure ? '; Secure' : '');
const setSessionCookie = (req, res, token) => res.append('Set-Cookie', `${COOKIE}=${token}; ${cookieFlags(req)}; Max-Age=${SESSION_DAYS * 86400}`);
const clearSessionCookie = (req, res) => res.append('Set-Cookie', `${COOKIE}=; ${cookieFlags(req)}; Max-Age=0`);

function createSession(userId) {
  const token = crypto.randomBytes(32).toString('hex');
  db.createSession(sha(token), userId, Date.now() + SESSION_DAYS * 86400000); // only a hash of the token is stored
  return token;
}
function currentUser(req) {
  const token = getCookie(req, COOKIE);
  if (!token || !/^[0-9a-f]{64}$/.test(token)) return null;
  return db.userForSession(sha(token));
}

// Account responses are private: never cache them, and reject cross-site writes.
app.use(['/api/auth', '/api/me'], (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  if (req.method === 'GET' || req.method === 'HEAD') return next();
  const origin = req.get('origin');
  if (origin) {
    let host = null;
    try { host = new URL(origin).host; } catch (e) { /* invalid origin */ }
    if (host !== req.get('host')) return res.status(403).json({ error: 'This request was blocked.' });
  }
  next();
});
function needUser(req, res, next) {
  try {
    const u = currentUser(req);
    if (!u) return res.status(401).json({ error: 'Please sign in again.' });
    req.user = u; next();
  } catch (e) { next(e); }
}

app.post('/api/auth/signup', rateLimit(10, 15 * 60 * 1000), async (req, res, next) => {
  try {
    const b = req.body || {};
    const email = clean(b.email, 120).toLowerCase();
    const name = clean(b.name, 40);
    const pw = typeof b.password === 'string' ? b.password : '';
    const fields = {};
    if (!EMAIL_RE.test(email)) fields.email = 'Enter a valid email address.';
    if (pw.length < 8) fields.password = 'Use at least 8 characters.';
    else if (pw.length > 200) fields.password = 'Use 200 characters or fewer.';
    else if (pw.toLowerCase() === email) fields.password = 'Choose a password that is different from your email.';
    if (Object.keys(fields).length) return res.status(400).json({ error: 'Please fix the highlighted fields.', fields });
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = await hashPassword(pw, salt);
    const plan = cleanPlan(b.plan);
    const user = db.createUser({ id: 'u-' + crypto.randomBytes(8).toString('hex'), email, name, salt, hash, plan });
    if (!user) return res.status(409).json({ error: 'This email already has an account. Try signing in instead.', fields: { email: 'This email already has an account.' } });
    setSessionCookie(req, res, createSession(user.id));
    res.status(201).json({ user: publicUser(user), plan });
  } catch (e) { next(e); }
});

app.post('/api/auth/login', rateLimit(20, 15 * 60 * 1000), async (req, res, next) => {
  try {
    const b = req.body || {};
    const email = clean(b.email, 120).toLowerCase();
    const pw = typeof b.password === 'string' && b.password.length <= 200 ? b.password : '';
    const user = db.userByEmail(email);
    const hash = await hashPassword(pw, user ? user.salt : DUMMY_SALT); // same work whether or not the email exists
    const ok = !!user && pw.length > 0 && crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(user.hash, 'hex'));
    if (!ok) return res.status(401).json({ error: 'The email or password is not right.' });
    setSessionCookie(req, res, createSession(user.id));
    res.json({ user: publicUser(user), plan: db.getPlan(user.id) });
  } catch (e) { next(e); }
});

app.post('/api/auth/logout', (req, res, next) => {
  try {
    const token = getCookie(req, COOKIE);
    if (token && /^[0-9a-f]{64}$/.test(token)) db.deleteSession(sha(token));
    clearSessionCookie(req, res);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

app.get('/api/me', (req, res, next) => {
  try {
    const u = currentUser(req);
    if (!u) return res.json({ user: null });
    res.json({ user: publicUser(u), plan: db.getPlan(u.id) });
  } catch (e) { next(e); }
});

app.put('/api/me/plan', rateLimit(300, 15 * 60 * 1000), needUser, (req, res, next) => {
  try {
    const plan = cleanPlan(req.body || {});
    db.setPlan(req.user.id, plan);
    res.json({ plan });
  } catch (e) { next(e); }
});

app.delete('/api/me', rateLimit(10, 15 * 60 * 1000), needUser, async (req, res, next) => {
  try {
    const pw = req.body && typeof req.body.password === 'string' && req.body.password.length <= 200 ? req.body.password : '';
    const hash = await hashPassword(pw, req.user.salt);
    if (!pw || !crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(req.user.hash, 'hex'))) {
      return res.status(401).json({ error: 'That password is not right.' });
    }
    db.deleteUser(req.user.id); // also removes their sign-ins, shortlist and progress
    clearSessionCookie(req, res);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

app.use('/api', (req, res) => res.status(404).json({ error: 'Not found.' }));

/* ---------- static site ---------- */
app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'], maxAge: '5m' }));

app.use((err, req, res, next) => {
  if (err && err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON.' });
  if (err && err.type === 'entity.too.large') return res.status(413).json({ error: 'Request too large.' });
  console.error(err);
  res.status(err.status || 500).json({ error: 'Something went wrong on our side. Please try again.' });
});

if (require.main === module) {
  const server = app.listen(PORT, () => {
    const c = db.counts();
    console.log(`Vantage Learning running at http://localhost:${PORT}`);
    console.log(`Data folder: ${db.file} (${c.opportunities} opportunities, ${c.users} accounts, ${c.pendingSuggestions} suggestions waiting)`);
  });
  const stop = () => { server.close(() => { db.close(); process.exit(0); }); setTimeout(() => process.exit(0), 3000).unref(); };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
}
module.exports = app;
