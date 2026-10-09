import test from 'node:test';
import assert from 'node:assert/strict';
import {categoriesForTest,testInCategory} from '../src/health-categories.js';
const marker=(name,key=name.replace(/[^a-z0-9]/gi,'').toUpperCase()+'|mg/dl')=>({name,key});
test('maps common Indian panel names and aliases to the right categories',()=>{
 for(const [name,category] of [['LDL CHOLESTEROL','heart'],['CHOL / HDL RATIO','heart'],['ALANINE AMINOTRANSFERASE (ALT/SGPT)','liver'],['BILIRUBIN CONJUGATED (DIRECT)','liver'],['A/G RATIO','liver'],['.eGFR - ESTIMATED GLOMERULAR FILTRATION RATE','kidney'],['CREATININE','kidney'],['BLOOD UREA NITROGEN','kidney'],['GLUCOSE, FASTING','sugar'],['HbA1c','sugar'],['TSH','thyroid'],['Haemoglobin','blood'],['R.D.W','blood'],['PCV','blood'],['TOTAL IRON BINDING CAPACITY','iron'],['Vitamin B12','vitamins'],['PROLACTIN','hormones'],['LIPASE','digestion']])assert.ok(testInCategory(marker(name),category),name);
});
test('allows shared tests and separates inflammation from heart and iron tests',()=>{
 assert.deepEqual(categoriesForTest(marker('C-reactive protein','crp|mg/l')),['inflammation']);
 assert.ok(testInCategory(marker('White blood cells','wbc|cells/cu.mm'),'blood'));
 assert.ok(testInCategory(marker('White blood cells','wbc|cells/cu.mm'),'inflammation'));
 assert.ok(testInCategory(marker('Vitamin D','vitamin-d|ng/ml'),'bone'));
 assert.ok(testInCategory(marker('CALCIUM'),'kidney'));
 assert.ok(!testInCategory(marker('FERRITIN'),'inflammation'));
 assert.ok(!testInCategory(marker('MICROALBUMIN'),'liver'));
 assert.deepEqual(categoriesForTest(marker('Unrecognized assay')),['other']);
});

test('fertility groups recorded blood hormones but not pregnancy tests or unrelated vitamins',()=>{
 for(const name of ['AMH','Anti-Mullerian hormone','FSH','Follicle stimulating hormone','LH','Luteinising hormone','Estradiol','Oestradiol','Progesterone','17-hydroxyprogesterone','Total testosterone','Prolactin','TSH']) assert.ok(testInCategory(marker(name),'fertility'),name);
 for(const name of ['Beta HCG','Vitamin D','Semen volume','Glucose']) assert.ok(!testInCategory(marker(name),'fertility'),name);
 assert.ok(testInCategory({key:'tsh|miu/l',name:'TSH',observations:[{rawName:'Thyroid stimulating hormone'}]},'fertility'));
});
test('longevity groups established long-term health markers without treating all inflammation as cardiac risk',()=>{
 for(const name of ['LDL cholesterol','HDL','Non-HDL cholesterol','Triglycerides','Apolipoprotein B','ApoB','Lipoprotein(a)','Lp(a)','Glucose fasting','HbA1c','Creatinine','eGFR','Cystatin C','hs-CRP','High sensitivity C-reactive protein','C-reactive protein (high sensitivity)']) assert.ok(testInCategory(marker(name),'longevity'),name);
 for(const name of ['CRP','C-reactive protein','ESR','Vitamin D','Testosterone','Apolipoprotein A1','Urine creatinine','Troponin','Telomere length']) assert.ok(!testInCategory(marker(name),'longevity'),name);
 assert.ok(testInCategory(marker('HbA1c'),'sugar'));
 assert.ok(testInCategory(marker('Creatinine'),'kidney'));
});
