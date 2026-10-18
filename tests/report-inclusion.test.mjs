import test from 'node:test';
import assert from 'node:assert/strict';
import {reportInclusion,inclusionPageList} from '../src/report-inclusion.js';
const reports=[{id:'first',fileName:'Fictional-first.pdf',pageCount:5,usedPages:[4,2,4],markers:[]},{id:'second',fileName:'Fictional-second.pdf',pageCount:6,usedPages:[5,3],markers:[]}];
const comparison={reports,comparable:[{observations:[{page:4,unit:'mg/L'},{page:5,unit:'mg/L'}]},{observations:[{page:4,unit:'g/L'},{page:3,unit:'mg/L'}]},{observations:[null,{page:3,unit:'mg/L'}]}]};
test('every selected report has its own saved total, result pages and same-unit comparable pages',()=>{
 assert.deepEqual(reportInclusion(comparison),[
 {fileName:'Fictional-first.pdf',totalPages:5,testPages:[2,4],comparablePages:[4]},
 {fileName:'Fictional-second.pdf',totalPages:6,testPages:[3,5],comparablePages:[5]},
 ]);
 assert.equal(inclusionPageList([2,4]),'2 (pages 2, 4)');assert.equal(inclusionPageList([]),'0');
});
test('uploaded filenames and selected order survive chronological comparison sorting',()=>{
 const rows=reportInclusion(comparison,[{id:'second',name:'Uploaded-second.pdf'},{id:'first',name:'Uploaded-first.pdf'}]);
 assert.equal(rows[0].fileName,'Uploaded-second.pdf');assert.deepEqual(rows[0].comparablePages,[5]);assert.equal(rows[1].totalPages,5);
});
test('a selected report without saved reading results is included without inventing counts',()=>{
 const row=reportInclusion(comparison,[{id:'unread',name:'Fictional-unread.pdf',pageCount:7}])[0];
 assert.deepEqual(row,{fileName:'Fictional-unread.pdf',totalPages:7,testPages:null,comparablePages:null});assert.equal(inclusionPageList(row.testPages),'Not available');
});

test('mixed-file inclusion agrees with page details including all three native-text pages',async()=>{
 const {plainPageCoverage}=await import('../src/page-coverage.js');
 const scanCoverage={pdfTotal:27,total:24,checked:24,read:6,skipped:Array.from({length:18},(_,i)=>({page:i+1})),textPages:[{page:25,tests:0},{page:26,tests:2},{page:27,tests:0}]};
 const report={id:'mixed',fileName:'Fictional-mixed.pdf',pageCount:99,usedPages:[19,20,21,22,23,24],scanCoverage,markers:[]};
 const other={id:'other',fileName:'Fictional-other.pdf',pageCount:4,usedPages:[2,3],markers:[]};
 const comparison={reports:[report,other],comparable:[{observations:[{page:19,unit:'mg/L'},{page:2,unit:'mg/L'}]},{observations:[{page:1,unit:'mg/L'},{page:3,unit:'mg/L'}]}]};
 const rows=reportInclusion(comparison);
 assert.equal(rows[0].totalPages,27);assert.deepEqual(rows[0].testPages,[19,20,21,22,23,24,25,26,27]);assert.equal(rows[0].testPages.length,9);
 assert(plainPageCoverage(scanCoverage).includes('test results found on 9'));assert.deepEqual(rows[0].comparablePages,[19]);assert.deepEqual(rows[1].comparablePages,[2,3]);
 for(const row of rows)assert(row.comparablePages.every(page=>row.testPages.includes(page)));
 // Each file retains its own physical page numbers, regardless of selected order.
 const reversed=reportInclusion(comparison,[other,report]);assert.deepEqual(reversed[0].testPages,[2,3]);assert.deepEqual(reversed[1].testPages,rows[0].testPages);
 const legacy=reportInclusion({...comparison,reports:[{...report,scanCoverage:{...scanCoverage,textPages:undefined}},other]});assert.deepEqual(legacy[0].testPages,rows[0].testPages);
});
test('unfinished coverage does not count unprocessed pages and comparable pages stay within known result pages',()=>{
 const report={id:'partial',fileName:'Fictional-partial.pdf',pageCount:5,usedPages:[4],markers:[],scanCoverage:{pdfTotal:5,total:2,checked:1,read:1,skipped:[],textPages:[{page:1,tests:0},{page:2,tests:1},{page:3,tests:0}]}};
 const result=reportInclusion({reports:[report],comparable:[]})[0];assert.deepEqual(result.testPages,[1,2,3,4]);assert(!result.testPages.includes(5));
});
