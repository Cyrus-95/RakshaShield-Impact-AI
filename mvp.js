/* RakshaShield MVP layer. Loads after the base script and reuses its helpers ($, $$, LS, esc, go, modal, analyse, tab). */
const KEY = { inc: 'rs_incidents', notes: 'rs_notifications', who: 'rs_viewing' };
const MEMBERS = [
  { id: 'user', n: 'Demo User', rel: 'Primary user', av: '🧑' }, { id: 'rajesh', n: 'Rajesh', rel: 'Father', av: '👨' },
  { id: 'sunita', n: 'Sunita', rel: 'Mother', av: '👩' }, { id: 'rahul', n: 'Rahul', rel: 'Brother', av: '🧒' }, { id: 'priya', n: 'Priya', rel: 'Sister', av: '👧' }];
const ORDER = ['Sent', 'Seen', 'Acknowledged', 'Resolved'], STATUSES = ['New', 'Under Review', 'Resolved'];
const RK = { HIGH: { c: 'high', i: '🚨', l: 'HIGH RISK' }, MEDIUM: { c: 'med', i: '⚠️', l: 'CAUTION' }, LOW: { c: 'low', i: '✅', l: 'LOW RISK' }, UNKNOWN: { c: 'med', i: '🛑', l: 'NOT ANALYSED' } };

/* ---- centralised LocalStorage helpers ---- */
const store = { inc: () => LS.get(KEY.inc, []), setInc: (v) => LS.set(KEY.inc, v), notes: () => LS.get(KEY.notes, []), setNotes: (v) => LS.set(KEY.notes, v) };
const uid = (p) => `${p}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
const fmt = (iso) => new Date(iso).toLocaleString();
const mem = (id) => MEMBERS.find((m) => m.id === id);
const listHtml = (a) => '<ul class="ul">' + a.map((x) => `<li>${esc(x)}</li>`).join('') + '</ul>';
const techHtml = (r) => r.detectedTechniques.length ? r.detectedTechniques.map((t) => `<div class="tech"><b>${esc(t.name)}</b>${t.evidence ? `<q>${esc(t.evidence)}</q>` : ''}<span>${esc(t.explanation)}</span></div>`).join('') : '<p class="sub">No notable manipulation techniques detected.</p>';
function toast(t) { const d = document.createElement('div'); d.className = 'toast'; d.textContent = t; document.body.appendChild(d); setTimeout(() => d.remove(), 2600); }

let cur = null; // latest analysis: { r, mode:'ai'|'demo', text, kind, checks, savedId }

/* ---- AI analysis (calls our backend, which calls Gemini) ---- */
$('#analyse').insertAdjacentHTML('beforebegin', '<div id="aiStatus" class="sub" style="font-size:14px;margin-bottom:8px">Checking backend...</div>');
$('#analyse').insertAdjacentHTML('afterend', '<button class="btn ghost" id="demoBtn" style="margin-top:10px;width:100%">Run labelled demo mode (no AI)</button>');
fetch('/api/health').then((r) => r.json()).then((h) => { $('#aiStatus').textContent = h.configured ? `🟢 Gemini connected (${h.model})` : '🟠 Backend is running but GEMINI_API_KEY is not set. AI analysis is unavailable; demo mode still works.'; })
  .catch(() => { $('#aiStatus').textContent = '🔴 Backend not reachable. Run "npm start" and open http://localhost:3000. Demo mode still works.'; });

async function runAnalysis(demo) {
  const err = $('#err'); err.textContent = '';
  if (tab === 'num') { err.textContent = 'Number lookup is not available. Use "Describe what is happening" to describe the call.'; return; }
  const text = $(tab === 'msg' ? '#msg' : '#desc').value.trim(), kind = tab === 'msg' ? 'Message' : 'Description';
  if (text.length < 10) { err.textContent = 'Please add a little more detail (at least 10 characters).'; return; }
  if (demo) { // rule-based local check from the base prototype, mapped to the AI shape
    const l = analyse(text, false);
    cur = { mode: 'demo', text, kind, r: { riskLevel: { high: 'HIGH', med: 'MEDIUM', low: 'LOW' }[l.lvl], summary: l.why, scamType: 'Not determined (demo rules)', detectedTechniques: l.labels.map((n) => ({ name: n, evidence: '', explanation: 'Matched a simple rule-based pattern.' })), scammerObjective: l.wants, recommendedActions: l.steps, shouldEnterSafetyMode: l.lvl === 'high' } };
    return renderResult();
  }
  const btn = $('#analyse'); btn.disabled = true; btn.textContent = 'Analysing with Gemini...'; $('#result').innerHTML = '';
  try {
    const res = await fetch('/api/analyse', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) });
    const j = await res.json();
    if (!res.ok) throw new Error(j.error || 'Analysis failed.');
    cur = { mode: 'ai', text, kind, r: j }; renderResult();
  } catch (e) {
    $('#result').innerHTML = `<div class="card" style="border-color:var(--red)"><h4>AI analysis unavailable</h4><p style="margin:6px 0 12px">${esc(e.message === 'Failed to fetch' ? 'Could not reach the backend server.' : e.message)}</p><button class="btn ghost" id="useDemo">Use labelled demo mode instead</button></div>`;
    $('#useDemo').onclick = () => runAnalysis(true);
  } finally { btn.disabled = false; btn.textContent = 'Analyse My Situation'; }
}
$('#analyse').onclick = () => runAnalysis(false);
$('#demoBtn').onclick = () => runAnalysis(true);

function renderResult() {
  const { r, mode } = cur, M = RK[r.riskLevel];
  const lead = { HIGH: 'Stop. This appears to be a possible scam. Open Safety Mode before doing anything else.', MEDIUM: 'Be careful. Verify independently before acting.', LOW: 'No strong scam indicators were found. It is still wise to verify the source.' }[r.riskLevel];
  $('#result').innerHTML = (mode === 'demo' ? '<div class="demo">DEMO MODE: simple rule-based check, not Gemini AI.</div>' : '<span class="tag">AI analysis by Gemini. It can be wrong; use your judgement.</span>') +
    `<div class="risk ${M.c}"><div class="big">${M.i}</div><div><b>${M.l}</b>${lead}</div></div>
    <div class="grid g2"><div class="card"><h4>Summary</h4><p style="margin:8px 0">${esc(r.summary)}</p><span class="tag">${esc(r.scamType)}</span></div>
    <div class="card"><h4>Detected techniques</h4><div style="margin-top:8px">${techHtml(r)}</div></div>
    ${r.scammerObjective.length ? `<div class="card"><h4>What the scammer may want</h4>${listHtml(r.scammerObjective)}</div>` : ''}
    <div class="card"><h4>What you should do now</h4><ol class="steps" style="margin-top:8px">${r.recommendedActions.map((a) => `<li>${esc(a)}</li>`).join('')}</ol></div></div>
    <div class="row" style="margin-top:16px;justify-content:flex-start"><button class="btn ${r.riskLevel === 'HIGH' ? 'red' : 'ghost'}" data-go="safety">Open Safety Mode</button><button class="btn ghost" data-act="save">Save Incident</button>${r.riskLevel === 'HIGH' ? '<button class="btn" data-act="alert">Alert My Trusted Person</button>' : ''}</div>`;
  $('#result').scrollIntoView({ behavior: 'smooth' });
}

/* ---- Scam Interruption Mode: analysis context inside Safety Mode ---- */
function checklistFor(r) { // checklist tailored to the detected scam
  const t = (r.scamType + ' ' + r.detectedTechniques.map((x) => x.name).join(' ') + ' ' + r.summary).toLowerCase(), L = [];
  if (r.riskLevel !== 'LOW') L.push('Do not transfer money');
  if (r.riskLevel === 'HIGH' || /otp|pin|kyc|bank|credential|password|upi/.test(t)) L.push('Do not share OTP, PIN, CVV or passwords');
  if (/remote|screen|install|anydesk|app/.test(t)) L.push('Do not install remote-access applications at a caller\'s request');
  if (/arrest|police|cbi|authorit|impersonat|caller|call/.test(t)) L.push('Do not follow instructions from suspicious callers');
  return [...L, 'Contact a trusted person', 'Verify claims independently through official channels', 'Preserve suspicious messages and payment details'];
}
function renderSafetyCtx() {
  const el = $('#aiSafety');
  if (!cur) { el.innerHTML = '<div class="ctx"><b>Safety Mode opened manually.</b><p>No analysis is loaded. Use the checklist below, or <button class="chip" data-go="check">analyse a message</button> first.</p></div>'; return; }
  const { r, mode } = cur, M = RK[r.riskLevel], list = checklistFor(r); cur.checks = cur.checks || [];
  el.innerHTML = `<div class="ctx ${M.c}"><b>${M.i} ${M.l}${mode === 'demo' ? ' (demo mode)' : ''}</b><p>${esc(r.summary)}</p>
    ${r.detectedTechniques.length ? `<h5>Manipulation techniques detected</h5>${techHtml(r)}` : ''}
    <h5>Recommended actions</h5>${listHtml(r.recommendedActions)}
    <h5>Your safety checklist</h5>${list.map((t, i) => `<label class="ck"><input type="checkbox" data-ck="${i}" ${cur.checks.includes(i) ? 'checked' : ''}><span>${esc(t)}</span></label>`).join('')}
    <div style="margin-top:14px"><button class="btn ghost sm" data-act="save">Save Incident</button></div></div>`;
}
document.addEventListener('change', (e) => { const i = e.target.dataset.ck; if (i !== undefined && cur) { const c = cur.checks, n = +i; cur.checks = e.target.checked ? [...new Set([...c, n])] : c.filter((x) => x !== n); } });

/* ---- Evidence Locker ---- */
function saveIncident() { // only runs when the user clicks Save
  if (!cur) return toast('Analyse something first, then save it.');
  if (cur.savedId) return go('locker');
  const { r } = cur, inc = { id: uid('INC'), original: cur.text, kind: cur.kind, mode: cur.mode, riskLevel: r.riskLevel, scamType: r.scamType, summary: r.summary, techniques: r.detectedTechniques, objectives: r.scammerObjective, actions: r.recommendedActions, createdAt: new Date().toISOString(), status: 'New', notes: '' };
  store.setInc([inc, ...store.inc()]); cur.savedId = inc.id; toast('Saved to Evidence Locker');
  $$('[data-act="save"]').forEach((b) => { b.textContent = 'Saved ✓'; });
}
function renderLocker() {
  const a = store.inc();
  $('#lockerBox').innerHTML = a.length ? a.map((i) => { const M = RK[i.riskLevel] || RK.UNKNOWN; return `<div class="card act" data-inc="${i.id}" style="margin-bottom:12px"><div class="row"><span class="pill ${M.c}">${M.l}</span><span class="st ${i.status.replace(' ', '')}">${i.status}</span></div><h4 style="margin-top:8px">${esc(i.scamType)}</h4><p>${esc(i.original.slice(0, 140))}</p><p style="font-size:13px">${fmt(i.createdAt)} · ${i.id}</p></div>`; }).join('') : '<div class="card"><p>Your Evidence Locker is empty. Analyse a message and choose "Save Incident".</p></div>';
}
function openInc(id) {
  const i = store.inc().find((x) => x.id === id); if (!i) return;
  modal(`<div class="row"><h3>${esc(i.scamType)}</h3><button class="btn ghost sm" data-x>Close</button></div><p class="sub">${i.id} · ${fmt(i.createdAt)} · ${RK[i.riskLevel]?.l || ''}</p>
    <h4>What you submitted (original, unchanged)</h4><div class="card" style="background:#f4f6fb;white-space:pre-wrap">${esc(i.original)}</div>
    <h4>${i.mode === 'demo' ? 'Demo-mode analysis (not AI)' : 'AI-generated analysis (Gemini)'}</h4><p class="sub">${esc(i.summary)}</p>
    ${i.techniques.length ? techHtml({ detectedTechniques: i.techniques }) : ''}${i.objectives.length ? `<h4>Scammer may want</h4>${listHtml(i.objectives)}` : ''}<h4>Recommended actions</h4>${listHtml(i.actions)}
    <h4>Your notes</h4><textarea id="incNotes" style="min-height:90px">${esc(i.notes)}</textarea>
    <h4>Status</h4><select id="incStatus">${STATUSES.map((s) => `<option ${s === i.status ? 'selected' : ''}>${s}</option>`).join('')}</select>
    <div class="row" style="justify-content:flex-start;margin-top:16px"><button class="btn" data-act="saveInc" data-id="${i.id}">Save changes</button><button class="btn ghost" data-del="${i.id}">Delete</button></div>`);
}

/* ---- Family Guardian (simulated notifications in LocalStorage) ---- */
let pending = null;
function alertStep1() {
  modal(`<div class="row"><h3>Alert a trusted person</h3><button class="btn ghost sm" data-x>Close</button></div><p class="sub" style="margin:8px 0 12px"><b>Simulated demo.</b> No SMS or WhatsApp is sent.</p>${MEMBERS.map((m) => `<button class="opt" style="margin-bottom:8px;width:100%" data-pick="${m.id}" ${m.id === 'user' ? 'disabled' : ''}>${m.av} <b>${m.n}</b> · ${m.rel}${m.id === 'user' ? ' (you)' : ''}</button>`).join('')}`);
}
function buildNote(to) { // incident summary shared with the chosen member
  const r = cur && cur.r, risk = r ? r.riskLevel : 'UNKNOWN', now = new Date().toISOString();
  return { id: uid('ALT'), to, from: 'user', risk, head: risk === 'HIGH' ? 'URGENT SAFETY ALERT' : 'SAFETY NOTICE',
    text: `A potentially dangerous digital interaction has been detected.\n\nRisk level: ${risk}.\n\n${r ? `The user may be experiencing a suspected ${r.scamType}.` : 'The user opened Safety Mode manually and may need help.'}\n\nPlease contact them and check whether they need assistance.`,
    summary: r ? r.summary : 'The user opened Safety Mode manually without an analysis.', techniques: r ? r.detectedTechniques.map((t) => t.name) : [], status: 'Sent', createdAt: now, log: [{ s: 'Sent', t: now }] };
}
function alertStep2(to) {
  pending = buildNote(to);
  modal(`<h3>Confirm alert to ${mem(to).n}</h3><div class="card" style="background:#f4f6fb;white-space:pre-line;margin:12px 0"><b>${pending.head}</b>\n\n${esc(pending.text)}</div><p class="sub">Shared: this alert and a short summary. Your original message is not shared. Simulated, nothing leaves this browser.</p><div class="row" style="justify-content:flex-start;margin-top:14px"><button class="btn" data-act="confirmAlert">Confirm and send (simulated)</button><button class="btn ghost" data-act="alert">Back</button></div>`);
}
function confirmAlert() {
  store.setNotes([pending, ...store.notes()]); LS.set(KEY.who, pending.to);
  modal(`<h3>Alert saved for ${mem(pending.to).n}</h3><p class="sub" style="margin:8px 0 14px">It now appears in their Family Guardian inbox. Open it as ${mem(pending.to).n} to acknowledge.</p><button class="btn" data-go="family" data-x>Open Family Guardian</button>`);
}
function renderFamily() {
  const who = LS.get(KEY.who, 'user'), ns = store.notes(), me = mem(who), list = who === 'user' ? ns.filter((n) => n.from === 'user') : ns.filter((n) => n.to === who);
  const row = (n) => `<div class="card act" data-note="${n.id}" style="margin-bottom:10px"><div class="row"><b>${esc(n.head)}</b><span class="st ${n.status}">${n.status}</span></div><p>${who === 'user' ? 'To ' + mem(n.to).n : 'From Demo User'} · ${fmt(n.createdAt)} · Risk ${n.risk}</p></div>`;
  $('#familyBox').innerHTML = `<div class="demo">Simulated demo notification system. No real WhatsApp or SMS is sent. Data stays in this browser.</div>
    <p class="sub" style="margin-bottom:8px">Viewing as:</p><div class="chips">${MEMBERS.map((m) => `<button class="chip ${m.id === who ? 'on' : ''}" data-who="${m.id}">${m.av} ${m.n}</button>`).join('')}</div>
    <h2>Family members</h2><div class="grid g3">${MEMBERS.map((m) => { const got = ns.filter((n) => n.to === m.id), fresh = got.filter((n) => n.status === 'Sent').length; return `<div class="card"><div class="ic">${m.av}</div><h4>${m.n}</h4><p>${m.rel}</p><span class="tag">${got.length} alert(s) received${fresh ? ` · ${fresh} new` : ''}</span></div>`; }).join('')}</div>
    <h2>${who === 'user' ? 'Alerts you sent' : 'Inbox for ' + me.n}</h2>${list.length ? list.map(row).join('') : '<div class="card"><p>No alerts yet.</p></div>'}`;
}
function openNote(id) {
  const n = store.notes().find((x) => x.id === id); if (!n) return;
  const isRecipient = LS.get(KEY.who, 'user') === n.to, idx = ORDER.indexOf(n.status);
  const btn = (s, l) => `<button class="btn sm ${ORDER.indexOf(s) > idx ? '' : 'ghost'}" data-st="${s}" data-id="${n.id}" ${ORDER.indexOf(s) <= idx ? 'disabled' : ''}>${l}</button>`;
  modal(`<div class="row"><h3>${esc(n.head)}</h3><button class="btn ghost sm" data-x>Close</button></div><span class="st ${n.status}">${n.status}</span>
    <div class="card" style="background:#f4f6fb;white-space:pre-line;margin:12px 0">${esc(n.text)}</div><h4>Shared incident summary</h4><p class="sub">${esc(n.summary)}</p>
    ${n.techniques.length ? `<h4>Techniques detected</h4>${listHtml(n.techniques)}` : ''}<h4>Status history</h4>${listHtml(n.log.map((l) => `${l.s} · ${fmt(l.t)}`))}
    ${isRecipient ? `<div class="row" style="justify-content:flex-start;margin-top:14px">${btn('Seen', 'Mark as seen')}${btn('Acknowledged', 'Acknowledge')}${btn('Resolved', 'Mark resolved')}</div>` : '<p class="sub" style="margin-top:10px">Switch to the recipient to respond.</p>'}`);
}
function setStatus(id, s) {
  const all = store.notes(), n = all.find((x) => x.id === id); if (!n) return;
  n.status = s; n.log.push({ s, t: new Date().toISOString() }); store.setNotes(all); renderFamily(); openNote(id);
}

/* ---- one delegated click handler ---- */
let delArm = null;
document.addEventListener('click', (e) => {
  const t = e.target.closest('[data-act],[data-pick],[data-who],[data-note],[data-inc],[data-st],[data-del]'); if (!t) return;
  const d = t.dataset;
  if (d.act === 'save') saveIncident();
  else if (d.act === 'alert') alertStep1();
  else if (d.act === 'confirmAlert') confirmAlert();
  else if (d.act === 'saveInc') { const a = store.inc(), i = a.find((x) => x.id === d.id); if (i) { i.notes = $('#incNotes').value; i.status = $('#incStatus').value; store.setInc(a); renderLocker(); toast('Incident updated'); } }
  else if (d.pick) alertStep2(d.pick);
  else if (d.who) { LS.set(KEY.who, d.who); renderFamily(); }
  else if (d.note) openNote(d.note);
  else if (d.inc) openInc(d.inc);
  else if (d.st) setStatus(d.id, d.st);
  else if (d.del) { if (delArm !== d.del) { delArm = d.del; t.textContent = 'Click again to confirm delete'; } else { store.setInc(store.inc().filter((x) => x.id !== d.del)); delArm = null; close(); renderLocker(); toast('Incident deleted'); } }
});

/* hook screen changes so the new views refresh */
const _go = go;
go = function (v) { _go(v); if (v === 'safety') renderSafetyCtx(); if (v === 'family') renderFamily(); if (v === 'locker') renderLocker(); };
