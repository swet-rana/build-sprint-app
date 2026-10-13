import test from 'node:test';
import assert from 'node:assert/strict';
import { ocrPage } from '../src/ocr-page.js';
import { parseReport } from '../src/lab-parser.js';
function data({confidence=99,value='6.5'}={}){
 const word=(text,x,y,width=35)=>({text,confidence,bbox:{x0:x,y0:y,x1:x+width,y1:y+16}});
 const rows=[
 [word('Patient',20,20),word('Name',65,20),word(':',110,20,5),word('Sample',125,20),word('Patient',175,20)],
 [word('Collected',310,50,65),word(':',380,50,5),word('27/May/2026',395,50,110)],
 [word('Test',20,150),word('Name',65,150),word('Result',240,150,40),word('Unit',320,150),word('Bio.',390,150),word('Ref.',425,150),word('Interval',460,150),word('Method',550,150)],
 [word('HAEMOGLOBIN',20,200,130),word(value,240,200),word('g/dL',320,200),word('12-15',425,200),word('Calculated',550,200)],
 ];
 return {blocks:[{paragraphs:[{lines:rows.map(words=>({words}))}]}]};
}
test('OCR coordinates preserve patient, collection date, test, decimal value and reference',()=>{
 const report=parseReport([ocrPage(data(),600,900,3)]);
 assert.equal(report.patientName,'Sample Patient');assert.equal(report.date,'2026-05-27');
 assert.equal(report.markers[0].value,6.5);assert.equal(report.markers[0].referenceText,'12-15');assert.equal(report.markers[0].page,3);
});
test('unreadable and uncertain OCR output fails rather than inventing results',()=>{
 assert.throws(()=>ocrPage({blocks:[]},600,900),/No readable text/);
 assert.throws(()=>ocrPage(data({confidence:30}),600,900),/confidently/);
 const output=data();output.blocks[0].paragraphs[0].lines.at(-1).words[1].confidence=30;
 assert.throws(()=>ocrPage(output,600,900),/test result/);
});

test('recognized information pages are excluded without a reading error',()=>{
 const words="Apollo Let's understand the critical markers in detail that require your focus SMART REPORT".split(' ').map((text,i)=>({text,confidence:99,bbox:{x0:20+i*25,y0:100,x1:40+i*25,y1:116}}));
 const result=ocrPage({blocks:[{paragraphs:[{lines:[{words}]}]}]},600,900,56);
 assert.equal(result.exclusionReason,'information page');assert.deepEqual(result.items,[]);
 const cover=words.filter(w=>!['SMART','REPORT'].includes(w.text)).map(w=>({...w,text:w.text==="Let's"?'Let’':w.text}));
 assert.equal(ocrPage({blocks:[{paragraphs:[{lines:[{words:cover}]}]}]},600,900,56).exclusionReason,'information page');
 const unknown=words.filter(w=>!['understand','critical','focus'].includes(w.text));
 assert.throws(()=>ocrPage({blocks:[{paragraphs:[{lines:[{words:unknown}]}]}]},600,900,56),/columns/);
});

test('OCR rejects below 80 and retains exact low words, scores, page and boxes',()=>{
 const input=data();const word=input.blocks[0].paragraphs[0].lines[0].words[3];word.confidence=79.5;
 assert.throws(()=>ocrPage(input,600,800,7),error=>{assert.equal(error.code,'LOW_CONFIDENCE');assert.equal(error.diagnostics.threshold,80);assert.equal(error.diagnostics.page,7);assert.deepEqual(error.diagnostics.lowConfidenceWords,[{text:word.text,confidence:79.5,bbox:word.bbox}]);return true;});
 word.confidence=80;assert.doesNotThrow(()=>ocrPage(input,600,800,7));
});

test('result confidence rejection saves only the low-confidence result words',()=>{
 const input=data();const word=input.blocks[0].paragraphs[0].lines[3].words[1];word.confidence=79;
 assert.throws(()=>ocrPage(input,600,800,3),error=>{assert.equal(error.diagnostics.field,'test result');assert.equal(error.diagnostics.page,3);assert.deepEqual(error.diagnostics.lowConfidenceWords,[{text:word.text,confidence:79,bbox:word.bbox}]);return true;});
 word.confidence=80;assert.doesNotThrow(()=>ocrPage(input,600,800,3));
});
