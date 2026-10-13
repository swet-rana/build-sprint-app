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
test('vision caps thirty pages per reading and 150 pages across the app per IST day',()=>{
 assert.equal(visionLimitError(29,149),null);assert.match(visionLimitError(30,0),/30 vision pages/);assert.match(visionLimitError(0,150),/150 vision pages/);
 assert.equal(visionDay(Date.parse('2026-10-13T18:29:59Z')),'2026-10-13');assert.equal(visionDay(Date.parse('2026-10-13T18:30:00Z')),'2026-10-14');
});
test('vision cannot silently merge different people, dates or conflicting values',()=>{
 const first=mergeScanResults([{page:1,result:validateScan(scan)}],null,2);
 for(const change of [{patientName:'Someone Else'},{reportDate:'2026-07-16'},{tests:[{...scan.tests[0],value:'15'}]}])assert.throws(()=>mergeScanResults([{page:2,result:validateScan({...scan,...change})}],first,2));
});
