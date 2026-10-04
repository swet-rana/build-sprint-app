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
