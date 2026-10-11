'use strict';
/**
 * Vantage Learning data store (plain JSON files).
 *
 * Files in data/ (created on first use, never served to the public):
 *   users.json        optional student accounts: email, salted password hash and the saved shortlist
 *   sessions.json     signed-in browsers (only a hash of the cookie token is stored)
 *   submissions.json  suggestions from teachers, NGOs and students, waiting for review
 *   feedback.json     anonymous "was this useful?" answers
 *
 * The curated list is read from public/data/opportunities.json.
 *
 * Node runs one request at a time on a single thread, and every save here is synchronous, so two
 * requests can never overlap while changing data. Each save writes a temporary file and renames it,
 * so a crash in the middle cannot leave a half-written file.
 */
const fs = require('fs');
const path = require('path');

const MAX_PENDING = 500;
const MAX_USERS = 5000;
const MAX_FEEDBACK = 2000;

const now = () => new Date().toISOString();
const fail = (message, status) => Object.assign(new Error(message), { status });

function open({ dataDir, curatedFile }) {
  fs.mkdirSync(dataDir, { recursive: true });
  const file = dataDir;

  const read = (name, fallback) => {
    const f = path.join(dataDir, name);
    if (!fs.existsSync(f)) return fallback;
    try {
      const v = JSON.parse(fs.readFileSync(f, 'utf8'));
      return v && typeof v === typeof fallback ? v : fallback;
    } catch (e) {
      // keep the unreadable file instead of overwriting it
      const copy = f + '.broken-' + Date.now();
      try { fs.renameSync(f, copy); console.warn(`${name} could not be read. It was kept as ${path.basename(copy)}. Starting with an empty one.`); } catch (_) { /* ignore */ }
      return fallback;
    }
  };
  const save = (name, value) => {
    const f = path.join(dataDir, name);
    const tmp = f + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(value, null, 2));
    fs.renameSync(tmp, f);
  };

  let users = read('users.json', []);
  let sessions = read('sessions.json', {});
  let submissions = read('submissions.json', []);
  let feedback = read('feedback.json', []);
  if (!Array.isArray(users)) users = [];
  if (!Array.isArray(submissions)) submissions = [];
  if (!Array.isArray(feedback)) feedback = [];

  let curated = [];
  function syncCurated() {
    try {
      const items = JSON.parse(fs.readFileSync(curatedFile, 'utf8'));
      curated = Array.isArray(items) ? items.filter(o => o && typeof o.id === 'string') : [];
    } catch (e) { console.warn('Could not read ' + curatedFile + ': ' + e.message); }
  }
  syncCurated();

  const userRow = u => (u ? { id: u.id, email: u.email, name: u.name || '', salt: u.salt, hash: u.hash } : null);
  const copyPlan = p => ({ saved: [...(p.saved || [])], track: JSON.parse(JSON.stringify(p.track || {})) });
  const prune = () => {
    const t = Date.now();
    let changed = false;
    for (const [h, s] of Object.entries(sessions)) if (!s || !(s.exp >= t)) { delete sessions[h]; changed = true; }
    return changed;
  };
  if (prune()) save('sessions.json', sessions);

  return {
    file,
    close() { /* nothing to close: every change is saved as it happens */ },
    syncCurated,

    /** Curated opportunities followed by approved community suggestions. */
    listPublished() {
      const community = submissions
        .filter(s => s.status === 'approved' && s.opportunity)
        .map(s => Object.assign({}, s.opportunity, { community: true }));
      return [...curated, ...community];
    },

    addSubmission({ id, opportunity, contact }) {
      if (submissions.filter(s => s.status === 'pending').length >= MAX_PENDING) throw fail('queue full', 503);
      submissions.push({ id, status: 'pending', createdAt: now(), contact: contact || '', opportunity });
      save('submissions.json', submissions);
    },
    listSubmissions(status) {
      return submissions.filter(s => s.status === status).map(s => JSON.parse(JSON.stringify(s)));
    },
    decideSubmission(id, decision) {
      const s = submissions.find(x => x.id === id);
      if (!s) return false;
      s.status = decision;
      s.reviewedAt = now();
      save('submissions.json', submissions);
      return true;
    },

    addFeedback({ helpful, stage, note }) {
      feedback.push({ at: now(), helpful: !!helpful, stage: stage || null, note: note || '' });
      if (feedback.length > MAX_FEEDBACK) feedback = feedback.slice(-MAX_FEEDBACK);
      save('feedback.json', feedback);
    },

    /** Returns the new user, or null when the email already has an account. */
    createUser({ id, email, name, salt, hash, plan }) {
      if (users.some(u => u.email === email)) return null;
      if (users.length >= MAX_USERS) throw fail('too many users', 503);
      users.push({ id, email, name: name || '', salt, hash, createdAt: now(), plan: plan ? copyPlan(plan) : { saved: [], track: {} } });
      save('users.json', users);
      return { id, email, name: name || '', salt, hash };
    },
    userByEmail: email => userRow(users.find(u => u.email === email)),
    getPlan(userId) {
      const u = users.find(x => x.id === userId);
      return u ? copyPlan(u.plan || {}) : { saved: [], track: {} };
    },
    setPlan(userId, plan) {
      const u = users.find(x => x.id === userId);
      if (!u) return;
      u.plan = copyPlan(plan);
      u.updatedAt = now();
      save('users.json', users);
    },
    deleteUser(id) {
      const before = users.length;
      users = users.filter(u => u.id !== id);
      if (users.length === before) return false;
      for (const [h, s] of Object.entries(sessions)) if (s.uid === id) delete sessions[h];
      save('users.json', users);
      save('sessions.json', sessions);
      return true;
    },

    createSession(tokenHash, userId, expiresAt) {
      prune();
      sessions[tokenHash] = { uid: userId, exp: expiresAt };
      save('sessions.json', sessions);
    },
    userForSession(tokenHash) {
      const s = Object.prototype.hasOwnProperty.call(sessions, tokenHash) ? sessions[tokenHash] : null;
      if (!s || !(s.exp >= Date.now())) return null;
      return userRow(users.find(u => u.id === s.uid));
    },
    deleteSession(tokenHash) {
      if (Object.prototype.hasOwnProperty.call(sessions, tokenHash)) {
        delete sessions[tokenHash];
        save('sessions.json', sessions);
      }
    },

    counts() {
      return {
        opportunities: curated.length,
        pendingSuggestions: submissions.filter(s => s.status === 'pending').length,
        users: users.length,
        feedback: feedback.length
      };
    }
  };
}

module.exports = { open };
