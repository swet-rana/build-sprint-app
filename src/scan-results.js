import {isAdditionalSpecimen,specimenMarker} from './specimen-results.js';
import {classifyScanPage,isStandardBloodTest} from './blood-page-classification.js';
import {resolveReportIdentity} from './report-identity.js';
import {testIdentity} from './test-names.js';
import {semenIdentity} from './semen-markers.js';
export function mergeScanResults(scans,native,pageCount,identityPages=[],confirmedIdentity){
 const identity=confirmedIdentity??resolveReportIdentity([...identityPages,...scans.map(({page,result})=>({page,patientName:result.patientName,reportDate:result.reportDate})),...(native?[{page:native.usedPages[0],patientName:native.patientName,reportDate:native.date}]:[])]);
 if(identity.needsConfirmation)return {identityConfirmation:identity.conflict};
 let result=native?{...native,markers:[...native.markers],warnings:[...native.warnings],usedPages:[...native.usedPages],unreadable:[...(native.unreadable??[])]}:null;
 for(const {page,result:originalScan} of scans){
  const scan=classifyScanPage(originalScan);
  if(scan.reportKind==='other')continue;
  result??={reportKind:scan.reportKind,date:identity.reportDate,patientName:identity.patientName,patientId:null,patientIdIssuer:null,labName:'',markers:[],usedPages:[],excludedPages:[],pageCount,warnings:[],unreadable:[]};
  for(const row of scan.tests){
   if(!isAdditionalSpecimen(scan.reportKind)&&scan.originalReportKind==='other'&&!isStandardBloodTest(row.name,row.unit)){result.warnings.push(`Page ${page}: ${row.name} is not a recognized blood test on this page; excluded.`);continue;}
   if(!row.readable||row.value===null){result.unreadable.push({name:isAdditionalSpecimen(scan.reportKind)?`${scan.reportKind==='urine'?'Urine':'Stool'} · ${row.name}`:row.name,...(isAdditionalSpecimen(scan.reportKind)?{rawName:row.name,specimen:scan.reportKind}:{}),value:null,page,reason:'Unreadable in scan'});continue;}
   if(isAdditionalSpecimen(scan.reportKind)){
    const marker=specimenMarker(scan.reportKind,row.name,row.value,row.unit,row.referenceRange,{page,sourceTop:row.sourceTop??undefined,readPath:'vision'});
    if(marker){const prior=result.markers.find(m=>m.key===marker.key);if(prior&&prior.value!==marker.value)throw Error(`Conflicting ${marker.name} values were read in this file. Check the original.`);if(!prior)result.markers.push(marker);}continue;
   }
   if(!/^[+-]?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?$/.test(row.value))throw Error(`Page ${page}: ${row.name} has an unclear numeric value. Check the original scan.`);
   const value=Number(row.value.replaceAll(',',''));if(!Number.isFinite(value))throw Error('The scan reader returned an invalid numeric value.');
   const unitlessRatio=scan.reportKind==='blood'&&/\bratio\b/i.test(row.name)&&/^(?:[-–—])?$/.test((row.unit??'').trim());
   const unit=unitlessRatio?'':row.unit??'',identity=scan.reportKind==='semen'?semenIdentity(row.name,unit,''):testIdentity(row.name,unit);
   if(!identity){result.warnings.push(`Page ${page}: ${row.name} is outside the supported measurements.`);continue;}
   if(!unit&&!unitlessRatio){result.unreadable.push({name:row.name,value:null,page,reason:'Unit unreadable in scan'});continue;}
   // The existing text reader treats some blank ratio units as "Ratio".
   // New unitless scan results must instead compare only with other empty units.
   if(unitlessRatio)identity.key=identity.key.split('|')[0]+'|';
   const prior=result.markers.find(m=>m.key===identity.key);
   if(prior&&prior.value!==value)throw Error(`Conflicting ${row.name} values were read in this file. Check the original.`);
   if(!prior)result.markers.push({...identity,value,unit,referenceText:row.referenceRange??'Not readable in scan',page,sourceTop:row.sourceTop??undefined,sourceText:`${row.name} ${row.value} ${unit}`,readPath:'vision'});
  }
  if(scan.tests.some(row=>row.readable&&row.value!==null)&&!result.usedPages.includes(page))result.usedPages.push(page);
 }
 if(!result?.markers.length)throw Error('No readable, dated test results were found in the scan. Upload a clearer result page.');
 result.droppedRows=[...(native?.droppedRows??[]),...scans.flatMap(({result:scan})=>scan.droppedRows??[])];
 result.date=identity.reportDate;result.patientName=identity.patientName;result.identitySources=identity.identitySources;result.warnings.push(...identity.warnings);
 result.excludedPages=Array.from({length:pageCount},(_,i)=>i+1).filter(n=>!result.usedPages.includes(n));
 const kinds=new Set(result.markers.map(m=>m.specimen??'blood'));
 result.reportKind=kinds.size===1?[...kinds][0]:'mixed';
 result.readingPaths=[...(native?.readingPaths??[]),...(scans.length?['scan (AI vision)']:[])];
 if(scans.length)result.warnings.push('Values read from scan, please check against the original.');
 return result;
}
