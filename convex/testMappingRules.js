import {TEST_DEFINITIONS,testIdentity,isKnownTestName,unitIdentity} from '../src/test-names.js';
const units={mcv:'fL',mch:'pg',mchc:'g/dL',mpv:'fL',pdw:'fL',lymphocytes:'%',haemoglobin:'g/dL',wbc:'10^3/uL',esr:'mm/hr',hba1c:'%',tsh:'uIU/mL',t3:'ng/dL',t4:'ug/dL','vitamin-d':'ng/mL','vitamin-b12':'pg/mL',crp:'mg/L',pcv:'%',rbc:'10^6/uL',alt:'U/L',ast:'U/L',alp:'U/L',ggt:'U/L',bun:'mg/dL',iron:'ug/dL',tibc:'ug/dL',uibc:'ug/dL',fsh:'mIU/mL',lh:'mIU/mL'};
export const STANDARD_TESTS=TEST_DEFINITIONS.map(([id,name])=>({id,name,unit:units[id]??(id.endsWith('-absolute')?'10^3/uL':id.endsWith('-ratio')?'Ratio':id.startsWith('cholesterol-')?'mg/dL':id.startsWith('glucose-')?'mg/dL':'')})).concat([
 {id:'rdw-cv',name:'RDW-CV',unit:'%'},
 ...[['CREATININE','Creatinine','mg/dL'],['CALCIUM','Calcium','mg/dL'],['AMH','AMH','ng/mL'],['TESTOSTERONE','Testosterone (unspecified)','ng/dL'],['FREETESTOSTERONE','Free testosterone','pg/mL'],['TRIGLYCERIDES','Triglycerides','mg/dL'],['ALBUMIN','Albumin','g/dL'],['UREA','Urea','mg/dL'],['URICACID','Uric acid','mg/dL'],['TOTALBILIRUBIN','Total bilirubin','mg/dL'],['DIRECTBILIRUBIN','Direct bilirubin','mg/dL'],['GLUCOSE','Glucose (condition not stated)','mg/dL'],['HSCRP','High sensitivity CRP','mg/L'],['PLATELETCOUNT','Platelet count','10^3/uL']].map(([id,name,unit])=>({id,name,unit}))
]);
const standards=new Map(STANDARD_TESTS.map(s=>[s.id,s]));
export const standardTest=id=>standards.get(id)??null;
export const mappingKey=({name,specimen='blood',method=''})=>JSON.stringify([specimen,String(method).normalize('NFKC').trim().toLowerCase(),String(name).normalize('NFKC').trim().replace(/\s+/g,' ').toLowerCase()]);
export function localStandard(name,unit){
 const identity=testIdentity(name,unit),id=identity.key.split('|')[0];
 if(isKnownTestName(name,unit))return standardTest(id);
 const compact=String(name).toUpperCase().replace(/[^A-Z0-9]/g,'');
 // Only exact existing standard names are seeded; new synonyms still go through AI.
 return STANDARD_TESTS.find(s=>s.id===id&&s.id===compact)??null;
}
export function validStandardMatch(name,id){
 if(!standardTest(id))return false;
 const text=String(name).toLowerCase(),free=/\bfree\b/.test(text),direct=/\bdirect\b/.test(text),highSensitivity=/high[ -]?sensitiv|\bhs[ -]?crp\b/.test(text);
 if(free&&['t3','t4','TESTOSTERONE'].includes(id))return false;
 if(direct&&id==='cholesterol-ldl')return false;
 if(highSensitivity&&id==='crp'||!highSensitivity&&id==='HSCRP')return false;
 if(/\brandom\b|\brbs\b/.test(text)&&id==='glucose-fasting'||/fasting|\bfbs\b/.test(text)&&id==='glucose-random')return false;
 if(id==='glucose-fasting'&&!/fasting|\bfbs\b/.test(text)||id==='glucose-random'&&!/random|\brbs\b/.test(text))return false;
 if(id==='GLUCOSE'&&/fasting|random|\bfbs\b|\brbs\b/.test(text))return false;
 if(id==='bun'&&/\burea\b/.test(text)&&!/nitrogen|\bbun\b/.test(text)||id==='UREA'&&/nitrogen|\bbun\b/.test(text))return false;
 if(id==='TOTALBILIRUBIN'&&direct||id==='DIRECTBILIRUBIN'&&!direct)return false;
 if(id==='FREETESTOSTERONE'&&!free)return false;
 if(/\burine\b|post[ -]?wash|pre[ -]?wash|prepared sperm|semen|sperm/i.test(text))return false;
 return true;
}
const prefixes={g:1,mg:1e-3,ug:1e-6,ng:1e-9,pg:1e-12,iu:1,miu:1e-3,uiu:1e-6};
const volumes={l:1,dl:.1,ml:.001,ul:1e-6};
function concentration(unit){const m=unit.match(/^(g|mg|ug|ng|pg|iu|miu|uiu)\/(l|dl|ml|ul)$/);return m?{dimension:m[1].endsWith('iu')?'activity':'mass',scale:prefixes[m[1]]/volumes[m[2]]}:null;}
export function conversionFactor(id,sourceUnit){
 const standard=standardTest(id);if(!standard?.unit)return null;
 const source=unitIdentity(sourceUnit).replace(/^gm\//,'g/'),target=unitIdentity(standard.unit);
 if(source===target)return 1;
 const a=concentration(source),b=concentration(target);if(a&&b&&a.dimension===b.dimension)return a.scale/b.scale;
 if(target==='10^3/ul'||target==='10^6/ul'){
  const factors={'cells/ul':1,'cells/cumm':1,'cells/mm3':1,'10^3/ul':1000,'10^9/l':1000,'10^6/ul':1000000,'10^12/l':1000000};
  if(source in factors)return factors[source]/(target==='10^3/ul'?1000:1000000);
 }
 // Analyte-specific factors, never supplied by AI. Sources are documented in docs/test-matching.md.
 if(source==='umol/l'&&id==='CREATININE')return 1/88.4;
 if(source==='mmol/l'&&id.startsWith('cholesterol-')&&!id.endsWith('-ratio'))return 38.67;
 if(source==='mmol/l'&&(id.startsWith('glucose-')||id==='GLUCOSE'))return 1/.0555;
 return null;
}
