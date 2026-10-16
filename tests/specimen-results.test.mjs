import test from 'node:test';import assert from 'node:assert/strict';
import {validateScan,VISION_PROMPT} from '../convex/visionRules.js';import {mergeScanResults} from '../src/scan-results.js';import {compareReportSeries,rangeStatus,parseReport} from '../src/lab-parser.js';import {normalizeReportTests} from '../src/test-matching.js';import {categoriesForTest} from '../src/health-categories.js';import {scanPageCheck} from '../src/scan-screening.js';
const scan=(specimen,date='2026-07-15')=>({reportKind:specimen,specimen,patientName:'Fictional Patient',reportDate:date,tests:[{name:'pH',value:'6.0',unit:null,referenceRange:'5-8',readable:true,sourceTop:.3},{name:'RBC',value:'2-4',unit:'/hpf',referenceRange:'0-2',readable:true,sourceTop:.4},{name:'Occult blood',value:'Negative',unit:null,referenceRange:'Negative',readable:true,sourceTop:.5},{name:'Unclear',value:null,unit:null,referenceRange:null,readable:false,sourceTop:null}]});
test('urine and stool retain numeric, ranged and written results without mixing specimens',async()=>{
 for(const specimen of ['urine','stool']){
  const r=mergeScanResults([{page:2,result:validateScan(scan(specimen))}],null,3);assert.equal(r.reportKind,specimen);assert.equal(r.markers.length,3);assert.deepEqual(r.markers.map(m=>m.value),[6,'2-4','Negative']);assert(r.markers.every(m=>m.specimen===specimen&&m.key.startsWith(specimen+'-')&&m.page===2));assert.equal(r.unreadable.length,1);
  assert.deepEqual(categoriesForTest(r.markers[0]),['other']);assert.equal(rangeStatus(r.markers[1].value,r.markers[1].referenceText),'unknown');
  let calls=0;const normalized=await normalizeReportTests([r],async()=>{calls++;return [];});assert.equal(calls,0);assert.deepEqual(normalized[0].markers,r.markers);
  const early=mergeScanResults([{page:1,result:validateScan(scan(specimen,'2026-01-15'))}],null,1),c=compareReportSeries([early,r]);assert.equal(c.comparable.length,3);assert.equal(c.comparable[0].change,0);assert.equal(c.comparable[1].change,null);assert.equal(c.comparable[1].qualitative,true);
 }
 const urine=mergeScanResults([{page:1,result:validateScan(scan('urine','2026-01-15'))}],null,1),stool=mergeScanResults([{page:1,result:validateScan(scan('stool'))}],null,1);assert.throws(()=>compareReportSeries([urine,stool]),/No matching/);
});
test('old urine page results remain urine; blood and semen stay numeric only',()=>{
 const old=validateScan({...scan('urine'),reportKind:'other'});assert.equal(old.reportKind,'urine');assert.equal(old.specimen,'urine');
 const blood={...scan('blood'),tests:[{...scan('blood').tests[0],name:'Haemoglobin',value:'Negative',unit:'g/dL'}]};assert.throws(()=>mergeScanResults([{page:1,result:validateScan(blood)}],null,1),/unclear numeric/);
 assert(VISION_PROMPT.includes('urine'));assert(VISION_PROMPT.includes('stool'));
});
test('OCR screening allows labelled urine/stool qualitative tables, not educational prose',()=>{
 for(const type of ['URINE ANALYSIS','STOOL EXAMINATION'])assert.equal(scanPageCheck({text:`${type}\nTest Result Reference\nOccult blood Negative Negative\nOva Absent Absent`}).hasTestContent,true);
 assert.equal(scanPageCheck({text:'Urine and stool testing information. A negative result does not always exclude disease.'}).hasTestContent,false);
});
test('native urine/stool tables use the same specimen-safe result identity',()=>{
 for(const specimen of ['urine','stool']){
 const items=[];const row=(y,cells)=>cells.forEach((str,i)=>items.push({str,width:40,transform:[1,0,0,1,[20,250,360,480][i],y]}));
 row(900,[specimen.toUpperCase()+' ANALYSIS']);row(870,['Patient Name: Fictional Patient']);row(840,['Collection Date: 15/Jul/2026']);row(800,['Test Name','Result','Unit','Bio. Ref. Interval']);row(760,['pH','6.0','','5-8']);row(720,['Occult blood','Negative','','Negative']);
 const r=parseReport([{page:1,items}]);assert.equal(r.reportKind,specimen);assert.deepEqual(r.markers.map(m=>m.value),[6,'Negative']);assert(r.markers.every(m=>m.key.startsWith(specimen+'-')));
 }
});

test('panel headings are not results and ambiguous mixed tables are skipped, not mixed into urine',async()=>{
 const {specimenMarker}=await import('../src/specimen-results.js');
 assert.equal(specimenMarker('urine','COMPLETE URINE EXAMINATION (CUE) ,','Urine'),null);
 assert.equal(scanPageCheck({text:'Complete Blood Count\nURINE ANALYSIS\nTest Result Unit Reference\nRBC 4 /hpf 0-2'}).hasTestContent,false);
 assert.equal(scanPageCheck({text:'URINE ANALYSIS\nSTOOL EXAMINATION\nTest Result Unit Reference\nRBC 4 /hpf 0-2'}).hasTestContent,false);
});
