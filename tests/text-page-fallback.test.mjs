import test from 'node:test';import assert from 'node:assert/strict';
import {textPageNeedsVision} from '../src/text-page-fallback.js';
import {classifyScanPage} from '../src/blood-page-classification.js';
import {mergeScanResults} from '../src/scan-results.js';
import {validateScan} from '../convex/visionRules.js';
const items=text=>text.split('\n').map((str,i)=>({str,transform:[1,0,0,1,40,750-i*20],width:str.length*6}));
test('A failed native text page with lab evidence requires vision; covers and dates do not',()=>{
 assert.equal(textPageNeedsVision({page:1,items:items('Collected On: 15/07/2026\nTest Results Units Biological Reference Interval\nHaemoglobin 132 g/L 120-160')}).eligible,true);
 assert.equal(textPageNeedsVision({page:1,items:items('Report date: 15/07/2026\nPage 1 of 27\nMedical report cover')}).eligible,false);
});
const row={name:'Haemoglobin',value:'13.2',unit:'g/dL',referenceRange:'12-16',readable:true,sourceTop:.4};
const scan={reportKind:'other',patientName:'Fictional Patient',reportDate:'2026-07-15',tests:[row]};
test('Standard blood rows classified other are corrected on the server and accepted without inventing values',()=>{
 const corrected=validateScan(scan);assert.equal(corrected.reportKind,'blood');assert.equal(corrected.originalReportKind,'other');assert.equal(corrected.tests[0].value,'13.2');
 const result=mergeScanResults([{page:18,result:scan}],null,27);assert.equal(result.markers.length,1);assert.equal(result.markers[0].page,18);assert.equal(result.markers[0].readPath,'vision');
});
test('Urine, imaging and semen retain their classification; an unreadable blood row remains unreadable',()=>{
 assert.equal(classifyScanPage({...scan,specimen:'urine'}).reportKind,'other');assert.equal(classifyScanPage({...scan,tests:[{...row,name:'Kidney length',unit:'cm'}]}).reportKind,'other');assert.equal(classifyScanPage({...scan,reportKind:'semen'}).reportKind,'semen');
 const unclear=validateScan({...scan,tests:[{...row,readable:false}]});assert.equal(unclear.tests[0].value,null);assert.throws(()=>mergeScanResults([{page:1,result:unclear}],null,1),/No readable/);
});
