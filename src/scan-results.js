import {normalizePatient} from './lab-parser.js';
import {testIdentity} from './test-names.js';
import {semenIdentity} from './semen-markers.js';
function validDate(date){if(!/^\d{4}-\d{2}-\d{2}$/.test(date??''))return false;const parsed=new Date(date+'T00:00:00Z');return Number.isFinite(parsed.getTime())&&parsed.toISOString().slice(0,10)===date;}
export function mergeScanResults(scans,native,pageCount){
 let result=native?{...native,markers:[...native.markers],warnings:[...native.warnings],usedPages:[...native.usedPages],unreadable:[...(native.unreadable??[])]}:null;
 for(const {page,result:scan} of scans){
  if(scan.reportKind==='other')continue;
  if(!validDate(scan.reportDate)||!scan.patientName?.trim())throw Error(`Page ${page}: the scan reader could not read the patient name and report date. Upload a clearer full-page copy.`);
  if(result&&(result.date!==scan.reportDate||normalizePatient(result.patientName)!==normalizePatient(scan.patientName)))throw Error('The scanned pages contain different patient names or dates. Upload each dated report separately.');
  result??={reportKind:scan.reportKind,date:scan.reportDate,patientName:scan.patientName,patientId:null,patientIdIssuer:null,labName:'',markers:[],usedPages:[],excludedPages:[],pageCount,warnings:[],unreadable:[]};
  for(const row of scan.tests){
   if(!row.readable||row.value===null){result.unreadable.push({name:row.name,value:null,page,reason:'Unreadable in scan'});continue;}
   if(!/^[+-]?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?$/.test(row.value))throw Error(`Page ${page}: ${row.name} has an unclear numeric value. Check the original scan.`);
   const value=Number(row.value.replaceAll(',',''));if(!Number.isFinite(value))throw Error('The scan reader returned an invalid numeric value.');
   const unit=row.unit??'',identity=scan.reportKind==='semen'?semenIdentity(row.name,unit,''):testIdentity(row.name,unit);
   if(!identity){result.warnings.push(`Page ${page}: ${row.name} is outside the supported measurements.`);continue;}
   if(!unit){result.unreadable.push({name:row.name,value:null,page,reason:'Unit unreadable in scan'});continue;}
   const prior=result.markers.find(m=>m.key===identity.key);
   if(prior&&prior.value!==value)throw Error(`Conflicting ${row.name} values were read in this file. Check the original.`);
   if(!prior)result.markers.push({...identity,value,unit,referenceText:row.referenceRange??'Not readable in scan',page,sourceTop:row.sourceTop??undefined,sourceText:`${row.name} ${row.value} ${unit}`,readPath:'vision'});
  }
  if(scan.tests.some(row=>row.readable&&row.value!==null)&&!result.usedPages.includes(page))result.usedPages.push(page);
 }
 if(!result?.markers.length)throw Error('No readable, dated blood or semen values were found in the scan. Upload a clearer result page.');
 result.excludedPages=Array.from({length:pageCount},(_,i)=>i+1).filter(n=>!result.usedPages.includes(n));
 result.reportKind=result.markers.every(m=>m.specimen==='semen')?'semen':result.markers.some(m=>m.specimen==='semen')?'mixed':'blood';
 result.readingPaths=[...(native?.readingPaths??[]),...(scans.length?['scan (AI vision)']:[])];
 if(scans.length)result.warnings.push('Values read from scan, please check against the original.');
 return result;
}
