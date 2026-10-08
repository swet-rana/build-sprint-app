import { MAX_ANALYSIS_REPORTS, analysisCountError } from './analysis-rules.js';
import { openReportViewer } from './report-viewer.js';
import './summary.css';
import { shortTestType } from './report-details.js';
import { summaryTests } from './summary-tests.js';
import { HEALTH_CATEGORIES, testInCategory } from './health-categories.js';
import { compareReportSeries, parseRange, rangeStatus } from './lab-parser.js';
const escape=text=>String(text??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const number=n=>n.toLocaleString('en-IN',{maximumFractionDigits:5});
const dateLabel=date=>new Date(date+'T00:00:00Z').toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'});
const preferred=['wbc','haemoglobin','esr','tsh','vitamin-d','vitamin-b12'];
const statusLabel={above:'Above this report’s range',below:'Below this report’s range',within:'Within this report’s range',unknown:'See source for interpretation'};
function chart(marker,dates){
 const observations=marker.observations;
 const ranges=observations.map(m=>m?parseRange(m.referenceText):null);
 const a=ranges[0],same=a&&a.low!==null&&a.high!==null&&ranges.every(r=>r&&JSON.stringify(r)===JSON.stringify(a));
 const values=observations.filter(Boolean).map(m=>m.value),bounds=same?[a.low,a.high]:[];
 const high=Math.max(...values,...bounds,1)*1.24,low=Math.min(...values,...bounds,0);
 const chartWidth=Math.max(440,dates.length*140);
 const y=value=>122-(value-low)/(high-low)*96,x=i=>(i+.5)*chartWidth/dates.length;
 const dateY=Math.max(...values.map(y),...(same?[y(a.low)]:[]))+24;
 const chartHeight=dateY+12;
 const lines=observations.map((m,i)=>m&&i&&observations[i-1]?`<path d="M${x(i-1)} ${y(observations[i-1].value)} L${x(i)} ${y(m.value)}" fill="none" stroke="#176889" stroke-width="3"/>`:'').join('');
 return `<svg class="chart" viewBox="0 0 ${chartWidth} ${chartHeight}" role="img" aria-label="${escape(marker.name)}: ${observations.map((m,i)=>`${m?number(m.value):marker.missingLabels[i]} on ${dates[i]}`).join(', ')}, ${escape(marker.unit)}.">${same?`<rect x="22" y="${y(a.high)}" width="${chartWidth-44}" height="${y(a.low)-y(a.high)}" fill="#e6f0f1"/><text x="18" y="${y(a.high)+4}" text-anchor="end">${number(a.high)}</text><text x="18" y="${y(a.low)+4}" text-anchor="end">${number(a.low)}</text>`:''}${lines}${observations.map((m,i)=>m?`<circle cx="${x(i)}" cy="${y(m.value)}" r="5" class="result-point range-${rangeStatus(m.value,m.referenceText)}" fill="#176889"/><text x="${x(i)}" y="${y(m.value)-12}" text-anchor="middle" class="point-label result-value range-${rangeStatus(m.value,m.referenceText)}">${number(m.value)}</text>`:'').join('')}${dates.map((d,i)=>dates.length>4&&i!==0&&i!==dates.length-1?'':`<text x="${x(i)}" y="${dateY}" text-anchor="middle">${d}</text>`).join('')}</svg>`;
}
export function mountAnalysis(root,onReady){
 root.innerHTML=`<section class="analysis-controls"><h2>Reports selected for analysis</h2><form id="analysis-form"><div id="selected-analysis-reports"></div><button class="primary" id="prepare-summary" type="submit" disabled>Prepare summary</button></form><p id="analysis-status" role="status" aria-live="polite"></p></section><div id="real-summary"></div>`;
 const button=root.querySelector('#prepare-summary'),status=root.querySelector('#analysis-status'),output=root.querySelector('#real-summary'),selectionList=root.querySelector('#selected-analysis-reports');
 let reports=[],reportIds=[],comparison=null,selected=new Set(),busy=false,activeCategory='all',selectionVersion=0;
 function canPrepare(){return reportIds.length>=2&&reportIds.length<=MAX_ANALYSIS_REPORTS&&reportIds.every(id=>reports.some(r=>r.id===id));}
 const site=import.meta.env.VITE_CONVEX_URL?.replace(/\.convex\.cloud\/?$/,'.convex.site');
 function message(text,error=false){status.textContent=text;status.classList.toggle('is-error',error);}
 async function fetchReport(report){
  const response=await fetch(`${site}/reports/open`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionKey:localStorage.getItem('health-history-upload-session'),reportId:report.id}),signal:AbortSignal.timeout(60000)});
  if(!response.ok){const error=await response.json();throw Error(error.error||'Could not read the report. Try again.');}
  return response.blob();
 }
 function sourceButton(marker,report){return `<button class="source-button" type="button" data-source="${report.id}" data-page="${marker.page}">View original report <span class="sr-only"> for ${escape(marker.name)}, ${dateLabel(report.date)}</span></button>`;}
 function render(){
  if(!comparison)return;
  const c=comparison,dates=c.reports.map(r=>dateLabel(r.date)),tests=summaryTests(c),markers=tests.filter(m=>selected.has(m.key));
  const choices=tests.filter(m=>testInCategory(m,activeCategory)),visible=c.comparable.filter(m=>testInCategory(m,activeCategory)),unpaired=c.unpaired.filter(m=>testInCategory(m,activeCategory));
  const categoryName=HEALTH_CATEGORIES.find(c=>c.id===activeCategory)?.label??'All tests';
  const uniqueTests=[...new Map([...c.comparable,...c.unpaired].map(m=>[m.key,m])).values()];
  const categoryButtons=[{id:'all',label:'All tests',description:'Browse everything read from your selected reports'},...HEALTH_CATEGORIES].map(category=>{
   const count=uniqueTests.filter(m=>testInCategory(m,category.id)).length;
   const art={heart:'heart-cholesterol',liver:'liver',kidney:'kidney',sugar:'blood-sugar',thyroid:'thyroid',blood:'blood-counts',inflammation:'inflammation',iron:'iron',vitamins:'vitamins',bone:'bone-minerals',electrolytes:'electrolytes',hormones:'reproductive-hormones',digestion:'pancreas-digestion',clotting:'blood-clotting',allergy:'allergy-markers',other:'other-tests'}[category.id];
   return `<button class="health-category${art?' health-category-with-art':''}" type="button" data-category="${category.id}" aria-pressed="${activeCategory===category.id}"><strong>${category.label}</strong><span>${count?`${count} ${count===1?'test':'tests'} available`:'No tests in these reports'}</span>${art?`<img class="health-category-art" src="/images/${art}.png" alt="" width="76" height="76" decoding="async">`:''}</button>`;
  }).join('');
  const warnings=c.reports.flatMap(r=>r.warnings.map(w=>`${r.fileName}: ${w}`));
  output.innerHTML=`<div class="summary-review"><strong>Check this draft against the originals.</strong> This comparison shows recorded values, not diagnoses. ${c.comparable.length} tests appear in at least two selected reports. Missing values stay blank.</div><section class="health-categories" aria-labelledby="category-title"><div class="category-heading"><h3 id="category-title">Browse by health category</h3><p>Common lab-test groups. Some tests appear in more than one group. These categories don’t indicate a diagnosis.</p></div><div class="category-grid" aria-label="Health categories">${categoryButtons}</div><p class="category-context" role="status">${categoryName}: ${visible.length} comparable tests and ${unpaired.length} results without a matching test and unit. Choosing a category selects all its tests and clears other selections.</p></section><details class="test-picker"><summary>Choose tests for your summary <span>${markers.length} selected</span></summary><p>Select any number of tests across all categories. Printing continues onto extra pages when needed. Showing ${categoryName.toLowerCase()}.</p><button class="secondary" id="select-no-tests" type="button" ${markers.length?'':'disabled'}>Select none</button><div class="test-options">${choices.map(m=>`<label><input type="checkbox" value="${escape(m.key)}" ${selected.has(m.key)?'checked':''}>${escape(m.name)} <span>${escape(m.unit)}${m.isComparable?'':' · Single report'}</span></label>`).join('')||'<p>No tests in this category in the selected reports.</p>'}</div><p id="selection-status" role="status" aria-live="polite"></p></details><article class="summary real-summary-paper"><div class="summary-heading"><div><h2>Blood report summary</h2><p>${dates[0]} – ${dates.at(-1)}</p></div><div class="report-count"><strong>${c.reports.length}</strong> reports compared</div></div><div class="context"><div><span>Patient in reports</span><strong>${escape(c.later.patientName)}</strong></div><div><span>Selected tests</span><strong>${markers.length} of ${tests.length} available</strong></div><div><span>Source dates</span><strong>Blood sample collection dates</strong></div></div><div class="section-heading"><h3>Selected test results</h3><span class="legend"><i></i> Lab's reference range</span></div><div class="markers">${markers.map(m=>`<section class="marker"><div class="marker-heading"><h4>${escape(m.name)}</h4><span>${escape(m.unit)}</span></div><div class="aligned-results"><div class="aligned-results-inner" style="--result-count:${c.reports.length}">${m.isComparable?chart(m,dates):'<p class="single-result-note">Single report result · no comparable trend</p>'}<div class="values" style="--report-columns:${c.reports.length}">${m.observations.map((value,i)=>value?`<div><p><strong class="result-value range-${rangeStatus(value.value,value.referenceText)}" aria-label="${number(value.value)}: ${statusLabel[rangeStatus(value.value,value.referenceText)]}">${number(value.value)}</strong> <span>${escape(value.unit)}</span></p><span>Reference: ${escape(value.referenceText)}</span>${sourceButton(value,c.reports[i])}</div>`:`<div><span>${dates[i]}</span><p>${escape(m.missingLabels[i])}</p></div>`).join('')}</div></div></div><div class="change"><strong>${!m.isComparable?'One recorded value; no measured change can be calculated':m.change===0?'No measured change':`${m.change>0?'Increased':'Decreased'} by ${number(Math.abs(m.change))} ${escape(m.unit)}`}</strong><span>${m.isComparable?`${dateLabel(m.earlier.date)} – ${dateLabel(m.later.date)}`:dateLabel(m.later.date)}</span><span class="range-${rangeStatus(m.later.value,m.later.referenceText)}">Latest value: ${statusLabel[rangeStatus(m.later.value,m.later.referenceText)]}</span></div></section>`).join('')}</div><footer class="summary-footer"><p>Draft comparison of selected tests only. Check source reports for full results and context. A change is not a diagnosis or a judgement of health; your doctor interprets it.</p></footer></article><section class="reading-coverage"><h3>What was included</h3><p>${c.reports.reduce((n,r)=>n+r.pageCount,0)} report pages checked. ${c.reports.reduce((n,r)=>n+r.usedPages.length,0)} dated blood-table pages used. Matching tests are compared only when their units agree.</p>${warnings.length?`<details><summary>Pages excluded from this comparison</summary><ul>${warnings.map(w=>`<li>${escape(w)}</li>`).join('')}</ul></details>`:''}</section><details class="all-results" ${activeCategory!=='all'?'open':''}><summary>${categoryName}: ${visible.length} comparable results</summary><div class="table-scroll"><table><thead><tr><th>Test</th>${dates.map(d=>`<th>${d}</th>`).join('')}<th>Measured change</th></tr></thead><tbody>${visible.map(m=>`<tr><th scope="row">${escape(m.name)}<small>${escape(m.unit)}</small></th>${m.observations.map((v,i)=>v?`<td><strong>${number(v.value)}</strong><small>Ref: ${escape(v.referenceText)}</small>${sourceButton(v,c.reports[i])}</td>`:`<td>${escape(m.missingLabels[i])}</td>`).join('')}<td>${m.change>0?'+':''}${number(m.change)}<small>${dateLabel(m.earlier.date)} – ${dateLabel(m.later.date)}</small><small>${statusLabel[rangeStatus(m.later.value,m.later.referenceText)]}</small></td></tr>`).join('')}</tbody></table></div></details><details class="unpaired-results" ${activeCategory!=='all'?'open':''}><summary>${categoryName}: ${unpaired.length} results without a matching test and unit</summary><p>These values have no trend line. Tests with different conditions, such as fasting and random glucose, stay separate.</p><div class="table-scroll"><table><thead><tr><th>Test</th><th>Report date</th><th>Recorded result</th><th>Reference range</th><th>Source</th></tr></thead><tbody>${unpaired.map(m=>`<tr><th scope="row">${escape(m.name)}<small>${escape(m.unit)}</small>${m.rawName&&m.rawName!==m.name?`<small>Report name: ${escape(m.rawName)}</small>`:''}</th><td>${dateLabel(m.date)}</td><td><strong>${number(m.value)}</strong><small>${escape(m.unit)}</small></td><td>${escape(m.referenceText)}</td><td>${sourceButton(m,m.report)}</td></tr>`).join('')||'<tr><td colspan="5">No results without a matching test and unit in this category.</td></tr>'}</tbody></table></div></details>`;
  output.querySelectorAll('[data-category]').forEach(button=>button.addEventListener('click',()=>{
   activeCategory=button.dataset.category;
   selected=new Set(summaryTests(comparison).filter(m=>testInCategory(m,activeCategory)).map(m=>m.key));
   render();output.querySelector('.test-picker').open=true;
   output.querySelector(`[data-category="${activeCategory}"]`).focus();
  }));
  onReady(markers.length>0);
  if(!markers.length)output.querySelector('.markers').innerHTML='<p>No tests selected. Choose a test above to add it to your summary.</p>';
  output.querySelector('#select-no-tests').addEventListener('click',()=>{selected.clear();render();output.querySelector('.test-picker').open=true;output.querySelector('.test-picker summary').focus();output.querySelector('#selection-status').textContent='All tests cleared.';});
  const picker=output.querySelector('.test-picker');
  picker.addEventListener('change',event=>{
   const input=event.target;if(input.type!=='checkbox')return;
   const key=input.value;
   input.checked?selected.add(key):selected.delete(key);render();output.querySelector('.test-picker').open=true;
   output.querySelector(`input[value="${CSS.escape(key)}"]`).focus();
  });
 }
 async function prepare(){
  if(busy)return;
  const ids=[...reportIds],version=selectionVersion;
  const choices=ids.map(id=>reports.find(r=>r.id===id));
  const countError=analysisCountError(ids.length);if(countError){message(countError,true);return;}
  if(choices.some(r=>r?.duplicateOf&&ids.includes(reports.find(p=>p.serial===r.duplicateOf)?.id))){message('Untick duplicate reports before analyzing. Each report date should appear once.',true);return;}
  if(!canPrepare()||choices.some(r=>!r)||new Set(ids).size!==ids.length){message('Tick at least two different blood reports in My reports.',true);return;}
  busy=true;button.disabled=true;button.textContent='Reading reports…';comparison=null;output.innerHTML='';onReady(false);
  try{
   const {readLabReport}=await import('./report-reader.js');
   const parsed=[];
   for(let i=0;i<choices.length;i++){
    message(`Opening report ${i+1} of ${choices.length}…`);
    const blob=await fetchReport(choices[i]);
    let report;
    try{report=await readLabReport(blob,(page,total,step)=>message(`Reading report ${i+1} of ${choices.length}: page ${page} of ${total}${step?` · ${step}`:''}…`),choices[i].contentType);}
    catch(error){throw Error(`Reading error — report #${choices[i].serial}: ${error.message}`);}
    parsed.push({...report,id:choices[i].id,fileName:choices[i].name});
   }
   if(version!==selectionVersion)throw Error('Report selection changed. Prepare the summary again.');
   if(choices.some(r=>!reports.some(p=>p.id===r.id)))throw Error('A selected report was deleted. Choose saved reports and prepare the summary again.');
   comparison=compareReportSeries(parsed);activeCategory='all';
   selected=new Set(preferred.map(prefix=>comparison.comparable.find(m=>m.key.split('|')[0]===prefix)?.key).filter(Boolean));
   for(const marker of comparison.comparable){if(selected.size>=6)break;selected.add(marker.key);}
   render();const readingWarnings=comparison.reports.flatMap(r=>r.warnings).filter(w=>w.startsWith('Reading error'));message(`${choices.length} reports read. ${comparison.comparable.length} matching tests found. ${readingWarnings.length?'Reading error: some scanned pages could not be read and were excluded. See What was included and check the originals.':'Check values against their source pages.'}`,readingWarnings.length>0);onReady(true);
  }catch(error){message(error.name==='TimeoutError'?'A report took too long to download. Check your connection and try Prepare summary again.':error.message==='Failed to fetch'?'Could not read the report. Check your connection and try again.':error.message,true);}
  finally{busy=false;button.disabled=!canPrepare();button.textContent='Prepare summary';}
 }
 root.querySelector('#analysis-form').addEventListener('submit',event=>{event.preventDefault();prepare();});
 output.addEventListener('click',async event=>{
  const link=event.target.closest('[data-source]');if(!link||link.disabled)return;
  const report=reports.find(r=>r.id===link.dataset.source);if(!report)return;
  await openReportViewer({name:`Report #${report.serial} · ${report.name}`,page:link.dataset.page,load:()=>fetchReport(report)});
 });
 return {prepare,updateReports(saved,ids=[]){
  reports=saved;
  const next=ids.filter(id=>reports.some(r=>r.id===id));
  if(JSON.stringify(next)!==JSON.stringify(reportIds)){
   reportIds=next;selectionVersion++;comparison=null;output.innerHTML='';onReady(false);
   message('Report selection changed. Prepare the summary when ready.');
  }
  const choices=reportIds.map(id=>reports.find(r=>r.id===id));
  selectionList.innerHTML=choices.length?`<ul class="analysis-selected-list">${choices.map(r=>`<li><strong>Report #${r.serial}</strong> · ${escape(r.details?.testType?shortTestType(r.details.testType):r.name)}<span>${escape(r.details?.labName||'')} · ${escape(r.details?.patientName||'')} · ${escape(r.details?.testDate||'Date not added')}${r.duplicateOf?` · Duplicate of report #${r.duplicateOf}`:''}</span></li>`).join('')}</ul>`:'<p>No reports selected. Tick the boxes in My reports to add them here.</p>';
  button.disabled=busy||!canPrepare();
  if(reportIds.length>MAX_ANALYSIS_REPORTS)message(analysisCountError(reportIds.length),true);
  if(choices.length&&choices.length<2)message('Select at least two reports to compare.');

 }};
}
