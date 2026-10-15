import {classifyScanPage,isStandardBloodTest} from './blood-page-classification.js';
import {resolveReportIdentity} from './report-identity.js';
import {testIdentity} from './test-names.js';
import {semenIdentity} from './semen-markers.js';
export function mergeScanResults(scans,native,pageCount,identityPages=[]){
 const identity=resolveReportIdentity([...identityPages,...scans.map(({page,result})=>({page,patientName:result.patientName,reportDate:result.reportDate})),...(native?[{page:native.usedPages[0],patientName:native.patientName,reportDate:native.date}]:[])]);
 let result=native?{...native,markers:[...native.markers],warnings:[...native.warnings],usedPages:[...native.usedPages],unreadable:[...(native.unreadable??[])]}:null;
 for(const {page,result:originalScan} of scans){
  const scan=classifyScanPage(originalScan);
  if(scan.reportKind==='other')continue;
  result??={reportKind:scan.reportKind,date:identity.reportDate,patientName:identity.patientName,patientId:null,patientIdIssuer:null,labName:'',markers:[],usedPages:[],excludedPages:[],pageCount,warnings:[],unreadable:[]};
  for(const row of scan.tests){
   if(scan.originalReportKind==='other'&&!isStandardBloodTest(row.name,row.unit)){result.warnings.push(`Page ${page}: ${row.name} is not a recognized blood test on this page; excluded.`);continue;}
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
 result.date=identity.reportDate;result.patientName=identity.patientName;result.identitySources=identity.identitySources;result.warnings.push(...identity.warnings);
 result.excludedPages=Array.from({length:pageCount},(_,i)=>i+1).filter(n=>!result.usedPages.includes(n));
 result.reportKind=result.markers.every(m=>m.specimen==='semen')?'semen':result.markers.some(m=>m.specimen==='semen')?'mixed':'blood';
 result.readingPaths=[...(native?.readingPaths??[]),...(scans.length?['scan (AI vision)']:[])];
 if(scans.length)result.warnings.push('Values read from scan, please check against the original.');
 return result;
}
