import {SMART_DISCLAIMER,SINGLE_REPORT_NOTE} from './smart-summary-rules.js';
import {summaryRangeStatus} from './summary-range.js';
const escape=text=>String(text??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const friendlyName=name=>/^HDL(?:[- ]cholesterol)?$/i.test(name)?'HDL (good cholesterol)':/^LDL(?:[- ]cholesterol)?$/i.test(name)?'LDL cholesterol':name;
// Presentation only: the saved server groups and verified improvement wording
// remain authoritative. No new classification or AI request happens here.
function plainLine(item,marker,group,single){
 const name=friendlyName(marker.name),status=summaryRangeStatus(marker.value,marker.referenceText);
 if(group==='stayed')return `${name} stayed in range`;
 if(group==='hits')return `${name} ${single?'is in range':'came back to normal'}`;
 const direction=status==='above'?'high':status==='below'?'low':'out of range';
 return `${name} is ${item.line.includes('improved since last report')?'still '+direction+', but better than last time':direction}`;
}
function statusDot(status){
 const green=status==='within',path=green?'m5 12 4 4L19 6':status==='above'?'M12 20V4m-6 6 6-6 6 6':'M12 4v16m-6-6 6 6 6-6';
 return `<span class="smart-status ${green?'smart-status-green':'smart-status-red'}" role="img" aria-label="${green?'In range':status==='above'?'Above range':status==='below'?'Below range':'Out of range'}"><i></i><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${path}"/></svg></span>`;
}
export function smartSummaryMarkup(state,comparison,sourceButton){
 const single=comparison.reports.length===1,title=single?'Range summary':'Hits and Misses';
 const hasScans=comparison.reports.some(r=>(r.scanCoverage?.read??0)>0||r.markers.some(m=>m.readPath==='vision'||m.readPath==='ocr'));
 const items=(rows,group)=>`<ul class="smart-summary-items">${rows.map((item,index)=>{
  const sources=item.sources.flatMap(source=>{const report=comparison.reports[source.reportIndex],marker=report?.markers[source.markerIndex];return report&&marker?[{report,marker}]:[];});
  const latest=sources.at(-1)?.marker;if(!latest)return '';
  const id=`smart-source-${group}-${index}`,name=friendlyName(latest.name),status=group==='misses'?summaryRangeStatus(latest.value,latest.referenceText):'within';
  return `<li>${statusDot(status)}<div class="smart-summary-item-content"><p class="smart-summary-line">${escape(plainLine(item,latest,group,single))}</p><button type="button" class="smart-source-trigger" popovertarget="${id}" aria-haspopup="dialog" aria-controls="${id}" aria-label="Source for ${escape(name)}">Source</button><div id="${id}" class="smart-source-popover" popover="auto" role="dialog" aria-label="Sources for ${escape(name)}"><div class="smart-source-heading"><h4>${escape(name)}</h4><button type="button" class="smart-source-close" data-smart-source-close aria-label="Close sources">Close</button></div><div class="smart-summary-sources">${sources.map(({report,marker})=>`<div><span>${escape(report.date)} · Page ${marker.page}</span>${sourceButton(marker,report,{scanNotice:false})}</div>`).join('')}</div></div></div></li>`;
 }).join('')}</ul>`;
 const groups=[['hits',single?'In range':'Hits'],['misses',single?'Out of range':'Misses']];
 const content=!state?`<p role="status">Writing ${single?'range summary':'Hits and Misses'}…</p>`:!state.available?'<p class="smart-summary-unavailable" role="status">Smart summary unavailable right now</p>':`<div class="smart-summary-columns">${groups.map(([key,label])=>`<section aria-label="${label}"><h3>${label}</h3>${state[key].length?items(state[key],key):'<p class="smart-summary-empty">No results in this group.</p>'}${state[key].length<state[key==='hits'?'totalHits':'totalMisses']?`<p class="smart-summary-note">Showing ${state[key].length} of ${state[key==='hits'?'totalHits':'totalMisses']} results; all results remain below.</p>`:''}</section>`).join('')}</div>${!single&&state.stayed?.length?`<details class="smart-summary-stayed"><summary>Stayed in range · ${state.stayed.length} ${state.stayed.length===1?'test':'tests'}</summary>${items(state.stayed,'stayed')}</details>`:''}${state.unclassified?'<p class="smart-summary-note">Results without a clear reference range, source page or complete comparison remain in the plain summary below.</p>':''}${state.questions.length?`<section class="smart-summary-questions"><h3>Questions for your doctor</h3><ul>${state.questions.map(q=>`<li>${escape(q)}</li>`).join('')}</ul></section>`:''}`;
 return `<section class="smart-summary" aria-labelledby="smart-summary-title"><h2 id="smart-summary-title" tabindex="-1">${title}</h2>${hasScans?'<p class="smart-summary-scan-note">Some values were read from scans. Please check against the originals.</p>':''}${single?`<p class="smart-summary-note">Compared with the printed reference ranges. ${SINGLE_REPORT_NOTE}</p>`:''}${content}<p class="smart-summary-disclaimer">${SMART_DISCLAIMER}</p></section>`;
}
