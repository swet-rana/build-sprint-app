import test from 'node:test';
import assert from 'node:assert/strict';
import {formatTestName} from '../src/format-test-name.js';
const cases=[
 ['BLOOD GLUCOSE-POST PRANDIAL','Blood glucose post prandial'],
 ['Fasting glucose','Fasting glucose'],
 ['T4-FREE','T4 free'],['T3-T4','T3 T4'],['FRACTION 3-5 (mg/dL)','Fraction 3-5 (mg/dL)'],
 ['  tOtAl   BiLiRuBiN  ','Total bilirubin'],
 ['C-REACTIVE PROTEIN','C reactive protein'],
 ['TOTAL CHOLESTEROL/hdl CHOLESTEROL RATIO','Total cholesterol/HDL cholesterol ratio'],
 ['hba1c','HbA1c'],['ldl / hdl / vldl','LDL / HDL / VLDL'],
 ['tsh t3 t4 ft3 ft4','TSH T3 T4 FT3 FT4'],
 ['alt ast sgpt sgot ggt alp','ALT AST SGPT SGOT GGT ALP'],
 ['rbc wbc mcv mch mchc rdw','RBC WBC MCV MCH MCHC RDW'],
 ['esr crp bun psa b12','ESR CRP BUN PSA B12'],
 ['egfr','eGFR'],['URINE PH','Urine pH'],['ph','pH'],
 ['25 HYDROXY VITAMIN D','25 Hydroxy Vitamin D'],
 ['vitamin d total','Vitamin D total'],
 ['SERUM CREATININE (mg/dL)','Serum creatinine (mg/dL)'],
 ['RBC COUNT (10^6/µL)','RBC count (10^6/µL)'],
 ['VITAMIN B12 (pg/mL)','Vitamin B12 (pg/mL)'],
 [' FREE-T4  (pmol/L) ','Free T4 (pmol/L)'],
 ['ALBUMIN 24 HOUR (g/L)','Albumin 24 hour (g/L)'],
 ['pHOSPHATE','Phosphate'],['ASTOUNDING MARKER','Astounding marker'],
 ['',''],[null,'']
];
for(const [before,after] of cases)test(`display name: ${JSON.stringify(before)} → ${after}`,()=>{assert.equal(formatTestName(before),after);assert.equal(formatTestName(after),after,'Formatting must be idempotent');});
test('formatting a display label never changes the stored marker or its unit',()=>{const marker=Object.freeze({name:'BLOOD GLUCOSE-POST PRANDIAL',rawName:'BLOOD GLUCOSE-POST PRANDIAL',key:'original-key',unit:'mg/dL',value:12.34});const before=JSON.stringify(marker);formatTestName(marker.name);assert.equal(JSON.stringify(marker),before);});
test('Hits and Misses render sentence case while keeping raw names, sources and counts unchanged',async()=>{
 const {JSDOM}=await import('jsdom');const {smartSummaryMarkup}=await import('../src/smart-summary-view.js');
 const marker={name:'BLOOD GLUCOSE-POST PRANDIAL',key:'untouched',value:90,unit:'mg/dL',referenceText:'70-140',page:1};
 const comparison={reports:[{date:'2026-07-15',pageCount:1,markers:[marker]}]};
 const state={available:true,hits:[{line:'unchanged AI reply',sources:[{reportIndex:0,markerIndex:0}]}],misses:[],totalHits:1,totalMisses:0};const before=JSON.stringify({comparison,state});
 const doc=new JSDOM(smartSummaryMarkup(state,comparison,()=>'<button class="source-button" type="button" data-source="fictional" data-page="1">View original report</button>')).window.document;
 assert.equal(doc.querySelector('.smart-result-name').textContent,'Blood glucose post prandial');assert.equal(doc.querySelector('[data-test-info]').dataset.testInfo,marker.name);assert.equal(doc.querySelector('.smart-count-normal').textContent,'1');assert.equal(doc.querySelector('[data-source]').dataset.page,'1');assert.equal(JSON.stringify({comparison,state}),before);
});
