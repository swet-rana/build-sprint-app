import {rowsFromItems,field,parseDate,normalizePatient} from './lab-parser.js';
export function identityFromItems({page,items}){
 const rows=rowsFromItems(items),footer=rows.find(r=>/^Sample Collected on \(SCT\)\s*:/i.test(r.text))?.text.replace(/^Sample Collected on \(SCT\)\s*:\s*/i,'');
 const name=field(rows,'Patient Name')??field(rows,'Name')??field(rows,'Patient');
 return {page,patientName:(footer?name?.replace(/\s*\(\d+Y\/[MF]\)\s*$/i,''):name)??null,reportDate:parseDate(field(rows,'Collected')??field(rows,'Collection Date')??field(rows,'Test date')??footer??'')};
}
// Identity-only OCR evidence uses the same 80% threshold. An uncertain line supplies nothing.
export function identityFromOcr(data,width,height,page){
 const lines=(data.blocks??[]).flatMap(b=>(b.paragraphs??[]).flatMap(p=>p.lines??[]));
 const items=lines.filter(l=>l.words?.length&&l.words.every(w=>w.confidence>=80)).map(l=>({str:l.words.map(w=>w.text).join(' '),width:600,transform:[1,0,0,1,0,900-l.words[0].bbox.y0/height*800]}));
 return identityFromItems({page,items});
}
function validDate(date){if(!/^\d{4}-\d{2}-\d{2}$/.test(date??''))return false;const parsed=new Date(date+'T00:00:00Z');return Number.isFinite(parsed.getTime())&&parsed.toISOString().slice(0,10)===date;}
export function resolveReportIdentity(sources){
 const sorted=sources.filter(Boolean).slice().sort((a,b)=>(a.page??0)-(b.page??0)),names=sorted.filter(s=>s.patientName?.trim()),dates=sorted.filter(s=>validDate(s.reportDate));
 if(new Set(names.map(s=>normalizePatient(s.patientName))).size>1)throw Error('The scanned pages contain different patient names. Upload a separate file for each person.');
 if(!names.length||!dates.length)throw Error('The scan reader could not read the patient name and report date anywhere in this report. Upload a clearer copy showing both.');
 const warnings=new Set(dates.map(s=>s.reportDate)).size>1?['More than one printed date was read in this file. The first readable report date is used; check it against the original.']:[];
 return {patientName:names[0].patientName.trim(),reportDate:dates[0].reportDate,identitySources:{patientPage:names[0].page,datePage:dates[0].page},warnings};
}
