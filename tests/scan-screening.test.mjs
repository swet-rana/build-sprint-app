import test from 'node:test';
import assert from 'node:assert/strict';
import {scanPageCheck} from '../src/scan-screening.js';
const data=text=>({text,blocks:[]});
test('OCR screening skips blank pages, covers, dates, addresses and image captions without test-like results',()=>{
 for(const text of ['', 'Prima Diagnostic Centre\nPatient Name: Fictional Person\nCollected: 12/10/2026\nAge: 38 years\nReport 1234567890\nPage 1 of 27', 'Chest image attachment\nImage 2\nPhone 9876543210', 'Page 12 of 27\nAppointment 10:30\nWeight 65 kg\nHeight 170 cm']){
  const check=scanPageCheck(data(text));assert.equal(check.hasTestContent,false,text);assert(check.reason.includes('no test-like'));
 }
});
test('OCR screening accepts numbers with lab units or printed ranges without relaxing result confidence',()=>{
 for(const text of ['Haemoglobin 13.2 g/dL 12 - 16','CRP 3 mg/L','Vitamin D 24 ng/mL','Sperm concentration 16 million/mL','Motility 42 %','Calcium 9.4 8.5 - 10.5','TSH 2.4 µIU/mL','Glucose 90 mg/dl','Result < 5','Platelets 250 x10^3/uL','Calcium 9.O mg/dL','Haemoglobin 13.2 gm/dL','Calcium 9.4 8.5 to 10.5'])assert.equal(scanPageCheck(data(text)).hasTestContent,true,text);
 const low={text:'',blocks:[{paragraphs:[{lines:[{words:[{text:'Calcium',confidence:40},{text:'9.4',confidence:35},{text:'mg/dL',confidence:20}]}]}]}]};assert.equal(scanPageCheck(low).hasTestContent,true);
});
