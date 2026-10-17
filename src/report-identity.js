import {nameParts,patientNamesMatch} from './patient-name-match.js';
import {rowsFromItems,field,parseDate} from './lab-parser.js';
const otherNameLabels=['Ref(?:erred|erring|erral)?\\.?\\s*(?:By|Doctor|Physician)','(?:Doctor|Consultant|Physician|Pathologist)(?:\\s+Name)?','(?:Reported|Verified|Approved|Authori[sz]ed|Signed)\\s+By'];
const otherNameRow=new RegExp(`^(?:${otherNameLabels.join('|')})\\s*:`,'i');
export function identityFromItems({page,items}){
 const rows=rowsFromItems(items),footer=rows.find(r=>/^Sample Collected on \(SCT\)\s*:/i.test(r.text))?.text.replace(/^Sample Collected on \(SCT\)\s*:\s*/i,'');
 const explicit=field(rows,'Patient Name')??field(rows,'Patient');
 const name=explicit??field(rows.filter(r=>!otherNameRow.test(r.text)),'Name');
 const nonPatientNames=otherNameLabels.map(label=>field(rows,label)).filter(Boolean);
 return {page,patientName:(footer?name?.replace(/\s*\(\d+Y\/[MF]\)\s*$/i,''):name)??null,reportDate:parseDate(field(rows,'Collected')??field(rows,'Collection Date')??field(rows,'Test date')??footer??''),...(nonPatientNames.length?{nonPatientNames,patientNameLabelled:!!explicit}:{})};
}
// Identity-only OCR evidence uses the same 80% threshold. An uncertain line supplies nothing.
export function identityFromOcr(data,width,height,page){
 const lines=(data.blocks??[]).flatMap(b=>(b.paragraphs??[]).flatMap(p=>p.lines??[]));
 const items=lines.filter(l=>l.words?.length&&l.words.every(w=>w.confidence>=80)).map(l=>({str:l.words.map(w=>w.text).join(' '),width:600,transform:[1,0,0,1,0,900-l.words[0].bbox.y0/height*800]}));
 return identityFromItems({page,items});
}
function validDate(date){if(!/^\d{4}-\d{2}-\d{2}$/.test(date??''))return false;const parsed=new Date(date+'T00:00:00Z');return Number.isFinite(parsed.getTime())&&parsed.toISOString().slice(0,10)===date;}
export function resolveReportIdentity(sources,{samePerson=false}={}){
 const sorted=sources.filter(Boolean).slice().sort((a,b)=>(a.page??0)-(b.page??0)),dates=sorted.filter(s=>validDate(s.reportDate));
 const names=sorted.filter(s=>{
  if(!s.patientName?.trim()||otherNameRow.test(s.patientName))return false;
  const name=nameParts(s.patientName);if(!name.full.length)return false;
  const pageEvidence=sorted.filter(e=>e.page===s.page);
  const explicit=pageEvidence.some(e=>e.patientNameLabelled&&nameParts(e.patientName).compact===name.compact);
  const doctor=pageEvidence.some(e=>(e.nonPatientNames??[]).some(other=>nameParts(other).compact===name.compact));
  return !doctor||explicit;
 });
 if(!samePerson)for(let i=0;i<names.length;i++)for(let j=i+1;j<names.length;j++)if(!patientNamesMatch(names[i].patientName,names[j].patientName))return {needsConfirmation:true,conflict:[names[i],names[j]].map(({page,patientName})=>({page,patientName}))};
 if(!names.length||!dates.length)throw Error('The scan reader could not read the patient name and report date anywhere in this report. Upload a clearer copy showing both.');
 const warnings=new Set(dates.map(s=>s.reportDate)).size>1?['More than one printed date was read in this file. The first readable report date is used; check it against the original.']:[];
 return {patientName:names[0].patientName.trim(),reportDate:dates[0].reportDate,identitySources:{patientPage:names[0].page,datePage:dates[0].page},warnings};
}
