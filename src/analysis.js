import {requestSmartSummary} from './smart-summary-client.js';
import {smartSummaryMarkup} from './smart-summary-view.js';
import './smart-summary.css';
import {pdfPageTotal,pageExplanations} from './page-coverage.js';
import {dailyVisionMessage,isDailyVisionLimit,nextVisionReset} from './vision-limits.js';
import {CATEGORY_ART,categoryIllustration} from './category-art.js';
import {reportCache} from './report-cache.js';
import {normalizeReportTests,originalResultTitle} from './test-matching.js';
import {testMatching} from './test-match-client.js';
import {visionReading,savedVisionReading,finishVisionReading,VISION_FAILURE} from './vision-client.js';
import { evaluationLogger } from './evaluation-log.js';
import { MAX_ANALYSIS_REPORTS, analysisCountError } from './analysis-rules.js';
import { openReportViewer } from './report-viewer.js';
import './summary.css';
import { trendPointStates } from './trend-point-states.js';
import { testDateLabel } from './report-details.js';
import { summaryTests } from './summary-tests.js';
import { HEALTH_CATEGORIES, testInCategory } from './health-categories.js';
import { compareReportSeries, parseRange, rangeStatus } from './lab-parser.js';
const escape=text=>String(text??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const number=n=>typeof n==='number'?n.toLocaleString('en-IN',{maximumFractionDigits:5}):escape(n);
const dateLabel=date=>new Date(date+'T00:00:00Z').toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'});
const preferred=['wbc','haemoglobin','esr','tsh','vitamin-d','vitamin-b12'];
const statusLabel={above:'Above this report’s range',below:'Below this report’s range',within:'Within this report’s range',unknown:'See source for interpretation'};
function chart(marker,dates){
 const observations=marker.observations;
 const pointStates=trendPointStates(observations);
 const glossId='trend-gloss-'+Array.from(marker.key,c=>c.codePointAt(0).toString(16)).join('-');
 const glossPalettes={neutral:['#c9c4ff','#4942bc','#29236e'],'out-of-range':['#ffb5bd','#b42332','#701521'],'normal-transition':['#b0efc5','#239b58','#135c34']};
 const glossDefs=`<defs>${Object.entries(glossPalettes).map(([state,colors])=>`<radialGradient id="${glossId}-${state}" cx="32%" cy="25%" r="78%"><stop offset="0" stop-color="${colors[0]}"/><stop offset=".48" stop-color="${colors[1]}"/><stop offset="1" stop-color="${colors[2]}"/></radialGradient>`).join('')}</defs>`;
 const ranges=observations.map(m=>m?parseRange(m.referenceText):null);
 const a=ranges[0],same=a&&a.low!==null&&a.high!==null&&ranges.every(r=>r&&JSON.stringify(r)===JSON.stringify(a));
 const values=observations.filter(Boolean).map(m=>m.value),bounds=same?[a.low,a.high]:[];
 const high=Math.max(...values,...bounds,1)*1.24,low=Math.min(...values,...bounds,0);
 const chartWidth=Math.max(440,dates.length*140);
 const y=value=>122-(value-low)/(high-low)*96,x=i=>(i+.5)*chartWidth/dates.length;
 const dateY=Math.max(...values.map(y),...(same?[y(a.low)]:[]))+24;
 const chartHeight=dateY+12;
 const lines=observations.map((m,i)=>m&&i&&observations[i-1]?`<path d="M${x(i-1)} ${y(observations[i-1].value)} L${x(i)} ${y(m.value)}" fill="none" stroke="#176889" stroke-width="3"/>`:'').join('');
 return `<svg class="chart" viewBox="0 0 ${chartWidth} ${chartHeight}" role="img" aria-label="${escape(marker.name)}: ${observations.map((m,i)=>`${m?number(m.value):marker.missingLabels[i]} on ${dates[i]}`).join(', ')}, ${escape(marker.unit)}.">${glossDefs}${same?`<rect class="reference-range-band" x="38" y="${y(a.high)}" width="${chartWidth-60}" height="${y(a.low)-y(a.high)}" fill="#e6f0f1"/><text class="range-axis-label" x="34" y="${y(a.high)+3}" text-anchor="end">${number(a.high)}</text><text class="range-axis-label" x="34" y="${y(a.low)+3}" text-anchor="end">${number(a.low)}</text>`:''}${lines}${observations.map((m,i)=>m?`<ellipse cx="${x(i)}" cy="${y(m.value)+5}" rx="5" ry="2" fill="#17145c" opacity=".15"/><circle cx="${x(i)}" cy="${y(m.value)}" r="6" class="result-point trend-${pointStates[i]} range-${rangeStatus(m.value,m.referenceText)}" style="fill:url(#${glossId}-${pointStates[i]})"><title>${escape(originalResultTitle(m))}</title></circle><ellipse cx="${x(i)-1.8}" cy="${y(m.value)-2.5}" rx="2.4" ry="1.4" fill="#fff" opacity=".72"/><text x="${x(i)}" y="${y(m.value)-12}" text-anchor="middle" class="point-label result-value range-${rangeStatus(m.value,m.referenceText)}">${number(m.value)}</text>`:'').join('')}${dates.map((d,i)=>dates.length>4&&i!==0&&i!==dates.length-1?'':`<text x="${x(i)}" y="${dateY}" text-anchor="middle">${d}</text>`).join('')}</svg>`;
}
const summaryIcon=(paths)=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
const calendarIcon=summaryIcon('<rect x="4" y="5" width="16" height="16" rx="2"/><path d="M8 3v4m8-4v4M4 11h16"/>');
const labIcon=summaryIcon('<path d="M9 3h6m-5 0v7L5 21h14l-5-11V3M8 15h8"/>');
const pdfIcon=summaryIcon('<path d="M5 3h9l5 5v13H5zM14 3v5h5M8 12h8M8 16h6"/>');
const sizeLabel=n=>Number.isFinite(n)?n>=1024*1024?`${(n/(1024*1024)).toFixed(1)} MB`:`${Math.max(1,Math.round(n/1024))} KB`:'Size not added';
export function mountAnalysis(root,onReady,{onAddReports=()=>{},onRemoveReport=()=>{}}={}){
 const rangeLabelsObserver=typeof ResizeObserver==='undefined'?null:new ResizeObserver(entries=>{
  for(const {target:svg} of entries){
   const scale=svg.getScreenCTM()?.a;
   const reference=svg.closest('.marker')?.querySelector('.values span');
   if(!scale||!reference)continue;
   const labels=[...svg.querySelectorAll('.range-axis-label')];
   const size=parseFloat(getComputedStyle(reference).fontSize)/scale;
   labels.forEach(label=>label.style.setProperty('font-size',`${size}px`,'important'));
   const labelRight=Math.max(34,...labels.map(label=>label.getComputedTextLength()+4));
   labels.forEach(label=>label.setAttribute('x',labelRight));
   const band=svg.querySelector('.reference-range-band');
   if(band){band.setAttribute('x',labelRight+4);band.setAttribute('width',svg.viewBox.baseVal.width-labelRight-26);}
  }
 });
 root.innerHTML=`<form id="analysis-form" class="summary-workspace"><section class="analysis-controls" aria-labelledby="selected-analysis-title"><div class="analysis-selection-heading"><h2 id="selected-analysis-title">Reports selected for analysis</h2><div class="analysis-selection-actions"><span id="analysis-selection-count">0 of 10 reports selected</span><button class="secondary" id="add-analysis-reports" type="button">${summaryIcon('<path d="M12 5v14M5 12h14"/>')}Add more reports</button></div></div><div id="selected-analysis-reports"></div></section><aside class="summary-preparation" aria-labelledby="preparation-title">${summaryIcon('<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5z"/>')}<h2 id="preparation-title">Turn your reports into<br>a clear summary</h2><ul class="analysis-guide">${['Compare key markers across reports.','Highlight changes and trends.','Prepare a clear, doctor-friendly summary.','Keep findings connected to their original reports.'].map(text=>`<li>${summaryIcon('<path d="m6 12 4 4 8-8"/>')}<span>${text}</span></li>`).join('')}</ul><button class="primary" id="prepare-summary" type="submit" disabled>Prepare summary <span aria-hidden="true">→</span></button><p class="preparation-help">Select 1–10 reports. Add a second date to see trends.</p></aside></form><section class="analysis-notice" aria-label="Report information">${summaryIcon('<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v1"/>')}<div><p id="analysis-status" role="status" aria-live="polite" hidden></p><p>Check this draft against the originals. Access stays tied to this browser until sign-in is available.</p></div><button type="button" class="secondary" id="retry-summary" hidden>Try again</button></section><div id="reading-failures" role="status" hidden></div><section id="scan-page-coverage" class="reading-coverage" aria-label="Scanned page reading" hidden></section><div id="real-summary"></div>`;
 const button=root.querySelector('#prepare-summary'),status=root.querySelector('#analysis-status'),output=root.querySelector('#real-summary'),selectionList=root.querySelector('#selected-analysis-reports');
 let failures=[],reports=[],reportIds=[],comparison=null,selected=new Set(),busy=false,activeCategory='all',selectionVersion=0,dailyRetryAt=0,resetTimer,smartSummary=null;
 const retry=root.querySelector('#retry-summary'),addReports=root.querySelector('#add-analysis-reports'),preparationHelp=root.querySelector('.preparation-help');
 const thumbnails=new Map(),readingPaths=new Map(),scanCoverage=new Map(),scanFailureReasons=new Map();
 addReports.addEventListener('click',onAddReports);
 selectionList.addEventListener('click',event=>{const remove=event.target.closest('[data-summary-remove]');if(remove&&!busy)onRemoveReport(remove.dataset.summaryRemove);});
 function canPrepare(){return reportIds.length>=1&&reportIds.length<=MAX_ANALYSIS_REPORTS&&reportIds.every(id=>reports.some(r=>r.id===id));}
 const site=import.meta.env.VITE_CONVEX_URL?.replace(/\.convex\.cloud\/?$/,'.convex.site');
 function blockDailyUntil(until){
  dailyRetryAt=until;window.clearTimeout(resetTimer);
  if(until>Date.now())resetTimer=window.setTimeout(()=>{dailyRetryAt=0;message('The daily AI vision limit has reset. Tap Try again to resume reading.',true);setBusyControls();},until-Date.now());
 }
 function message(text,error=false){
  if(error&&isDailyVisionLimit(text)&&dailyRetryAt<=Date.now())blockDailyUntil(nextVisionReset(Date.now()));
  const blocked=dailyRetryAt>Date.now();
  status.textContent=blocked?dailyVisionMessage(dailyRetryAt):text;status.hidden=!status.textContent;status.classList.toggle('is-error',error||blocked);retry.hidden=!error||blocked;
 }
 function showCoverage(){
  const box=root.querySelector('#scan-page-coverage');box.hidden=!scanCoverage.size;
  box.innerHTML=[...scanCoverage].map(([id,coverage])=>`<div><h3>${escape(reports.find(r=>r.id===id)?.name??'Scanned report')}</h3><p>${coverage.read} scanned ${coverage.read===1?'page':'pages'} read · ${coverage.skipped.length} skipped · ${coverage.checked} of ${coverage.total} scan/fallback pages checked${coverage.pdfTotal?` · PDF total: ${coverage.pdfTotal} pages`:""}. ${coverage.vision} included from AI vision; ${coverage.ocr} from local OCR.</p>${coverage.pdfTotal?`<p class="pdf-page-total">${escape(pdfPageTotal(coverage))}</p>`:''}${scanFailureReasons.has(id)?`<p class="reading-stopped" role="alert">Reading stopped on page ${scanFailureReasons.get(id).page}: ${escape(scanFailureReasons.get(id).reason)}</p>`:''}${pageExplanations(coverage).length?`<details><summary>Why pages were skipped</summary><ul>${pageExplanations(coverage).map(p=>`<li>Page ${p.page}: ${escape(p.reason==='AI vision found no supported blood or semen result table.'?'AI vision found no supported test result table.':p.reason)}</li>`).join('')}</ul></details>`:''}</div>`).join('');
 }
 function showPaths(){
  for(const item of selectionList.querySelectorAll('li')){
   const id=item.querySelector('[data-summary-remove]')?.dataset.summaryRemove,text=readingPaths.get(id);
   let label=item.querySelector('.reading-path');
   if(!text){label?.remove();continue;}
   if(!label){label=document.createElement('p');label.className='reading-path';item.querySelector('.selected-report-details').append(label);}
   label.textContent=`Reading path: ${text}`;
  }
 }
 function showFailures(){
  const box=root.querySelector('#reading-failures');box.hidden=!failures.length;
  box.innerHTML=failures.map(f=>`<p>${escape(f.message)}</p>`).join('');
  for(const item of selectionList.querySelectorAll('li')){
   const id=item.querySelector('[data-summary-remove]')?.dataset.summaryRemove;
   const failure=failures.find(f=>f.reportId===id);item.dataset.readingStatus=failure?'failed':'';
   item.querySelectorAll('.reading-file-error,.reading-file-error-mobile').forEach(note=>note.remove());
   if(failure){const note=document.createElement('p');note.className='reading-file-error';note.textContent=failure.message;item.querySelector('.selected-report-details').append(note);const mobileNote=note.cloneNode(true);mobileNote.className='reading-file-error-mobile';item.append(mobileNote);}
  }
 }
 function setBusyControls(){
  button.disabled=busy||dailyRetryAt>Date.now()||!canPrepare();retry.disabled=busy||dailyRetryAt>Date.now()||!canPrepare();addReports.disabled=busy;
  selectionList.querySelectorAll('[data-summary-remove]').forEach(b=>b.disabled=busy);
  root.querySelector('#analysis-form').setAttribute('aria-busy',String(busy));
 }
 async function loadThumbnails(){
  if(root.hidden)return;
  for(const report of reports.filter(r=>reportIds.includes(r.id)&&r.contentType?.startsWith('image/'))){
   if(!thumbnails.has(report.id))thumbnails.set(report.id,fetchReport(report).then(blob=>URL.createObjectURL(blob)).catch(()=>null));
   const pending=thumbnails.get(report.id),url=await pending;
   if(!reportIds.includes(report.id)||thumbnails.get(report.id)!==pending)continue;
   const preview=[...selectionList.querySelectorAll('[data-summary-thumbnail]')].find(el=>el.dataset.summaryThumbnail===report.id);
   if(url&&preview){const img=document.createElement('img');img.src=url;img.alt='';preview.replaceChildren(img);}
  }
 }
 const visibility=new MutationObserver(()=>{if(!root.hidden)loadThumbnails();});visibility.observe(root,{attributes:true,attributeFilter:['hidden']});
 async function fetchReport(report){
  return reportCache(site,localStorage.getItem('health-history-upload-session')).original(report);
 }
 function sourceButton(marker,report,{scanNotice=true}={}){return `${scanNotice&&marker.readPath==='vision'?'<small class="scan-value-notice">read from scan, please check against the original</small>':''}<button class="source-button" type="button" data-source="${report.id}" data-page="${marker.page}" data-source-top="${Number.isFinite(marker.sourceTop)?marker.sourceTop:''}" data-source-name="${escape(marker.name)}" data-source-path="${marker.readPath==='vision'?'vision':''}" data-source-ocr-name="${escape(marker.original?.name??marker.rawName??marker.name)}">View original report <span class="sr-only"> for ${escape(marker.name)}, ${dateLabel(report.date)}</span></button>`;}
 function render(){
  if(!comparison)return;
  const c=comparison,dates=c.reports.map(r=>dateLabel(r.date)),tests=summaryTests(c),markers=tests.filter(m=>selected.has(m.key));
  const choices=tests.filter(m=>testInCategory(m,activeCategory)),visible=c.comparable.filter(m=>testInCategory(m,activeCategory)),unpaired=c.unpaired.filter(m=>testInCategory(m,activeCategory));
  const categoryName=HEALTH_CATEGORIES.find(c=>c.id===activeCategory)?.label??'All tests';
  const uniqueTests=[...new Map([...c.comparable,...c.unpaired].map(m=>[m.key,m])).values()];
  const categoryButtons=[{id:'all',label:'All tests',description:'Browse everything read from your selected reports'},...HEALTH_CATEGORIES].map(category=>{
   const count=uniqueTests.filter(m=>testInCategory(m,category.id)).length;
   const art=CATEGORY_ART[category.id];
   return `<button class="health-category${art?' health-category-with-art':''}" type="button" data-category="${category.id}" aria-pressed="${activeCategory===category.id}" title="${escape(category.description)}"><strong>${category.label}</strong><span>${count?`${count} ${count===1?'test':'tests'} available`:'No tests in these reports'}</span>${categoryIllustration(category.id)}</button>`;
  }).join('');
  const warnings=c.reports.flatMap(r=>r.warnings.map(w=>`${r.fileName}: ${w}`));
  output.innerHTML=`<div id="smart-summary-slot">${smartSummaryMarkup(smartSummary,c,sourceButton)}</div><section class="health-categories" aria-labelledby="category-title"><div class="category-heading"><h3 id="category-title">Browse by health category</h3><p>Common lab-test groups. Some tests appear in more than one group. These categories don’t indicate a diagnosis.</p></div><div class="category-grid" aria-label="Health categories">${categoryButtons}</div>${HEALTH_CATEGORIES.find(category=>category.id===activeCategory)?.note?`<p class="category-context">${activeCategory==='fertility'?'Fertility markers need clinical context; these results do not predict pregnancy chances.':`${escape(HEALTH_CATEGORIES.find(category=>category.id===activeCategory).description)}. ${escape(HEALTH_CATEGORIES.find(category=>category.id===activeCategory).note)}`}</p>`:''}<p class="category-context" role="status">${categoryName}: ${visible.length} comparable tests and ${unpaired.length} results without a matching test and unit. Choosing a category selects all its tests and clears other selections.</p></section><div class="test-picker-navigation"><details class="test-picker"><summary>Choose tests for your summary <span>${markers.length} selected</span></summary><p>Select any number of tests across all categories. Printing continues onto extra pages when needed. Showing ${categoryName.toLowerCase()}.</p><button class="secondary" id="select-no-tests" type="button" ${markers.length?'':'disabled'}>Select none</button><div class="test-options">${choices.map(m=>`<label><input type="checkbox" value="${escape(m.key)}" ${selected.has(m.key)?'checked':''}>${escape(m.name)} <span>${escape(m.unit)}${m.isComparable?'':' · Single report'}</span></label>`).join('')||'<p>No tests in this category in the selected reports.</p>'}</div><p id="selection-status" role="status" aria-live="polite"></p></details><button type="button" class="secondary summary-scroll-down" id="scroll-to-lab-summary" aria-label="Scroll to lab report summary" title="Scroll to lab report summary"><span aria-hidden="true">↓</span></button></div><article class="summary real-summary-paper" aria-labelledby="lab-report-summary-title"><div class="summary-heading"><div><h2 id="lab-report-summary-title" tabindex="-1">Lab report summary</h2><p>${dates.length===1?dates[0]:`${dates[0]} – ${dates.at(-1)}`}</p></div><div class="summary-print-actions"><div class="report-count"><strong>${c.reports.length}</strong> ${c.reports.length===1?'report included':'reports compared'}</div></div></div><div class="context"><div><span>Patient in reports</span><strong>${escape(c.later.patientName)}</strong></div><div><span>Selected tests</span><strong>${markers.length} of ${tests.length} available</strong></div><div><span>Source dates</span><strong>Dates printed in reports</strong></div></div>${c.reports.flatMap(r=>(r.unreadable??[]).map(m=>`<p class="scan-value-notice">${escape(m.name)} · ${dateLabel(r.date)} · unreadable in scan (page ${m.page}); check the original. ${sourceButton({...m,readPath:'vision'},r,{scanNotice:false})}</p>`)).join('')}<div class="section-heading"><h3>Selected test results</h3><span class="legend"><i></i> Lab's reference range</span></div><div class="markers">${[...markers].sort((a,b)=>Number(a.key.startsWith('semen-'))-Number(b.key.startsWith('semen-'))).map(m=>`<section class="marker"><div class="marker-heading"><h4>${escape(m.name)}</h4><span>${escape(m.unit)}</span></div><div class="aligned-results"><div class="aligned-results-inner" style="--result-count:${c.reports.length}">${m.isComparable?chart(m,dates):`<p class="single-result-note">${m.qualitative?'Written or ranged results · no numeric trend':'Single report result · no comparable trend'}</p>`}<div class="values" style="--report-columns:${c.reports.length}">${m.observations.map((value,i)=>value?`<div><p><strong title="${escape(originalResultTitle(value))}" class="result-value range-${rangeStatus(value.value,value.referenceText)}" aria-label="${number(value.value)}: ${statusLabel[rangeStatus(value.value,value.referenceText)]}">${number(value.value)}</strong> <span>${escape(value.unit)}</span></p><span>Reference: ${escape(value.referenceText)}</span>${sourceButton(value,c.reports[i])}</div>`:`<div><span>${dates[i]}</span><p>${escape(m.missingLabels[i])}</p></div>`).join('')}</div></div></div><div class="change"><strong>${m.qualitative?'Written or ranged results; no numeric change calculated':!m.isComparable?'One recorded value; no measured change can be calculated':m.change===0?'No measured change':`${m.change>0?'Increased':'Decreased'} by ${number(Math.abs(m.change))} ${escape(m.unit)}`}</strong><span>${m.isComparable?`${dateLabel(m.earlier.date)} – ${dateLabel(m.later.date)}`:dateLabel(m.later.date)}</span><span class="range-${rangeStatus(m.later.value,m.later.referenceText)}">Latest value: ${statusLabel[rangeStatus(m.later.value,m.later.referenceText)]}</span></div></section>`).join('')}</div><footer class="summary-footer"><p>Draft comparison of selected tests only. Check source reports for full results and context. A change is not a diagnosis or a judgement of health; your doctor interprets it.</p></footer></article><section class="reading-coverage"><h3>What was included</h3><p>${c.reports.reduce((n,r)=>n+r.pageCount,0)} report pages checked. ${c.reports.reduce((n,r)=>n+r.usedPages.length,0)} dated result-table pages used. Matching tests are compared only when their units agree.</p>${warnings.length?`<details><summary>Pages excluded from this comparison</summary><ul>${warnings.map(w=>`<li>${escape(w)}</li>`).join('')}</ul></details>`:''}</section><details class="all-results" ${activeCategory!=='all'?'open':''}><summary>${categoryName}: ${visible.length} comparable results</summary><div class="table-scroll"><table><thead><tr><th>Test</th>${dates.map(d=>`<th>${d}</th>`).join('')}<th>Measured change</th></tr></thead><tbody>${visible.map(m=>`<tr><th scope="row">${escape(m.name)}<small>${escape(m.unit)}</small></th>${m.observations.map((v,i)=>v?`<td><strong title="${escape(originalResultTitle(v))}">${number(v.value)}</strong><small>Ref: ${escape(v.referenceText)}</small>${sourceButton(v,c.reports[i])}</td>`:`<td>${escape(m.missingLabels[i])}</td>`).join('')}<td>${m.qualitative?'No numeric change':`${m.change>0?'+':''}${number(m.change)}`}<small>${dateLabel(m.earlier.date)} – ${dateLabel(m.later.date)}</small><small>${statusLabel[rangeStatus(m.later.value,m.later.referenceText)]}</small></td></tr>`).join('')}</tbody></table></div></details><details class="unpaired-results" ${activeCategory!=='all'?'open':''}><summary>${categoryName}: ${unpaired.length} results without a matching test and unit</summary><p>These values have no trend line. Tests with different conditions, such as fasting and random glucose, stay separate.</p><div class="table-scroll"><table><thead><tr><th>Test</th><th>Report date</th><th>Recorded result</th><th>Reference range</th><th>Source</th></tr></thead><tbody>${unpaired.map(m=>`<tr><th scope="row">${escape(m.name)}<small>${escape(m.unit)}</small>${m.rawName&&m.rawName!==m.name?`<small>Report name: ${escape(m.rawName)}</small>`:''}</th><td>${dateLabel(m.date)}</td><td><strong title="${escape(originalResultTitle(m))}">${number(m.value)}</strong><small>${escape(m.unit)}</small></td><td>${escape(m.referenceText)}</td><td>${sourceButton(m,m.report)}</td></tr>`).join('')||'<tr><td colspan="5">No results without a matching test and unit in this category.</td></tr>'}</tbody></table></div></details>`;
  output.querySelectorAll('[data-category]').forEach(button=>button.addEventListener('click',()=>{
   activeCategory=button.dataset.category;
   selected=new Set(summaryTests(comparison).filter(m=>testInCategory(m,activeCategory)).map(m=>m.key));
   render();output.querySelector('.test-picker').open=true;
   const heading=output.querySelector('.test-picker>summary');
   heading.style.scrollMarginTop='24px';
   heading.focus({preventScroll:true});
   heading.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});
  }));
  onReady(markers.length>0);
  if(!markers.length)output.querySelector('.markers').innerHTML='<p>No tests selected. Choose a test above to add it to your summary.</p>';
  rangeLabelsObserver?.disconnect();
  output.querySelectorAll('.chart').forEach(svg=>rangeLabelsObserver?.observe(svg));
  output.querySelector('#select-no-tests').addEventListener('click',()=>{selected.clear();render();output.querySelector('.test-picker').open=true;output.querySelector('.test-picker summary').focus();output.querySelector('#selection-status').textContent='All tests cleared.';});
  output.querySelector('#scroll-to-lab-summary').addEventListener('click',()=>{
   const summary=output.querySelector('.real-summary-paper');
   summary.querySelector('#lab-report-summary-title').focus({preventScroll:true});
   summary.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});
  });
  const picker=output.querySelector('.test-picker');
  picker.addEventListener('change',event=>{
   const input=event.target;if(input.type!=='checkbox')return;
   const key=input.value;
   input.checked?selected.add(key):selected.delete(key);render();output.querySelector('.test-picker').open=true;
   output.querySelector(`input[value="${CSS.escape(key)}"]`).focus();
  });
 }
 async function prepare({resume=false,retryFailed=false}={}){
  if(busy||dailyRetryAt>Date.now())return;
  const ids=[...reportIds],version=selectionVersion;
  const choices=ids.map(id=>reports.find(r=>r.id===id));
  const countError=analysisCountError(ids.length);if(countError){message(countError,true);return;}
  if(choices.some(r=>r?.duplicateOf&&ids.includes(reports.find(p=>p.serial===r.duplicateOf)?.id))){message('Untick duplicate reports before analyzing. Each report date should appear once.',true);return;}
  if(!canPrepare()||choices.some(r=>!r)||new Set(ids).size!==ids.length){message('Select at least one medical report in My reports.',true);return;}
  failures=[];readingPaths.clear();scanCoverage.clear();scanFailureReasons.clear();showCoverage();showPaths();showFailures();busy=true;setBusyControls();button.textContent='Reading reports…';comparison=null;smartSummary=null;output.innerHTML='';onReady(false);
  const logger=evaluationLogger();
  const summaryRun=await logger.begin('summary',ids,'HealthStats comparison and summary renderer v1');
  try{
   const {readLabReport,explainPdfTextPages}=await import('./report-reader.js');
   async function includeTextPages(file,coverage){
    if(coverage.pdfTotal&&!Array.isArray(coverage.textPages)){
     if(coverage.pdfTotal===coverage.total)coverage.textPages=[];
     else if(explainPdfTextPages)try{coverage.textPages=await explainPdfTextPages(await fetchReport(file));}catch{ /* Explanation failure must not fail a saved reading. */ }
    }
   }
   let parsed=[];const vision=visionReading(ids,{resume,retryFailed,onStatus:job=>{if(job.retryAt>Date.now())blockDailyUntil(job.retryAt);if(job.status==='failed'&&job.failureReason)scanFailureReasons.set(job.reportId,{page:job.page,reason:job.failureReason});readingPaths.set(job.reportId,`scan (AI vision) · page ${job.page}: ${job.status}`);showPaths();message(job.status==='failed'?VISION_FAILURE:`Scan page ${job.page}: ${job.status==='succeeded'?'finished':'reading on the server'}…`,job.status==='failed');}});
   for(let i=0;i<choices.length;i++){
    message(`Opening report ${i+1} of ${choices.length}…`);
    const file=choices[i];
    const readingRun=await logger.begin('report-reading',[file.id],'pdf.js 6.4.299 / Tesseract 6 / HealthStats parser v1');
    try{
     function showPath(text){readingPaths.set(file.id,text);showPaths();}
     const report=await reportCache(site,localStorage.getItem('health-history-upload-session')).reading(file,async()=>{
      const blob=await fetchReport(file);
      return readLabReport(blob,(page,total,step)=>{message(`Reading report ${i+1} of ${choices.length}: page ${page} of ${total}${step?` · ${step}`:''}…`);if(step?.includes('path'))showPath(step);},file.contentType,{vision:vision?(canvas,page,diagnostics)=>vision(canvas,page,file,diagnostics):null});
     });
     showPath((report.readingPaths??['text']).join(' + '));
     if(report.scanCoverage){await includeTextPages(file,report.scanCoverage);scanCoverage.set(file.id,report.scanCoverage);showCoverage();}
     await logger.finish(readingRun,report);parsed.push({...report,id:file.id,fileName:file.name});
    }catch(error){
     if(error.message.includes(VISION_FAILURE)){error.message=VISION_FAILURE;error.code='VISION_STOP';}
     if(error.pageCoverage){await includeTextPages(file,error.pageCoverage);scanCoverage.set(file.id,error.pageCoverage);showCoverage();}
     await logger.finish(readingRun,null,error);
     const reason=dailyRetryAt>Date.now()?dailyVisionMessage(dailyRetryAt):error.name==='TimeoutError'?'The file took too long to download. Try again.':error.message==='Failed to fetch'?'Could not download the file. Check your connection and try again.':error.message.includes('confidently')?'The scan is too unclear to read safely. Upload a clearer copy.':error.message.includes('No supported dated')?'Could not find a readable, dated test results table.':error.message;
     failures.push({reportId:file.id,fileName:file.name,error:error.message,message:`Report #${file.serial} (${file.name}) could not be read: ${reason}`});showFailures();
     if(error.code==='VISION_STOP')throw error;
    }
   }
   if(version!==selectionVersion)throw Error('Report selection changed. Prepare the summary again.');
   if(choices.some(r=>!reports.some(p=>p.id===r.id)))throw Error('A selected report was deleted. Choose saved reports and prepare the summary again.');
   if(!parsed.length)throw Error('None of the selected files could be read. Check the file errors above and try again.');
   message('Matching test names and units…');
   parsed=await normalizeReportTests(parsed,testMatching(ids));
   if(version!==selectionVersion)throw Error('Report selection changed. Prepare the summary again.');
   if(parsed.length===1){const report=parsed[0];comparison={reports:parsed,earlier:report,later:report,comparable:[],unpaired:report.markers.map(m=>({...m,date:report.date,report}))};}
   else comparison=compareReportSeries(parsed);
   activeCategory='all';
   selected=new Set(preferred.map(prefix=>comparison.comparable.find(m=>m.key.split('|')[0]===prefix)?.key).filter(Boolean));
   for(const marker of comparison.comparable){if(selected.size>=6)break;selected.add(marker.key);}
   if(parsed.length===1)selected=new Set(parsed[0].markers.map(m=>m.key));
   render();finishVisionReading(ids);await logger.finish(summaryRun,{comparison,failedFiles:failures,selectedTestKeys:[...selected],summaryHtml:output.querySelector('.real-summary-paper').outerHTML});const readingWarnings=comparison.reports.flatMap(r=>r.warnings).filter(w=>w.startsWith('Reading error'));message(`${parsed.length} ${parsed.length===1?'report read; showing its results only. No trend can be calculated.':`reports read · ${comparison.comparable.length} matching tests found.`} ${failures.length?`${failures.length} file${failures.length===1?'':'s'} could not be read; see the file errors above. `:''}${readingWarnings.length?'Reading error: some scanned pages could not be read and were excluded. See What was included and check the originals.':'Check values against their original source reports.'}`,readingWarnings.length>0||failures.length>0);onReady(true);
   smartSummary=await requestSmartSummary(summaryRun);
   if(version!==selectionVersion)return;
   output.querySelector('#smart-summary-slot').innerHTML=smartSummaryMarkup(smartSummary,comparison,sourceButton);
   if(!root.hidden){
    const heading=output.querySelector('#smart-summary-title');
    heading.setAttribute('tabindex','-1');
    heading.focus({preventScroll:true});
    heading.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});
   }
  }catch(error){finishVisionReading(ids,true);await logger.finish(summaryRun,null,error);message(error.name==='TimeoutError'?'A report took too long to download. Check your connection and try Prepare summary again.':error.message==='Failed to fetch'?'Could not read the report. Check your connection and try again.':error.message,true);}
  finally{busy=false;setBusyControls();button.innerHTML='Prepare summary <span aria-hidden="true">→</span>';}
 }
 root.querySelector('#analysis-form').addEventListener('submit',event=>{event.preventDefault();prepare({retryFailed:true});});
 retry.addEventListener('click',()=>prepare({retryFailed:true}));
 output.addEventListener('click',async event=>{
  const link=event.target.closest('[data-source]');if(!link||link.disabled)return;
  const report=reports.find(r=>r.id===link.dataset.source);if(!report)return;
  await openReportViewer({name:`Report #${report.serial} · ${report.name}`,page:link.dataset.page,sourceTop:link.dataset.sourceTop===''?undefined:Number(link.dataset.sourceTop),sourceName:link.dataset.sourceName,readPath:link.dataset.sourcePath,sourceOcrName:link.dataset.sourceOcrName,load:()=>fetchReport(report)});
 });
 return {prepare,updateReports(saved,ids=[]){
  reports=saved;
  const next=ids.filter(id=>reports.some(r=>r.id===id));
  if(JSON.stringify(next)!==JSON.stringify(reportIds)){
   blockDailyUntil(0);reportIds=next;selectionVersion++;failures=[];readingPaths.clear();scanCoverage.clear();scanFailureReasons.clear();showCoverage();showFailures();comparison=null;smartSummary=null;output.innerHTML='';onReady(false);
   message('Report selection changed. Prepare the summary when ready.');
  }
  const choices=reportIds.map(id=>reports.find(r=>r.id===id));
  root.querySelector('#analysis-selection-count').textContent=`${choices.length} of ${MAX_ANALYSIS_REPORTS} reports selected`;
  selectionList.innerHTML=choices.length?`<ul class="analysis-selected-list">${choices.map(r=>`<li><span class="selected-report-number" aria-label="Report #${escape(r.serial)}">${escape(r.serial)}</span><div class="selected-report-preview" ${r.contentType?.startsWith('image/')?`data-summary-thumbnail="${escape(r.id)}"`:''} aria-hidden="true">${pdfIcon}<span>${r.contentType==='application/pdf'?'PDF':'Photo'}</span></div><div class="selected-report-details"><strong title="${escape(r.name)}">${escape(r.name)}</strong><p>${calendarIcon}${escape(r.details?.testDate?testDateLabel(r.details.testDate):'Date not added')}</p><p>${labIcon}${escape(r.details?.labName||'Lab not added')}</p>${r.duplicateOf?`<p class="duplicate-note">Duplicate of report #${escape(r.duplicateOf)}</p>`:''}</div><span class="selected-report-file">${r.contentType==='application/pdf'?'PDF':'Image'} · ${sizeLabel(r.size)}</span><button type="button" class="remove-analysis-report" data-summary-remove="${escape(r.id)}" aria-label="Remove report #${escape(r.serial)} from selection">${summaryIcon('<path d="m6 6 12 12M18 6 6 18"/>')}</button></li>`).join('')}</ul>`:'<div class="summary-empty"><p>No reports selected</p><span>Choose a medical report from My Reports to prepare a summary.</span></div>';
  preparationHelp.textContent=choices.length<2?'Add a second report from another date to see trends.':`Compare up to ${MAX_ANALYSIS_REPORTS} reports from different dates.`;
  for(const [id,pending] of thumbnails){if(!reportIds.includes(id)){thumbnails.delete(id);pending.then(url=>{if(url)URL.revokeObjectURL(url);});}}
  showFailures();showPaths();showCoverage();loadThumbnails();setBusyControls();
  if(reportIds.length>MAX_ANALYSIS_REPORTS)message(analysisCountError(reportIds.length),true);
  if(choices.length===1)message('One report selected. Add a second report to see a trend.');
  const pending=savedVisionReading(reportIds);
  if(!busy&&canPrepare()&&pending?.status==='reading'){busy=true;queueMicrotask(()=>{busy=false;prepare({resume:true});});}

 }};
}
