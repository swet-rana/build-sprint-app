import test from 'node:test';
import assert from 'node:assert/strict';
import {validateScan,visionLimitError,visionDay} from '../convex/visionRules.js';
import {mergeScanResults} from '../src/scan-results.js';
const scan={reportKind:'blood',patientName:'Sample Patient',reportDate:'2026-07-15',tests:[{name:'Haemoglobin',value:'13.2',unit:'g/dL',referenceRange:'12 - 16',readable:true,sourceTop:0.4},{name:'Vitamin D',value:'99',unit:'ng/mL',referenceRange:'30 - 100',readable:false,sourceTop:null}]};
test('vision excludes unsure values, keeps exact known values, date, page and scan provenance',()=>{
 const result=mergeScanResults([{page:3,result:validateScan(scan)}],null,4);
 assert.equal(result.markers.length,1);assert.equal(result.markers[0].value,13.2);assert.equal(result.markers[0].readPath,'vision');assert.equal(result.markers[0].page,3);assert.equal(result.date,'2026-07-15');assert.equal(result.unreadable[0].name,'Vitamin D');assert.equal(result.unreadable[0].value,null);
});
test('vision refuses invalid dates, missing patient identity, non-blood/semen and malformed results',()=>{
 for(const change of [{reportDate:'2026-02-30'},{patientName:null},{reportKind:'other',tests:[{...scan.tests[0],name:'Kidney length',unit:'cm'}]},{tests:[{...scan.tests[0],value:'13?2'}]}])assert.throws(()=>mergeScanResults([{page:1,result:validateScan({...scan,...change})}],null,1));
});
test('vision caps 100 pages per reading and 400 pages across the app per IST day',()=>{
 assert.equal(visionLimitError(30,30),null);assert.equal(visionLimitError(44,44),null);assert.equal(visionLimitError(99,399),null);assert.match(visionLimitError(100,0),/100 vision pages/);assert.match(visionLimitError(0,400),/400 vision pages/);assert.match(visionLimitError(100,400),/daily limit of 400/);
 assert.equal(visionDay(Date.parse('2026-10-13T18:29:59Z')),'2026-10-13');assert.equal(visionDay(Date.parse('2026-10-13T18:30:00Z')),'2026-10-14');
});
test('vision cannot silently merge different people or conflicting values',()=>{
 const first=mergeScanResults([{page:1,result:validateScan(scan)}],null,2);
 for(const change of [{patientName:'Someone Else'},{tests:[{...scan.tests[0],value:'15'}]}])assert.throws(()=>mergeScanResults([{page:2,result:validateScan({...scan,...change})}],first,2));
});

test('report identity from the first page applies to later scan results with missing identity',()=>{
 const second={...scan,patientName:null,reportDate:null,tests:[{name:'CRP',value:'3',unit:'mg/L',referenceRange:'0-5',readable:true,sourceTop:.4}]};
 const result=mergeScanResults([{page:2,result:second},{page:1,result:scan}],null,2);
 assert.equal(result.patientName,scan.patientName);assert.equal(result.date,scan.reportDate);assert.equal(result.markers.length,2);assert(result.usedPages.includes(2));
});
test('a cover-page identity can supply missing details without being a result page',()=>{
 const result=mergeScanResults([{page:2,result:{...scan,patientName:null,reportDate:null}}],null,2,[{page:1,patientName:scan.patientName,reportDate:scan.reportDate}]);
 assert.equal(result.patientName,scan.patientName);assert.equal(result.date,scan.reportDate);assert.equal(result.markers.length,1);assert.deepEqual(result.usedPages,[2]);
});
test('missing whole-file identity and conflicting names on a non-result page are rejected',()=>{
 assert.throws(()=>mergeScanResults([{page:2,result:{...scan,patientName:null,reportDate:null}}],null,2),/patient name and report date/);
 assert.throws(()=>mergeScanResults([{page:1,result:scan},{page:2,result:{reportKind:'other',specimen:'other',patientName:'Different Person',reportDate:null,tests:[]}}],null,2),/different patient names/);
});

test('different printed dates for the same patient use the first report date with a source-check warning',()=>{
 const result=mergeScanResults([{page:1,result:scan},{page:2,result:{...scan,reportDate:'2026-07-16'}}],null,2);
 assert.equal(result.date,'2026-07-15');assert(result.warnings.some(w=>w.includes('More than one printed date')));
});

test('scanned ratios accept blank or dash units but never an unreadable value',()=>{
 const ratio=(unit,name='A G RATIO',extra={})=>({name,value:'1.4',unit,referenceRange:'1-2',readable:true,sourceTop:.5,...extra});
 for(const unit of [null,'',' ','-','–','—']){
  const result=mergeScanResults([{page:1,result:validateScan({...scan,tests:[scan.tests[0],ratio(unit),ratio(unit,'TOTAL CHOLESTEROL/HDL CHOLESTEROL RATIO'),ratio(unit,'LDL/HDL RATIO',{readable:false}),ratio(unit,'Other ratio',{value:null})]})}],null,1);
  assert.equal(result.markers.length,3);assert(result.markers.slice(1).every(m=>m.unit===''&&m.key.endsWith('|')));
  assert.equal(result.unreadable.length,2);assert(result.unreadable.every(m=>m.value===null));
 }
 const nonRatio=mergeScanResults([{page:1,result:validateScan({...scan,tests:[scan.tests[0],{...scan.tests[0],name:'Calcium',unit:null}]})}],null,1);
 assert.equal(nonRatio.unreadable[0].reason,'Unit unreadable in scan');
});

test('unitless scanned ratios compare only to the same ratio with no unit',async()=>{
 const {compareReportSeries}=await import('../src/lab-parser.js');const {normalizeReportTests}=await import('../src/test-matching.js');
 const make=(date,unit,name='TOTAL CHOLESTEROL/HDL CHOLESTEROL RATIO')=>mergeScanResults([{page:1,result:validateScan({...scan,reportDate:date,tests:[{name,value:'2.4',unit,referenceRange:'1-4',readable:true,sourceTop:.5}]})}],null,1);
 const pair=await normalizeReportTests([make('2026-01-15',null),make('2026-07-15','-')],async()=>[]);
 const c=compareReportSeries(pair);assert.equal(c.comparable.length,1);assert.equal(c.comparable[0].unit,'');assert(c.comparable[0].observations.every(m=>m.unit===''));
 for(const unit of ['Ratio','%','mg/dL'])assert.throws(()=>compareReportSeries([pair[0],make('2026-07-15',unit)]),/No matching tests/);
 assert.throws(()=>compareReportSeries([pair[0],make('2026-07-15',null,'A G RATIO')]),/No matching tests/);
});

test('daily reset is exactly midnight Asia/Kolkata and advances across month and year boundaries',async()=>{
 const {nextVisionReset,dailyVisionMessage}=await import('../src/vision-limits.js');
 for(const [now,reset] of [['2026-10-16T18:29:59.999Z','2026-10-16T18:30:00.000Z'],['2026-10-16T18:30:00.000Z','2026-10-17T18:30:00.000Z'],['2026-12-31T18:29:59.999Z','2026-12-31T18:30:00.000Z']])assert.equal(new Date(nextVisionReset(Date.parse(now))).toISOString(),reset);
 assert.equal(dailyVisionMessage(Date.parse('2026-10-16T18:30:00Z')),'HealthStats has reached its daily AI vision limit of 400 pages. Reading resumes at 00:00 IST (India time) on 17 Oct 2026.');
});
