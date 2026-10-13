import test from 'node:test';
import assert from 'node:assert/strict';
test('equivalent lab names get the same identity while retaining printed names',async()=>{
 const {testIdentity}=await import('../src/test-names.js');
 const pairs=[['CHOLESTEROL - LDL','LDL CHOLESTEROL'],['Cholesterol - Total','TOTAL CHOLESTEROL'],['Cholesterol - HDL','HDL CHOLESTEROL'],['Cholesterol- VLDL','VLDL CHOLESTEROL'],['Non HDL Cholesterol','NON-HDL CHOLESTEROL'],['Cholesterol : HDL Cholesterol','CHOL / HDL RATIO'],['Glucose - Fasting','GLUCOSE, FASTING , NAF PLASMA'],['HCT','PCV'],['RBC','RBC COUNT'],['SGPT','ALANINE AMINOTRANSFERASE (ALT/SGPT)'],['SGOT','ASPARTATE AMINOTRANSFERASE (AST/SGOT)'],['BUN','BLOOD UREA NITROGEN'],['FSH','Follicle Stimulating Hormone (FSH)'],['LH','Luteinizing Hormone (LH)'],['Hemoglobin','HAEMOGLOBIN'],['HbA1c','HBA1C, GLYCATED HEMOGLOBIN'],['RDW-CV','R.D.W']];
 for(const [a,b] of pairs){const x=testIdentity(a,'%'),y=testIdentity(b,'%');assert.equal(x.key,y.key,`${a} / ${b}`);assert.equal(x.rawName,a);}
 assert.equal(testIdentity('Cholesterol : HDL Cholesterol','').key,testIdentity('CHOL / HDL RATIO','Ratio').key);
});
test('different analytes, conditions, ratios and units are never merged',async()=>{
 const {testIdentity}=await import('../src/test-names.js');
 for(const [a,b] of [['LDL CHOLESTEROL','NON HDL CHOLESTEROL'],['HDL CHOLESTEROL','CHOL / HDL RATIO'],['CHOL / HDL RATIO','LDL : HDL Cholesterol'],['GLUCOSE, FASTING','GLUCOSE, RANDOM'],['T3, Total','Free T3'],['T4, Total','Free T4'],['CRP','hs-CRP'],['RDW-CV','RDW-SD'],['CREATININE','Urinary Creatinine'],['NEUTROPHILS','Absolute Neutrophil Count'],['LDL CHOLESTEROL','LDL direct']])assert.notEqual(testIdentity(a,'mg/dL').key,testIdentity(b,'mg/dL').key,`${a} / ${b}`);
 assert.notEqual(testIdentity('Cholesterol - LDL','mg/dL').key,testIdentity('LDL CHOLESTEROL','mmol/L').key);
});
test('explicit full names match their abbreviations with compatible units',async()=>{
 const {testIdentity}=await import('../src/test-names.js');
 for(const [a,b,unit] of [['HEMATOCRIT(PCV)','HCT','%'],['MEAN CORPUSCULAR VOLUME(MCV)','MCV','fL'],['MEAN CORP.HEMO.CONC(MCHC)','MCHC','g/dL'],['RED CELL DISTRIBUTION WIDTH (RDW-CV)','RDW-CV','%'],['MEAN PLATELET VOLUME(MPV)','MPV','fL'],['PLATELET DISTRIBUTION WIDTH(PDW)','PDW','fL'],['LYMPHOCYTE PERCENTAGE','LYMPHOCYTES','%'],['TOTAL THYROXINE (T4)','T4, Total','ug/dL'],['THYROID STIMULATING HORMONE (TSH)','TSH','uIU/mL'],['BLOOD UREA NITROGEN (BUN)','BUN','mg/dL']])assert.equal(testIdentity(a,unit).key,testIdentity(b,unit).key,a);
 assert.equal(testIdentity('NEUTROPHILS - ABSOLUTE COUNT','X 10³ / μL').key,testIdentity('Absolute Neutrophil Count','10^3/μL').key);
 assert.equal(testIdentity('PLATELET COUNT','X 10³ / μL').key,testIdentity('PLATELET COUNT','10^3/μL').key);
 assert.notEqual(testIdentity('PLATELET COUNT','10^6/uL').key,testIdentity('PLATELET COUNT','10^3/uL').key);
 assert.notEqual(testIdentity('PLATELET COUNT','cells/uL').key,testIdentity('PLATELET COUNT','10^3/uL').key);
 assert.notEqual(testIdentity('MCH','pq').key,testIdentity('MCH','pg').key);
 assert.notEqual(testIdentity('TOTAL TRIIODOTHYRONINE (T3)','ng/dL').key,testIdentity('T3, Total','ng/mL').key);
 assert.notEqual(testIdentity('NEUTROPHILS','%').key,testIdentity('Absolute Neutrophil Count','10^3/μL').key);
});
