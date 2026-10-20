"use strict";
// GED Study Coach. Everything runs in the browser; progress is saved in localStorage on this device.
const KEY = "ged-study-v2", DAY = 86400000, REVIEW_DAYS = 14;
const DEF = () => ({ name: "", testDate: "", topics: {}, qstat: {}, tests: [], essays: {}, days: {}, exam: null });
// ---------- profiles ----------
// Several people can share one browser. Each profile keeps its own progress under its own key. The first profile
// ("p1") uses the original key, so progress saved before profiles existed is still there, untouched.
const PKEY = "ged-profiles-v1";
const dataKey = id => id === "p1" ? KEY : KEY + "-" + id;
const rd = k => { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch (e) { return null; } };
let P = rd(PKEY);
if (!P || !Array.isArray(P.list) || !P.list.length) {
  const old = rd(KEY);
  P = { list: [{ id: "p1", name: (old && old.name) || "" }], active: "p1" };
  try { localStorage.setItem(PKEY, JSON.stringify(P)); } catch (e) {}
}
const saveP = () => { try { localStorage.setItem(PKEY, JSON.stringify(P)); } catch (e) {} };
const curProf = () => P.list.find(x => x.id === P.active) || P.list[0];
let S;
function loadState() { S = Object.assign(DEF(), rd(dataKey(curProf().id)) || {}); }
loadState();
const save = () => { try { localStorage.setItem(dataKey(curProf().id), JSON.stringify(S)); } catch (e) {} const c = curProf(); if (c.name !== S.name) { c.name = S.name; saveP(); } };
// The PIN identifies the person. Khaela's progress from before profiles existed is the first profile ("p1").
function adopt(user) {
  let x = P.list.find(y => y.name.toLowerCase() === user.toLowerCase());
  if (!x && user.toLowerCase() === "khaela") { x = P.list.find(y => y.id === "p1"); x.name = user; }
  if (!x) { x = { id: "p" + Date.now().toString(36), name: user }; P.list.push(x); }
  P.active = x.id; saveP(); loadState();
  if (S.name !== x.name) { S.name = x.name; save(); }
}
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const topicById = id => TOPICS.find(t => t.id === id);
const subjById = id => SUBJECTS.find(s => s.id === id);
const LETTERS = "ABCDEFG";
let timer = null, examView = false;
const todayStr = () => { const d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };
const fmtTime = s => { s = Math.max(0, Math.round(s)); const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60); return (h ? h + ":" + String(m).padStart(2, "0") : m) + ":" + String(s % 60).padStart(2, "0"); };

// ---------- mastery model ----------
// A topic is "done" once she has 3+ answers and got 80%+ of her last 5 right. That is what lets her skip what she already knows.
function ts(id) { return S.topics[id] || (S.topics[id] = { hist: [], last: 0 }); }
function acc5(id) { const h = ts(id).hist.slice(-5); return h.length ? h.reduce((a, b) => a + b, 0) / h.length : 0; }
function isDone(id) { return ts(id).hist.length >= 3 && acc5(id) >= 0.8; }
function status(id) { return !ts(id).hist.length ? "new" : isDone(id) ? "done" : "work"; }
function dueReview(id) { return isDone(id) && Date.now() - ts(id).last > REVIEW_DAYS * DAY; }
function record(tid, key, ok) {
  const t = ts(tid); t.hist.push(ok ? 1 : 0); if (t.hist.length > 30) t.hist.shift(); t.last = Date.now();
  const q = S.qstat[key] || (S.qstat[key] = { c: 0, w: 0, last: 0 });
  ok ? q.c++ : q.w++; q.last = Date.now();
  const d = todayStr(); S.days[d] = (S.days[d] || 0) + 1;
}
function subjProgress(sid) {
  const l = TOPICS.filter(t => t.subj === sid);
  return { done: l.filter(t => isDone(t.id)).length, total: l.length, fresh: l.filter(t => status(t.id) === "new").length };
}
function nextTopic(sid) {
  const list = TOPICS.filter(t => (!sid || t.subj === sid) && !isDone(t.id));
  const work = list.filter(t => status(t.id) === "work").sort((a, b) => acc5(a.id) - acc5(b.id));
  return work[0] || list[0] || null;
}
function streak() {
  let n = 0, d = new Date();
  if (!S.days[todayStr()]) d = new Date(Date.now() - DAY);
  for (;;) { const k = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); if (S.days[k]) { n++; d = new Date(d.getTime() - DAY); } else break; }
  return n;
}
const missedKeys = () => Object.keys(S.qstat).filter(k => S.qstat[k].w > S.qstat[k].c);
function keyToQ(k) {
  if (k.startsWith("test:")) { const [, s, n, i] = k.split(":"); const q = TESTS[s] && TESTS[s][+n] && TESTS[s][+n].qs[+i]; return q ? { q, tid: q.t } : null; }
  const [tid, qi] = k.split(":"); const t = topicById(tid); return t && t.qs[+qi] ? { q: t.qs[+qi], tid } : null;
}
// choose practice questions: unseen first, then most-missed, then least recently seen
function pickQs(tid, n) {
  const t = topicById(tid);
  return t.qs.map((q, i) => { const s = S.qstat[tid + ":" + i] || { c: 0, w: 0, last: 0 };
    return { i, sc: (s.c + s.w === 0 ? -100 : 0) - s.w * 5 + s.c * 3 + s.last / 1e13 + Math.random() }; })
    .sort((a, b) => a.sc - b.sc).slice(0, n).map(x => x.i);
}
const mkItem = (tid, qi) => ({ tid, key: tid + ":" + qi, q: topicById(tid).qs[qi], order: shuffle(topicById(tid).qs[qi].c.map((_, i) => i)) });
const mkKeyItem = k => { const r = keyToQ(k); return r ? { tid: r.tid, key: k, q: r.q, order: shuffle(r.q.c.map((_, i) => i)) } : null; };
const stim = q => q.p ? `<div class="passage">${q.p}</div>` : "";

// ---------- router ----------
const NAV = [["#/home", "Home"], ["#/check", "Skip what I know"], ["#/tests", "Practice tests"], ["#/essay", "Essay"], ["#/progress", "Progress"], ["#/resources", "Resources"]];
function route() {
  clearInterval(timer); timer = null; examView = false;
  const h = location.hash || "#/home", p = h.slice(2).split("/"), v = p[0];
  $("#nav").innerHTML = NAV.map(([a, n]) => `<a href="${a}" class="${h.startsWith(a) ? "on" : ""}">${n}</a>`).join("");
  $("#nav").innerHTML += `<a href="#/signout" class="who">👤 ${esc(curProf().name || "Me")} · Sign out</a>`;
  window.scrollTo(0, 0);
  if (v === "signout") { fetch("/api/ged/logout", { method: "POST" }).finally(() => { location.hash = "#/home"; location.reload(); }); return; }
  if (v === "check") return p[1] ? startCheck(p[1]) : viewCheck();
  if (v === "topic") return viewTopic(p[1]);
  if (v === "review") return startReview();
  if (v === "tests") return viewTests();
  if (v === "test") return viewTestIntro(p[1], +p[2]);
  if (v === "exam") return S.exam ? renderExam() : (location.hash = "#/tests");
  if (v === "result") return viewResult(+p[1], p[2]);
  if (v === "essay") return p[1] !== undefined ? viewEssay(+p[1]) : viewEssayList();
  if (v === "progress") return viewProgress();
  if (v === "resources") return viewResources();
  if (v === "formulas") return viewFormulas();
  viewHome();
}
addEventListener("hashchange", route);

// ---------- home ----------
function viewHome() {
  const nxt = nextTopic(), due = TOPICS.filter(t => dueReview(t.id)), miss = missedKeys().length;
  const started = TOPICS.some(t => ts(t.id).hist.length), doneN = TOPICS.filter(t => isDone(t.id)).length;
  const dl = S.testDate ? Math.ceil((new Date(S.testDate + "T00:00:00") - new Date()) / DAY) : null;
  const left = TOPICS.length - doneN, wks = dl > 0 ? Math.max(1, Math.ceil(dl / 7)) : 0;
  const todayN = S.days[todayStr()] || 0, st = streak();
  $("#app").innerHTML = `
  <h1>${S.name ? "Welcome back, " + esc(S.name) + "." : "Welcome!"}</h1>
  <p class="mute">You only study what you don't already know. Take the quick skip-check on a subject, and every topic you get right is marked done and skipped. When you're ready, take the full-length timed practice tests.</p>
  ${!S.name ? `<div class="row"><input type="text" id="nm" placeholder="Your first name" maxlength="30"><button class="btn sm alt" id="nmb">Save</button></div>` : ""}
  <div class="card"><div class="stat"><div><b>${doneN}/${TOPICS.length}</b><span class="mute">topics done</span></div><div><b>${todayN}</b><span class="mute">questions today</span></div><div><b>${st}</b><span class="mute">day streak</span></div><div><b>${S.tests.length}</b><span class="mute">practice tests</span></div></div></div>
  ${S.exam ? `<div class="card hl"><h3>Practice test in progress</h3><p class="mute">${esc(TESTS[S.exam.subj][S.exam.n].name)}, question ${S.exam.idx + 1}.</p><a class="btn" href="#/exam">Resume test</a></div>` : ""}
  ${nxt ? `<div class="card hl"><span class="mute">${started ? "Next up" : "Start here"}</span>
    <h3>${started ? esc(nxt.name) : "Take a quick skip-check first"}</h3>
    <p class="mute">${started ? subjById(nxt.subj).name : "3 questions per topic. Whatever you already know gets skipped, and the rest becomes your study list."}</p>
    <a class="btn" href="${started ? "#/topic/" + nxt.id : "#/check"}">${started ? "Continue" : "Begin"}</a></div>`
    : `<div class="card hl"><h3>🎉 Every topic is marked done!</h3><p class="mute">Take the full-length practice tests to confirm you're ready.</p><a class="btn" href="#/tests">Practice tests</a></div>`}
  <div class="grid">
    <div class="card"><h3>Test date</h3>${dl !== null && dl >= 0 ? `<p>${dl === 0 ? "Today!" : dl + " days to go"}${left && wks ? `. About <b>${Math.ceil(left / wks)} topics per week</b> keeps you on track.` : ""}</p>` : `<p class="mute">Optional: set the date you plan to test and I'll pace you.</p>`}
      <div class="row"><input type="date" id="td" value="${esc(S.testDate)}"><button class="btn sm alt" id="tdb">Save</button></div></div>
    ${miss ? `<div class="card"><h3>Missed questions</h3><p class="mute">${miss} question${miss > 1 ? "s" : ""} to re-try. Getting them right clears them.</p><a class="btn sm" href="#/review">Review missed</a></div>` : ""}
    ${due.length ? `<div class="card"><h3>Quick refreshers due</h3><p class="mute">Learned a while ago. A few questions keeps them fresh.</p><div class="row">${due.slice(0, 3).map(t => `<a class="btn sm alt" href="#/topic/${t.id}">${esc(t.name.split(":")[0].slice(0, 28))}</a>`).join("")}</div></div>` : ""}
  </div>
  <h2>Your subjects</h2><div class="grid">${SUBJECTS.map(s => { const p = subjProgress(s.id), n = nextTopic(s.id);
    return `<div class="card"><h3>${s.icon} ${s.name}</h3><div class="prog"><i style="width:${p.done / p.total * 100}%"></i></div>
    <div class="mute">${p.done} of ${p.total} topics done${p.fresh ? `, ${p.fresh} not checked` : ""}</div>
    <div class="row">${p.fresh ? `<a class="btn sm" href="#/check/${s.id}">Skip-check</a>` : ""}${n ? `<a class="btn sm alt" href="#/topic/${n.id}">Study next</a>` : ""}<a class="btn sm alt" href="#/tests">Tests</a></div></div>`; }).join("")}</div>`;
  const b = $("#nmb"); if (b) b.onclick = () => { S.name = $("#nm").value.trim().slice(0, 30); save(); viewHome(); };
  $("#tdb").onclick = () => { S.testDate = $("#td").value; save(); viewHome(); };
}

// ---------- skip-check ----------
function viewCheck() {
  $("#app").innerHTML = `<h1>Skip what I know</h1><p class="mute">Pick a subject. You'll get 3 quick questions on each topic you haven't checked yet. Get them right and that topic is marked done. There are no explanations until the end, so go with your best answer.</p>
  <div class="grid">${SUBJECTS.map(s => { const p = subjProgress(s.id);
    return `<div class="card"><h3>${s.icon} ${s.name}</h3><div class="mute">${p.fresh ? p.fresh + " topics to check (about " + p.fresh * 3 + " questions, " + Math.ceil(p.fresh * 3 * 0.75) + " minutes)" : "All topics checked"}</div>
    <div class="row"><a class="btn sm" href="#/check/${s.id}">${p.fresh ? "Start check" : "Re-check all"}</a></div></div>`; }).join("")}</div>`;
}
function startCheck(sid) {
  if (!subjById(sid)) return viewCheck();
  let tl = TOPICS.filter(t => t.subj === sid);
  const fresh = tl.filter(t => status(t.id) === "new"); if (fresh.length) tl = fresh;
  const items = []; tl.forEach(t => pickQs(t.id, 3).forEach(qi => items.push(mkItem(t.id, qi))));
  runQuiz({ title: subjById(sid).name + " skip-check", items, feedback: false, onDone: r => checkResults(r, tl) });
}
function checkResults(r, tl) {
  $("#app").innerHTML = `<h1>Skip-check results</h1><p class="mute">Topics marked done are skipped. The rest are your study list.</p>` +
    tl.map(t => { const rs = r.filter(x => x.tid === t.id), c = rs.filter(x => x.ok).length, d = isDone(t.id);
      return `<div class="card"><div class="row sb" style="margin:0"><div><h3>${esc(t.name)}</h3><span class="mute">${c} of ${rs.length} correct</span></div>
      ${d ? `<span class="chip done">✓ Done, skip</span>` : `<a class="btn sm" href="#/topic/${t.id}">Study this</a>`}</div></div>`; }).join("") +
    `<div class="row"><a class="btn" href="#/home">Back home</a></div>`;
}

// ---------- topic study & practice ----------
function viewTopic(id) {
  const t = topicById(id); if (!t) return viewHome();
  const st = status(id), h = ts(id).hist, a = Math.round(acc5(id) * 100), s = subjById(t.subj);
  $("#app").innerHTML = `<a href="#/home" class="mute">← Home</a><h1>${esc(t.name)}</h1>
  <span class="chip ${st}">${st === "done" ? "✓ Done" : st === "work" ? "In progress" : "Not started"}</span> <span class="chip">${s.icon} ${s.name}</span>
  ${h.length ? `<span class="mute"> Recent accuracy ${a}% (needs 80%)</span>` : ""}
  <div class="card"><h3>Key ideas</h3><ul class="l">${t.lesson.map(l => `<li>${esc(l)}</li>`).join("")}</ul></div>
  ${(t.ex || []).map(([p, sol]) => `<div class="card"><b>Worked example</b><p style="margin:6px 0">${esc(p)}</p><div class="expl">${esc(sol)}</div></div>`).join("")}
  ${t.subj === "math" ? `<div class="row"><button class="btn sm alt" id="fs">Formula sheet</button><button class="btn sm alt" id="cl">Calculator</button></div>` : ""}
  <div class="card"><h3>Go deeper (free)</h3><ul class="l">${t.links.map(([n, u]) => `<li><a href="${u}" target="_blank" rel="noopener">${esc(n)}</a></li>`).join("")}</ul></div>
  <div class="row"><button class="btn" id="go">${st === "done" ? "Quick refresher (5 questions)" : "Practice (5 questions)"}</button><button class="btn alt" id="go10">10 questions</button></div>
  <p class="mute">Get about 4 out of 5 right and this topic is marked done. If you already know it, just start and prove it.</p>`;
  const go = n => runQuiz({ title: t.name, items: pickQs(id, n).map(qi => mkItem(id, qi)), feedback: true, onDone: r => practiceDone(id, r) });
  $("#go").onclick = () => go(5); $("#go10").onclick = () => go(10);
  if ($("#fs")) { $("#fs").onclick = showFormulas; $("#cl").onclick = toggleCalc; }
}
function practiceDone(id, r) {
  const c = r.filter(x => x.ok).length, d = isDone(id), nx = nextTopic(topicById(id).subj);
  $("#app").innerHTML = `<h1>${c} of ${r.length} correct</h1>
  <div class="card">${d ? `<h3>✅ Topic mastered. You can skip this one.</h3>` : `<h3>Keep going, you're building it.</h3><p class="mute">Reread the key ideas, then try again.</p>`}</div>
  <div class="row"><a class="btn alt" href="#/topic/${id}">${d ? "Topic page" : "Review & retry"}</a>${nx && nx.id !== id ? `<a class="btn" href="#/topic/${nx.id}">Next: ${esc(nx.name)}</a>` : ""}</div>`;
}

// ---------- missed-question drill ----------
function startReview() {
  const items = shuffle(missedKeys()).slice(0, 10).map(mkKeyItem).filter(Boolean);
  if (!items.length) { $("#app").innerHTML = `<h1>No missed questions</h1><p class="mute">Nice work. Anything you miss in practice will show up here.</p><a class="btn" href="#/home">Home</a>`; return; }
  runQuiz({ title: "Review missed questions", items, feedback: true, onDone: r => { const c = r.filter(x => x.ok).length;
    $("#app").innerHTML = `<h1>${c} of ${r.length} correct</h1><p class="mute">${missedKeys().length} missed question${missedKeys().length === 1 ? "" : "s"} left to clear.</p><div class="row"><a class="btn" href="#/review">Keep going</a><a class="btn alt" href="#/home">Home</a></div>`; } });
}

// ---------- generic quiz runner (skip-check, topic practice, drill) ----------
function runQuiz(cfg) {
  const { items, feedback, onDone } = cfg; let i = 0; const results = [];
  const draw = () => {
    const it = items[i];
    $("#app").innerHTML = `<div class="row sb" style="margin:0"><span class="mute">${esc(cfg.title)} · ${i + 1} of ${items.length}</span><a class="mute" href="#/home">Quit</a></div>
    <div class="prog"><i style="width:${i / items.length * 100}%;background:var(--brand)"></i></div>
    <div class="card">${stim(it.q)}<h3>${esc(it.q.q)}</h3><div id="ch">${it.order.map((o, n) => `<button class="choice" data-o="${o}"><span class="k">${LETTERS[n]}</span><span>${esc(it.q.c[o])}</span></button>`).join("")}</div><div id="fb"></div></div>
    ${it.tid && subjById(topicById(it.tid).subj).id === "math" ? `<div class="row"><button class="btn sm alt" id="cl">Calculator</button><button class="btn sm alt" id="fs">Formula sheet</button></div>` : ""}`;
    document.querySelectorAll(".choice").forEach(b => b.onclick = () => answer(+b.dataset.o));
    if ($("#cl")) { $("#cl").onclick = toggleCalc; $("#fs").onclick = showFormulas; }
  };
  const answer = pick => {
    const it = items[i], ok = pick === it.q.a;
    record(it.tid, it.key, ok); results.push({ tid: it.tid, key: it.key, q: it.q, pick, ok }); save();
    const next = () => { i++; i < items.length ? draw() : onDone(results); };
    if (!feedback) return next();
    document.querySelectorAll(".choice").forEach(b => { b.disabled = true; const o = +b.dataset.o; if (o === it.q.a) b.classList.add("right"); else if (o === pick) b.classList.add("wrong"); });
    $("#fb").innerHTML = `<div class="expl"><b>${ok ? "✓ Correct." : "Not quite."}</b> ${esc(it.q.e)}</div><div class="row"><button class="btn" id="nx">${i + 1 < items.length ? "Next" : "Finish"}</button></div>`;
    $("#nx").onclick = next; $("#nx").focus();
  };
  draw();
}

// ---------- full practice tests ----------
function viewTests() {
  const doc = S.exam ? `<div class="card hl"><h3>Test in progress</h3><p class="mute">${esc(TESTS[S.exam.subj][S.exam.n].name)}, question ${S.exam.idx + 1} of ${TESTS[S.exam.subj][S.exam.n].qs.length}.</p><div class="row"><a class="btn" href="#/exam">Resume</a><button class="btn alt" id="abn">Abandon this attempt</button></div></div>` : "";
  $("#app").innerHTML = `<h1>Full-length practice tests</h1>
  <p class="mute">Three complete tests for each subject, built to the length and style of the real GED. Take them timed, in one sitting, with no notes. Each test uses all-new questions. Scores below about 60% mean more study; consistently 70% or better is a good sign.</p>
  ${doc}
  ${SUBJECTS.map(s => `<h2>${s.icon} ${s.full}</h2><p class="mute">${esc(s.about)}</p><div class="grid">${TESTS[s.id].map((T, n) => {
    const tk = S.tests.filter(x => x.subj === s.id && x.n === n), best = tk.length ? Math.max(...tk.map(x => x.pct)) : null;
    return `<div class="card"><h3>Test ${n + 1}</h3><div class="mute">${T.qs.length} questions · ${s.minutes} min</div>
      <div class="row">${best !== null ? `<span class="chip ${best >= 70 ? "done" : "work"}">Best ${best}%</span><span class="chip">${tk.length} attempt${tk.length > 1 ? "s" : ""}</span>` : `<span class="chip">Not taken</span>`}</div>
      <div class="row"><a class="btn sm" href="#/test/${s.id}/${n}">${best !== null ? "Retake" : "Start"}</a></div></div>`; }).join("")}</div>`).join("")}`;
  if ($("#abn")) $("#abn").onclick = () => { if (confirm("Abandon this test attempt? Your answers will be lost.")) { S.exam = null; save(); viewTests(); } };
}
function viewTestIntro(sid, n) {
  const s = subjById(sid), T = s && TESTS[sid][n]; if (!T) return viewTests();
  if (S.exam && !(S.exam.subj === sid && S.exam.n === n)) { $("#app").innerHTML = `<h1>Finish your current test first</h1><p class="mute">You have another practice test in progress.</p><a class="btn" href="#/exam">Resume it</a>`; return; }
  $("#app").innerHTML = `<a href="#/tests" class="mute">← Practice tests</a><h1>${esc(T.name)}</h1>
  <div class="card"><ul class="l"><li>${T.qs.length} questions. The real test gives ${s.minutes} minutes for a test this size.</li>
  <li>You can skip around, flag questions to come back to, and change answers until you submit.</li>
  <li>Unanswered questions count as wrong, so always guess.</li>
  ${sid === "math" ? `<li>The on-screen calculator and a formula sheet are available, like the real test.</li>` : ""}
  ${sid === "rla" ? `<li>The real Language Arts test also has a 45-minute essay. Practice it separately on the <a href="#/essay">Essay</a> page.</li>` : ""}
  <li>Find a quiet spot and silence your phone. You'll see explanations after you submit.</li></ul>
  <label><input type="checkbox" id="tm" checked> Time me (${s.minutes} minutes)</label>
  <div class="row"><button class="btn" id="go">${S.exam ? "Resume" : "Begin test"}</button></div></div>`;
  $("#go").onclick = () => { if (!S.exam) startExam(sid, n, $("#tm").checked); else location.hash = "#/exam"; };
}
function startExam(sid, n, timed) {
  const T = TESTS[sid][n];
  S.exam = { subj: sid, n, timed, start: Date.now(), limit: timed ? subjById(sid).minutes * 60 : 0, idx: 0, hide: false,
    ans: T.qs.map(() => null), flag: T.qs.map(() => false), order: T.qs.map(q => shuffle(q.c.map((_, i) => i))) };
  save(); location.hash = "#/exam";
}
const examLeft = () => S.exam.limit - (Date.now() - S.exam.start) / 1000;
function renderExam() {
  const E = S.exam, T = TESTS[E.subj][E.n], q = T.qs[E.idx], n = T.qs.length; examView = true;
  const unans = E.ans.filter(a => a === null).length;
  $("#app").innerHTML = `
  <div class="exambar"><b>${esc(T.name)}</b><span class="pill">Question ${E.idx + 1} of ${n}</span>
    ${E.timed ? `<span class="t" id="tm"></span><button class="btn sm alt" id="tt">${E.hide ? "Show" : "Hide"} timer</button>` : ""}
    <span style="margin-left:auto" class="row">${E.subj === "math" ? `<button class="btn sm alt" id="cl">Calculator</button><button class="btn sm alt" id="fs">Formulas</button>` : ""}<button class="btn sm" id="fin">Finish</button></span></div>
  <div class="card">${stim(q)}<h3>${esc(q.q)}</h3><div id="ch">${E.order[E.idx].map((o, k) => `<button class="choice ${E.ans[E.idx] === o ? "sel" : ""}" data-o="${o}"><span class="k">${LETTERS[k]}</span><span>${esc(q.c[o])}</span></button>`).join("")}</div></div>
  <div class="row sb"><button class="btn alt" id="pv" ${E.idx === 0 ? "disabled" : ""}>← Previous</button><button class="btn alt ${E.flag[E.idx] ? "warn" : ""}" id="fl">${E.flag[E.idx] ? "⚑ Flagged" : "⚐ Flag for review"}</button>
    ${E.idx < n - 1 ? `<button class="btn" id="nx">Next →</button>` : `<button class="btn" id="fin2">Review & finish</button>`}</div>
  <div class="mute" style="margin-top:14px">${n - unans} of ${n} answered. Tap a number to jump.</div>
  <div class="qgrid">${T.qs.map((_, i) => `<button class="${E.ans[i] !== null ? "ans" : ""} ${i === E.idx ? "cur" : ""} ${E.flag[i] ? "flag" : ""}" data-i="${i}">${i + 1}</button>`).join("")}</div>`;
  const go = i => { E.idx = Math.max(0, Math.min(n - 1, i)); save(); renderExam(); window.scrollTo(0, 0); };
  document.querySelectorAll(".choice").forEach(b => b.onclick = () => { E.ans[E.idx] = +b.dataset.o; save(); renderExam(); });
  document.querySelectorAll(".qgrid button").forEach(b => b.onclick = () => go(+b.dataset.i));
  $("#pv").onclick = () => go(E.idx - 1);
  if ($("#nx")) $("#nx").onclick = () => go(E.idx + 1);
  $("#fl").onclick = () => { E.flag[E.idx] = !E.flag[E.idx]; save(); renderExam(); };
  $("#fin").onclick = examReview; if ($("#fin2")) $("#fin2").onclick = examReview;
  if ($("#cl")) { $("#cl").onclick = toggleCalc; $("#fs").onclick = showFormulas; }
  if (E.timed) {
    const tick = () => { const l = examLeft(), el = $("#tm"); if (!el) return; el.textContent = E.hide ? "⏱ hidden" : "⏱ " + fmtTime(l); el.classList.toggle("low", l < 300); if (l <= 0) { clearInterval(timer); alert("Time is up. Your test will now be scored."); submitExam(); } };
    tick(); clearInterval(timer); timer = setInterval(tick, 1000);
    $("#tt").onclick = () => { E.hide = !E.hide; save(); renderExam(); };
  }
}
document.addEventListener("keydown", e => {
  if (!examView || !S.exam || /INPUT|TEXTAREA|SELECT/.test((e.target || {}).tagName || "")) return;
  const E = S.exam, k = e.key.toLowerCase(), n = TESTS[E.subj][E.n].qs.length;
  const pick = "abcd".indexOf(k) >= 0 ? "abcd".indexOf(k) : "1234".indexOf(k);
  if (pick >= 0 && pick < E.order[E.idx].length) { E.ans[E.idx] = E.order[E.idx][pick]; save(); renderExam(); }
  else if (e.key === "ArrowRight" && E.idx < n - 1) { E.idx++; save(); renderExam(); }
  else if (e.key === "ArrowLeft" && E.idx > 0) { E.idx--; save(); renderExam(); }
});
function examReview() {
  const E = S.exam, T = TESTS[E.subj][E.n], un = [], fl = [];
  E.ans.forEach((a, i) => { if (a === null) un.push(i); if (E.flag[i]) fl.push(i); });
  const list = a => a.length ? a.map(i => `<button class="btn sm alt" data-i="${i}">${i + 1}</button>`).join(" ") : `<span class="mute">None</span>`;
  $("#app").innerHTML = `<h1>Ready to submit?</h1><div class="card"><p><b>${T.qs.length - un.length}</b> of ${T.qs.length} answered.</p>
  <p><b>Unanswered</b> (these count as wrong; guess if unsure):</p><div class="row">${list(un)}</div>
  <p><b>Flagged:</b></p><div class="row">${list(fl)}</div>
  ${E.timed ? `<p class="mute">Time left: ${fmtTime(examLeft())}</p>` : ""}</div>
  <div class="row"><button class="btn alt" id="bk">← Back to the test</button><button class="btn" id="sub">Submit and score</button></div>`;
  document.querySelectorAll("[data-i]").forEach(b => b.onclick = () => { E.idx = +b.dataset.i; save(); renderExam(); });
  $("#bk").onclick = () => renderExam();
  $("#sub").onclick = () => { if (un.length && !confirm(un.length + " question(s) are unanswered. Submit anyway?")) return; submitExam(); };
}
function submitExam() {
  const E = S.exam; if (!E) return;
  clearInterval(timer); examView = false;
  const T = TESTS[E.subj][E.n], by = {}; let correct = 0;
  T.qs.forEach((q, i) => { const ok = E.ans[i] === q.a; if (ok) correct++;
    record(q.t, `test:${E.subj}:${E.n}:${i}`, ok); (by[q.t] = by[q.t] || [0, 0])[1]++; if (ok) by[q.t][0]++; });
  const rec = { subj: E.subj, n: E.n, date: Date.now(), correct, total: T.qs.length, pct: Math.round(correct / T.qs.length * 100), by, picks: E.ans,
    secs: Math.round(Math.min((Date.now() - E.start) / 1000, E.limit || 1e9)), timed: E.timed };
  S.tests.push(rec); S.exam = null; save();
  location.hash = "#/result/" + (S.tests.length - 1);
}
function readiness(p) {
  return p >= 80 ? ["strong", "Strong result. This is the range where passing, and possibly a College Ready score, is likely."]
    : p >= 65 ? ["good", "Solid. This is in the range where passing is likely. Keep sharpening the topics below."]
    : p >= 50 ? ["close", "Borderline. Passing is possible but not safe yet. Work the weak topics below, then retake a different test."]
    : ["more", "More study is needed. Use the skip-check and topic practice, starting with the weakest topics below."];
}
function viewResult(i, mode) {
  const r = S.tests[i]; if (!r) return viewProgress();
  const T = TESTS[r.subj][r.n], s = subjById(r.subj), rd = readiness(r.pct), showAll = mode === "all";
  const rows = Object.entries(r.by).sort((a, b) => a[1][0] / a[1][1] - b[1][0] / b[1][1]);
  const wrong = T.qs.map((q, k) => k).filter(k => r.picks[k] !== T.qs[k].a);
  const list = (showAll ? T.qs.map((q, k) => k) : wrong);
  $("#app").innerHTML = `<a href="#/tests" class="mute">← Practice tests</a><h1>${esc(T.name)} results</h1>
  <div class="card"><div class="big">${r.pct}%</div><div>${r.correct} of ${r.total} correct${r.timed ? ` · time used ${fmtTime(r.secs)}` : ""}</div>
  <p style="margin-bottom:0">${rd[1]}</p><p class="mute" style="margin-top:6px">This is a rough guide only. The real GED is scored from 100 to 200 and you need 145 on each subject. The official GED Ready practice test is the best predictor.</p></div>
  ${r.subj === "rla" && T.essay !== undefined ? `<div class="card"><h3>Don't forget the essay</h3><p class="mute">The real Language Arts test includes a 45-minute essay.</p><a class="btn sm" href="#/essay/${T.essay}">Practice the essay</a></div>` : ""}
  <h2>By topic (weakest first)</h2>${rows.map(([tid, [c, t]]) => { const p = c / t;
    return `<div class="tbar"><span class="nm">${esc(topicById(tid).name)}</span><span class="bg"><i style="width:${p * 100}%;background:${p >= .7 ? "var(--ok)" : p >= .5 ? "var(--warn)" : "var(--bad)"}"></i></span><span>${c}/${t}</span>${p < .8 ? `<a class="btn sm alt" href="#/topic/${tid}">Study</a>` : ""}</div>`; }).join("")}
  <h2>Review answers</h2><div class="row"><a class="btn sm ${showAll ? "alt" : ""}" href="#/result/${i}">Missed (${wrong.length})</a><a class="btn sm ${showAll ? "" : "alt"}" href="#/result/${i}/all">All questions</a></div>
  ${list.length ? list.map(k => { const q = T.qs[k], pk = r.picks[k], ok = pk === q.a;
    return `<div class="card"><span class="chip ${ok ? "done" : "bad"}">${ok ? "Correct" : "Missed"}</span> <span class="mute">Question ${k + 1} · ${esc(topicById(q.t).name)}</span>${stim(q)}<b>${esc(q.q)}</b>
    <p style="margin:8px 0 2px">Your answer: ${pk === null ? "<i>no answer</i>" : esc(q.c[pk])}</p><p style="margin:2px 0;color:var(--ok)">Correct answer: ${esc(q.c[q.a])}</p><div class="expl">${esc(q.e)}</div></div>`; }).join("") : `<div class="card">Nothing missed. 🎉</div>`}
  <div class="row"><a class="btn" href="#/tests">Back to tests</a><a class="btn alt" href="#/home">Home</a></div>`;
}

// ---------- essay practice ----------
function viewEssayList() {
  $("#app").innerHTML = `<h1>Essay practice</h1><p class="mute">The Language Arts test includes one Extended Response: you read two passages that take different positions, then write an essay (about 45 minutes) arguing which is better supported, using evidence from both passages. You are scored on three things: your argument and use of evidence, how well your ideas are organized and developed, and your command of standard English.</p>
  <div class="grid">${ESSAYS.map((e, i) => { const d = S.essays[i];
    return `<div class="card"><h3>${esc(e.title)}</h3><div class="row">${d && d.text ? `<span class="chip">${(d.text.trim().split(/\s+/).filter(Boolean).length)} words saved</span>` : `<span class="chip">Not started</span>`}</div><div class="row"><a class="btn sm" href="#/essay/${i}">${d && d.text ? "Open" : "Start"}</a></div></div>`; }).join("")}</div>
  <div class="card"><h3>A simple structure that works</h3><ul class="l"><li><b>Introduction:</b> say which position is better supported, in one clear sentence (your claim).</li>
  <li><b>Body paragraph 1:</b> your strongest reason, with a specific detail from the passages. Explain why it matters.</li>
  <li><b>Body paragraph 2:</b> a second reason, with evidence from the passage you agree with.</li>
  <li><b>Body paragraph 3:</b> point out a weakness in the other position (for example, no data, or a claim based on opinion).</li>
  <li><b>Conclusion:</b> restate your claim in new words.</li></ul>
  <p class="mute">Aim for 300 to 600 words. Leave 5 minutes to proofread for spelling, commas and complete sentences.</p></div>`;
}
function viewEssay(i) {
  const e = ESSAYS[i]; if (!e) return viewEssayList();
  const d = S.essays[i] || (S.essays[i] = { text: "", scores: [0, 0, 0] });
  $("#app").innerHTML = `<a href="#/essay" class="mute">← Essays</a><h1>${esc(e.title)}</h1>
  <div class="split"><div class="card"><b>${esc(e.a.label)}</b><p>${esc(e.a.text)}</p></div><div class="card"><b>${esc(e.b.label)}</b><p>${esc(e.b.text)}</p></div></div>
  <div class="card hl"><b>Prompt</b><p style="margin:6px 0 0">${esc(e.prompt)}</p></div>
  <div class="row"><span class="pill" id="wc">0 words</span><span class="pill" id="et">45:00 available</span><button class="btn sm alt" id="st">Start 45-minute timer</button></div>
  <textarea id="tx" placeholder="Write your essay here. It saves automatically on this device." spellcheck="true"></textarea>
  <div class="row"><button class="btn alt" id="cp">Copy essay text</button></div>
  <h2>Score yourself</h2><p class="mute">Be honest. Rate each area 0 (weak), 1 (developing) or 2 (strong). Ask a teacher or tutor to read it too.</p>
  ${[["Argument and evidence", "Did I take a clear position and support it with specific details from BOTH passages? Did I explain the other side's weakness?"],
     ["Organization and development", "Do my ideas follow a clear order, with an introduction, body paragraphs and conclusion? Is each idea explained, not just stated?"],
     ["English conventions", "Are my sentences complete? Did I check spelling, commas and word choice?"]].map(([n, q], k) =>
    `<div class="card"><b>${n}</b><div class="mute">${q}</div><div class="row">${[0, 1, 2].map(v => `<label><input type="radio" name="s${k}" value="${v}" ${d.scores[k] === v ? "checked" : ""}> ${v}</label>`).join("&nbsp;&nbsp;")}</div></div>`).join("")}`;
  const tx = $("#tx"); tx.value = d.text;
  const wc = () => { $("#wc").textContent = (tx.value.trim().split(/\s+/).filter(Boolean).length) + " words"; }; wc();
  let t; tx.oninput = () => { wc(); clearTimeout(t); t = setTimeout(() => { d.text = tx.value; save(); }, 400); };
  document.querySelectorAll("input[type=radio]").forEach(r => r.onchange = () => { d.scores[+r.name.slice(1)] = +r.value; save(); });
  $("#cp").onclick = () => { tx.select(); try { document.execCommand("copy"); } catch (_) {} };
  $("#st").onclick = () => { const end = Date.now() + 45 * 60000; clearInterval(timer); timer = setInterval(() => { const l = Math.max(0, (end - Date.now()) / 1000); $("#et").textContent = "⏱ " + fmtTime(l); if (l <= 0) { clearInterval(timer); alert("Time! Finish your sentence and proofread."); } }, 1000); $("#st").disabled = true; };
}

// ---------- progress ----------
function viewProgress() {
  const named = SUBJECTS.map(s => `<h2>${s.icon} ${s.name}</h2><div class="card"><table>${TOPICS.filter(t => t.subj === s.id).map(t => { const st = status(t.id), n = ts(t.id).hist.length;
    return `<tr><td><a href="#/topic/${t.id}">${esc(t.name)}</a></td><td>${n ? Math.round(acc5(t.id) * 100) + "%" : "-"}</td><td><span class="chip ${st}">${st === "done" ? "Done" : st === "work" ? "Studying" : "New"}</span></td></tr>`; }).join("")}</table>
    ${S.tests.filter(x => x.subj === s.id).length ? `<div class="mute" style="margin-top:8px">Practice tests: ${S.tests.map((x, i) => [x, i]).filter(([x]) => x.subj === s.id).map(([x, i]) => `<a href="#/result/${i}">T${x.n + 1}: ${x.pct}%</a>`).join(" · ")}</div>` : ""}</div>`).join("");
  $("#app").innerHTML = `<h1>Progress</h1>${named}
  <h2>Your data</h2><p class="mute">Progress for <b>${esc(curProf().name || "this profile")}</b> is saved in this browser on this device only. Download a backup to keep it safe or move it to another device.</p>
  <div class="row"><button class="btn sm alt" id="ex">Download backup</button><label class="btn sm alt">Restore backup<input type="file" id="im" accept=".json" hidden></label><button class="btn sm alt" id="rs">Reset everything</button></div>`;
  $("#ex").onclick = () => { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([JSON.stringify(S)], { type: "application/json" })); a.download = "ged-progress.json"; a.click(); };
  $("#im").onchange = e => { const f = e.target.files[0]; if (!f) return; f.text().then(t => { try { const d = JSON.parse(t); if (d && d.topics) { S = Object.assign(DEF(), d); save(); viewProgress(); } else alert("That file doesn't look right."); } catch (_) { alert("That file doesn't look right."); } }); };
  $("#rs").onclick = () => { if (confirm("Erase all progress on this device?")) { const nm = S.name; S = DEF(); S.name = nm; save(); route(); } };
}

// ---------- resources ----------
function viewResources() {
  const L = (n, u, d) => `<li><a href="${u}" target="_blank" rel="noopener">${n}</a>${d ? ` <span class="mute">${d}</span>` : ""}</li>`;
  $("#app").innerHTML = `<h1>Resources</h1>
  <div class="card"><h3>How the real GED works</h3><ul class="l">
  <li>Four separate tests: Math, Language Arts, Science, Social Studies. You can take them on different days and in any order.</li>
  <li>Each is scored from 100 to 200. You need <b>145</b> on every one to pass. Scores of 165 and up can count as "College Ready."</li>
  <li>Scores don't average. A high score in one subject doesn't make up for a low one in another, so you can retake only the subject you missed.</li>
  ${SUBJECTS.map(s => `<li><b>${s.name}:</b> ${esc(s.about)}</li>`).join("")}</ul>
  <p class="mute">Test lengths and rules can change. Confirm on GED.com before test day.</p></div>
  <div class="card"><h3>Maryland</h3><ul class="l">
  <li>Maryland residents who are 18 or older and not enrolled in school can take the GED. You will need proof of Maryland residency when you register.</li>
  ${L("Find a free adult education / GED prep program near you", "https://www.labor.maryland.gov/gedmd/programs.shtml", "(Maryland Department of Labor)")}
  ${L("Maryland diploma options", "https://www.labor.md.gov/gedmd/geddiplomaoptions.pdf", "(the GED test, the National External Diploma Program, or the Adult High School Program all lead to the same state diploma)")}
  <li>Ask your local program about discounted test fees and about "4th &amp; Goal," which can cover the last test if you have already passed three.</li>
  <li>Many Maryland public libraries offer free test-prep websites and study spaces with a library card. Ask at the desk.</li>
  <li>Rules and fees change, so confirm everything on <a href="https://ged.com" target="_blank" rel="noopener">GED.com</a> (choose Maryland) before you register.</li></ul></div>
  <div class="card"><h3>Official</h3><ul class="l">
  ${L("GED.com", "https://ged.com", "schedule your tests and find the official study materials")}
  ${L("GED study guides (all four subjects)", "https://www.ged.com/educators-admins/teaching/classroom_materials/study_guides/", "official, with sample questions")}
  ${L("Official Assessment Guide: Math", "https://www.ged.com/wp-content/uploads/assessment_guide_for_educators_math.pdf", "PDF with real GED-style sample items")}
  ${L("Official Assessment Guide: Language Arts", "https://www.ged.com/wp-content/uploads/assessment_guide_for_educators_rla.pdf", "PDF")}
  ${L("Official Assessment Guide: Science", "https://www.ged.com/wp-content/uploads/assessment_guide_for_educators_science.pdf", "PDF")}
  ${L("Official Assessment Guide: Social Studies", "https://www.ged.com/wp-content/uploads/assessment_guide_for_educators_social_studies.pdf", "PDF")}
  ${L("Official essay scoring tool", "https://www.ged.com/wp-content/uploads/extended_response_scoring_tool_for_ged_ready.pdf", "how the essay is scored, with sample responses")}
  ${L("GED study tools", "https://www.ged.com/ged-study-tools.html", "official paid practice products")}
  <li>Maryland adult education programs can sometimes waive the GED Ready fee for enrolled students. Ask your program.</li>
  <li><b>GED Ready</b> (official practice test, sold on GED.com): the closest thing to the real exam and the best predictor of your score. Take it after you're scoring well on the practice tests here.</li></ul></div>
  <div class="card"><h3>Free study help</h3><ul class="l">
  ${L("Khan Academy: Arithmetic", "https://www.khanacademy.org/math/arithmetic", "videos and exercises")}
  ${L("Khan Academy: Pre-algebra", "https://www.khanacademy.org/math/pre-algebra")}
  ${L("Khan Academy: Algebra", "https://www.khanacademy.org/math/algebra")}
  ${L("Khan Academy: Geometry", "https://www.khanacademy.org/math/geometry-home")}
  ${L("Khan Academy: Statistics & probability", "https://www.khanacademy.org/math/statistics-probability")}
  ${L("Khan Academy: Reading, writing & grammar", "https://www.khanacademy.org/ela")}
  ${L("Khan Academy: Biology", "https://www.khanacademy.org/science/biology")}
  ${L("Khan Academy: Chemistry", "https://www.khanacademy.org/science/chemistry")}
  ${L("Khan Academy: Physics", "https://www.khanacademy.org/science/physics")}
  ${L("Khan Academy: Earth & space", "https://www.khanacademy.org/science/high-school-earth-and-space-science")}
  ${L("Khan Academy: US government & civics", "https://www.khanacademy.org/humanities/us-government-and-civics")}
  ${L("Khan Academy: US history", "https://www.khanacademy.org/humanities/us-history")}
  ${L("Khan Academy: Economics", "https://www.khanacademy.org/economics-finance-domain/microeconomics")}
  ${L("Purplemath", "https://www.purplemath.com", "plain-language math lessons")}
  ${L("Math Antics", "https://www.mathantics.com", "friendly math videos")}
  ${L("OpenStax", "https://openstax.org/subjects/math", "free online textbooks in math, science and history")}
  ${L("iCivics", "https://www.icivics.org", "free civics lessons and games")}</ul></div>
  <div class="card"><h3>Tools</h3><div class="row"><button class="btn sm alt" id="cl">On-screen calculator</button><button class="btn sm alt" id="fs">Math formula sheet</button></div>
  <p class="mute">The real test has a built-in calculator (a TI-30XS style). Practice with the same kind of calculator before test day.</p></div>
  <div class="card"><h3>Study tips</h3><ul class="l"><li>Short, regular sessions (20 to 30 minutes) beat one long cram.</li>
  <li>Take the skip-check first, then spend your time on the topics you miss. Don't re-study what you already know.</li>
  <li>After each practice test, work the "missed questions" review before taking the next test.</li>
  <li>Take one subject at a time. Once you pass a subject test, you're done with that one.</li>
  <li>If you have a documented learning or health condition, ask GED Testing Service about testing accommodations well before your test date.</li></ul></div>`;
  $("#cl").onclick = toggleCalc; $("#fs").onclick = showFormulas;
}
function viewFormulas() { $("#app").innerHTML = `<h1>Math formulas</h1><div class="card">${formulaHtml()}</div>`; }

// ---------- formula sheet and calculator ----------
function formulaHtml() {
  return `<h3>Formula reference</h3><ul class="l">
  <li><b>Rectangle:</b> area = length × width. Perimeter = 2 × length + 2 × width.</li>
  <li><b>Square:</b> area = side². Perimeter = 4 × side.</li>
  <li><b>Triangle:</b> area = ½ × base × height. Angles add to 180°.</li>
  <li><b>Trapezoid:</b> area = ½ × (base₁ + base₂) × height.</li>
  <li><b>Circle:</b> area = π × r². Circumference = 2 × π × r. (π ≈ 3.14)</li>
  <li><b>Rectangular prism (box):</b> volume = l × w × h. Surface area = 2lw + 2lh + 2wh.</li>
  <li><b>Cube:</b> volume = s³. Surface area = 6s².</li>
  <li><b>Cylinder:</b> volume = π × r² × h.</li>
  <li><b>Cone:</b> volume = ⅓ × π × r² × h. <b>Sphere:</b> volume = ⁴⁄₃ × π × r³.</li>
  <li><b>Pythagorean theorem:</b> a² + b² = c² (c is the hypotenuse).</li>
  <li><b>Slope:</b> m = (y₂ − y₁) ÷ (x₂ − x₁). <b>Slope-intercept form:</b> y = mx + b.</li>
  <li><b>Distance:</b> distance = rate × time.</li>
  <li><b>Simple interest:</b> I = p × r × t.</li>
  <li><b>Mean</b> = sum ÷ count. <b>Median</b> = middle value. <b>Mode</b> = most frequent. <b>Range</b> = largest − smallest.</li>
  <li><b>Probability</b> = favorable outcomes ÷ total outcomes.</li>
  <li><b>Percent change</b> = (new − old) ÷ old × 100.</li>
  <li><b>Quadratic formula:</b> x = (−b ± √(b² − 4ac)) ÷ (2a).</li>
  <li><b>Difference of squares:</b> a² − b² = (a − b)(a + b).</li></ul>
  <p class="mute">This is a study reference. The real test provides its own formula sheet.</p>`;
}
function showFormulas() {
  const m = document.createElement("div"); m.className = "modal"; m.innerHTML = `<div>${formulaHtml()}<div class="row"><button class="btn" id="x">Close</button></div></div>`;
  m.onclick = e => { if (e.target === m) m.remove(); }; document.body.appendChild(m); $("#x").onclick = () => m.remove();
}
function calcEval(src) {
  const t = src.replace(/×/g, "*").replace(/÷/g, "/").replace(/−/g, "-").replace(/π/g, "(" + Math.PI + ")"); let i = 0;
  const num = () => { const m = /^(\d+\.?\d*|\.\d+)/.exec(t.slice(i)); if (!m) throw 0; i += m[0].length; return parseFloat(m[0]); };
  const primary = () => { let v;
    if (t[i] === "(") { i++; v = expr(); if (t[i] === ")") i++; }
    else if (t[i] === "√") { i++; v = Math.sqrt(primary()); }
    else v = num();
    while (t[i] === "²") { i++; v *= v; } return v; };
  const pow = () => { const b = primary(); if (t[i] === "^") { i++; return Math.pow(b, unary()); } return b; };
  const unary = () => { if (t[i] === "-") { i++; return -unary(); } if (t[i] === "+") { i++; return unary(); } return pow(); };
  const term = () => { let v = unary(); while (t[i] === "*" || t[i] === "/") { const o = t[i++]; const r = unary(); v = o === "*" ? v * r : v / r; } return v; };
  const expr = () => { let v = term(); while (t[i] === "+" || t[i] === "-") { const o = t[i++]; const r = term(); v = o === "+" ? v + r : v - r; } return v; };
  try { const v = expr(); if (i < t.length || !isFinite(v)) return NaN; return v; } catch (e) { return NaN; }
}
function toggleCalc() {
  const ex = $(".calc"); if (ex) return ex.remove();
  const c = document.createElement("div"); c.className = "calc";
  c.innerHTML = `<div class="row sb" style="margin:0 0 6px"><b>Calculator</b><button class="btn sm alt" id="cx">Close</button></div><div class="ex" id="ce"></div><div class="scr" id="cs">0</div><div class="keys"></div>`;
  const keys = ["C", "⌫", "(", ")", "7", "8", "9", "÷", "4", "5", "6", "×", "1", "2", "3", "−", "0", ".", "√", "+", "π", "x²", "^", "="];
  let cur = ""; const scr = () => { $("#cs").textContent = cur || "0"; };
  keys.forEach(k => { const b = document.createElement("button"); b.textContent = k; if ("÷×−+^".includes(k)) b.className = "op"; if (k === "=") b.className = "eq";
    b.onclick = () => {
      if (k === "C") { cur = ""; $("#ce").textContent = ""; }
      else if (k === "⌫") cur = cur.slice(0, -1);
      else if (k === "=") { const v = calcEval(cur); $("#ce").textContent = cur + " ="; cur = isNaN(v) ? "" : String(Math.round(v * 1e10) / 1e10); if (isNaN(v)) { $("#cs").textContent = "Error"; return; } }
      else if (k === "x²") cur += "²"; else if (k === "√") cur += "√("; else cur += k;
      scr(); };
    c.querySelector(".keys").appendChild(b); });
  document.body.appendChild(c); $("#cx").onclick = () => c.remove();
}

fetch("/api/ged/me", { cache: "no-store" }).then(r => r.json()).catch(() => ({})).then(j => { if (j.user) adopt(j.user); route(); });
