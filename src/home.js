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
function bloodReportsVisual() {
  const reports = [
    { number: 2, date: '12 Mar 2025', title: 'Complete blood count', rows: [['Hemoglobin', '13.2 g/dL'], ['WBC', '7,800 /µL'], ['Platelets', '2.6 L/µL']] },
    { number: 3, date: '18 Sep 2025', title: 'Complete blood count', rows: [['Hemoglobin', '12.8 g/dL'], ['WBC', '7,600 /µL'], ['Platelets', '2.4 L/µL']] },
    { number: 5, date: '06 Jan 2026', title: 'Complete blood count', rows: [['Hemoglobin', '13.0 g/dL'], ['WBC', '7,700 /µL'], ['Platelets', '2.5 L/µL']] },
  ];
  return `<div class="home-blood-reports" aria-label="Three illustrative blood test reports">${reports.map(report => `<article class="home-blood-report"><header><span class="home-blood-file">${homeIcon('reports')}<span>Test Report ${report.number}</span></span><strong>${report.title}</strong></header><div class="home-blood-date">${report.date}</div><div class="home-blood-results">${report.rows.map(([marker, value]) => `<div><span>${marker}</span><span>${value}</span></div>`).join('')}</div></article>`).join('')}</div>`;
}
function summaryPreview(completed = false) {
  return `<div class="home-summary-preview${completed ? ' home-completed-report' : ''}">
    <div class="home-preview-title"><strong>Health Summary</strong><span>Example</span></div>
    <p class="home-preview-context">Two dates. Original values together.</p>
    <div class="home-preview-marker"><span>Hemoglobin</span><strong>12.8 → 13.2 <small>g/dL</small></strong></div>
    <div class="home-preview-marker"><span>WBC</span><strong>7,600 → 7,800 <small>/µL</small></strong></div>
    <div class="home-preview-marker"><span>Platelets</span><strong>2.4 → 2.6 <small>L/µL</small></strong></div>
    <p class="home-preview-source">Recorded values · linked to original reports</p>
    ${completed ? `<span class="home-completion-check">${homeIcon('ready')}</span>` : ''}
  </div>`;
}
export function mountHome(root) {
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
    <div class="home-resting" data-home-stage="settled"><div class="home-resting-copy">${introCopy}</div><ol class="home-journey" aria-label="Your report-to-summary journey">${steps.map((step, index) => `<li><button type="button" data-home-replay="${step.phase}" aria-label="Step ${index + 1}: ${step.label.replace(/<br>/g, ' ')}"><span class="home-step-icon">${homeIcon(step.icon)}</span><span class="home-step-number">${index + 1}</span><span class="home-step-label">${step.label}</span></button></li>`).join('')}</ol></div>
  </section>`;
  const stages = [...root.querySelectorAll('[data-home-stage]')];
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let completed = reducedMotion.matches;
  try { completed ||= localStorage.getItem(COMPLETED_KEY) === 'complete'; } catch { /* Home still works without browser storage. */ }
  let elapsed = completed ? totalDuration : 0, frame = 0, lastTime = null, active = false, currentPhase = null, replayEnd = null, replayPhase = null, replayButton = null;
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
    const phase = replayPhase ? { id: replayPhase.id, elapsed: elapsed - replayPhase.start } : homePhaseAt(elapsed);
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
    cancelAnimationFrame(frame);
    frame = 0;
    lastTime = null;
    completed = false;
    root.dataset.homeComplete = 'false';
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
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { cancelAnimationFrame(frame); frame = 0; lastTime = null; }
    else schedule();
  });
  reducedMotion.addEventListener('change', event => { if (event.matches) finish(); });
  showPhase(completed ? 'settled' : 'intro');
  if (completed) finish();
  return { setActive };
}
