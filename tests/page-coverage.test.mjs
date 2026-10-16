import test from 'node:test';
import assert from 'node:assert/strict';
import {pdfPageTotal,textPageReason,pageExplanations} from '../src/page-coverage.js';
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
