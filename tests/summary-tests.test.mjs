import test from 'node:test';
import assert from 'node:assert/strict';
test('single-report tests are selectable with dates and source pages but no change',async()=>{
 const {summaryTests}=await import('../src/summary-tests.js');
 const reports=[{id:'old',date:'2024-08-19',markers:[]},{id:'new',date:'2026-08-25',markers:[{key:'crp|mg/dl'}]}];
 const single={key:'crp|mg/l',name:'C-reactive protein',unit:'mg/L',value:4,page:7,date:reports[0].date,report:reports[0]};
 const comparable={key:'haemoglobin|g/dl',name:'Haemoglobin',observations:[],change:0.3};
 const tests=summaryTests({reports,comparable:[comparable],unpaired:[single]});
 assert.equal(tests.length,2);assert.equal(tests[0].isComparable,true);assert.equal(tests[1].isComparable,false);
 assert.equal(tests[1].change,null);assert.equal(tests[1].observations[0].value,4);assert.equal(tests[1].observations[0].page,7);assert.equal(tests[1].observations[0].report.id,'old');assert.equal(tests[1].observations[1],null);assert.equal(tests[1].missingLabels[1],'Different unit');
});
