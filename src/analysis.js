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
 const y=value=>122-(value-low)/(high-low)*96,x=i=>104+i*242/(dates.length-1);
 const lines=observations.map((m,i)=>m&&i&&observations[i-1]?`<path d="M${x(i-1)} ${y(observations[i-1].value)} L${x(i)} ${y(m.value)}" fill="none" stroke="#176889" stroke-width="3"/>`:'').join('');
 return `<svg class="chart" viewBox="0 0 440 158" role="img" aria-label="${escape(marker.name)}: ${observations.map((m,i)=>`${m?number(m.value):marker.missingLabels[i]} on ${dates[i]}`).join(', ')}, ${escape(marker.unit)}.">${same?`<rect x="66" y="${y(a.high)}" width="324" height="${y(a.low)-y(a.high)}" fill="#e6f0f1"/><text x="61" y="${y(a.high)+4}" text-anchor="end">${number(a.high)}</text><text x="61" y="${y(a.low)+4}" text-anchor="end">${number(a.low)}</text>`:''}${lines}${observations.map((m,i)=>m?`<circle cx="${x(i)}" cy="${y(m.value)}" r="5" fill="#176889"/><text x="${x(i)}" y="${y(m.value)-12}" text-anchor="middle" class="point-label">${number(m.value)}</text>`:'').join('')}${dates.map((d,i)=>`<text x="${x(i)}" y="149" text-anchor="middle">${d}</text>`).join('')}</svg>`;
}
export function mountAnalysis(root,onReady){
 root.innerHTML=`<section class="analysis-controls"><h2>Compare your uploaded reports</h2><p>Choose two or three text-readable blood-test PDFs. Results are read from dated tables, then linked to their source pages. Photos and scanned-only PDFs aren’t supported yet.</p><form id="analysis-form"><div class="report-selectors"><label>First report<select id="first-report" required></select></label><label>Second report<select id="second-report" required></select></label><label>Third report (optional)<select id="third-report"></select></label></div><button class="primary" id="prepare-summary" type="submit" disabled>Prepare summary</button></form><p id="analysis-status" role="status" aria-live="polite"></p></section><div id="real-summary"></div>`;
 const first=root.querySelector('#first-report'),second=root.querySelector('#second-report'),third=root.querySelector('#third-report'),button=root.querySelector('#prepare-summary'),status=root.querySelector('#analysis-status'),output=root.querySelector('#real-summary');
 let reports=[],comparison=null,selected=new Set(),busy=false,activeCategory='all';
 const site=import.meta.env.VITE_CONVEX_URL?.replace(/\.convex\.cloud\/?$/,'.convex.site');
 function message(text,error=false){status.textContent=text;status.classList.toggle('is-error',error);}
 async function fetchReport(report){
  const response=await fetch(`${site}/reports/open`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionKey:localStorage.getItem('health-history-upload-session'),reportId:report.id}),signal:AbortSignal.timeout(60000)});
  if(!response.ok){const error=await response.json();throw Error(error.error||'Could not read the report. Try again.');}
  return response.blob();
 }
 function sourceButton(marker,report){return `<button class="source-button" type="button" data-source="${report.id}" data-page="${marker.page}">View original report <span>· p. ${marker.page}</span><span class="sr-only"> for ${escape(marker.name)}, ${dateLabel(report.date)} (opens a new tab)</span></button>`;}
 function render(){
  if(!comparison)return;
  const c=comparison,dates=c.reports.map(r=>dateLabel(r.date)),markers=c.comparable.filter(m=>selected.has(m.key));
  const visible=c.comparable.filter(m=>testInCategory(m,activeCategory)),unpaired=c.unpaired.filter(m=>testInCategory(m,activeCategory));
  const categoryName=HEALTH_CATEGORIES.find(c=>c.id===activeCategory)?.label??'All tests';
  const uniqueTests=[...new Map([...c.comparable,...c.unpaired].map(m=>[m.key,m])).values()];
  const categoryButtons=[{id:'all',label:'All tests',description:'Browse everything read from your selected reports'},...HEALTH_CATEGORIES].map(category=>{
   const count=uniqueTests.filter(m=>testInCategory(m,category.id)).length;
   return `<button class="health-category" type="button" data-category="${category.id}" aria-pressed="${activeCategory===category.id}"><strong>${category.label}</strong><span>${count?`${count} ${count===1?'test':'tests'} available`:'No tests in these reports'}</span></button>`;
  }).join('');
  const warnings=c.reports.flatMap(r=>r.warnings.map(w=>`${r.fileName}: ${w}`));
  output.innerHTML=`<div class="summary-review"><strong>Check this draft against the originals.</strong> This comparison shows recorded values, not diagnoses. ${c.comparable.length} tests appear in at least two selected reports. Missing values stay blank.</div><section class="health-categories" aria-labelledby="category-title"><div class="category-heading"><h3 id="category-title">Browse by health category</h3><p>Common lab-test groups. Some tests appear in more than one group. These categories don’t indicate a diagnosis.</p></div><div class="category-grid" aria-label="Health categories">${categoryButtons}</div><p class="category-context" role="status">${categoryName}: ${visible.length} comparable tests and ${unpaired.length} results without a matching test and unit. Choosing a category selects all its comparable tests and clears other selections.</p></section><details class="test-picker"><summary>Choose tests for your summary <span>${markers.length} selected</span></summary><p>Select any number of tests across all categories. Printing continues onto extra pages when needed. Showing ${categoryName.toLowerCase()}.</p><button class="secondary" id="select-no-tests" type="button" ${markers.length?'':'disabled'}>Select none</button><div class="test-options">${visible.map(m=>`<label><input type="checkbox" value="${escape(m.key)}" ${selected.has(m.key)?'checked':''}>${escape(m.name)} <span>${escape(m.unit)}</span></label>`).join('')||'<p>No comparable tests in this category. Any single-report values are listed below.</p>'}</div><p id="selection-status" role="status" aria-live="polite"></p></details><article class="summary real-summary-paper"><div class="summary-heading"><div><h2>Blood report summary</h2><p>${dates[0]} – ${dates.at(-1)}</p></div><div class="report-count"><strong>${c.reports.length}</strong> reports compared</div></div><div class="context"><div><span>Patient in reports</span><strong>${escape(c.later.patientName)}</strong></div><div><span>Selected tests</span><strong>${markers.length} of ${c.comparable.length} comparable</strong></div><div><span>Source dates</span><strong>Blood sample collection dates</strong></div></div><div class="section-heading"><h3>Changes between reports</h3><span class="legend"><i></i> Report reference range</span></div><div class="markers">${markers.map(m=>`<section class="marker"><div class="marker-heading"><h4>${escape(m.name)}</h4><span>${escape(m.unit)}</span></div>${chart(m,dates)}<div class="values" style="--report-columns:${c.reports.length}">${m.observations.map((value,i)=>value?`<div><span>${dates[i]}</span><p><strong>${number(value.value)}</strong> <span>${escape(value.unit)}</span></p><span>Reference: ${escape(value.referenceText)}</span>${sourceButton(value,c.reports[i])}</div>`:`<div><span>${dates[i]}</span><p>${escape(m.missingLabels[i])}</p></div>`).join('')}</div><div class="change"><strong>${m.change===0?'No measured change':`${m.change>0?'Increased':'Decreased'} by ${number(Math.abs(m.change))} ${escape(m.unit)}`}</strong><span>${dateLabel(m.earlier.date)} – ${dateLabel(m.later.date)}</span><span class="range-${rangeStatus(m.later.value,m.later.referenceText)}">${statusLabel[rangeStatus(m.later.value,m.later.referenceText)]}</span></div></section>`).join('')}</div><footer class="summary-footer"><p>Draft comparison of selected tests only. Check source reports for full results and context. A change is not a diagnosis or a judgement of health; your doctor interprets it.</p></footer></article><section class="reading-coverage"><h3>What was included</h3><p>${c.reports.reduce((n,r)=>n+r.pageCount,0)} PDF pages checked. ${c.reports.reduce((n,r)=>n+r.usedPages.length,0)} dated blood-table pages used. Matching tests are compared only when their units agree.</p>${warnings.length?`<details><summary>Pages excluded from this comparison</summary><ul>${warnings.map(w=>`<li>${escape(w)}</li>`).join('')}</ul></details>`:''}</section><details class="all-results" ${activeCategory!=='all'?'open':''}><summary>${categoryName}: ${visible.length} comparable results</summary><div class="table-scroll"><table><thead><tr><th>Test</th>${dates.map(d=>`<th>${d}</th>`).join('')}<th>Measured change</th></tr></thead><tbody>${visible.map(m=>`<tr><th scope="row">${escape(m.name)}<small>${escape(m.unit)}</small></th>${m.observations.map((v,i)=>v?`<td><strong>${number(v.value)}</strong><small>Ref: ${escape(v.referenceText)}</small>${sourceButton(v,c.reports[i])}</td>`:`<td>${escape(m.missingLabels[i])}</td>`).join('')}<td>${m.change>0?'+':''}${number(m.change)}<small>${dateLabel(m.earlier.date)} – ${dateLabel(m.later.date)}</small><small>${statusLabel[rangeStatus(m.later.value,m.later.referenceText)]}</small></td></tr>`).join('')}</tbody></table></div></details><details class="unpaired-results" ${activeCategory!=='all'?'open':''}><summary>${categoryName}: ${unpaired.length} results without a matching test and unit</summary><p>These values have no trend line. Tests with different conditions, such as fasting and random glucose, stay separate.</p><ul>${unpaired.map(m=>`<li><div><strong>${escape(m.name)}</strong><span>${dateLabel(m.date)} · ${number(m.value)} ${escape(m.unit)} · Reference: ${escape(m.referenceText)}</span></div>${sourceButton(m,m.report)}</li>`).join('')}</ul></details>`;
  output.querySelectorAll('[data-category]').forEach(button=>button.addEventListener('click',()=>{
   activeCategory=button.dataset.category;
   selected=new Set(comparison.comparable.filter(m=>testInCategory(m,activeCategory)).map(m=>m.key));
   render();output.querySelector('.test-picker').open=true;
   output.querySelector(`[data-category="${activeCategory}"]`).focus();
  }));
  if(activeCategory!=='all'){
   const paper=output.querySelector('.real-summary-paper');
   paper.before(output.querySelector('.all-results'),output.querySelector('.unpaired-results'));
  }
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
  const ids=[first.value,second.value,...(third.value?[third.value]:[])];
  const choices=ids.map(id=>reports.find(r=>r.id===id));
  if(choices.some(r=>!r)||new Set(ids).size!==ids.length){message('Choose two or three different uploaded PDFs.',true);return;}
  busy=true;button.disabled=true;first.disabled=true;second.disabled=true;third.disabled=true;button.textContent='Reading reports…';comparison=null;output.innerHTML='';onReady(false);
  try{
   const {readLabPdf}=await import('./report-reader.js');
   const parsed=[];
   for(let i=0;i<choices.length;i++){
    message(`Opening report ${i+1} of ${choices.length}…`);
    const blob=await fetchReport(choices[i]);
    const report=await readLabPdf(blob,(page,total)=>message(`Reading report ${i+1} of ${choices.length}: page ${page} of ${total}…`));
    parsed.push({...report,id:choices[i].id,fileName:choices[i].name});
   }
   comparison=compareReportSeries(parsed);activeCategory='all';
   selected=new Set(preferred.map(prefix=>comparison.comparable.find(m=>m.key.split('|')[0]===prefix)?.key).filter(Boolean));
   for(const marker of comparison.comparable){if(selected.size>=6)break;selected.add(marker.key);}
   render();message(`${choices.length} reports read. ${comparison.comparable.length} matching tests found. Check values against their source pages.`);onReady(true);
  }catch(error){message(error.message==='Failed to fetch'?'Could not read the report. Check your connection and try again.':error.message,true);}
  finally{busy=false;button.disabled=reports.length<2;button.textContent='Prepare summary';first.disabled=false;second.disabled=false;third.disabled=false;}
 }
 root.querySelector('#analysis-form').addEventListener('submit',event=>{event.preventDefault();prepare();});
 [first,second,third].forEach(select=>select.addEventListener('change',()=>{comparison=null;output.innerHTML='';message('Report selection changed. Prepare the summary again.');onReady(false);}));
 output.addEventListener('click',async event=>{
  const link=event.target.closest('[data-source]');if(!link||link.disabled)return;
  const report=reports.find(r=>r.id===link.dataset.source);if(!report)return;
  const viewer=window.open('','_blank');if(!viewer){message('Allow a new tab for this app, then try again.',true);return;}
  viewer.opener=null;viewer.document.title='Opening source report';viewer.document.body.textContent='Opening the source page…';link.disabled=true;
  try{const url=URL.createObjectURL(await fetchReport(report));viewer.location.replace(url+`#page=${link.dataset.page}`);setTimeout(()=>URL.revokeObjectURL(url),300000);}catch(error){viewer.close();message(error.message,true);}finally{link.disabled=false;}
 });
 return {prepare,updateReports(saved){
  reports=saved.filter(r=>r.contentType==='application/pdf');
  const previous=[first.value,second.value,third.value],initial=!first.options.length;
  const distinct=(a,b)=>a.id!==b?.id&&(a.name!==b?.name||a.size!==b?.size);
  const options=reports.map(r=>`<option value="${r.id}">${escape(r.name)}</option>`).join('')||'<option value="">Upload a PDF first</option>';
  first.innerHTML=options;second.innerHTML=options;third.innerHTML='<option value="">No third report</option>'+(reports.length?options:'');
  first.value=reports.some(r=>r.id===previous[0])?previous[0]:(reports[0]?.id??'');
  second.value=reports.some(r=>r.id===previous[1])&&previous[1]!==first.value?previous[1]:(reports.find(r=>distinct(r,reports.find(p=>p.id===first.value)))?.id??'');
  third.value=reports.some(r=>r.id===previous[2])?previous[2]:initial?(reports.find(r=>distinct(r,reports.find(p=>p.id===first.value))&&distinct(r,reports.find(p=>p.id===second.value)))?.id??''):'';
  button.disabled=busy||reports.length<2;
  if(reports.length<2)message('Upload two blood-test PDFs to prepare your summary.');
 }};
}
