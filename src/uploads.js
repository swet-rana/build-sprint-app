import { matchesReportSearch } from './report-search.js';
import { MAX_ANALYSIS_REPORTS } from './analysis-rules.js';
import { openReportViewer } from './report-viewer.js';
import { ConvexClient } from 'convex/browser';
import './reports.css';
import './reports-premium.css';
import { api } from '../convex/_generated/api';
import { fileError } from '../convex/fileRules.js';
import { numberReports, sortReports } from './report-list.js';
import { emptyDetails, testDateLabel, shortTestType } from './report-details.js';
const escape = text => String(text).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const sizeLabel = n => n >= 1024 * 1024 ? `${(n / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1,Math.round(n / 1024))} KB`;
const documentIcon = '<svg width="24" height="28" viewBox="0 0 24 28" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M4 2h10l6 6v18H4zM14 2v6h6M8 14h8M8 19h8"/></svg>';

export function mountUploads(root, onReports = () => {}, onSummary = () => {}) {
  root.innerHTML = `<section class="upload-panel" aria-labelledby="upload-title"><div class="upload-heading"><h2 id="upload-title">Add your lab reports</h2><p>Start with two blood or semen reports from different dates. Upload clear copies with all pages included.</p></div><form id="upload-form"><div class="file-picker"><svg width="38" height="38" viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M20 26V8m-7 7 7-7 7 7M8 25v8h24v-8"/></svg><div><label for="report-files">Choose reports</label><p id="file-help">PDF, JPG, PNG or WebP · up to 10 MB each</p><p id="multiple-file-help">Choose several files at once, or add them one at a time before uploading.</p></div><input id="report-files" type="file" accept="application/pdf,image/jpeg,image/png,image/webp,.pdf,.jpg,.jpeg,.png,.webp" multiple aria-describedby="file-help multiple-file-help" /></div><ul id="upload-queue" class="upload-queue" aria-label="Selected reports"></ul><div id="upload-actions" class="upload-actions" hidden><button class="primary" type="submit" id="upload-submit">Upload reports</button><button class="secondary" type="button" id="clear-selection">Clear selection</button></div></form><p id="upload-status" class="upload-status" role="status" aria-live="polite"></p><div class="upload-note"><strong>Your reports stay separate from the sample.</strong><p>Your original files are saved. For now, access is tied to this browser. Clearing browser data loses access; sign-in will come later. Once two reports are saved, open My summary to compare them. Clear photos and scanned PDFs can be read too.</p></div></section><section class="saved-reports" aria-labelledby="saved-title"><div class="saved-heading"><h2 id="saved-title">Your uploaded reports</h2><span id="report-count-label"></span></div><div id="reports-list"><p class="loading-message">Prepare for conversation with your doctor</p></div></section>`;
  root.classList.add('premium-reports');
  const uploadPanel=root.querySelector('.upload-panel'), savedPanel=root.querySelector('.saved-reports');
  uploadPanel.id='add-reports-panel';uploadPanel.hidden=true;
  savedPanel.querySelector('.saved-heading').innerHTML=`<div class="reports-title-with-art"><img class="reports-heading-art" src="/images/reports-summary.png" alt="" width="88" height="88" decoding="async"><div><h1 id="saved-title">My reports</h1><p>All your health records, in one place.</p></div></div><div class="report-upload-heading"><button class="primary premium-upload" type="button" id="show-upload" aria-expanded="false" aria-controls="add-reports-panel"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M12 16V3m-5 5 5-5 5 5M4 15v6h16v-6"/></svg>Upload report</button><p id="report-count-label"></p></div>`;
  const toolbar=document.createElement('div');toolbar.className='reports-toolbar';
  toolbar.innerHTML=`<label class="report-search"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg><span class="sr-only">Search reports</span><input id="search-reports" type="search" placeholder="Search by report type, lab or PDF / photo" autocomplete="off"></label><div class="report-arrange-row"><div class="report-filters" aria-label="Filter reports"><button type="button" data-report-filter="all" aria-pressed="true">All reports</button><button type="button" data-report-filter="pdf" aria-pressed="false">PDF</button><button type="button" data-report-filter="image" aria-pressed="false">Image</button></div><label class="report-sort">Sort by<select id="sort-reports"><option value="upload-newest">Upload date · newest first</option><option value="upload-oldest">Upload date · oldest first</option><option value="report-newest">Report date · newest first</option><option value="report-oldest">Report date · oldest first</option></select></label></div>`;
  savedPanel.querySelector('.saved-heading').after(toolbar);
  toolbar.after(uploadPanel);
  const selectionBar=document.createElement('div');selectionBar.className='reports-selection-bar';selectionBar.hidden=true;
  selectionBar.innerHTML='<span id="selected-report-count" role="status"></span><button class="secondary" type="button" id="unselect-all-reports">Unselect all</button><button class="primary reports-summary-action" type="button" id="move-to-summary">Move to summary page <span aria-hidden="true">→</span></button>';
  root.querySelector('#reports-list').before(selectionBar);
  root.addEventListener('click',event=>{
    if(event.target.closest('[data-show-upload]'))root.querySelector('#show-upload').click();
    if(event.target.closest('[data-clear-filters]')){
      searchTerm='';reportFilter='all';root.querySelector('#search-reports').value='';
      toolbar.querySelectorAll('[data-report-filter]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.reportFilter==='all')));renderReports();
    }
  });
  root.prepend(savedPanel);
  root.querySelector('.saved-heading').after(root.querySelector('#upload-status'));
  root.querySelector('#show-upload').addEventListener('click',event=>{
    uploadPanel.hidden=!uploadPanel.hidden;event.currentTarget.setAttribute('aria-expanded',String(!uploadPanel.hidden));
    if(!uploadPanel.hidden)root.querySelector('#report-files').focus();
  });
  const input = root.querySelector('#report-files');
  const queueEl = root.querySelector('#upload-queue');
  const status = root.querySelector('#upload-status');
  const actions = root.querySelector('#upload-actions');
  const submit = root.querySelector('#upload-submit');
  const clear = root.querySelector('#clear-selection');
  const list = root.querySelector('#reports-list');
  let queue = [], saved = [], busy = false, loaded = false, sessionKey, client, editingId = null, deletedReports = [], trashCursor = null, trashDone = true, trashPageCount = 1, reportControlsReady = false, searchTerm = '', reportFilter = 'all';
  let reportSort = localStorage.getItem('healthstats-report-sort') || 'upload-newest';
  if (!['upload-newest','upload-oldest','report-newest','report-oldest'].includes(reportSort)) reportSort = 'upload-newest';
  root.querySelector('#sort-reports').value = reportSort;
  root.querySelector('#sort-reports').addEventListener('change', event => {
    reportSort = event.target.value;
    localStorage.setItem('healthstats-report-sort', reportSort);
    renderReports();
  });
  let analysisIds=new Set();
  try{const stored=JSON.parse(localStorage.getItem('health-history-analysis-reports')||'[]');if(Array.isArray(stored))analysisIds=new Set(stored.filter(id=>typeof id==='string'));}catch{}
  root.querySelector('#move-to-summary').addEventListener('click',()=>{if(analysisIds.size>=2)onSummary();});
  root.querySelector('#unselect-all-reports').addEventListener('click',()=>{
    analysisIds.clear();
    list.querySelectorAll('[data-analysis-id]').forEach(input=>input.checked=false);
    publishSelection();
  });
  function updateSummaryActions(){
    root.querySelector('#unselect-all-reports').disabled=analysisIds.size===0;
    selectionBar.hidden=analysisIds.size===0;
    root.querySelector('#selected-report-count').textContent=`${analysisIds.size} of ${MAX_ANALYSIS_REPORTS} reports selected`;
    const proceed=root.querySelector('#move-to-summary');proceed.disabled=analysisIds.size<2;
    proceed.title=analysisIds.size<2?'Select at least two reports to compare':'';
  }
  function publishSelection(){updateSummaryActions();localStorage.setItem('health-history-analysis-reports',JSON.stringify([...analysisIds]));onReports(numberReports(saved),[...analysisIds]);}
  const readingErrors=new Map();
  const trashPages = [], trashSubscriptions = [];
  const url = import.meta.env.VITE_CONVEX_URL;
  const site = url?.replace(/\.convex\.cloud\/?$/, '.convex.site');
  function message(text, isError = false) { status.textContent = text; status.classList.toggle('is-error', isError); }
  function renderQueue() {
    queueEl.innerHTML = queue.map(item => `<li><div><strong>${escape(item.file.name)}</strong><span>${sizeLabel(item.file.size)}</span></div><span class="queue-state ${item.state==='error'?'is-error':''}">${escape(item.message || 'Ready to upload')}</span></li>`).join('');
    actions.hidden = queue.length === 0;
    root.querySelector('label[for="report-files"]').textContent = queue.length ? 'Add more reports' : 'Choose reports';
    const pending = queue.filter(item => item.state !== 'saved').length;
    submit.textContent = busy ? 'Uploading…' : `Upload ${pending} ${pending===1?'report':'reports'}`;
    submit.disabled = busy || pending === 0 || !loaded;
    input.disabled = busy || !loaded;
    clear.disabled = busy;
  }
  const thumbnailCache=new Map();let thumbnailObserver;
  function loadVisibleThumbnails(){
    thumbnailObserver?.disconnect();
    if(typeof IntersectionObserver==='undefined')return;
    thumbnailObserver=new IntersectionObserver(entries=>{
      entries.filter(entry=>entry.isIntersecting).forEach(({target})=>{
        thumbnailObserver.unobserve(target);
        const reportId=target.dataset.thumbnailId;
        let promise=thumbnailCache.get(reportId);
        if(!promise){promise=fetch(`${site}/reports/open`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionKey,reportId}),signal:AbortSignal.timeout(60000)}).then(response=>{if(!response.ok)throw Error('Preview unavailable');return response.blob();}).then(blob=>URL.createObjectURL(blob)).catch(()=>null);thumbnailCache.set(reportId,promise);}
        promise.then(url=>{if(url&&target.isConnected){const image=document.createElement('img');image.src=url;image.alt='';image.decoding='async';target.replaceChildren(image);}});
      });
    },{rootMargin:'100px'});
    list.querySelectorAll('[data-thumbnail-id]').forEach(target=>thumbnailObserver.observe(target));
  }
  function renderReports() {
    root.querySelector('#report-count-label').textContent = `${saved.length} ${saved.length===1?'report':'reports'} saved · Select up to 10 for analysis`;
    if (!saved.length) {
      list.innerHTML = `<div class="reports-empty">${documentIcon}<div><h3>No reports yet</h3><p>Upload your first medical report to start building your health history.</p><button class="primary" type="button" data-show-upload>Upload report</button></div></div>`;
      return;
    }
    if (editingId) return;
    const openMenus=new Set([...list.querySelectorAll('.report-menu[open]')].map(menu=>menu.dataset.reportMenu));
    const visible=sortReports(numberReports(saved), reportSort).filter(r=>{
      const d=r.details || emptyDetails();
      const matches=matchesReportSearch(r,searchTerm);
      return matches && (reportFilter==='all'||reportFilter==='image'&&r.contentType.startsWith('image/')||reportFilter==='pdf'&&r.contentType==='application/pdf');
    });
    list.innerHTML = visible.length ? `<ul class="report-rows premium-grid">${visible.map(report => {
      const d = report.details || emptyDetails(), type=shortTestType(d.testType) || 'Medical report';
      return `<li class="premium-report-card"><div class="card-topline"><div class="card-identity"><span class="report-number">Report #${report.serial}</span><span class="report-kind-badge">${report.contentType==='application/pdf'?'PDF':'Image'}</span></div><label class="report-analysis-check"><input type="checkbox" data-analysis-id="${report.id}" aria-label="Select report #${report.serial} for analysis" ${analysisIds.has(report.id)?'checked':''}><span>For summary</span></label><details class="report-menu" data-report-menu="${report.id}" ${openMenus.has(report.id)?'open':''}><summary aria-label="Actions for report #${report.serial}"><svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="19" cy="12" r="1.7"/></svg></summary><div><button class="secondary" type="button" data-edit-id="${report.id}" aria-label="Edit details for report #${report.serial}">Edit details</button><button class="secondary report-delete" type="button" ${reportControlsReady ? '' : 'disabled'} data-delete-id="${report.id}" aria-label="Delete report #${report.serial}">Delete report</button></div></details></div>${Number.isFinite(report.uploadedAt)?`<p class="report-uploaded-date">Uploaded on ${escape(new Date(report.uploadedAt).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}))}</p>`:''}${readingErrors.has(report.id)?`<p class="report-reading-error" role="status">Reading error: ${escape(readingErrors.get(report.id))}</p>`:''}${report.duplicateOf ? `<p class="duplicate-note">Duplicate of report #${report.duplicateOf}</p>` : ''}<div class="card-report-content"><div class="report-preview" ${report.contentType.startsWith('image/')?`data-thumbnail-id="${report.id}"`:''} aria-hidden="true">${documentIcon}<span>${report.contentType==='application/pdf'?'PDF':'Photo'}</span></div><div class="report-details"><h2>${escape(type)}</h2><p class="report-lab"><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M5 21h14M9 3h6m-5 0v7L5 21h14l-5-11V3M8 15h8"/></svg>${escape(d.labName || 'Lab not added')}</p><p class="report-date"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="4" y="5" width="16" height="16" rx="2"/><path d="M8 3v4m8-4v4M4 11h16"/></svg>${escape(d.testDate?testDateLabel(d.testDate):'Test date not added')}</p><p class="report-person"><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="7" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/></svg> ${escape(d.patientName || 'Name not added')}</p><span class="report-file-badge">${documentIcon}${report.contentType==='application/pdf'?'PDF':'Photo'} · ${sizeLabel(report.size)}</span></div></div><p class="report-filename" title="${escape(report.name)}">${escape(report.name)}</p>${(!d.labName||!d.patientName||!d.testDate)?`<button class="report-add-details" type="button" data-edit-id="${report.id}" aria-label="Add missing details for report #${report.serial}">Add missing details</button>`:''}<div class="report-edit-slot"></div><div class="report-card-actions"><button class="report-open primary" type="button" data-report-id="${report.id}" aria-label="Open report #${report.serial}">Open report <span aria-hidden="true">→</span></button></div></li>`;
    }).join('')}</ul>` : '<div class="reports-empty"><div><h3>No matching reports</h3><p>Try a different search or filter.</p><button type="button" class="secondary" data-clear-filters>Clear filters</button></div></div>';
    updateSummaryActions();
    list.innerHTML += `<p class="stored-note" id="details-status" role="status"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-11v2"/></svg><span>Check report details against the originals. Access stays tied to this browser until sign-in is available.</span></p>`;
    loadVisibleThumbnails();
  }
  list.addEventListener('change',event=>{
    const input=event.target.closest('[data-analysis-id]');if(!input)return;
    if(input.checked && analysisIds.size >= MAX_ANALYSIS_REPORTS){input.checked=false;message('Select up to 10 reports at a time. Untick a report to choose another.',true);return;}
    input.checked?analysisIds.add(input.dataset.analysisId):analysisIds.delete(input.dataset.analysisId);
    publishSelection();
  });
  root.querySelector('#search-reports').addEventListener('input',event=>{searchTerm=event.target.value.trim().toLowerCase();renderReports();});
  toolbar.addEventListener('click',event=>{
    const filter=event.target.closest('[data-report-filter]');if(!filter)return;
    reportFilter=filter.dataset.reportFilter;
    toolbar.querySelectorAll('[data-report-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b===filter)));renderReports();
  });

  function renderDeleted() {
    let section = root.querySelector('#deleted-reports');
    if (!section) { section=document.createElement('div'); section.id='deleted-reports'; root.append(section); }
    const wasOpen=section.querySelector('details')?.open || false;
    section.innerHTML = deletedReports.length ? `<details class="deleted-reports"><summary>Deleted reports (${deletedReports.length}${trashDone ? '' : '+'})</summary><p>These reports are excluded from My summary. Restore them here if needed.</p><ul>${deletedReports.map(r => `<li><span>#${r.serial || '?'} · ${escape(r.name)}</span><button class="secondary" type="button" data-restore-id="${r.id}">Restore</button></li>`).join('')}</ul>${trashDone ? '' : '<button class="secondary" type="button" data-more-deleted>Show more deleted reports</button>'}</details>` : '';
    if(wasOpen&&section.querySelector('details'))section.querySelector('details').open=true;
  }
  function watchTrashPage(index,cursor) {
    trashSubscriptions[index]?.unsubscribe();
    trashSubscriptions[index]=client.onUpdate(api.reports.trash,{sessionKey,paginationOpts:{numItems:20,cursor}},result=>{
      const oldCursor=trashPages[index]?.continueCursor;
      trashPages[index]=result;
      if(oldCursor!==result.continueCursor || result.isDone){
        for(let i=index+1;i<trashSubscriptions.length;i++)trashSubscriptions[i]?.unsubscribe();
        trashSubscriptions.length=index+1;trashPages.length=index+1;
      }
      deletedReports=[...new Map(trashPages.flatMap(p=>p.page).map(r=>[r.id,r])).values()];
      const last=trashPages.at(-1);trashCursor=last.continueCursor;trashDone=last.isDone;renderDeleted();
      if(!result.isDone&&index+1<trashPageCount&&!trashSubscriptions[index+1])watchTrashPage(index+1,result.continueCursor);
    },()=>message('Could not load deleted reports. Reload to try again.',true));
  }
  try {
    sessionKey = localStorage.getItem('health-history-upload-session');
    if (!/^[a-f0-9]{64}$/.test(sessionKey ?? '')) {
      sessionKey = Array.from(crypto.getRandomValues(new Uint8Array(32)), n => n.toString(16).padStart(2,'0')).join('');
      localStorage.setItem('health-history-upload-session', sessionKey);
    }
    if (!url || !site) throw new Error('missing configuration');
    client = new ConvexClient(url);
    const reportPages=[], reportSubscriptions=[];
    let legacySubscription;
    function watchReports(index,cursor){
      reportSubscriptions[index]?.unsubscribe();
      reportSubscriptions[index]=client.onUpdate(api.reports.listPage,{sessionKey,paginationOpts:{numItems:50,cursor}},result=>{
        const oldCursor=reportPages[index]?.continueCursor;
        reportPages[index]=result;
        if(oldCursor!==result.continueCursor || result.isDone){
          for(let i=index+1;i<reportSubscriptions.length;i++)reportSubscriptions[i]?.unsubscribe();
          reportSubscriptions.length=index+1;reportPages.length=index+1;
        }
        saved=[...new Map(reportPages.flatMap(p=>p.page).map(r=>[r.id,r])).values()];
        const complete=reportPages.at(-1).isDone;
        loaded=complete;renderReports();renderQueue();
        if(complete){
          analysisIds=new Set([...analysisIds].filter(id=>saved.some(r=>r.id===id)));
          publishSelection();
        }else if(!reportSubscriptions[index+1])watchReports(index+1,result.continueCursor);
      },()=>{
        message('Unlimited uploads need the latest storage update. Run npx convex dev --once, then reload.',true);
        if(!legacySubscription)legacySubscription=client.onUpdate(api.reports.list,{sessionKey},reports=>{
          saved=reports;loaded=true;renderReports();renderQueue();publishSelection();
        },()=>{loaded=false;renderQueue();message('Reports could not be loaded. Check your connection and reload.',true);});
      });
    }
    watchReports(0,null);
    void client.mutation(api.reports.ensureNumbers,{sessionKey}).then(()=>{reportControlsReady=true;renderReports();watchTrashPage(0,null);}).catch(()=>message('Numbering, duplicate checks and Delete need the latest Convex update. Run npx convex dev --once, then reload.',true));
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
    const additions = Array.from(input.files).flatMap(file => {
      const error = fileError(file.size, file.type);
      if (error) { errors.push(`${file.name}: ${error}`); return []; }
      return [{file, uploadId:crypto.randomUUID(), state:'ready', message:''}];
    });
    queue = [...queue.filter(item => item.state !== 'saved'), ...additions];
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
  root.addEventListener('click',async event=>{
    const more=event.target.closest('[data-more-deleted]');
    if(more){
      more.disabled=true;trashPageCount+=1;watchTrashPage(trashPages.length,trashCursor);return;
    }
    const button=event.target.closest('[data-delete-id],[data-restore-id]');
    if(!button||button.disabled)return;
    const deleted=Boolean(button.dataset.deleteId), reportId=button.dataset.deleteId || button.dataset.restoreId;
    if(editingId){message('Save or cancel the open details form before deleting a report.',true);return;}
    button.disabled=true;
    try {
      await client.mutation(api.reports.setDeleted,{sessionKey,reportId,deleted});
      message(deleted?'Report deleted. You can restore it under Deleted reports.':'Report restored.');
    } catch(error) {message(typeof error.data==='string'?error.data:'Could not update this report. Check your connection and the Convex update, then try again.',true);button.disabled=false;}
  });
  list.addEventListener('click', event => {
    const edit = event.target.closest('[data-edit-id]');
    if (!edit || editingId) return;
    const report = saved.find(r => r.id === edit.dataset.editId);
    if (!report) return;
    editingId = report.id;
    const d = report.details || emptyDetails();
    const slot = edit.closest('li').querySelector('.report-edit-slot');
    const menu=edit.closest('details');if(menu)menu.open=false;
    slot.innerHTML = `<form class="report-details-form" aria-label="Edit report details"><h4>Report details</h4><div class="report-fields"><label>Lab name<input name="labName" maxlength="160" value="${escape(d.labName)}" autocomplete="off"></label><label>For whom?<input name="patientName" maxlength="160" value="${escape(d.patientName)}" autocomplete="off"></label><label class="wide-field">Type of test<input name="testType" maxlength="600" value="${escape(shortTestType(d.testType))}" autocomplete="off"></label><label>Date of test<input name="testDate" type="date" value="${escape(d.testDate)}"></label></div><p class="details-form-status" role="status"></p><div class="upload-actions"><button class="primary" type="submit">Save details</button><button class="secondary" type="button" data-cancel-details>Cancel</button></div></form>`;
    slot.querySelector('input').focus();
    slot.querySelector('[data-cancel-details]').addEventListener('click', () => { editingId = null; renderReports(); });
    slot.querySelector('form').addEventListener('submit', async e => {
      e.preventDefault();
      const form = e.currentTarget;
      const details = Object.fromEntries(new FormData(form));
      const buttons = form.querySelectorAll('button');
      buttons.forEach(b => { b.disabled = true; });
      form.querySelector('.details-form-status').textContent = 'Saving…';
      try {
        await client.mutation(api.reports.updateDetails, {sessionKey,reportId:report.id,details});
        saved = saved.map(r => r.id === report.id ? {...r,details} : r);
        editingId = null; renderReports(); message('Report details saved.');
      } catch {
        form.querySelector('.details-form-status').textContent = 'Details could not be saved. Check your connection and try again.';
        buttons.forEach(b => { b.disabled = false; });
      }
    });
  });
  list.addEventListener('click',async event=>{
    const button=event.target.closest('[data-report-id]');
    if (!button || button.disabled) return;
    const report = saved.find(r=>r.id===button.dataset.reportId);
    if(!report) return;
    await openReportViewer({name:`Report #${report.serial} · ${report.name}`,load:async()=>{
      const response=await fetch(`${site}/reports/open`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionKey,reportId:report.id}),signal:AbortSignal.timeout(60000)});
      if(!response.ok){const result=await response.json();throw Error(result.error||'Could not open this report.');}
      return response.blob();
    }});
  });
}
