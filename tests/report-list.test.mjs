import test from 'node:test';
import assert from 'node:assert/strict';
import {numberReports,fileFingerprint} from '../src/report-list.js';
test('duplicates use file contents and reference the original stable report number',()=>{
 const rows=numberReports([
  {id:'c',uploadedAt:3,serial:8,name:'renamed.pdf',contentHash:'same'},
  {id:'b',uploadedAt:2,serial:7,name:'original.pdf',contentHash:'different'},
  {id:'a',uploadedAt:1,serial:6,name:'original.pdf',contentHash:'same'},
 ]);
 assert.equal(rows[0].duplicateOf,6);assert.equal(rows[1].duplicateOf,null);assert.equal(rows[2].duplicateOf,null);
 assert.equal(numberReports([rows[0],rows[1]])[0].serial,8);
 assert.equal(numberReports([rows[0],rows[1]])[0].duplicateOf,null);
});
test('identical bytes match even with different names; different bytes do not match',async()=>{
 const a=await fileFingerprint(new Blob(['report A']));
 assert.equal(a,await fileFingerprint(new Blob(['report A'])));
 assert.notEqual(a,await fileFingerprint(new Blob(['report B'])));
 assert.match(a,/^[a-f0-9]{64}$/);
});

test('report sorting supports both dates and directions without changing numbering or input', async () => {
 const {sortReports}=await import('../src/report-list.js');
 const rows=numberReports([
  {id:'a',uploadedAt:10,serial:1,details:{testDate:'2026-08-25'}},
  {id:'b',uploadedAt:30,serial:3,details:{testDate:'2024-08-19'}},
  {id:'c',uploadedAt:20,serial:2,details:{testDate:'2026-05-27'}},
 ]);
 const ids=order=>sortReports(rows,order).map(r=>r.id);
 assert.deepEqual(ids('upload-newest'),['b','c','a']);
 assert.deepEqual(ids('upload-oldest'),['a','c','b']);
 assert.deepEqual(ids('report-newest'),['a','c','b']);
 assert.deepEqual(ids('report-oldest'),['b','c','a']);
 assert.deepEqual(rows.map(r=>r.serial),[1,3,2]);
 assert.equal(sortReports(rows,'report-newest')[2].serial,3);
});
test('missing or invalid report dates stay last in either direction and ties are stable', async () => {
 const {sortReports}=await import('../src/report-list.js');
 const rows=[
  {id:'missing',uploadedAt:50},
  {id:'invalid',uploadedAt:40,details:{testDate:'2026-02-30'}},
  {id:'a',uploadedAt:10,details:{testDate:'2026-05-27'}},
  {id:'b',uploadedAt:20,details:{testDate:'2026-05-27'}},
 ];
 for(const order of ['report-newest','report-oldest'])assert.deepEqual(sortReports(rows,order).map(r=>r.id),['b','a','missing','invalid']);
 assert.deepEqual(sortReports([]),[]);
});
