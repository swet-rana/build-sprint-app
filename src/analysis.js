import { compareReports, parseRange, rangeStatus } from './lab-parser.js';
const escape=text=>String(text??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const number=n=>n.toLocaleString('en-IN',{maximumFractionDigits:5});
const dateLabel=date=>new Date(date+'T00:00:00Z').toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'});
const preferred=['wbc','haemoglobin','esr','tsh','vitamin-d','vitamin-b12'];
const statusLabel={above:'Above this report’s range',below:'Below this report’s range',within:'Within this report’s range',unknown:'See source for interpretation'};
function chart(marker,dates){
 const a=parseRange(marker.earlier.referenceText),b=parseRange(marker.later.referenceText);
 const same=a&&b&&JSON.stringify(a)===JSON.stringify(b)&&a.low!==null&&a.high!==null;
 const values=[marker.earlier.value,marker.later.value];
 const bounds=same?[a.low,a.high]:[];
 const high=Math.max(...values,...bounds,1)*1.24,low=Math.min(...values,...bounds,0);
 const y=value=>122-(value-low)/(high-low)*96;
 return `<svg class="chart" viewBox="0 0 440 158" role="img" aria-label="${escape(marker.name)}: ${number(values[0])} on ${dates[0]}, ${number(values[1])} on ${dates[1]}, ${escape(marker.unit)}.">${same?`<rect x="66" y="${y(a.high)}" width="324" height="${y(a.low)-y(a.high)}" fill="#e6f0f1"/><line x1="66" x2="390" y1="${y(a.high)}" y2="${y(a.high)}" stroke="#8baeb7" stroke-dasharray="4 4"/><text x="61" y="${y(a.high)+4}" text-anchor="end">${number(a.high)}</text><text x="61" y="${y(a.low)+4}" text-anchor="end">${number(a.low)}</text>`:''}<path d="M104 ${y(values[0])} L346 ${y(values[1])}" fill="none" stroke="#176889" stroke-width="3"/>${values.map((v,i)=>`<circle cx="${i?346:104}" cy="${y(v)}" r="5" fill="#176889"/><text x="${i?346:104}" y="${y(v)-12}" text-anchor="middle" class="point-label">${number(v)}</text>`).join('')}<text x="104" y="149" text-anchor="middle">${dates[0]}</text><text x="346" y="149" text-anchor="middle">${dates[1]}</text></svg>`;
}
export function mountAnalysis(root,onReady){
 root.innerHTML=`<section class="analysis-controls"><h2>Compare your uploaded reports</h2><p>Choose two text-readable blood-test PDFs. Results are read from dated tables, then linked to their source pages. Photos and scanned-only PDFs aren’t supported yet.</p><form id="analysis-form"><div class="report-selectors"><label>First report<select id="first-report" required></select></label><label>Second report<select id="second-report" required></select></label></div><button class="primary" id="prepare-summary" type="submit" disabled>Prepare summary</button></form><p id="analysis-status" role="status" aria-live="polite"></p></section><div id="real-summary"></div>`;
 const first=root.querySelector('#first-report'),second=root.querySelector('#second-report'),button=root.querySelector('#prepare-summary'),status=root.querySelector('#analysis-status'),output=root.querySelector('#real-summary');
 let reports=[],comparison=null,selected=new Set(),busy=false;
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
  const c=comparison,dates=[dateLabel(c.earlier.date),dateLabel(c.later.date)],markers=c.comparable.filter(m=>selected.has(m.key));
  const warnings=[...c.earlier.warnings.map(w=>`${c.earlier.fileName}: ${w}`),...c.later.warnings.map(w=>`${c.later.fileName}: ${w}`)];
  output.innerHTML=`<div class="summary-review"><strong>Check this draft against the originals.</strong> This comparison shows recorded values, not diagnoses. ${c.comparable.length} tests match across both reports.</div><details class="test-picker"><summary>Choose tests for the one-page summary <span>${markers.length} of 6 selected</span></summary><p>Select up to six tests. All matching results are listed below.</p><div class="test-options">${c.comparable.map(m=>`<label><input type="checkbox" value="${escape(m.key)}" ${selected.has(m.key)?'checked':''}>${escape(m.name)} <span>${escape(m.unit)}</span></label>`).join('')}</div><p id="selection-status" role="status" aria-live="polite"></p></details><article class="summary real-summary-paper"><div class="summary-heading"><div><h2>Blood report summary</h2><p>${dates.join(' – ')}</p></div><div class="report-count"><strong>2</strong> reports compared</div></div><div class="context"><div><span>Patient in reports</span><strong>${escape(c.later.patientName)}</strong></div><div><span>Selected tests</span><strong>${markers.length} of ${c.comparable.length} comparable</strong></div><div><span>Source dates</span><strong>Blood sample collection dates</strong></div></div><div class="section-heading"><h3>Changes between reports</h3><span class="legend"><i></i> Report reference range</span></div><div class="markers">${markers.map(m=>`<section class="marker"><div class="marker-heading"><h4>${escape(m.name)}</h4><span>${escape(m.unit)}</span></div>${chart(m,dates)}<div class="values">${[m.earlier,m.later].map((value,i)=>`<div><span>${dates[i]}</span><p><strong>${number(value.value)}</strong> <span>${escape(value.unit)}</span></p><span>Reference: ${escape(value.referenceText)}</span>${sourceButton(value,i?c.later:c.earlier)}</div>`).join('')}</div><div class="change"><strong>${m.change===0?'No measured change':`${m.change>0?'Increased':'Decreased'} by ${number(Math.abs(m.change))} ${escape(m.unit)}`}</strong><span class="range-${rangeStatus(m.later.value,m.later.referenceText)}">${statusLabel[rangeStatus(m.later.value,m.later.referenceText)]}</span></div></section>`).join('')}</div><footer class="summary-footer"><p>Draft comparison of selected tests only. Check source reports for full results and context. A change is not a diagnosis or a judgement of health; your doctor interprets it.</p></footer></article><section class="reading-coverage"><h3>What was included</h3><p>${c.earlier.pageCount+c.later.pageCount} PDF pages checked. ${c.earlier.usedPages.length+c.later.usedPages.length} dated blood-table pages used. Matching tests are compared only when their units agree.</p>${warnings.length?`<details><summary>Pages excluded from this comparison</summary><ul>${warnings.map(w=>`<li>${escape(w)}</li>`).join('')}</ul></details>`:''}</section><details class="all-results"><summary>All ${c.comparable.length} comparable results</summary><div class="table-scroll"><table><thead><tr><th>Test</th><th>${dates[0]}</th><th>${dates[1]}</th><th>Measured change</th></tr></thead><tbody>${c.comparable.map(m=>`<tr><th scope="row">${escape(m.name)}<small>${escape(m.unit)}</small></th><td><strong>${number(m.earlier.value)}</strong><small>Ref: ${escape(m.earlier.referenceText)}</small>${sourceButton(m.earlier,c.earlier)}</td><td><strong>${number(m.later.value)}</strong><small>Ref: ${escape(m.later.referenceText)}</small>${sourceButton(m.later,c.later)}</td><td>${m.change>0?'+':''}${number(m.change)}<small>${statusLabel[rangeStatus(m.later.value,m.later.referenceText)]}</small></td></tr>`).join('')}</tbody></table></div></details><details class="unpaired-results"><summary>${c.unpaired.length} results without a matching test and unit</summary><p>These values have no trend line. Tests with different conditions, such as fasting and random glucose, stay separate.</p><ul>${c.unpaired.map(m=>`<li><div><strong>${escape(m.name)}</strong><span>${dateLabel(m.date)} · ${number(m.value)} ${escape(m.unit)} · Reference: ${escape(m.referenceText)}</span></div>${sourceButton(m,m.date===c.earlier.date?c.earlier:c.later)}</li>`).join('')}</ul></details>`;
  const picker=output.querySelector('.test-picker');
  picker.addEventListener('change',event=>{
   const input=event.target;if(input.type!=='checkbox')return;
   if(input.checked&&selected.size>=6){input.checked=false;output.querySelector('#selection-status').textContent='Choose up to six tests. Uncheck one before adding another.';return;}
   if(!input.checked&&selected.size===1){input.checked=true;output.querySelector('#selection-status').textContent='Keep at least one test selected.';return;}
   const key=input.value;
   input.checked?selected.add(key):selected.delete(key);render();output.querySelector('.test-picker').open=true;
   output.querySelector(`input[value="${CSS.escape(key)}"]`).focus();
  });
 }
 async function prepare(){
  if(busy)return;
  const choices=[reports.find(r=>r.id===first.value),reports.find(r=>r.id===second.value)];
  if(!choices[0]||!choices[1]||choices[0].id===choices[1].id){message('Choose two different uploaded PDFs.',true);return;}
  busy=true;button.disabled=true;first.disabled=true;second.disabled=true;button.textContent='Reading reports…';comparison=null;output.innerHTML='';onReady(false);
  try{
   const {readLabPdf}=await import('./report-reader.js');
   const parsed=[];
   for(let i=0;i<choices.length;i++){
    message(`Opening report ${i+1} of 2…`);
    const blob=await fetchReport(choices[i]);
    const report=await readLabPdf(blob,(page,total)=>message(`Reading report ${i+1} of 2: page ${page} of ${total}…`));
    parsed.push({...report,id:choices[i].id,fileName:choices[i].name});
   }
   comparison=compareReports(...parsed);
   selected=new Set(preferred.map(prefix=>comparison.comparable.find(m=>m.key.split('|')[0]===prefix)?.key).filter(Boolean));
   for(const marker of comparison.comparable){if(selected.size>=6)break;selected.add(marker.key);}
   render();message(`Both reports read. ${comparison.comparable.length} matching tests found. Check values against their source pages.`);onReady(true);
  }catch(error){message(error.message==='Failed to fetch'?'Could not read the report. Check your connection and try again.':error.message,true);}
  finally{busy=false;button.disabled=reports.length<2;button.textContent='Prepare summary';first.disabled=false;second.disabled=false;}
 }
 root.querySelector('#analysis-form').addEventListener('submit',event=>{event.preventDefault();prepare();});
 [first,second].forEach(select=>select.addEventListener('change',()=>{comparison=null;output.innerHTML='';message('Report selection changed. Prepare the summary again.');onReady(false);}));
 output.addEventListener('click',async event=>{
  const link=event.target.closest('[data-source]');if(!link||link.disabled)return;
  const report=reports.find(r=>r.id===link.dataset.source);if(!report)return;
  const viewer=window.open('','_blank');if(!viewer){message('Allow a new tab for this app, then try again.',true);return;}
  viewer.opener=null;viewer.document.title='Opening source report';viewer.document.body.textContent='Opening the source page…';link.disabled=true;
  try{const url=URL.createObjectURL(await fetchReport(report));viewer.location.replace(url+`#page=${link.dataset.page}`);setTimeout(()=>URL.revokeObjectURL(url),300000);}catch(error){viewer.close();message(error.message,true);}finally{link.disabled=false;}
 });
 return {prepare,updateReports(saved){
  reports=saved.filter(r=>r.contentType==='application/pdf');
  const previous=[first.value,second.value];
  const options=reports.map(r=>`<option value="${r.id}">${escape(r.name)}</option>`).join('')||'<option value="">Upload a PDF first</option>';
  first.innerHTML=options;second.innerHTML=options;
  first.value=reports.some(r=>r.id===previous[0])?previous[0]:(reports[0]?.id??'');
  second.value=reports.some(r=>r.id===previous[1])&&previous[1]!==first.value?previous[1]:(reports.find(r=>r.id!==first.value)?.id??'');
  button.disabled=busy||reports.length<2;
  if(reports.length<2)message('Upload two blood-test PDFs to prepare your summary.');
 }};
}
