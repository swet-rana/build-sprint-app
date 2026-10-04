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
