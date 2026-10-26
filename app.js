// Reaction Lab: shape and shape+colour go/no-go reaction tests with CSV export.

const TRIALS = 10;           // goal appearances per test
const DISTRACTOR_MS = 800;   // how long a non-goal stays on screen
const GOAL_TIMEOUT_MS = 1500; // goal disappears (miss) after this
const FEEDBACK_MS = 700;
const BLANK_MIN_MS = 600;
const BLANK_MAX_MS = 1800;

const COLOURS = {
  Red: '#e5484d',
  Yellow: '#f5d90a',
  Green: '#30a46c',
  Blue: '#4a72e0',
  Purple: '#8e4ec6',
};
const COLOUR_NAMES = Object.keys(COLOURS);

// Shapes are drawn in a flat colour with white/black overlays for shading,
// so any colour gets the same 3D look.
const poly = (pts, c, shade = 0) =>
  `<polygon points="${pts}" fill="${c}"/>` +
  (shade ? `<polygon points="${pts}" fill="${shade > 0 ? '#fff' : '#000'}" fill-opacity="${Math.abs(shade)}"/>` : '');
const shaded = (el, c, grad) => `<${el} fill="${c}"/><${el} fill="url(#${grad})"/>`;

const SHAPES = {
  Cube: c => poly('100,30 165,65 100,100 35,65', c, 0.35) + poly('35,65 100,100 100,175 35,140', c) + poly('100,100 165,65 165,140 100,175', c, -0.3),
  Sphere: c => shaded('circle cx="100" cy="100" r="70"', c, 'g-sphere'),
  Pyramid: c => poly('100,25 40,150 100,175', c, 0.15) + poly('100,25 100,175 160,150', c, -0.3),
  Cylinder: c =>
    shaded('ellipse cx="100" cy="150" rx="60" ry="18"', c, 'g-side') +
    shaded('rect x="40" y="50" width="120" height="100"', c, 'g-side') +
    `<ellipse cx="100" cy="50" rx="60" ry="18" fill="${c}"/><ellipse cx="100" cy="50" rx="60" ry="18" fill="#fff" fill-opacity=".35"/>`,
  Cone: c => shaded('path d="M40 150 L100 25 L160 150 A60 18 0 0 1 40 150 Z"', c, 'g-side'),
};
const SHAPE_NAMES = Object.keys(SHAPES);

const shapeSvg = (item, cls) =>
  `<svg viewBox="0 0 200 200" class="${cls}" role="img" aria-label="${labelOf(item)}">${SHAPES[item.shape](COLOURS[item.colour])}</svg>`;
const labelOf = item => (item.showColour ? `${item.colour} ${item.shape}` : item.shape);
const others = (list, x) => list.filter(v => v !== x);

const TESTS = {
  // Test 1: every shape is the same blue, so only the shape matters.
  shape: {
    label: 'Shape test',
    makeGoal: () => ({ shape: pick(SHAPE_NAMES), colour: 'Blue' }),
    makeDistractor: goal => ({ shape: pick(others(SHAPE_NAMES, goal.shape)), colour: 'Blue' }),
  },
  // Test 2: must match shape AND colour. Most distractors get one of the two right.
  combo: {
    label: 'Shape + colour test',
    makeGoal: () => ({ shape: pick(SHAPE_NAMES), colour: pick(COLOUR_NAMES), showColour: true }),
    makeDistractor: goal => {
      const r = Math.random();
      const shape = r < 0.4 ? goal.shape : pick(others(SHAPE_NAMES, goal.shape));
      const colour = r >= 0.4 && r < 0.8 ? goal.colour : pick(others(COLOUR_NAMES, goal.colour));
      return { shape, colour, showColour: true };
    },
  },
};

// What a stimulus is relative to the goal, for the CSV.
function stimulusType(item, goal) {
  const shapeOk = item.shape === goal.shape;
  const colourOk = item.colour === goal.colour;
  if (shapeOk && colourOk) return 'goal';
  if (shapeOk) return 'wrong colour';
  if (colourOk) return 'wrong shape';
  return 'wrong shape and colour';
}

const $ = id => document.getElementById(id);
const stage = $('stage'), stim = $('stim'), msg = $('msg');
const rand = (a, b) => a + Math.random() * (b - a);
const pick = arr => arr[Math.floor(Math.random() * arr.length)];

let run = null;
const lastResults = {};

function showScreen(id) {
  for (const s of ['home', 'test', 'results']) $(s).hidden = s !== id;
}

// Each goal is preceded by 0–2 distractors; no stimulus repeats back to back.
function buildSequence(t, goal) {
  const seq = [];
  let prev = null;
  for (let i = 0; i < TRIALS; i++) {
    const n = Math.floor(Math.random() * 3);
    for (let k = 0; k < n; k++) {
      let d;
      do d = t.makeDistractor(goal); while (prev && labelOf(d) === labelOf(prev));
      seq.push(d);
      prev = d;
    }
    seq.push(goal);
    prev = goal;
  }
  return seq;
}

function startTest(key) {
  const t = TESTS[key];
  const goal = t.makeGoal();
  run = {
    key, t, goal,
    name: $('name').value.trim() || 'anonymous',
    seq: buildSequence(t, goal),
    idx: 0, attempt: 0, log: [],
    state: 'ready', timer: null, shownAt: 0, current: null,
  };
  $('goal').innerHTML = `${shapeSvg(goal, 'mini')}${labelOf(goal)}`;
  updateProgress();
  setBlank(`Click only when you see a <b>${labelOf(goal)}</b>.<br>Tap here or press space to start.`);
  showScreen('test');
}

function setBlank(html = '') {
  stim.innerHTML = '';
  msg.className = '';
  msg.innerHTML = html;
}

function updateProgress() {
  $('progress').textContent = `${run.attempt} / ${TRIALS}`;
}

function record(result, item, ms) {
  run.log.push({
    row: run.log.length + 1,
    attempt: run.attempt + 1,
    shown: item ? labelOf(item) : '',
    type: item ? stimulusType(item, run.goal) : '',
    result, ms,
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
  stim.innerHTML = shapeSvg(item, 'big');
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
    record('early', null, '');
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
    feedback(`Wrong — that was a ${labelOf(item)}`, 'bad');
  }
}

function finish() {
  run.state = 'done';
  const r = { key: run.key, label: run.t.label, goal: labelOf(run.goal), name: run.name, log: run.log, date: new Date() };
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
  const head = ['participant', 'test', 'goal', 'row', 'attempt', 'shown', 'stimulus_type', 'result', 'reaction_ms', 'timestamp'];
  const rows = r.log.map(l => [r.name, r.key, r.goal, l.row, l.attempt, l.shown, l.type, l.result, l.ms, l.time]);
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
$('shape-icon').innerHTML = shapeSvg({ shape: 'Cube', colour: 'Blue' }, '') + shapeSvg({ shape: 'Sphere', colour: 'Blue' }, '');
$('combo-icon').innerHTML = shapeSvg({ shape: 'Cube', colour: 'Red' }, '') + shapeSvg({ shape: 'Cone', colour: 'Yellow' }, '');

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
