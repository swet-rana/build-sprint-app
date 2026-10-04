import { ConvexClient } from 'convex/browser';
import { api } from '../convex/_generated/api';
import { fileError, MAX_REPORTS } from '../convex/fileRules.js';
const escape = text => String(text).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const sizeLabel = n => n >= 1024 * 1024 ? `${(n / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1,Math.round(n / 1024))} KB`;
const documentIcon = '<svg width="24" height="28" viewBox="0 0 24 28" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M4 2h10l6 6v18H4zM14 2v6h6M8 14h8M8 19h8"/></svg>';

export function mountUploads(root, onReports = () => {}) {
  root.innerHTML = `<section class="upload-panel" aria-labelledby="upload-title"><div class="upload-heading"><h2 id="upload-title">Add your blood reports</h2><p>Start with two reports from different dates. Upload clear copies with all pages included.</p></div><form id="upload-form"><div class="file-picker"><svg width="38" height="38" viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M20 26V8m-7 7 7-7 7 7M8 25v8h24v-8"/></svg><div><label for="report-files">Choose reports</label><p id="file-help">PDF, JPG, PNG or WebP · up to 10 MB each</p></div><input id="report-files" type="file" accept="application/pdf,image/jpeg,image/png,image/webp,.pdf,.jpg,.jpeg,.png,.webp" multiple aria-describedby="file-help" /></div><ul id="upload-queue" class="upload-queue" aria-label="Selected reports"></ul><div id="upload-actions" class="upload-actions" hidden><button class="primary" type="submit" id="upload-submit">Upload reports</button><button class="secondary" type="button" id="clear-selection">Clear selection</button></div></form><p id="upload-status" class="upload-status" role="status" aria-live="polite"></p><div class="upload-note"><strong>Your reports stay separate from the sample.</strong><p>Your original files are saved. For now, access is tied to this browser. Clearing browser data loses access; sign-in will come later. Once two PDFs are saved, open My summary to compare them.</p></div></section><section class="saved-reports" aria-labelledby="saved-title"><div class="saved-heading"><h2 id="saved-title">Your uploaded reports</h2><span id="report-count-label"></span></div><div id="reports-list"><p class="loading-message">Loading your reports…</p></div></section>`;
  const input = root.querySelector('#report-files');
  const queueEl = root.querySelector('#upload-queue');
  const status = root.querySelector('#upload-status');
  const actions = root.querySelector('#upload-actions');
  const submit = root.querySelector('#upload-submit');
  const clear = root.querySelector('#clear-selection');
  const list = root.querySelector('#reports-list');
  let queue = [], saved = [], busy = false, loaded = false, sessionKey, client;
  const url = import.meta.env.VITE_CONVEX_URL;
  const site = url?.replace(/\.convex\.cloud\/?$/, '.convex.site');
  function message(text, isError = false) { status.textContent = text; status.classList.toggle('is-error', isError); }
  function renderQueue() {
    queueEl.innerHTML = queue.map(item => `<li><div><strong>${escape(item.file.name)}</strong><span>${sizeLabel(item.file.size)}</span></div><span class="queue-state ${item.state==='error'?'is-error':''}">${escape(item.message || 'Ready to upload')}</span></li>`).join('');
    actions.hidden = queue.length === 0;
    const pending = queue.filter(item => item.state !== 'saved').length;
    submit.textContent = busy ? 'Uploading…' : `Upload ${pending} ${pending===1?'report':'reports'}`;
    submit.disabled = busy || pending === 0 || !loaded;
    input.disabled = busy || !loaded || saved.length >= MAX_REPORTS;
    clear.disabled = busy;
  }
  function renderReports() {
    root.querySelector('#report-count-label').textContent = `${saved.length} of ${MAX_REPORTS}`;
    if (!saved.length) {
      list.innerHTML = `<div class="reports-empty">${documentIcon}<div><h3>No reports uploaded yet</h3><p>Choose your first reports above. They’ll appear here once saved.</p></div></div>`;
      return;
    }
    list.innerHTML = `<ul class="report-rows">${saved.map(report => `<li>${documentIcon}<div class="report-details"><h3>${escape(report.name)}</h3><p>${report.contentType==='application/pdf'?'PDF':'Photo'} · ${sizeLabel(report.size)} · Uploaded ${new Date(report.uploadedAt).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}</p></div><button class="report-open secondary" type="button" data-report-id="${report.id}" aria-label="Open ${escape(report.name)}">Open report</button></li>`).join('')}</ul><p class="stored-note">Open My summary to read two PDFs and compare their recorded results.</p>`;
  }
  try {
    sessionKey = localStorage.getItem('health-history-upload-session');
    if (!/^[a-f0-9]{64}$/.test(sessionKey ?? '')) {
      sessionKey = Array.from(crypto.getRandomValues(new Uint8Array(32)), n => n.toString(16).padStart(2,'0')).join('');
      localStorage.setItem('health-history-upload-session', sessionKey);
    }
    if (!url || !site) throw new Error('missing configuration');
    client = new ConvexClient(url);
    client.onUpdate(api.reports.list, { sessionKey }, reports => {
      saved = reports; loaded = true; renderReports(); renderQueue(); onReports(reports);
    }, () => {
      loaded = false; renderQueue(); list.innerHTML = '<p class="is-error">Reports could not be loaded. Check your connection and reload this page.</p>';
      message('Cannot connect to report storage. Check your connection and reload the page.', true);
    });
  } catch {
    input.disabled = true;
    list.innerHTML = '<p>Your reports are unavailable in this browser.</p>';
    message('Report storage is unavailable. Use a browser that allows local storage, or check the app’s connection settings.', true);
    return;
  }
  renderQueue();
  input.addEventListener('change', () => {
    if (busy) return;
    const errors = [];
    queue = Array.from(input.files).flatMap(file => {
      const error = fileError(file.size, file.type);
      if (error) { errors.push(`${file.name}: ${error}`); return []; }
      return [{file, uploadId:crypto.randomUUID(), state:'ready', message:''}];
    });
    if (queue.length + saved.length > MAX_REPORTS) {
      errors.push(`Choose up to ${Math.max(0,MAX_REPORTS-saved.length)} more reports. This preview stores ${MAX_REPORTS} reports in this browser.`);
      queue=[];
    }
    input.value=''; renderQueue(); message(errors.join(' '), errors.length>0);
  });
  clear.addEventListener('click', () => { queue=[]; renderQueue(); message('Selection cleared. Uploaded reports are unchanged.'); });
  root.querySelector('#upload-form').addEventListener('submit', async event => {
    event.preventDefault();
    if (busy || !loaded || !queue.length) return;
    busy=true; message('Uploading your reports…'); renderQueue();
    for (const item of queue) {
      if (item.state === 'saved') continue;
      item.state='uploading'; item.message='Uploading…'; renderQueue();
      const form = new FormData(); form.append('sessionKey', sessionKey); form.append('file',item.file); form.append('uploadId',item.uploadId);
      try {
        const response = await fetch(`${site}/reports/upload`, {method:'POST',body:form,signal:AbortSignal.timeout(120000)});
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Upload failed. Try again.');
        item.state='saved'; item.message='Uploaded';
      } catch (error) {
        item.state='error'; item.message=error.name==='TimeoutError' ? 'Upload timed out. Check your connection and try again.' : error.message === 'Failed to fetch' ? 'Connection lost. Check your connection and try again.' : error.message;
      }
      renderQueue();
    }
    busy=false;
    const failures=queue.filter(item=>item.state==='error');
    const success=queue.filter(item=>item.state==='saved').length;
    if (!failures.length) { queue=[]; message(`${success} ${success===1?'report uploaded':'reports uploaded'}. You can open the originals below.`); }
    else message(`${success} uploaded. ${failures.length} ${failures.length===1?'report needs':'reports need'} another try.`,true);
    renderQueue();
  });
  list.addEventListener('click',async event=>{
    const button=event.target.closest('[data-report-id]');
    if (!button || button.disabled) return;
    // Open the new tab during the click so the browser doesn't block it later.
    const viewer=window.open('', '_blank');
    if (!viewer) { message('Allow a new tab for this app, then click Open report again.',true); return; }
    viewer.opener=null; viewer.document.title='Opening report';
    viewer.document.body.textContent='Opening your report…';
    button.disabled=true; button.textContent='Opening…';
    try {
      const response=await fetch(`${site}/reports/open`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionKey,reportId:button.dataset.reportId}),signal:AbortSignal.timeout(60000)});
      if (!response.ok) { const result=await response.json(); throw new Error(result.error || 'Could not open this report.'); }
      const objectUrl=URL.createObjectURL(await response.blob());
      viewer.location.replace(objectUrl);
      setTimeout(()=>URL.revokeObjectURL(objectUrl),300000);
      message('Original report opened in a new tab.');
    } catch (error) { viewer.close(); message(error.message==='Failed to fetch'?'Could not open the report. Check your connection and try again.':error.message,true); }
    finally { button.disabled=false; button.textContent='Open report'; }
  });
}
