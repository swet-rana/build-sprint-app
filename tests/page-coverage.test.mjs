import test from 'node:test';
import assert from 'node:assert/strict';
import {pdfPageTotal,textPageReason,pageExplanations,plainPageCoverage} from '../src/page-coverage.js';
test('PDF total includes all text, scan-read and skipped pages exactly once',()=>{
 const c={pdfTotal:27,total:24,read:6,skipped:Array.from({length:18},(_,i)=>({page:i+1,reason:'No test-like content.'})),textPages:[{page:25,tests:0},{page:26,tests:2},{page:27,tests:0}]};
 assert.equal(pdfPageTotal(c),'PDF total: 27 pages = 3 read as text + 6 scan/fallback pages read + 18 skipped.');
 assert.equal(textPageReason(c.textPages[0]),'Read as text, no test results found.');assert.equal(textPageReason(c.textPages[1]),'Read as text, 2 tests found.');
 const explanations=pageExplanations(c);assert.equal(explanations.length,21);assert.deepEqual(explanations.map(p=>p.page),[...Array.from({length:18},(_,i)=>i+1),25,26,27]);
});
test('unfinished and legacy coverage totals do not pretend remaining pages were skipped or read',()=>{
 const c={pdfTotal:5,total:2,read:0,skipped:[],textPages:[{page:1,tests:0},{page:2,tests:1},{page:5,tests:0}]};
 assert.equal(pdfPageTotal(c),'PDF total: 5 pages = 3 read as text + 0 scan/fallback pages read + 0 skipped + 2 scan/fallback pages not finished.');
 assert.equal(pdfPageTotal({pdfTotal:27,total:24,read:6,skipped:Array(18).fill({})}),'PDF total: 27 pages = 3 read as text + 6 scan/fallback pages read + 18 skipped.');
});

test('plain coverage uses the unchanged text and scanned read totals, with technical terms only in details',()=>{
 const c={pdfTotal:27,total:24,checked:24,read:6,vision:6,ocr:0,skipped:Array(18).fill({})};
 assert.equal(plainPageCoverage(c),'27 pages checked · test results found on 9 · 18 had no test results');
 assert.equal(plainPageCoverage({...c,vision:0,ocr:6}),plainPageCoverage(c));
 assert(!/scan|fallback|OCR|AI vision/.test(plainPageCoverage(c)));
});
test('only explicitly failed pages get the failure message; pending and skipped pages are not failures',()=>{
 const c={pdfTotal:5,total:2,checked:1,read:0,skipped:[]};
 assert.equal(plainPageCoverage(c),'4 pages checked · test results found on 3 · 0 had no test results');
 assert.equal(plainPageCoverage(c,[4,4]),"4 pages checked · test results found on 3 · 0 had no test results · 1 page couldn't be read, try uploading again");
 assert.equal(plainPageCoverage(c,[3,4]),"4 pages checked · test results found on 3 · 0 had no test results · 2 pages couldn't be read, try uploading again");
 assert.equal(plainPageCoverage({total:1,checked:1,read:1,skipped:[]}),'1 page checked · test results found on 1 · 0 had no test results');
});
