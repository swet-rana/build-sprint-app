import {parseSummaryRange as parseRange,summaryRangeStatus as rangeStatus} from './summary-range.js';
export const SMART_REPLY_TOKENS=1600;
export const SMART_DISCLAIMER='This is not medical advice; discuss with your doctor.';
export const SINGLE_REPORT_NOTE='A trend appears once a second report is added.';
const questionChoices=['How do these results fit with my health history?','Which results should we discuss first?','Are any results worth checking again?'];
const validRange=range=>range&&(range.low===null||range.high===null||range.low<=range.high);
const distance=(value,range)=>Math.max(range.low===null?0:range.low-value,range.high===null?0:value-range.high,0);
export function smartFacts(comparison){
 const reports=comparison?.reports;if(!Array.isArray(reports)||!reports.length||reports.length>10)throw Error('Invalid saved summary.');
 const groups=new Map();let unclassified=0;
 reports.forEach((report,reportIndex)=>{
  if(!/^\d{4}-\d{2}-\d{2}$/.test(report.date)||!Array.isArray(report.markers)||report.markers.length>1000)throw Error('Invalid saved results.');
  report.markers.forEach((marker,markerIndex)=>{if(typeof marker.key!=='string')throw Error('Invalid saved result identity.');const group=groups.get(marker.key)??[];group.push({marker,report,reportIndex,markerIndex});groups.set(marker.key,group);});
 });
 const hits=[],misses=[],stayed=[];
 const latestDate=reports.map(r=>r.date).sort().at(-1);
 for(const observations of groups.values()){
  observations.sort((a,b)=>a.report.date.localeCompare(b.report.date));const latest=observations.at(-1),previous=observations.at(-2),m=latest.marker,name=String(m.name??'').trim();
  const range=parseRange(m.referenceText),status=rangeStatus(m.value,m.referenceText);
  if(latest.report.date!==latestDate){unclassified++;continue;}
  // Written results, ambiguous ranges and unknown source pages stay in the plain summary.
  if(typeof m.value!=='number'||!Number.isFinite(m.value)||status==='unknown'||!validRange(range)||!name||name.length>120||/[\r\n<>]/.test(name)||/\b(?:diagnos\w*|prescrib\w*|medicine|treatment|ignore|instructions)\b/i.test(name)||!Number.isInteger(m.page)||m.page<1||m.page>(latest.report.pageCount??100)){unclassified++;continue;}
  let trend=null;
  if(previous&&typeof previous.marker.value==='number'&&Number.isFinite(previous.marker.value)&&m.unit===previous.marker.unit){
   const before=parseRange(previous.marker.referenceText);
   if(validRange(before)&&JSON.stringify(before)===JSON.stringify(range)){
    const delta=distance(m.value,range)-distance(previous.marker.value,range);trend=delta<0?'closer':delta>0?'farther':null;
   }
  }
  const outside=observations.slice(0,-1).find(entry=>['above','below'].includes(rangeStatus(entry.marker.value,entry.marker.referenceText)));
  const stayedInRange=observations.length===reports.length&&observations.every(entry=>rangeStatus(entry.marker.value,entry.marker.referenceText)==='within');
  const category=status!=='within'?'misses':reports.length===1||outside?'hits':stayedInRange?'stayed':null;
  if(!category){unclassified++;continue;}
  // An improving result that remains outside its range stays visible in Misses.
  let lines;
  if(category==='stayed')lines=[`${name} stayed within its printed range in every report.`];
  else if(category==='hits'&&outside)lines=[`${name} was outside its printed range in an earlier report and is in range in the latest report.`,`${name} is now in its printed range after an earlier out-of-range result.`];
  else if(status==='within')lines=[`${name} is within the printed reference range.`,`${name} falls within the range printed in its report.`];
  else if(trend==='closer')lines=[`${name} improved since last report but remains outside its printed range.`,`${name} remains outside its printed range, improved since last report.`];
  else if(trend==='farther')lines=[`${name} moved farther from the printed reference range since the previous report.`,`${name} is farther outside the printed range than in the previous report.`];
  else lines=[`${name} is ${status} the printed reference range.`,`${name} falls ${status} the range printed in its report.`];
  const source=entry=>({reportIndex:entry.reportIndex,markerIndex:entry.markerIndex});
  const validSource=entry=>Number.isInteger(entry.marker.page)&&entry.marker.page>0&&entry.marker.page<=(entry.report.pageCount??100);
  const sources=(category==='hits'&&outside?[outside,latest]:category==='stayed'?observations:trend&&previous?[previous,latest]:[latest]).filter(validSource).map(source);
  const fact={id:`r${latest.reportIndex}m${latest.markerIndex}`,name,category,lines,sources,evidence:{value:m.value,unit:m.unit,reference:m.referenceText,date:latest.report.date,...(trend?{trend}:{} )}};
  ({hits,misses,stayed})[category].push(fact);
 }
 return {single:reports.length===1,hits:hits.slice(0,6),misses:misses.slice(0,6),stayed:stayed.map(({id,name,lines,sources})=>({id,name,line:lines[0],sources})),totalHits:hits.length,totalMisses:misses.length,unclassified,questions:[...questionChoices,...(reports.length>1?['What might explain the changes between my reports?']:[])]};
}
export function smartReplySchema(facts){
 const items=rows=>({anyOf:(rows.length?rows:[{id:'none',lines:['none']}]).map(row=>({type:'object',additionalProperties:false,properties:{id:{type:'string',enum:[row.id]},line:{type:'string',enum:row.lines}},required:['id','line']}))});
 return {type:'object',additionalProperties:false,properties:{hits:{type:'array',items:items(facts.hits),minItems:facts.hits.length,maxItems:facts.hits.length},misses:{type:'array',items:items(facts.misses),minItems:facts.misses.length,maxItems:facts.misses.length},questions:{type:'array',items:{type:'string',enum:facts.questions},maxItems:3}},required:['hits','misses','questions']};
}
export function validateSmartReply(reply,facts){
 if(!reply||Object.keys(reply).sort().join(',')!=='hits,misses,questions')throw Error('Invalid smart summary.');
 for(const category of ['hits','misses']){
  const rows=reply[category],expected=facts[category];if(!Array.isArray(rows)||rows.length!==expected.length||new Set(rows.map(row=>row.id)).size!==rows.length)throw Error('Incomplete smart summary.');
  for(const row of rows){const fact=expected.find(f=>f.id===row.id);if(!fact||!fact.lines.includes(row.line)||Object.keys(row).sort().join(',')!=='id,line')throw Error('Unsupported smart summary statement.');}
 }
 if(!Array.isArray(reply.questions)||reply.questions.length>3||new Set(reply.questions).size!==reply.questions.length||reply.questions.some(q=>!facts.questions.includes(q)))throw Error('Unsupported doctor question.');
 return reply;
}
