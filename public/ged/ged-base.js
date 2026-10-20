// GED Study Coach: shared helpers and registries. All questions are original.
// Q(q, choices, indexOfCorrect, explanation, stimulusHtml?)           topic-practice question
// X(topicId, q, choices, indexOfCorrect, explanation, stimulusHtml?)  full-practice-test question
const Q = (q, c, a, e, p) => ({ q, c, a, e, p });
const X = (t, q, c, a, e, p) => ({ t, q, c, a, e, p });

// Table stimulus: TBL(["Day","Sales"], [["Mon",12],["Tue",18]], "optional caption")
const TBL = (head, rows, cap) =>
  `<table class="stim">${cap ? `<caption>${cap}</caption>` : ""}<tr>${head.map(h => `<th>${h}</th>`).join("")}</tr>` +
  rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join("")}</tr>`).join("") + `</table>`;

// Bar chart stimulus (inline SVG): BAR("Title", ["A","B"], [3,5], "unit label")
const BAR = (title, labels, vals, unit) => {
  const W = 360, H = 200, L = 40, B = 36, T = 28, max = Math.max(...vals), top = Math.ceil(max / 5) * 5 || 5, bw = (W - L - 10) / vals.length;
  let s = `<svg viewBox="0 0 ${W} ${H}" class="chart" role="img" aria-label="${title}"><text x="${W / 2}" y="16" text-anchor="middle" class="ct">${title}</text>`;
  for (let i = 0; i <= 4; i++) { const y = T + (H - T - B) * (1 - i / 4), v = Math.round(top * i / 4 * 10) / 10;
    s += `<line x1="${L}" x2="${W - 8}" y1="${y}" y2="${y}" class="gl"/><text x="${L - 5}" y="${y + 4}" text-anchor="end" class="ax">${v}</text>`; }
  vals.forEach((v, i) => { const h = (H - T - B) * v / top, x = L + i * bw + bw * 0.18;
    s += `<rect x="${x}" y="${H - B - h}" width="${bw * 0.64}" height="${h}" class="bar"/><text x="${x + bw * 0.32}" y="${H - B + 14}" text-anchor="middle" class="ax">${labels[i]}</text>`; });
  if (unit) s += `<text x="${W / 2}" y="${H - 4}" text-anchor="middle" class="ax">${unit}</text>`;
  return s + `</svg>`;
};

// Line chart stimulus: LINE("Title", [[x,y],...], "x label", "y label")
const LINE = (title, pts, xl, yl) => {
  const W = 360, H = 210, L = 44, B = 40, T = 28, R = 12;
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]), x0 = Math.min(...xs), x1 = Math.max(...xs), y1 = Math.ceil(Math.max(...ys) / 5) * 5 || 5, y0 = 0;
  const px = x => L + (x - x0) / ((x1 - x0) || 1) * (W - L - R), py = y => H - B - (y - y0) / (y1 - y0) * (H - T - B);
  let s = `<svg viewBox="0 0 ${W} ${H}" class="chart" role="img" aria-label="${title}"><text x="${W / 2}" y="16" text-anchor="middle" class="ct">${title}</text>`;
  for (let i = 0; i <= 4; i++) { const v = y0 + (y1 - y0) * i / 4, y = py(v); s += `<line x1="${L}" x2="${W - R}" y1="${y}" y2="${y}" class="gl"/><text x="${L - 5}" y="${y + 4}" text-anchor="end" class="ax">${Math.round(v * 10) / 10}</text>`; }
  s += `<polyline fill="none" class="ln" points="${pts.map(p => px(p[0]) + "," + py(p[1])).join(" ")}"/>`;
  pts.forEach(p => { s += `<circle cx="${px(p[0])}" cy="${py(p[1])}" r="3.5" class="dot"/><text x="${px(p[0])}" y="${H - B + 14}" text-anchor="middle" class="ax">${p[0]}</text>`; });
  if (xl) s += `<text x="${(L + W - R) / 2}" y="${H - 4}" text-anchor="middle" class="ax">${xl}</text>`;
  if (yl) s += `<text x="10" y="${H / 2}" text-anchor="middle" class="ax" transform="rotate(-90 10 ${H / 2})">${yl}</text>`;
  return s + `</svg>`;
};

const SUBJECTS = [
  { id: "math", name: "Math", full: "Mathematical Reasoning", icon: "➗", questions: 46, minutes: 115,
    about: "46 questions, 115 minutes. About 45% quantitative problem solving and 55% algebraic. An on-screen calculator is allowed on most questions, and a formula sheet is provided.",
    mix: "Roughly 45% number and quantity (fractions, percents, ratios, geometry, data) and 55% algebra (equations, functions, graphs, polynomials)." },
  { id: "rla", name: "Language Arts", full: "Reasoning Through Language Arts", icon: "📖", questions: 40, minutes: 80,
    about: "About 150 minutes including a 45-minute essay (extended response) and a short break. Reading passages (informational and literary) plus grammar and editing questions.",
    mix: "About 75% reading comprehension and 25% grammar, usage and editing, plus one argument essay." },
  { id: "sci", name: "Science", full: "Science", icon: "🔬", questions: 34, minutes: 90,
    about: "About 34 questions, 90 minutes. Roughly 40% life science, 40% physical science (including chemistry), 20% earth and space. Mostly reading passages, tables and graphs.",
    mix: "You are tested on reasoning with data and short passages, not on memorizing long lists of facts." },
  { id: "soc", name: "Social Studies", full: "Social Studies", icon: "🏛️", questions: 35, minutes: 70,
    about: "About 35 questions, 70 minutes. Roughly 50% civics and government, 20% U.S. history, 15% economics, 15% geography and the world.",
    mix: "Mostly reading documents, maps, charts and political cartoons and drawing conclusions." },
];

const TOPICS = [];
const TESTS = { math: [], rla: [], sci: [], soc: [] };

// Wrong-answer explanations. why-*.js files push W(questionText, correctChoiceText, { "wrong choice text": "why it's wrong" }).
// Keyed by choice TEXT, so it survives shuffling. attachWhy() (called by app.js) sets q.w = that map on the matching questions.
const WHY = [];
const W = (q, right, wrong) => WHY.push([q, right, wrong]);
function attachWhy() {
  const idx = new Map(WHY.map(([q, r, w]) => [q + "|" + r, w]));
  const tag = q => { const w = idx.get(q.q + "|" + q.c[q.a]); if (w) q.w = w; };
  TOPICS.forEach(t => (t.qs || []).forEach(tag));
  Object.values(TESTS).forEach(a => a.forEach(T => T.qs.forEach(tag)));
}
const ESSAYS = [];
