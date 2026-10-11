'use strict';
/* Vantage Learning front end.
   Matching runs here, in the browser, so a student's answers never leave the device.
   The server only supplies the opportunity list and receives suggestions and yes/no feedback. */

/* ---------- constants ---------- */
const TYPE = { scholarship: 'Scholarship', competition: 'Competition', mentorship: 'Mentorship', internship: 'Internship', learning: 'Learning' };
const TYPE_PL = { scholarship: 'Scholarships', competition: 'Competitions', mentorship: 'Mentorship', internship: 'Internships', learning: 'Learning' };
const TORDER = ['scholarship', 'competition', 'mentorship', 'internship', 'learning'];
const NEXT = {
  scholarship: 'Check the eligibility on the official page and keep your documents ready.',
  competition: 'Open the official page and note the registration window.',
  mentorship: 'Create a profile and send a short, specific request.',
  internship: 'Read the eligibility, then apply with a one-page résumé.',
  learning: 'Open it and finish the first lesson today.'
};
const STAGE = { school: 'Class 6–10', plus2: 'Class 11–12', college: 'College or university', voc: 'ITI or diploma' };
const INTEREST = { tech: 'Engineering & Technology', sci: 'Science & Research', health: 'Medicine & Health', biz: 'Commerce & Business', arts: 'Arts, Law & Humanities', skills: 'Agriculture & Skills' };
const NEEDS = { scholarship: 'Funding for my studies', competition: 'A challenge to win', mentorship: 'Someone to guide me', internship: 'Real work experience', learning: 'Skills and study material' };
const HOME = { village: 'Village', town: 'Small town', city: 'City' };
const BANDS = { lt1: { min: 0, max: 1, label: 'Under ₹1 lakh' }, b1: { min: 1, max: 2.5, label: '₹1–2.5 lakh' }, b2: { min: 2.5, max: 8, label: '₹2.5–8 lakh' }, gt8: { min: 8, max: Infinity, label: 'Above ₹8 lakh' } };
const CIRC = { girl: 'Girl student', sc: 'Scheduled Caste (SC)', st: 'Scheduled Tribe (ST)', obc: 'OBC', minority: 'Minority community', pwd: 'Person with a disability' };
const STATES = ['Andaman and Nicobar Islands', 'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chandigarh', 'Chhattisgarh', 'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jammu and Kashmir', 'Jharkhand', 'Karnataka', 'Kerala', 'Ladakh', 'Lakshadweep', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Puducherry', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal'];
const STEPS = [
  { key: 'stage', q: 'Where are you in your studies?', hint: 'Pick the closest one.', cols: 2, opts: [['school', 'Class 6–10', 'School'], ['plus2', 'Class 11–12', 'Plus-two or higher secondary'], ['college', 'College or university', 'Degree or postgraduate'], ['voc', 'ITI or diploma', 'Polytechnic or vocational']] },
  { key: 'interest', q: 'What pulls you most?', hint: 'Choose the field you would love to grow in.', cols: 2, opts: Object.entries(INTEREST).map(([k, v]) => [k, v, '']) },
  { key: 'need', q: 'What would help you most right now?', hint: 'We will show this first. You will still see everything else.', cols: 1, opts: Object.entries(NEEDS).map(([k, v]) => [k, v, '']) },
  { key: 'home', q: 'Where do you study from?', hint: 'Some opportunities are built for students far from big cities.' },
  { key: 'elig', q: 'Anything that could unlock more support?', hint: 'Optional. We use this only to show schemes meant for you.' }
];
const VIEWS = ['home', 'find', 'library', 'shortlist', 'account', 'toolkit', 'contribute'];
const IC = {
  scholarship: '<path d="M2 9l10-5 10 5-10 5L2 9z"/><path d="M6 11.5V16c0 1.5 3 3 6 3s6-1.5 6-3v-4.5"/><path d="M22 9v6"/>',
  competition: '<path d="M8 4h8v5a4 4 0 0 1-8 0V4z"/><path d="M8 6H4v1a3 3 0 0 0 4 2.8M16 6h4v1a3 3 0 0 1-4 2.8"/><path d="M12 13v4M9 20h6M10 17h4v3h-4z"/>',
  mentorship: '<circle cx="9" cy="8" r="3"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17" cy="9" r="2.5"/><path d="M17 14c2.5 0 4.5 2 4.5 5"/>',
  internship: '<rect x="3" y="7" width="18" height="12" rx="2"/><path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M3 12h18"/>',
  learning: '<path d="M3 5.5C5.5 4.5 9 4.5 12 6.5c3-2 6.5-2 9-1V19c-2.5-1-6-1-9 1-3-2-6.5-2-9-1V5.5z"/><path d="M12 6.5V20"/>'
};
const STAR = '<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true"><path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.8 6.8 19.6l1-5.8L3.5 9.7l5.9-.9z"/></svg>';
const STATUS = { toapply: 'To apply', applying: 'Applying', applied: 'Applied', done: 'Heard back' };

/* ---------- helpers ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const safeUrl = u => { try { const x = new URL(u); return x.protocol === 'https:' || x.protocol === 'http:' ? x.href : '#'; } catch (e) { return '#'; } };
const icon = (t, s = 22) => `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IC[t] || ''}</svg>`;
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } },
  del(k) { try { localStorage.removeItem(k); } catch (e) { /* storage unavailable */ } }
};
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
let toastT;
function toast(m) { const t = $('#toast'); t.textContent = m; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, 2400); }
async function copyText(text, ta) {
  try { await navigator.clipboard.writeText(text); toast('Copied'); }
  catch (e) { if (ta) { ta.hidden = false; ta.focus(); ta.select(); } toast('Select the text and copy it'); }
}
async function api(url, opts, ms = 9000) {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), ms);
  try {
    const r = await fetch(url, Object.assign({ signal: c.signal, headers: { Accept: 'application/json' } }, opts));
    let body = null;
    try { body = await r.json(); } catch (e) { /* not json */ }
    return { ok: r.ok, status: r.status, body };
  } finally { clearTimeout(t); }
}

/* ---------- state ---------- */
let DATA = [];
let source = 'none';
let step = 0, demo = false, resTab = 'all';
const emptyAns = () => ({ stage: null, interest: null, need: null, home: null, state: '', income: null, circ: [] });
let ans = emptyAns();
let saved = new Set(store.get('vantage.saved', []));
let checks = store.get('vantage.checks', {});
let track = store.get('vantage.track', {});
let mm = { name: '', who: '', found: '', goal: '' };
let libType = 'all', libStage = 'all';
let me = null, meReady = false, dirty = !!store.get('vantage.dirty', false), acctMode = 'signup', pushT = null;
const acctDraft = { email: '', name: '' };
const JSON_HEADERS = { 'Content-Type': 'application/json', Accept: 'application/json' };
let current = null;

/* ---------- data loading ---------- */
const validItem = o => o && typeof o.id === 'string' && typeof o.title === 'string' && TYPE[o.type] && Array.isArray(o.stages) && o.status !== 'pending' && o.status !== 'rejected';
async function loadData() {
  try {
    const r = await api('api/opportunities');
    if (r.ok && r.body && Array.isArray(r.body.items)) {
      DATA = r.body.items.filter(validItem); source = 'api';
      store.set('vantage.cache', { at: Date.now(), items: DATA });
      return;
    }
  } catch (e) { /* try next source */ }
  try {
    const r = await api('data/opportunities.json');
    const items = r.ok && r.body ? (Array.isArray(r.body) ? r.body : r.body.items) : null;
    if (items) { DATA = items.filter(validItem); source = 'static'; return; }
  } catch (e) { /* try cache */ }
  const c = store.get('vantage.cache', null);
  if (c && Array.isArray(c.items)) { DATA = c.items.filter(validItem); source = 'cache'; return; }
  DATA = []; source = 'none';
}
function showDataNote() {
  const n = $('#dataNote');
  const msg = {
    static: 'Showing the built-in list. Community additions appear when the server is reachable.',
    cache: 'You seem to be offline. Showing the list saved on this device.',
    none: 'The opportunity list could not be loaded. Check your connection and refresh the page.'
  }[source];
  n.hidden = !msg; n.textContent = msg || '';
}

/* ---------- matching (runs in the browser) ---------- */
function match(o, a) {
  if (!o.stages.includes(a.stage)) return null;
  let s = 0; const why = [];
  const rural = a.home === 'village' || a.home === 'town';
  if (o.stages.length < 4) why.push({ s: 'For ' + STAGE[a.stage] });
  if (o.interests === 'any' || !o.interests) s += 1;
  else if (o.interests.includes(a.interest)) { s += 3; why.push({ s: INTEREST[a.interest] }); }
  else return null;
  if (o.req) { if (!o.req.some(r => a.circ.includes(r))) return null; s += 3; why.push({ s: 'Meant for your background', t: 'ok' }); }
  if (o.boost && o.boost.some(b => a.circ.includes(b))) { s += 2; why.push({ s: 'Suits your background' }); }
  if (o.inc != null) {
    const b = BANDS[a.income];
    if (b) {
      if (b.min >= o.inc) return null;
      if (b.max <= o.inc) { s += 2; why.push({ s: 'Your income is within the limit', t: 'ok' }); }
      else why.push({ s: 'Income limit ₹' + o.inc + ' lakh. Check yours.', t: 'warn' });
    } else why.push({ s: 'Income limit ₹' + o.inc + ' lakh', t: 'warn' });
  }
  if (o.rural && rural) { s += 2; why.push({ s: 'Reachable from a ' + (a.home === 'village' ? 'village' : 'small town') }); }
  if (o.type === a.need) s += 4;
  if (o.hub) s += 1;
  return { o, s, why };
}
function run(a) {
  return DATA.map((o, i) => { const r = match(o, a); if (r) r.i = i; return r; }).filter(Boolean).sort((x, y) => y.s - x.s || x.i - y.i);
}
function pickTop(list) {
  const out = [], cnt = {};
  for (const r of list) { if ((cnt[r.o.type] || 0) >= 2) continue; out.push(r); cnt[r.o.type] = (cnt[r.o.type] || 0) + 1; if (out.length === 3) break; }
  return out;
}
const profile = () => (ans.stage ? ans : (store.get('vantage.profile', null) || null));

/* ---------- routing: one tab per feature ---------- */
let lastView = null;
function show(v, focus) {
  VIEWS.forEach(n => { $('#view-' + n).hidden = n !== v; });
  $$('.ntab').forEach(a => { if (a.dataset.tab === v) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
  const active = $('.ntab[aria-current="page"]');
  if (active && active.scrollIntoView) active.scrollIntoView({ block: 'nearest', inline: 'center' });
  if (v === 'find' && !$('#app').firstChild) initFind();
  if (v === 'library') renderLib();
  if (v === 'shortlist') renderShort();
  if (v === 'account') renderAccount();
  if (v === 'toolkit') renderToolkit();
  if (v === 'contribute') initContribute();
  if (lastView !== null && lastView !== v) { window.scrollTo(0, 0); }
  if (focus !== false && lastView !== null && lastView !== v) {
    const h = $('#view-' + v + ' h1'); if (h) h.focus({ preventScroll: true });
  }
  lastView = v;
  document.title = (v === 'home' ? '' : $('#view-' + v + ' h1').textContent.trim().slice(0, 0)) + 'Vantage Learning';
}
function route() {
  const v = (location.hash || '').replace('#', '').split('/')[0];
  show(VIEWS.includes(v) ? v : 'home');
}
function go(v) { if (location.hash === '#' + v) show(v); else location.hash = '#' + v; }
window.addEventListener('hashchange', route);

/* ---------- finder ---------- */
function initFind() {
  const p = store.get('vantage.profile', null);
  if (p && p.stage && DATA.length) { ans = Object.assign(emptyAns(), p); renderResults(); } else renderFinder();
}
function renderFinder() {
  const st = STEPS[step], n = STEPS.length;
  const stair = Array.from({ length: n }, (_, i) => `<i class="${i <= step ? 'on' : ''}"></i>`).join('');
  let body = '';
  if (st.opts) {
    body = `<div class="opts c${st.cols}" role="group" aria-label="${esc(st.q)}">${st.opts.map(([v, t, sub]) => `<button type="button" class="opt" data-act="pick" data-val="${v}" aria-pressed="${ans[st.key] === v}"><b>${esc(t)}</b>${sub ? `<small>${esc(sub)}</small>` : ''}</button>`).join('')}</div>`;
  } else if (st.key === 'home') {
    body = `<p class="lab">I study in a</p>
      <div class="opts c3" role="group" aria-label="Where you study from">${Object.entries(HOME).map(([v, t]) => `<button type="button" class="opt" data-act="home" data-val="${v}" aria-pressed="${ans.home === v}"><b>${t}</b></button>`).join('')}</div>
      <div><label class="lab" for="state">State or union territory <span>(optional, to show state schemes)</span></label>
      <select id="state" class="mt8"><option value="">Choose your state</option>${STATES.map(s => `<option ${ans.state === s ? 'selected' : ''}>${esc(s)}</option>`).join('')}</select></div>
      <div class="actions"><button type="button" class="btn btn-gold" data-act="next" ${ans.home ? '' : 'disabled'}>Continue</button></div>`;
  } else {
    body = `<div><p class="lab mb10">Family income per year</p>
      <div class="chips" role="group" aria-label="Family income per year">${Object.entries(BANDS).map(([v, b]) => `<button type="button" class="chip" data-act="income" data-val="${v}" aria-pressed="${ans.income === v}">${b.label}</button>`).join('')}<button type="button" class="chip" data-act="income" data-val="na" aria-pressed="${ans.income === 'na'}">Prefer not to say</button></div></div>
      <div><p class="lab mb10">Select any that apply</p>
      <div class="chips" role="group" aria-label="Circumstances">${Object.entries(CIRC).map(([v, t]) => `<button type="button" class="chip" data-act="circ" data-val="${v}" aria-pressed="${ans.circ.includes(v)}">${t}</button>`).join('')}</div></div>
      <p class="note">Many scholarships are reserved for specific groups or income levels. Your choices stay on this device.</p>
      <div class="actions"><button type="button" class="btn btn-gold" data-act="finish">Show my path</button></div>`;
  }
  $('#app').innerHTML = `<div class="finder"><div class="fpanel"><div class="stair" aria-hidden="true">${stair}</div><p class="step-label num">Step ${step + 1} of ${n}</p><h2 id="qt" tabindex="-1">${esc(st.q)}</h2><p class="hint">${esc(st.hint)}</p><div class="fnav">${step > 0 ? '<button type="button" class="link-btn" data-act="back">← Back</button>' : ''}</div></div><div class="fbody">${body}</div></div>`;
}
function gotoStep(i, focus = true) { step = i; renderFinder(); if (focus) { const h = $('#qt'); if (h) h.focus({ preventScroll: true }); } }

/* ---------- results ---------- */
const meta = o => [o.cost, o.mode, o.when].filter(Boolean).join(' · ');
function card(r, feat) {
  const o = r.o, sv = saved.has(o.id);
  return `<article class="card${feat ? ' feat' : ''}"><div class="card-top"><span class="emb">${icon(o.type)}</span><div><p class="kicker">${TYPE[o.type]}${o.community ? '<span class="badge">Community</span>' : ''}</p><h3>${esc(o.title)}</h3><p class="org">${esc(o.org)}</p></div></div>
  <p class="blurb">${esc(o.blurb)}</p>
  ${r.why && r.why.length ? `<ul class="why">${r.why.map(w => `<li class="${w.t || ''}">${esc(w.s)}</li>`).join('')}</ul>` : ''}
  <p class="next"><span>First step.</span>${esc(o.next || NEXT[o.type])}</p>
  <div class="card-foot"><p class="meta">${esc(meta(o))}</p><div class="acts"><button type="button" class="save" data-save="${esc(o.id)}" aria-pressed="${sv}">${STAR}<span>${sv ? 'Saved' : 'Save'}</span></button><a class="btn btn-gold" href="${esc(safeUrl(o.url))}" target="_blank" rel="noopener noreferrer">Official site ↗</a></div></div></article>`;
}
function renderResults() {
  const list = run(ans), top = pickTop(list);
  const counts = { all: list.length }; TORDER.forEach(t => { counts[t] = list.filter(r => r.o.type === t).length; });
  const shown = resTab === 'all' ? list : list.filter(r => r.o.type === resTab);
  const sum = [[STAGE[ans.stage], 0], [INTEREST[ans.interest], 1], [NEEDS[ans.need], 2], [HOME[ans.home] + (ans.state ? ', ' + ans.state : ''), 3]];
  if (ans.income && BANDS[ans.income]) sum.push([BANDS[ans.income].label, 4]);
  if (ans.circ.length) sum.push([ans.circ.map(c => CIRC[c]).join(', '), 4]);
  const emptyMsg = resTab === 'internship' && (ans.stage === 'school' || ans.stage === 'plus2')
    ? 'Most internships begin in college. Until then, competitions and courses build the profile that gets you selected.'
    : 'Nothing in this group matches your answers yet. Try another tab or change an answer above.';
  if (!DATA.length) {
    $('#app').innerHTML = `<div class="empty-box"><p>The opportunity list is not available right now. Check your connection and refresh the page.</p></div>`; return;
  }
  $('#app').innerHTML = `
  ${demo ? `<div class="ribbon"><span><b>Example.</b> This is Riya's path: Class 11–12, technology, from a village, family income ₹1–2.5 lakh, girl student.</span><button class="btn btn-ghost" type="button" data-act="restart">Start my own</button></div>` : ''}
  <div class="res-head"><div><p class="kicker">Your path</p><h2 tabindex="-1" id="resh"><span class="num">${list.length}</span> opportunities fit you</h2></div><button class="btn btn-ghost" type="button" data-act="restart">Start over</button></div>
  <div class="sum" aria-label="Your answers">${sum.map(([t, i]) => `<button type="button" class="pill" data-act="edit" data-step="${i}" title="Change this answer">${esc(t)}</button>`).join('')}</div>
  <h3 class="sub-h">Start here <small>The best matches, with the reason on each card.</small></h3>
  <div class="grid three">${top.map(r => card(r, true)).join('')}</div>
  <div class="tabs" role="group" aria-label="Opportunity types">${[['all', 'All']].concat(TORDER.map(t => [t, TYPE_PL[t]])).map(([k, l]) => `<button type="button" class="tab" data-act="rtab" data-val="${k}" aria-pressed="${resTab === k}">${l}<span class="num">${counts[k]}</span></button>`).join('')}</div>
  ${ans.state && (resTab === 'all' || resTab === 'scholarship') ? `<p class="callout"><b>${esc(ans.state)} has its own schemes too.</b> Many states run a separate scholarship portal on top of national ones. Ask your school office, or search for “${esc(ans.state)} scholarship portal”.</p>` : ''}
  ${shown.length ? `<div class="grid">${shown.map(r => card(r, false)).join('')}</div>` : `<p class="empty">${emptyMsg}</p>`}
  <div class="next-links"><a class="btn btn-ghost" href="#toolkit">Get application-ready</a><a class="btn btn-ghost" href="#shortlist">Open my shortlist</a></div>
  ${demo ? '' : `<div class="fb" id="fb"><p>Did this list help you?</p><button type="button" class="btn btn-ghost" data-act="fb" data-val="yes">Yes</button><button type="button" class="btn btn-ghost" data-act="fb" data-val="no">Not really</button></div>`}`;
}

/* ---------- saving and shortlist tracker ---------- */
function updateShortCount() {
  const n = DATA.filter(o => saved.has(o.id)).length;
  const c = $('#shortCnt'); c.textContent = n; c.hidden = n === 0;
}
function syncSaveButtons(id) {
  $$(`[data-save="${CSS.escape(id)}"]`).forEach(b => { const on = saved.has(id); b.setAttribute('aria-pressed', on); const s = b.querySelector('span'); if (s) s.textContent = on ? 'Saved' : 'Save'; });
}
function dueInfo(d) {
  if (!d) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d); if (!m) return null;
  const t = new Date(+m[1], +m[2] - 1, +m[3]); const now = new Date(); const t0 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const days = Math.round((t - t0) / 86400000);
  const pretty = t.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  if (days < 0) return { cls: 'late', text: `Passed ${-days} day${days === -1 ? '' : 's'} ago`, days };
  if (days === 0) return { cls: 'soon', text: 'Due today', days };
  if (days <= 7) return { cls: 'soon', text: `Due in ${days} day${days === 1 ? '' : 's'}`, days };
  return { cls: 'far', text: 'Due ' + pretty, days };
}
function renderShort() {
  updateShortCount();
  const items = DATA.filter(o => saved.has(o.id));
  const el = $('#shortBody');
  if (!items.length) {
    el.innerHTML = `<div class="empty-box"><p>Nothing saved yet. Use the Save button on any opportunity and it will appear here, where you can set a deadline and track your progress.</p><a class="btn btn-gold" href="#find">Find my path</a></div>`; return;
  }
  items.sort((a, b) => {
    const ta = track[a.id] || {}, tb = track[b.id] || {};
    const da = ta.status === 'done' ? 2 : 0, db = tb.status === 'done' ? 2 : 0;
    if (da !== db) return da - db;
    return (ta.deadline || '9999').localeCompare(tb.deadline || '9999');
  });
  el.innerHTML = syncNote() + `<div class="track-list">${items.map(o => {
    const t = track[o.id] || {}; const due = dueInfo(t.deadline);
    return `<div class="track${t.status === 'done' ? ' done' : ''}"><div><p class="kicker">${TYPE[o.type]}</p><h3><a href="${esc(safeUrl(o.url))}" target="_blank" rel="noopener noreferrer">${esc(o.title)} ↗</a></h3><p>${esc(o.org)}</p>${due ? `<span class="due ${due.cls}">${esc(due.text)}</span>` : ''}</div>
    <div class="track-ctl"><label>Status<select data-track-status="${esc(o.id)}">${Object.entries(STATUS).map(([k, v]) => `<option value="${k}" ${(t.status || 'toapply') === k ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
    <label>Deadline<input type="date" data-track-deadline="${esc(o.id)}" value="${esc(t.deadline || '')}"></label>
    <button type="button" class="save" data-save="${esc(o.id)}" aria-pressed="true">${STAR}<span>Saved</span></button></div></div>`;
  }).join('')}</div>
  <div class="actions mt14"><button type="button" class="btn btn-ghost" data-act="copylist">Copy my list</button></div>
  <textarea class="msg ta-short mt14" id="listTa" hidden readonly aria-label="Shortlist text"></textarea>`;
}

/* ---------- toolkit ---------- */
function docs(a) {
  const d = [['id', 'Aadhaar card or enrolment slip'], ['bank', 'Bank passbook for an account in your own name'], ['marks', 'Latest marksheet or result'], ['photo', 'Passport-size photo'], ['phone', 'Mobile number and email you can open'], ['idc', 'School or college ID, or a bonafide certificate']];
  if (a.income !== 'gt8') d.push(['inc', 'Income certificate from your local revenue office']);
  if (['sc', 'st', 'obc'].some(c => a.circ.includes(c))) d.push(['caste', 'Caste certificate']);
  if (a.circ.includes('minority')) d.push(['min', 'Minority community certificate or declaration']);
  if (a.circ.includes('pwd')) d.push(['pwd', 'Disability certificate or UDID card']);
  return d;
}
const SUBMIT_CHECKS = [['s1', 'Read the eligibility rules to the end'], ['s2', 'Your name matches your documents letter for letter'], ['s3', 'Use an email and phone number you check every day'], ['s4', 'Ask a teacher to read your form before you submit'], ['s5', 'Save the confirmation number or screenshot'], ['s6', 'Write the deadline in the Shortlist tab']];
function mentorText() {
  const p = profile() || emptyAns();
  const stg = p.stage ? { school: 'school student', plus2: 'Class 11–12 student', college: 'college student', voc: 'ITI or diploma student' }[p.stage] : 'student';
  const hm = p.home ? { village: 'a village', town: 'a small town', city: 'a city' }[p.home] : '[your town]';
  const field = p.interest ? INTEREST[p.interest].toLowerCase() : '[your field]';
  const ask = mm.goal.trim() || 'Could you spare 15 minutes to tell me where a beginner like me should start, and what to avoid?';
  return `Hello ${mm.who.trim() || '[Name]'},\n\nMy name is ${mm.name.trim() || '[Your name]'}. I am a ${stg} from ${hm}, interested in ${field}. I found your work through ${mm.found.trim() || '[where you found them]'}.\n\n${ask}\n\nI can fit around your schedule. Thank you for your time.\n${mm.name.trim() || '[Your name]'}`;
}
function renderToolkit() {
  const p = profile();
  const list = docs(p || emptyAns());
  $('#toolBody').innerHTML = `
  <div class="card"><div class="card-top"><span class="emb">${icon('scholarship')}</span><div><p class="kicker">Documents</p><h3>Keep these ready</h3></div></div>
    <p class="note">${p ? 'Tailored to your answers.' : 'A general list. <a href="#find">Take the five taps</a> to tailor it to you.'} Most applications ask for these, and collecting them early is the slow part.</p>
    <ul class="checks">${list.map(([k, t]) => `<li><label><input type="checkbox" data-chk="${k}" ${checks[k] ? 'checked' : ''}><span>${esc(t)}</span></label></li>`).join('')}</ul></div>
  <div class="card"><div class="card-top"><span class="emb">${icon('mentorship')}</span><div><p class="kicker">Mentorship</p><h3>Write to a mentor</h3></div></div>
    <p class="note">Fill in three lines and copy the message. Short, specific requests get answered.</p>
    <div class="msg-field"><label for="mm-name">Your name</label><input id="mm-name" type="text" maxlength="60" value="${esc(mm.name)}" autocomplete="name">
    <label for="mm-who">Who you are writing to</label><input id="mm-who" type="text" maxlength="60" value="${esc(mm.who)}" autocomplete="off">
    <label for="mm-found">Where you found them (a talk, a post, a programme)</label><input id="mm-found" type="text" maxlength="100" value="${esc(mm.found)}" autocomplete="off">
    <label for="mm-goal">What you want to ask <span class="note">(optional)</span></label><input id="mm-goal" type="text" maxlength="200" value="${esc(mm.goal)}" autocomplete="off">
    <label for="mm-out">Your message</label><textarea class="msg" id="mm-out" readonly>${esc(mentorText())}</textarea></div>
    <div class="actions"><button type="button" class="btn btn-gold" data-act="copymsg">Copy message</button></div></div>
  <div class="card"><div class="card-top"><span class="emb">${icon('internship')}</span><div><p class="kicker">Final check</p><h3>Before you submit</h3></div></div>
    <p class="note">Small slips cost more applications than weak marks do.</p>
    <ul class="checks">${SUBMIT_CHECKS.map(([k, t]) => `<li><label><input type="checkbox" data-chk="${k}" ${checks[k] ? 'checked' : ''}><span>${esc(t)}</span></label></li>`).join('')}</ul></div>`;
}

/* ---------- library ---------- */
function renderLib() {
  const q = ($('#q').value || '').trim().toLowerCase();
  const rows = DATA.filter(o => (libType === 'all' || o.type === libType) && (libStage === 'all' || o.stages.includes(libStage)) &&
    (!q || (o.title + ' ' + o.org + ' ' + o.blurb + ' ' + (Array.isArray(o.interests) ? o.interests.map(i => INTEREST[i] || '').join(' ') : '')).toLowerCase().includes(q)))
    .sort((a, b) => TORDER.indexOf(a.type) - TORDER.indexOf(b.type) || a.title.localeCompare(b.title));
  $('#libCount').textContent = DATA.length ? `${rows.length} of ${DATA.length} opportunities` : '';
  $('#libRows').innerHTML = rows.length ? rows.map(o => {
    const sv = saved.has(o.id);
    return `<div class="row"><span class="emb">${icon(o.type, 18)}</span><div><h3>${esc(o.title)}${o.community ? '<span class="badge">Community</span>' : ''}</h3><p>${TYPE[o.type]} · ${esc(o.org)} · ${o.stages.length === 4 ? 'All levels' : o.stages.map(s => STAGE[s]).join(', ')}</p></div><div class="acts"><button type="button" class="save" data-save="${esc(o.id)}" aria-pressed="${sv}">${STAR}<span>${sv ? 'Saved' : 'Save'}</span></button><a href="${esc(safeUrl(o.url))}" target="_blank" rel="noopener noreferrer">Official site ↗</a></div></div>`;
  }).join('') : `<p class="empty">${DATA.length ? 'No match. Try a shorter search or clear a filter.' : 'The opportunity list is not available right now.'}</p>`;
}
function initLibControls() {
  $('#libTypes').innerHTML = [['all', 'All']].concat(TORDER.map(t => [t, TYPE_PL[t]])).map(([k, l]) => `<button type="button" class="chip" data-lib="${k}" aria-pressed="${k === 'all'}">${l}</button>`).join('');
  $('#libStage').insertAdjacentHTML('beforeend', Object.entries(STAGE).map(([k, v]) => `<option value="${k}">${v}</option>`).join(''));
  $('#libTypes').addEventListener('click', e => { const b = e.target.closest('[data-lib]'); if (!b) return; libType = b.dataset.lib; $$('[data-lib]').forEach(x => x.setAttribute('aria-pressed', x === b)); renderLib(); });
  $('#libStage').addEventListener('change', e => { libStage = e.target.value; renderLib(); });
  $('#q').addEventListener('input', renderLib);
}

/* ---------- contribute form ---------- */
let sub = { stages: [], interests: [] }, contributeReady = false;
function initContribute() {
  if (contributeReady) return; contributeReady = true;
  $('#f-type').insertAdjacentHTML('beforeend', TORDER.map(t => `<option value="${t}">${TYPE[t]}</option>`).join(''));
  $('#f-stages').innerHTML = Object.entries(STAGE).map(([k, v]) => `<button type="button" class="chip" data-sub="stages" data-val="${k}" aria-pressed="false">${v}</button>`).join('');
  $('#f-interests').innerHTML = Object.entries(INTEREST).map(([k, v]) => `<button type="button" class="chip" data-sub="interests" data-val="${k}" aria-pressed="false">${v}</button>`).join('');
}
function setErr(name, msg) {
  const e = $('#e-' + name); if (!e) return;
  e.hidden = !msg; e.textContent = msg || '';
  const f = $('#f-' + name); if (f) { if (msg) f.setAttribute('aria-invalid', 'true'); else f.removeAttribute('aria-invalid'); }
}
function formMsg(kind, text) { const m = $('#subMsg'); m.hidden = !text; m.className = 'formmsg ' + (kind || ''); m.textContent = text || ''; }
async function submitForm(ev) {
  ev.preventDefault();
  ['type', 'title', 'org', 'blurb', 'url', 'stages'].forEach(n => setErr(n, ''));
  formMsg('', '');
  const v = n => $('#f-' + n).value.trim();
  const local = {};
  if (!v('type')) local.type = 'Choose a type.';
  if (v('title').length < 4) local.title = 'Give it a name of at least 4 characters.';
  if (v('org').length < 2) local.org = 'Tell us who runs it.';
  if (v('blurb').length < 20) local.blurb = 'Describe it in at least 20 characters.';
  try { const u = new URL(v('url')); if (!/^https?:$/.test(u.protocol)) throw new Error(); } catch (e) { local.url = 'Enter the official website, starting with https://'; }
  if (!sub.stages.length) local.stages = 'Pick at least one study level.';
  const keys = Object.keys(local);
  if (keys.length) {
    keys.forEach(k => setErr(k, local[k]));
    const first = $('#f-' + keys[0]) || $('#f-stages button'); if (first) first.focus();
    formMsg('bad', 'Please fix the highlighted fields.'); return;
  }
  const btn = $('#subBtn'); btn.disabled = true; btn.textContent = 'Sending…';
  try {
    const r = await api('api/submissions', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ type: v('type'), title: v('title'), org: v('org'), blurb: v('blurb'), url: v('url'), stages: sub.stages, interests: sub.interests, rural: $('#f-rural').checked, contact: v('contact'), website: v('website') })
    }, 12000);
    if (r.status === 201) {
      $('#subForm').reset(); sub = { stages: [], interests: [] }; $$('[data-sub]').forEach(b => b.setAttribute('aria-pressed', 'false'));
      formMsg('ok', 'Thank you. Your suggestion is with our reviewers. If it checks out, it will appear for students.');
    } else if (r.status === 400 && r.body && r.body.fields) {
      Object.entries(r.body.fields).forEach(([k, m]) => setErr(k, m)); formMsg('bad', r.body.error || 'Please fix the highlighted fields.');
    } else if (r.status === 429) formMsg('bad', 'You have sent a few suggestions already. Please try again in a few minutes.');
    else formMsg('bad', (r.body && r.body.error) || 'Something went wrong. Please try again.');
  } catch (e) {
    formMsg('bad', 'Could not reach the server. Check your connection and try again.');
  } finally { btn.disabled = false; btn.textContent = 'Send for review'; }
}

/* ---------- optional account: keeps the shortlist in sync across devices ---------- */
// Nothing here is needed to use Vantage. Only the shortlist (saved ids, status, deadline) is synced.
// The finder answers (class, income, background) never leave this device.
const planNow = () => ({ saved: [...saved], track });
const normPlan = p => ({ saved: Array.isArray(p && p.saved) ? p.saved.filter(x => typeof x === 'string') : [], track: p && p.track && typeof p.track === 'object' ? p.track : {} });
function renderAcctBtn() {
  const b = $('#acctBtn'); if (!b) return;
  b.querySelector('span').textContent = me ? (me.name || me.email.split('@')[0]) : 'Sign in';
  b.setAttribute('aria-label', me ? 'Your account' : 'Sign in or create an account');
}
function syncNote() {
  if (me) return '<p class="sync-line">Saved to your account, so it follows you to any device.</p>';
  return '<div class="sync-note"><p>This list is only on this device. Want it on your phone and laptop too? A free account keeps it in sync.</p><a class="btn btn-ghost" href="#account">Create an account</a></div>';
}
function refreshSaveViews() {
  $$('[data-save]').forEach(b => syncSaveButtons(b.dataset.save));
  updateShortCount();
  if (!$('#view-shortlist').hidden) renderShort();
  if (!$('#view-library').hidden) renderLib();
}
function adoptPlan(plan) {
  saved = new Set(plan.saved); track = plan.track;
  store.set('vantage.saved', [...saved]); store.set('vantage.track', track);
  refreshSaveViews();
}
function mergePlan(plan) {
  const ids = new Set([...saved, ...plan.saved]); const t = {};
  ids.forEach(id => { const m = Object.assign({}, plan.track[id], track[id]); if (m.status || m.deadline) t[id] = m; });
  adoptPlan({ saved: [...ids], track: t });
}
function queuePush() {
  if (!me) return;
  dirty = true; store.set('vantage.dirty', true);
  clearTimeout(pushT); pushT = setTimeout(pushPlan, 700);
}
async function pushPlan() {
  if (!me) return;
  try {
    const r = await api('api/me/plan', { method: 'PUT', headers: JSON_HEADERS, body: JSON.stringify(planNow()) });
    if (r.ok) { dirty = false; store.del('vantage.dirty'); }
    else if (r.status === 401) { me = null; dirty = false; store.del('vantage.dirty'); renderAcctBtn(); toast('You were signed out. Your list is still on this device.'); if (!$('#view-shortlist').hidden) renderShort(); if (!$('#view-account').hidden) renderAccount(); }
  } catch (e) { /* offline: the list stays marked as unsent and goes up on the next change or visit */ }
}
async function loadMe() {
  try {
    const r = await api('api/me');
    if (r.ok && r.body && r.body.user) {
      me = r.body.user;
      if (dirty) pushPlan(); else adoptPlan(normPlan(r.body.plan));
    } else me = null;
  } catch (e) { /* offline: keep what is on this device */ }
  meReady = true; renderAcctBtn();
  if (!$('#view-account').hidden) renderAccount();
  if (!$('#view-shortlist').hidden) renderShort();
}
function wipeDevice() {
  saved = new Set(); track = {}; checks = {}; ans = emptyAns(); dirty = false;
  ['vantage.saved', 'vantage.track', 'vantage.checks', 'vantage.profile', 'vantage.dirty'].forEach(k => store.del(k));
  $('#app').innerHTML = ''; if (!$('#view-find').hidden) initFind();
  refreshSaveViews();
}
function acctErr(id, msg) {
  const e = $('#e-' + id), i = $('#' + id); if (!e) return;
  e.hidden = !msg; e.textContent = msg || ''; if (i) { if (msg) i.setAttribute('aria-invalid', 'true'); else i.removeAttribute('aria-invalid'); }
}
function acctMsg(kind, text) { const m = $('#acctMsg'); if (!m) return; m.hidden = !text; m.className = 'formmsg ' + (kind || ''); m.textContent = text || ''; }
function renderAccount() {
  const body = $('#acctBody'), title = $('#acctTitle'), lede = $('#acctLede');
  if (!meReady) { body.innerHTML = '<p class="note">Checking your account…</p>'; return; }
  if (me) {
    const n = DATA.length ? DATA.filter(o => saved.has(o.id)).length : saved.size;
    title.textContent = 'Hello, ' + (me.name || 'student');
    lede.textContent = 'Your shortlist is saved to your account, so it follows you to any device.';
    body.innerHTML = `<div class="form acct-card">
      <div><p class="kicker">Signed in</p><h2>${esc(me.email)}</h2></div>
      <p><span class="num">${n}</span> saved ${n === 1 ? 'opportunity' : 'opportunities'} on your shortlist.</p>
      <div class="actions"><a class="btn btn-gold" href="#shortlist">Open my shortlist</a><button type="button" class="btn btn-ghost" data-act="signout">Sign out</button></div>
      <p class="note">Signing out also clears your list and your answers from this device, so the next person on this computer cannot see them. Sign in again to bring your list back.</p>
      <details class="danger"><summary>Delete my account</summary>
        <form id="delForm" novalidate>
          <p class="note">This removes your account and your saved list from our server, and clears this device. It cannot be undone.</p>
          <div class="field"><label for="d-pass">Type your password to confirm</label><input id="d-pass" type="password" autocomplete="current-password" maxlength="200"><p class="err" id="e-d-pass" hidden></p></div>
          <div class="actions"><button type="submit" class="btn btn-danger" id="delBtn">Delete my account</button></div>
        </form>
      </details>
    </div>`;
    return;
  }
  const up = acctMode === 'signup';
  title.textContent = 'Keep your list on every device';
  lede.textContent = 'You never need an account to use Vantage. Create one only if you want your shortlist on your phone and your laptop.';
  body.innerHTML = `<div class="acct-grid">
    <form id="acctForm" class="form" novalidate>
      <div class="seg" role="group" aria-label="Create an account or sign in">
        <button type="button" data-act="acct-mode" data-val="signup" aria-pressed="${up}">Sign up</button>
        <button type="button" data-act="acct-mode" data-val="login" aria-pressed="${!up}">Sign in</button>
      </div>
      ${up ? `<div class="field"><label for="a-name">First name <span>(optional)</span></label><input id="a-name" type="text" maxlength="40" autocomplete="given-name" value="${esc(acctDraft.name)}"></div>` : ''}
      <div class="field"><label for="a-email">Email</label><input id="a-email" type="email" inputmode="email" maxlength="120" autocomplete="email" value="${esc(acctDraft.email)}" required><p class="err" id="e-a-email" hidden></p></div>
      <div class="field"><label for="a-pass">Password ${up ? '<span>(at least 8 characters)</span>' : ''}</label>
        <div class="pwrow"><input id="a-pass" type="password" maxlength="200" autocomplete="${up ? 'new-password' : 'current-password'}" required><button type="button" class="btn btn-ghost" data-act="togglepw" aria-pressed="false" aria-label="Show or hide password">Show</button></div>
        <p class="err" id="e-a-pass" hidden></p></div>
      <div class="actions"><button type="submit" class="btn btn-gold" id="acctSubmit">${up ? 'Create account' : 'Sign in'}</button></div>
      <p class="formmsg" id="acctMsg" role="status" hidden></p>
    </form>
    <aside class="priv" aria-label="What we keep">
      <h2>What we keep</h2>
      <ul><li>Your email, and your first name if you add it</li><li>Your password, scrambled so nobody can read it</li><li>Your shortlist, with the status and deadline you set</li></ul>
      <h2>What we never keep</h2>
      <ul><li>Your class, income, background or disability answers. They stay on this device.</li></ul>
      <p class="note">You can delete your account at any time.</p>
    </aside>
  </div>`;
}
async function submitAcct(e) {
  e.preventDefault();
  const up = acctMode === 'signup', btn = $('#acctSubmit');
  const email = $('#a-email').value.trim(), password = $('#a-pass').value, name = up ? $('#a-name').value.trim() : '';
  acctDraft.email = email; acctDraft.name = name;
  acctErr('a-email', ''); acctErr('a-pass', ''); acctMsg('', '');
  let bad = false;
  if (!/^\S+@\S+\.\S{2,}$/.test(email)) { acctErr('a-email', 'Enter a valid email address.'); bad = true; }
  if (up ? password.length < 8 : !password) { acctErr('a-pass', up ? 'Use at least 8 characters.' : 'Enter your password.'); bad = true; }
  if (bad) { acctMsg('bad', 'Please fix the highlighted fields.'); return; }
  btn.disabled = true; btn.textContent = 'Please wait…';
  try {
    const r = await api('api/auth/' + (up ? 'signup' : 'login'), { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify(up ? { email, password, name, plan: planNow() } : { email, password }) });
    if (r.ok && r.body && r.body.user) {
      me = r.body.user; acctDraft.email = ''; acctDraft.name = '';
      const plan = normPlan(r.body.plan);
      if (up) adoptPlan(plan); else { mergePlan(plan); pushPlan(); }
      renderAcctBtn(); renderAccount();
      toast(up ? 'Account created. Your list is saved.' : 'Signed in. Your list is in sync.');
      return;
    }
    if (r.status === 400 && r.body && r.body.fields) { Object.entries(r.body.fields).forEach(([k, m]) => acctErr('a-' + (k === 'password' ? 'pass' : k), m)); acctMsg('bad', r.body.error || 'Please fix the highlighted fields.'); }
    else if (r.status === 409) { acctErr('a-email', 'This email already has an account.'); acctMsg('bad', 'This email already has an account. Choose Sign in above.'); }
    else if (r.status === 429) acctMsg('bad', 'Too many tries. Please wait a few minutes and try again.');
    else acctMsg('bad', (r.body && r.body.error) || 'Something went wrong. Please try again.');
  } catch (err) {
    acctMsg('bad', 'Could not reach the server. Check your connection and try again.');
  } finally { const b2 = $('#acctSubmit'); if (b2) { b2.disabled = false; b2.textContent = acctMode === 'signup' ? 'Create account' : 'Sign in'; } }
}
async function signOut(btn) {
  btn.disabled = true;
  try {
    const r = await api('api/auth/logout', { method: 'POST', headers: JSON_HEADERS, body: '{}' });
    if (!r.ok) throw new Error('logout failed');
    clearTimeout(pushT); me = null; wipeDevice(); renderAcctBtn(); renderAccount();
    toast('Signed out. This device is cleared.');
  } catch (e) {
    btn.disabled = false; toast('Could not sign out. Check your connection and try again.');
  }
}
async function submitDelete(e) {
  e.preventDefault();
  const btn = $('#delBtn'), password = $('#d-pass').value; acctErr('d-pass', '');
  if (!password) { acctErr('d-pass', 'Enter your password to confirm.'); return; }
  btn.disabled = true;
  try {
    const r = await api('api/me', { method: 'DELETE', headers: JSON_HEADERS, body: JSON.stringify({ password }) });
    if (r.ok) { clearTimeout(pushT); me = null; wipeDevice(); renderAcctBtn(); renderAccount(); toast('Your account was deleted.'); return; }
    acctErr('d-pass', r.status === 401 ? 'That password is not right.' : ((r.body && r.body.error) || 'Something went wrong. Please try again.'));
  } catch (err) { acctErr('d-pass', 'Could not reach the server. Try again.'); }
  btn.disabled = false;
}

/* ---------- events ---------- */
document.addEventListener('click', e => {
  const sv = e.target.closest('[data-save]');
  if (sv) {
    const id = sv.dataset.save; saved.has(id) ? saved.delete(id) : saved.add(id);
    store.set('vantage.saved', [...saved]); syncSaveButtons(id); updateShortCount(); queuePush();
    if (!$('#view-shortlist').hidden) renderShort();
    return;
  }
  if (e.target.closest('[data-riya]')) {
    ans = { stage: 'plus2', interest: 'tech', need: 'scholarship', home: 'village', state: '', income: 'b1', circ: ['girl'] };
    demo = true; resTab = 'all'; renderResults(); go('find'); return;
  }
  const sb = e.target.closest('[data-sub]');
  if (sb) {
    const arr = sub[sb.dataset.sub], v = sb.dataset.val, i = arr.indexOf(v);
    i > -1 ? arr.splice(i, 1) : arr.push(v); sb.setAttribute('aria-pressed', arr.includes(v));
    if (sb.dataset.sub === 'stages') setErr('stages', ''); return;
  }
  const b = e.target.closest('[data-act]'); if (!b) return;
  const act = b.dataset.act, val = b.dataset.val;
  if (act === 'pick') {
    ans[STEPS[step].key] = val; $$('.opt').forEach(x => x.setAttribute('aria-pressed', x === b));
    setTimeout(() => { if (step < STEPS.length - 1) gotoStep(step + 1); }, reduce ? 0 : 220);
  } else if (act === 'home') { ans.home = val; $$('[data-act="home"]').forEach(x => x.setAttribute('aria-pressed', x === b)); const n = $('[data-act="next"]'); if (n) n.disabled = false; }
  else if (act === 'next') gotoStep(step + 1);
  else if (act === 'back') gotoStep(step - 1);
  else if (act === 'income') { ans.income = ans.income === val ? null : val; $$('[data-act="income"]').forEach(x => x.setAttribute('aria-pressed', x.dataset.val === ans.income)); }
  else if (act === 'circ') { const i = ans.circ.indexOf(val); i > -1 ? ans.circ.splice(i, 1) : ans.circ.push(val); b.setAttribute('aria-pressed', ans.circ.includes(val)); }
  else if (act === 'finish') { demo = false; resTab = 'all'; store.set('vantage.profile', ans); renderResults(); $('#view-find').scrollIntoView({ block: 'start' }); const h = $('#resh'); if (h) h.focus({ preventScroll: true }); }
  else if (act === 'restart') { demo = false; ans = emptyAns(); resTab = 'all'; store.del('vantage.profile'); gotoStep(0, false); window.scrollTo(0, 0); }
  else if (act === 'edit') { demo = false; gotoStep(+b.dataset.step); }
  else if (act === 'rtab') { resTab = val; renderResults(); const t = $('.tabs'); if (t) t.scrollIntoView({ block: 'start', behavior: reduce ? 'auto' : 'smooth' }); }
  else if (act === 'copymsg') copyText($('#mm-out').value, $('#mm-out'));
  else if (act === 'copylist') { const t = DATA.filter(o => saved.has(o.id)).map(o => `${o.title}: ${o.url}`).join('\n'); const ta = $('#listTa'); ta.value = t; copyText(t, ta); }
  else if (act === 'acct-mode') { const em = $('#a-email'), nm = $('#a-name'); if (em) acctDraft.email = em.value; if (nm) acctDraft.name = nm.value; acctMode = val; renderAccount(); }
  else if (act === 'togglepw') { const i = $('#a-pass'); const show = i.type === 'password'; i.type = show ? 'text' : 'password'; b.textContent = show ? 'Hide' : 'Show'; b.setAttribute('aria-pressed', show); }
  else if (act === 'signout') signOut(b);
  else if (act === 'fb') {
    const helpful = val === 'yes'; const box = $('#fb'); if (box) box.innerHTML = '<p>Thank you.</p>';
    api('api/feedback', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ helpful, stage: ans.stage }) }).catch(() => { /* feedback is best effort */ });
  }
});
document.addEventListener('change', e => {
  const t = e.target;
  if (t.id === 'state') ans.state = t.value;
  if (t.dataset && t.dataset.chk) { checks[t.dataset.chk] = t.checked; store.set('vantage.checks', checks); }
  if (t.dataset && t.dataset.trackStatus) { const id = t.dataset.trackStatus; track[id] = Object.assign(track[id] || {}, { status: t.value }); store.set('vantage.track', track); queuePush(); renderShort(); }
  if (t.dataset && t.dataset.trackDeadline) { const id = t.dataset.trackDeadline; track[id] = Object.assign(track[id] || {}, { deadline: t.value }); store.set('vantage.track', track); queuePush(); renderShort(); }
});
document.addEventListener('input', e => {
  const m = /^mm-(name|who|found|goal)$/.exec(e.target.id);
  if (m) { mm[m[1]] = e.target.value; const o = $('#mm-out'); if (o) o.value = mentorText(); }
});
$('#subForm').addEventListener('submit', submitForm);
document.addEventListener('submit', e => { if (e.target.id === 'acctForm') submitAcct(e); else if (e.target.id === 'delForm') submitDelete(e); });

/* ---------- theme ---------- */
const effTheme = () => document.documentElement.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
function themeLabel() { $('#themeTxt').textContent = effTheme() === 'dark' ? 'Light' : 'Dark'; }
$('#themeBtn').addEventListener('click', () => { const n = effTheme() === 'dark' ? 'light' : 'dark'; document.documentElement.dataset.theme = n; store.set('vantage.theme', n); try { localStorage.setItem('vantage.theme', n); } catch (e) { /* ignore */ } themeLabel(); });

/* ---------- boot ---------- */
(async function boot() {
  $('#typesStrip').innerHTML = TORDER.map(t => `<div>${icon(t, 22)}<span>${TYPE_PL[t]}</span></div>`).join('');
  themeLabel(); initLibControls();
  $('#libRows').innerHTML = '<p class="empty">Loading opportunities…</p>';
  route();
  loadMe();
  await loadData();
  showDataNote(); updateShortCount();
  if (!$('#view-find').hidden && (!$('#app').firstChild || $('#app').querySelector('.empty-box'))) { $('#app').innerHTML = ''; initFind(); }
  if (!$('#view-library').hidden) renderLib();
  if (!$('#view-shortlist').hidden) renderShort();
})();
