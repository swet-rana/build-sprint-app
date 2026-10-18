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
