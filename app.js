// Reaction Lab: colour and shape go/no-go reaction tests with CSV export.

const TRIALS = 10;           // goal appearances per test
const DISTRACTOR_MS = 800;   // how long a non-goal stays on screen
const GOAL_TIMEOUT_MS = 1500; // goal disappears (miss) after this
const FEEDBACK_MS = 700;
const BLANK_MIN_MS = 600;
const BLANK_MAX_MS = 1800;

const COLOURS = {
  Red: '#e5484d',
  Orange: '#f76b15',
  Yellow: '#f5d90a',
  Green: '#30a46c',
  Blue: '#0090ff',
  Purple: '#8e4ec6',
  Pink: '#e93d82',
  Cyan: '#00b8d9',
};

// Every shape uses the same blue shading so only the shape differs.
const SHAPES = {
  Cube: '<polygon points="100,30 165,65 100,100 35,65" fill="#a9c1ff"/><polygon points="35,65 100,100 100,175 35,140" fill="#5b7fe0"/><polygon points="100,100 165,65 165,140 100,175" fill="#34529f"/>',
  Sphere: '<circle cx="100" cy="100" r="70" fill="url(#g-sphere)"/>',
  Pyramid: '<polygon points="100,25 40,150 100,175" fill="#7d9cf0"/><polygon points="100,25 100,175 160,150" fill="#34529f"/>',
  Cylinder: '<ellipse cx="100" cy="150" rx="60" ry="18" fill="url(#g-side)"/><rect x="40" y="50" width="120" height="100" fill="url(#g-side)"/><ellipse cx="100" cy="50" rx="60" ry="18" fill="#a9c1ff"/>',
  Cone: '<path d="M40 150 L100 25 L160 150 A60 18 0 0 1 40 150 Z" fill="url(#g-side)"/>',
};
const shapeSvg = (name, cls) => `<svg viewBox="0 0 200 200" class="${cls}" role="img" aria-label="${name}">${SHAPES[name]}</svg>`;

const TESTS = {
  colour: {
    label: 'Colour test',
    items: Object.keys(COLOURS),
    goalHTML: n => `<span class="swatch" style="background:${COLOURS[n]}"></span>${n}`,
    show: n => { stage.style.background = COLOURS[n]; stim.innerHTML = ''; },
  },
  shape: {
    label: 'Shape test',
    items: Object.keys(SHAPES),
    goalHTML: n => `${shapeSvg(n, 'mini')}${n}`,
    show: n => { stage.style.background = ''; stim.innerHTML = shapeSvg(n, 'big'); },
  },
};

const $ = id => document.getElementById(id);
const stage = $('stage'), stim = $('stim'), msg = $('msg');
const rand = (a, b) => a + Math.random() * (b - a);
const pick = arr => arr[Math.floor(Math.random() * arr.length)];

let run = null;
const lastResults = {};

function showScreen(id) {
  for (const s of ['home', 'test', 'results']) $(s).hidden = s !== id;
}

// Each goal is preceded by 0–2 distractors; no item repeats back to back.
function buildSequence(items, goal) {
  const seq = [];
  let prev = null;
  for (let i = 0; i < TRIALS; i++) {
    const n = Math.floor(Math.random() * 3);
    for (let k = 0; k < n; k++) {
      prev = pick(items.filter(x => x !== goal && x !== prev));
      seq.push(prev);
    }
    seq.push(goal);
    prev = goal;
  }
  return seq;
}

function startTest(key) {
  const t = TESTS[key];
  const goal = pick(t.items);
  run = {
    key, t, goal,
    name: $('name').value.trim() || 'anonymous',
    seq: buildSequence(t.items, goal),
    idx: 0, attempt: 0, log: [],
    state: 'ready', timer: null, shownAt: 0, current: null,
  };
  $('goal').innerHTML = t.goalHTML(goal);
  updateProgress();
  setBlank(`Click only when you see <b>${goal}</b>.<br>Tap here or press space to start.`);
  showScreen('test');
}

function setBlank(html = '') {
  stage.style.background = '';
  stim.innerHTML = '';
  msg.className = '';
  msg.innerHTML = html;
}

function updateProgress() {
  $('progress').textContent = `${run.attempt} / ${TRIALS}`;
}

function record(result, shown, ms) {
  run.log.push({
    row: run.log.length + 1,
    attempt: run.attempt + 1,
    shown, result, ms,
    time: new Date().toISOString(),
  });
}

function feedback(text, kind) {
  setBlank();
  msg.textContent = text;
  msg.className = kind;
  run.state = 'feedback';
  run.timer = setTimeout(next, FEEDBACK_MS);
}

function next() {
  if (run.idx >= run.seq.length) return finish();
  run.state = 'wait';
  setBlank('<span class="wait">wait…</span>');
  run.timer = setTimeout(showStim, rand(BLANK_MIN_MS, BLANK_MAX_MS));
}

function showStim() {
  const item = run.seq[run.idx];
  const isGoal = item === run.goal;
  run.t.show(item);
  msg.innerHTML = '';
  run.state = 'stim';
  run.current = item;
  run.shownAt = performance.now();
  run.timer = setTimeout(() => {
    run.idx++;
    if (!isGoal) return next();
    record('miss', item, '');
    run.attempt++;
    updateProgress();
    feedback('Missed!', 'bad');
  }, isGoal ? GOAL_TIMEOUT_MS : DISTRACTOR_MS);
}

function press(e) {
  if (!run) return;
  // Event timestamps share performance.now()'s clock and skip handler lag.
  const at = e.timeStamp || performance.now();
  if (run.state === 'ready') return next();
  if (run.state === 'wait' || (run.state === 'stim' && at < run.shownAt)) {
    clearTimeout(run.timer);
    record('early', '', '');
    return feedback('Too soon!', 'bad');
  }
  if (run.state !== 'stim') return;

  clearTimeout(run.timer);
  const ms = Math.round(at - run.shownAt);
  const item = run.current;
  run.idx++;
  if (item === run.goal) {
    record('hit', item, ms);
    run.attempt++;
    updateProgress();
    feedback(`${ms} ms`, 'good');
  } else {
    record('wrong', item, ms);
    feedback(`Wrong — that was ${item}`, 'bad');
  }
}

function finish() {
  run.state = 'done';
  const r = { key: run.key, label: run.t.label, goal: run.goal, name: run.name, log: run.log, date: new Date() };
  lastResults[r.key] = r;
  renderResults(r);
  renderDownloads();
  showScreen('results');
}

function stats(log) {
  const times = log.filter(l => l.result === 'hit').map(l => l.ms).sort((a, b) => a - b);
  const count = res => log.filter(l => l.result === res).length;
  const avg = times.length ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : null;
  const mid = times.length >> 1;
  const median = !times.length ? null : times.length % 2 ? times[mid] : Math.round((times[mid - 1] + times[mid]) / 2);
  return {
    avg, median, best: times[0] ?? null,
    hits: times.length, misses: count('miss'), wrong: count('wrong'), early: count('early'),
  };
}

const RESULT_LABEL = { hit: 'Hit', miss: 'Missed', wrong: 'Wrong click', early: 'Too early' };

function renderResults(r) {
  const s = stats(r.log);
  const fmt = v => (v == null ? '—' : `${v} ms`);
  $('results-title').textContent = `${r.label} — goal: ${r.goal}`;
  $('stats').innerHTML = [
    ['Average', fmt(s.avg)],
    ['Median', fmt(s.median)],
    ['Best', fmt(s.best)],
    ['Hits', `${s.hits} / ${TRIALS}`],
    ['Wrong clicks', s.wrong],
    ['Too early', s.early],
  ].map(([k, v]) => `<div class="stat"><span>${k}</span><b>${v}</b></div>`).join('');
  $('log').innerHTML = r.log.map(l =>
    `<tr><td>${l.row}</td><td>${l.attempt}</td><td>${l.shown || '—'}</td>` +
    `<td class="${l.result}">${RESULT_LABEL[l.result]}</td><td>${l.ms === '' ? '—' : l.ms}</td></tr>`
  ).join('');
  $('csv').onclick = () => downloadCSV(r);
}

function renderDownloads() {
  $('downloads').innerHTML = '';
  for (const r of Object.values(lastResults)) {
    const b = document.createElement('button');
    b.textContent = `⬇ ${r.label} CSV (${r.name})`;
    b.onclick = () => downloadCSV(r);
    $('downloads').append(b);
  }
}

const csvCell = v => {
  const s = String(v ?? '');
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

function downloadCSV(r) {
  const head = ['participant', 'test', 'goal', 'row', 'attempt', 'shown', 'result', 'reaction_ms', 'timestamp'];
  const rows = r.log.map(l => [r.name, r.key, r.goal, l.row, l.attempt, l.shown, l.result, l.ms, l.time]);
  const csv = [head, ...rows].map(row => row.map(csvCell).join(',')).join('\r\n');
  const slug = r.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'anonymous';
  const stamp = r.date.toISOString().slice(0, 16).replace(/[:T]/g, '-');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  a.download = `reaction-${r.key}-${slug}-${stamp}.csv`;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

// Wiring
document.querySelectorAll('[data-test]').forEach(b => b.addEventListener('click', () => startTest(b.dataset.test)));
$('shape-icon').innerHTML = shapeSvg('Cube', '') + shapeSvg('Sphere', '');

stage.addEventListener('pointerdown', e => {
  if (e.button !== 0) return;
  e.preventDefault();
  press(e);
});
document.addEventListener('keydown', e => {
  if (e.code !== 'Space' || $('test').hidden || e.repeat) return;
  e.preventDefault();
  press(e);
});

$('quit').onclick = () => { if (run) clearTimeout(run.timer); run = null; showScreen('home'); };
$('again').onclick = () => startTest(run.key);
$('home-btn').onclick = () => showScreen('home');

try { $('name').value = localStorage.getItem('reaction-name') || ''; } catch {}
$('name').addEventListener('input', e => { try { localStorage.setItem('reaction-name', e.target.value); } catch {} });
