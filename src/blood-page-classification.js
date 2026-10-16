import {testIdentity} from './test-names.js';
export function isStandardBloodTest(name,unit){
 const text=String(name??'').trim();if(/urine|urinary|semen|sperm|post[ -]?wash|pre[ -]?wash/i.test(text))return false;
 const id=testIdentity(text,unit).key.split('|')[0];if(id&&id!==id.toUpperCase())return true;
 return /^(?:serum\s+)?(?:creatinine|urea|uric acid|calcium|phosphorus|phosphate|sodium|potassium|chloride|magnesium|albumin|globulin|total protein|a\s*\/\s*g ratio|albumin\s*\/\s*globulin ratio|(?:total|direct|indirect)\s+bilirubin|bilirubin(?:\s*[,(-]\s*(?:total|direct|indirect)\)?)?|triglycerides?|(?:total|hdl|ldl|vldl|non[ -]?hdl)\s+cholesterol|cholesterol(?:\s*[,(-]\s*(?:total|hdl|ldl|vldl)\)?)?|(?:blood\s+)?(?:glucose|sugar)(?:\s*[,(-]?\s*(?:fasting|random|post[ -]?prandial|pp|f|r)\)?)?|(?:fasting|random|post[ -]?prandial)\s+(?:blood\s+)?(?:glucose|sugar)|fbs|rbs|ppbs|t3|t4|ft3|ft4|free\s+t[34]|vitamin\s+(?:b[ -]?12|d(?:3)?)(?:\s*\(25[ -]?oh\))?|platelet(?:s|\s+count)?|neutrophils?|monocytes?|eosinophils?|basophils?|rdw(?:[ -]?(?:cv|sd))?|amh|anti[ -]?m[uü]llerian hormone|testosterone|progesterone|estradiol|prolactin|ferritin)(?:\s*,?\s*(?:serum|plasma|blood))?$/i.test(text);
}
export function classifyScanPage(scan){
 if(scan.specimen==='urine'||scan.specimen==='stool')return {...scan,reportKind:scan.specimen};
 if(scan.reportKind==='urine'||scan.reportKind==='stool')return {...scan,specimen:scan.reportKind};
 if(scan.reportKind!=='other'||scan.specimen==='semen')return scan;
 if(!scan.tests.some(row=>isStandardBloodTest(row.name,row.unit)))return scan;
 return {...scan,reportKind:'blood',originalReportKind:'other'};
}
