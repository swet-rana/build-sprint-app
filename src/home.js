import './home.css';

const COMPLETED_KEY = 'healthstats-home-explainer-v1';
import { homePhaseAt, HOME_DURATION as totalDuration, HOME_PHASES } from './home-timeline.js';
export function homeIcon(name) {
  const paths = {
    home: '<path d="m3 10 9-7 9 7v10H3zM9 20v-7h6v7"/>',
    reports: '<path d="M5 3h9l5 5v13H5zM14 3v6h5M8 13h8M8 17h6"/>',
    summary: '<path d="M5 3h14v18H5zM8 8h8M8 12h5M8 16h8"/>',
    profile: '<circle cx="12" cy="7" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>',
    upload: '<path d="M12 16V3m-5 5 5-5 5 5M4 15v6h16v-6"/>',
    select: '<rect x="4" y="4" width="16" height="16" rx="3"/><path d="m8 12 3 3 5-6"/>',
    ready: '<path d="m5 12 4 4L19 6"/>',
  };
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.reports}</svg>`;
}
const reportRows = '<div><span>Hemoglobin</span><span>13.2 g/dL</span></div><div><span>WBC</span><span>7,800 /µL</span></div><div><span>Platelets</span><span>2.6 L/µL</span></div>';
function reportsVisual() {
  return `<div class="home-documents" aria-label="Illustrative medical reports">
    <div class="home-paper home-paper-pdf"><span class="home-file-tag">PDF</span><strong>Medical report</strong><div class="home-paper-lines"><i></i><i></i><i></i></div></div>
    <div class="home-paper home-paper-scan"><span class="home-file-tag home-scan-tag">Scan</span><strong>Report copy</strong><div class="home-paper-lines"><i></i><i></i><i></i></div></div>
    <div class="home-paper home-paper-lab"><strong>Lab report</strong><div class="home-report-columns"><span>Marker</span><span>Value</span></div><div class="home-marker-rows">${reportRows}</div><small>Illustrative values</small></div>
  </div>`;
}
const demoBloodReports = [
    { number: 2, date: '12 Mar 2025', title: 'Complete blood count', rows: [['Hemoglobin', '13.2 g/dL'], ['WBC', '7,800 /µL'], ['Platelets', '2.6 L/µL']] },
    { number: 3, date: '18 Sep 2025', title: 'Complete blood count', rows: [['Hemoglobin', '12.8 g/dL'], ['WBC', '7,600 /µL'], ['Platelets', '2.4 L/µL']] },
    { number: 5, date: '06 Jan 2026', title: 'Complete blood count', rows: [['Hemoglobin', '13.0 g/dL'], ['WBC', '7,700 /µL'], ['Platelets', '2.5 L/µL']] },
];
function bloodReportsVisual() {
  const reports = demoBloodReports;
  return `<div class="home-blood-reports" aria-label="Three illustrative blood test reports">${reports.map(report => `<article class="home-blood-report"><header><span class="home-blood-file">${homeIcon('reports')}<span>Test Report ${report.number}</span></span><strong>${report.title}</strong></header><div class="home-blood-date">${report.date}</div><div class="home-blood-results">${report.rows.map(([marker, value]) => `<div><span>${marker}</span><span>${value}</span></div>`).join('')}</div></article>`).join('')}</div>`;
}
function summaryPreview(completed = false) {
  const trends = demoBloodReports[0].rows.map(([marker, firstValue], index) => {
    const values = demoBloodReports.map(report => report.rows[index][1]);
    const numbers = values.map(value => Number(value.split(' ')[0].replaceAll(',', '')));
    const min = Math.min(...numbers), max = Math.max(...numbers);
    const points = numbers.map((value, point) => ({ x: 30 + point * 120, y: max === min ? 35 : 52 - (value - min) / (max - min) * 28 }));
    const unit = firstValue.split(' ').slice(1).join(' ');
    return `<div class="home-trend"><div class="home-trend-title"><strong>${marker}</strong><span>${unit}</span></div><svg viewBox="0 0 300 70" role="img" aria-label="${marker}: ${values.map((value, point) => `${value} on ${demoBloodReports[point].date}`).join('; ')}"><path class="home-trend-guide" d="M30 58H270"/><path class="home-trend-line" style="--trend-delay:${index * 0.22}s" d="${points.map((point, number) => `${number ? 'L' : 'M'}${point.x} ${point.y}`).join(' ')}" pathLength="1"/>${points.map((point, number) => `<circle cx="${point.x}" cy="${point.y}" r="3.5"/><text x="${point.x}" y="${point.y - 9}" text-anchor="middle">${values[number].split(' ')[0]}</text>`).join('')}</svg></div>`;
  }).join('');
  return `<div class="home-summary-preview${completed ? ' home-completed-report' : ''}">
    <div class="home-preview-title"><strong>Health Summary</strong><span>Example</span></div>
    <p class="home-preview-context">Three reports. Trends over time.</p>
    ${trends}
    <div class="home-trend-dates">${demoBloodReports.map(report => `<span>${report.date}</span>`).join('')}</div>
    <p class="home-preview-source">Illustrative values · each marker uses its own scale</p>
    ${completed ? `<span class="home-completion-check">${homeIcon('ready')}</span>` : ''}
  </div>`;
}
function premiumDecorations() {
  const symbols = {
    analytics: '<path d="M4 20h16M6 17v-5h3v5m3 0V8h3v9m3 0V4h3v13"/>',
    heart: '<path d="M12 21 3 12C-2 4 8 0 12 7c4-7 14-3 9 5z"/>',
    dna: '<path d="M6 3c0 8 12 10 12 18M18 3c0 8-12 10-12 18M7 5h10M8 9h8M8 15h8M7 19h10"/>',
    longevity: '<path d="M12 21V11m0 6C3 17 2 11 3 7c5-1 9 3 9 7m0 0c0-8 4-11 9-11 1 7-3 12-9 12M7 11l5 6m5-9-5 6"/>',
  };
  return `<div class="home-premium-reports" aria-hidden="true">
    <article class="home-floating-card home-floating-imaging"><header>${homeIcon('reports')}<strong>Imaging Report</strong></header><div class="home-imaging-thumb"><img src="/images/bone-minerals.png" alt="" width="70" height="90"></div><div class="home-paper-lines"><i></i><i></i></div></article>
    <article class="home-floating-card home-floating-prescription"><header><span class="home-rx">Rx</span><strong>Prescription</strong></header><div class="home-paper-lines"><i></i><i></i><i></i></div></article>
    <article class="home-floating-card home-floating-lab"><header>${homeIcon('reports')}<strong>Lab Report</strong></header><div class="home-paper-lines"><i></i><i></i></div><svg class="home-decor-trend" viewBox="0 0 180 55" fill="none"><path d="M5 44 34 29 61 34 90 20 116 26 148 13 175 5" stroke="currentColor" stroke-width="2"/>${[[5,44],[34,29],[90,20],[148,13],[175,5]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="3" fill="currentColor"/>`).join('')}</svg><div class="home-decor-results">${[['HbA1c','5.6'],['Vitamin D','28'],['Cholesterol','180']].map(([n,v])=>`<div><span>${n}</span><span>${v}</span><i></i></div>`).join('')}</div><small>Illustrative values</small></article>
  </div><div class="home-premium-ribbons" aria-hidden="true"><img class="home-ribbon-art" src="/images/home-glass-ribbons.png" alt="" width="1024" height="1536"><div class="home-health-symbols">${Object.values(symbols).map(path=>`<span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${path}</svg></span>`).join('')}</div></div>`;
}
export function mountHome(root, onUploadReports = null, onSelectReports = null, onPrepareSummary = null) {
  const steps = [
    { icon: 'upload', label: 'Upload<br>your reports', phase: 'upload' },
    { icon: 'select', label: 'Click reports<br>for analysis', phase: 'select' },
    { icon: 'summary', label: 'Prepare<br>summary', phase: 'prepare' },
    { icon: 'ready', label: "You're<br>ready!", phase: 'ready' },
  ];
  const introCopy = '<h1>Prepare for conversations<br>with your doctor</h1><p>Turn your medical reports into a clear,<br>one-page summary.</p>';
  root.innerHTML = `<section class="healthstats-home" aria-label="HealthStats Home">
    <div class="home-stage" data-home-stage="intro" hidden><div class="home-stage-copy">${introCopy}</div>${reportsVisual()}</div>
    <div class="home-stage" data-home-stage="upload" hidden><div class="home-stage-copy"><h1>Upload your reports</h1><p>Add lab reports, scans, prescriptions<br>and more.</p></div><div class="home-upload-demo">${reportsVisual()}<div class="home-upload-well">${homeIcon('upload')}<strong>Upload Reports</strong><span>PDF, JPG, PNG</span></div><span class="home-demo-caption">In My Reports · illustrative reports</span></div></div>
    <div class="home-stage" data-home-stage="select" hidden><div class="home-stage-copy"><h1>Click reports<br>for analysis</h1><p>Choose the reports you want to include.</p></div><div class="home-selection-demo"><div class="home-selection-heading"><h2>My Reports</h2><span>For Summary</span></div><div class="home-demo-report-list">${Array.from({ length: 6 }, (_, index) => `<label data-demo-report="${index + 1}"><span class="home-report-mini-icon">${homeIcon('reports')}</span><span>Test Report ${index + 1}</span><input type="checkbox" disabled aria-label="Test Report ${index + 1}"></label>`).join('')}</div><span class="home-demo-caption">Illustrative reports · 2, 3 and 5 selected</span></div></div>
    <div class="home-stage" data-home-stage="prepare" hidden><div class="home-stage-copy"><h1>Prepare summary</h1><p>Bring your selected reports<br>into one clear view.</p></div><div class="home-prepare-demo">${bloodReportsVisual()}<div class="home-demo-button-wrap"><button type="button" class="primary home-prepare-button" disabled>Prepare Summary</button><svg class="home-demo-pointer" viewBox="0 0 24 30" aria-hidden="true"><path d="M3 2v22l6-6 5 10 5-3-5-9h8z"/></svg></div><span class="home-demo-caption">In Summary · illustrative values</span></div></div>
    <div class="home-stage" data-home-stage="ready" hidden><div class="home-stage-copy"><h1>You are ready now!</h1><p>A clear, organised summary<br>for your next doctor conversation.</p></div><div>${summaryPreview(true)}<span class="home-demo-caption">An example of your completed summary</span></div></div>
    <div class="home-resting" data-home-stage="settled">${premiumDecorations()}<div class="home-resting-copy">${introCopy}</div><ol class="home-journey" aria-label="Your report-to-summary journey">${steps.map((step, index) => `<li><button type="button" data-home-replay="${step.phase}" aria-label="Step ${index + 1}: ${step.label.replace(/<br>/g, ' ')}"><span class="home-step-icon">${homeIcon(step.icon)}</span><span class="home-step-number">${index + 1}</span><span class="home-step-label">${step.label}</span></button></li>`).join('')}</ol><button type="button" class="home-tutorial" id="home-tutorial">Show video tutorial</button><button type="button" class="primary home-begin" id="home-begin">Begin now <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M4 12h16m-6-6 6 6-6 6"/></svg></button></div>
  </section>`;
  const stages = [...root.querySelectorAll('[data-home-stage]')];
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let completed = reducedMotion.matches;
  try { completed ||= localStorage.getItem(COMPLETED_KEY) === 'complete'; } catch { /* Home still works without browser storage. */ }
  let elapsed = completed ? totalDuration : 0, frame = 0, lastTime = null, active = false, currentPhase = null, replayEnd = null, replayPhase = null, replayButton = null, tutorialReplay = false;
  function showPhase(id) {
    if (id === currentPhase) return;
    currentPhase = id;
    root.dataset.homePhase = id;
    stages.forEach(stage => {
      const visible = stage.dataset.homeStage === id;
      stage.hidden = !visible;
      stage.inert = !visible;
    });
  }
  function finish() {
    completed = true;
    replayEnd = null;
    tutorialReplay = false;
    replayPhase = null;
    elapsed = totalDuration;
    showPhase('settled');
    root.dataset.homeComplete = 'true';
    try { localStorage.setItem(COMPLETED_KEY, 'complete'); } catch { /* Completion is retained in memory for this session. */ }
    cancelAnimationFrame(frame);
    frame = 0;
    lastTime = null;
    if (active && replayButton) replayButton.focus({ preventScroll: true });
    replayButton = null;
  }
  function tick(now) {
    frame = 0;
    if (!active || document.hidden || completed) { lastTime = null; return; }
    if (lastTime !== null) elapsed += now - lastTime;
    lastTime = now;
    if (elapsed >= (replayEnd ?? totalDuration)) { finish(); return; }
    const phase = replayPhase ? { id: replayPhase.id, elapsed: elapsed - replayPhase.start } : homePhaseAt(tutorialReplay ? elapsed * totalDuration / 10000 : elapsed);
    showPhase(phase.id);
    if (phase.id === 'select') {
      [2, 3, 5].forEach((number, index) => {
        const row = root.querySelector(`[data-demo-report="${number}"]`);
        const selected = phase.elapsed >= 150 + index * 280;
        row.querySelector('input').checked = selected;
        row.classList.toggle('is-selected', selected);
      });
    }
    frame = requestAnimationFrame(tick);
  }
  function schedule() {
    if (active && !document.hidden && !completed && !frame) frame = requestAnimationFrame(tick);
  }
  function setActive(value) {
    active = value;
    if (!active) {
      cancelAnimationFrame(frame);
      frame = 0;
      lastTime = null;
    } else schedule();
  }
  root.querySelectorAll('[data-home-replay]').forEach(button => button.addEventListener('click', () => {
    if (button.dataset.homeReplay === 'upload' && onUploadReports) {
      onUploadReports();
      return;
    }
    if (button.dataset.homeReplay === 'select' && onSelectReports) {
      onSelectReports();
      return;
    }
    if (button.dataset.homeReplay === 'prepare' && onPrepareSummary) {
      onPrepareSummary();
      return;
    }
    cancelAnimationFrame(frame);
    frame = 0;
    lastTime = null;
    completed = false;
    root.dataset.homeComplete = 'false';
    tutorialReplay = false;
    const phase = button.dataset.homeReplay;
    const phaseIndex = HOME_PHASES.findIndex(item => item.id === phase);
    elapsed = HOME_PHASES.slice(0, phaseIndex).reduce((sum, item) => sum + item.duration, 0);
    replayPhase = { id: phase, start: elapsed };
    replayEnd = elapsed + 3000;
    replayButton = button;
    root.querySelectorAll('[data-demo-report]').forEach(row => {
      row.querySelector('input').checked = false;
      row.classList.remove('is-selected');
    });
    showPhase(phase);
    // A chosen replay stays available with reduced motion, without animated transitions.
    schedule();
  }));
  root.querySelector('#home-tutorial').addEventListener('click', event => {
    cancelAnimationFrame(frame);
    frame = 0;
    lastTime = null;
    completed = false;
    elapsed = 0;
    tutorialReplay = true;
    replayPhase = null;
    replayEnd = 10000;
    replayButton = event.currentTarget;
    root.dataset.homeComplete = 'false';
    root.querySelectorAll('[data-demo-report]').forEach(row => {
      row.querySelector('input').checked = false;
      row.classList.remove('is-selected');
    });
    showPhase('intro');
    schedule();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { cancelAnimationFrame(frame); frame = 0; lastTime = null; }
    else schedule();
  });
  reducedMotion.addEventListener('change', event => { if (event.matches) finish(); });
  showPhase(completed ? 'settled' : 'intro');
  if (completed) finish();
  return { setActive };
}
