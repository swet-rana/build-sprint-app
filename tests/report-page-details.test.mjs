import test from 'node:test';
import assert from 'node:assert/strict';
import {reportPageDetails,pageDetailLine} from '../src/report-page-details.js';
import {reportInclusion} from '../src/report-inclusion.js';
test('text PDF details include every physical page using only saved results',()=>{
 const report={id:'text',fileName:'Fictional-text.pdf',pageCount:5,usedPages:[2,5],markers:[{page:2},{page:2},{page:5}]};
 assert.deepEqual(reportPageDetails(report).map(pageDetailLine),[
 'Page 1: text — No supported test results were found in the saved reading.',
 'Page 2: text — 2 test results found',
 'Page 3: text — No supported test results were found in the saved reading.',
 'Page 4: text — No supported test results were found in the saved reading.',
 'Page 5: text — 1 test result found']);
});
test('mixed PDF details preserve text, local OCR, AI vision and exact stored skipped reason',()=>{
 const report={id:'scan',fileName:'Fictional-scan.pdf',pageCount:5,usedPages:[2,3,5],markers:[{page:2},{page:3,readPath:'vision'},{page:5}],scanCoverage:{pdfTotal:5,total:3,checked:3,read:2,vision:1,ocr:1,textPages:[{page:1,tests:0},{page:5,tests:1}],skipped:[{page:4,reason:'Local OCR found no test-like content.'}],readPages:[{page:2,path:'local OCR',tests:1},{page:3,path:'AI vision',tests:1}]}};
 const comparison={reports:[report],comparable:[]},before=structuredClone(reportInclusion(comparison));
 assert.deepEqual(reportPageDetails(report).map(pageDetailLine),[
 'Page 1: text — No supported test results were found in the saved reading.',
 'Page 2: local OCR — 1 test result found',
 'Page 3: AI vision — 1 test result found',
 'Page 4: skipped — Local OCR found no test-like content.',
 'Page 5: text — 1 test result found']);
 assert.deepEqual(reportInclusion(comparison),before,'The inclusion counts must not change');
});
test('older scan results use saved source paths and never borrow another file’s page numbers',()=>{
 const text={pageCount:2,usedPages:[2],markers:[{page:2}]};
 const scan={pageCount:3,usedPages:[1,3],markers:[{page:1,readPath:'vision'},{page:3}],scanCoverage:{pdfTotal:3,total:2,read:1,vision:1,ocr:0,textPages:[{page:3,tests:1}],skipped:[{page:2,reason:'No test-like content.'}]}};
 assert.deepEqual(reportPageDetails(text).map(row=>row.page),[1,2]);assert.deepEqual(reportPageDetails(scan).map(row=>row.page),[1,2,3]);assert.equal(reportPageDetails(scan)[0].path,'AI vision');
});
