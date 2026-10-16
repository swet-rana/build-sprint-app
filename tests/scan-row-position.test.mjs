import test from 'node:test';import assert from 'node:assert/strict';
import {findScanRow} from '../src/scan-row-position.js';
const w=(text,x,y,width=90,confidence=96)=>({text,confidence,bbox:{x0:x,y0:y,x1:x+width,y1:y+24}});
const data=rows=>({blocks:[{paragraphs:[{lines:rows.map(words=>({words}))}]}]});
const row=y=>[w('Calcium',40,y),w('9.4',300,y),w('mg/dL',450,y),w('8.6-10',650,y)];
test('scan row comes from OCR boxes beneath the heading, never the model estimate',()=>{
 const box=findScanRow(data([[w('Calcium',40,200)],row(250)]),1000,1000,'Calcium');assert(box);assert(box.top>.24);assert(box.top+box.height<.29);assert(box.top>224/1000);
});
test('uncertain, missing, different or repeated names produce no box',()=>{
 const unclear=row(250);unclear[0].confidence=79;
 assert.equal(findScanRow(data([unclear]),1000,1000,'Calcium'),null);
 assert.equal(findScanRow(data([row(250)]),1000,1000,'Missing test'),null);
 assert.equal(findScanRow(data([row(250),row(350)]),1000,1000,'Calcium'),null);
 assert.equal(findScanRow(data([[w('Calcium',40,250),w('Ionized',140,250),...row(250).slice(1)]]),1000,1000,'Calcium'),null);
});

test('position matching relies on the confident name, without accepting the OCR numeric result',()=>{
 const words=row(250);words[1].confidence=76;assert(findScanRow(data([words]),1000,1000,'Calcium'));
});
