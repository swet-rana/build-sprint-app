import {unitIdentity} from './test-names.js';
const compact=s=>String(s??'').toLowerCase().replace(/[^a-z0-9]/g,'');
export function pageSpecimen(text){
 text=String(text??'').replace(/[()[\]]/g,' ');
 const urine=/\b(?:complete\s+urine\s+examination|urine\s+(?:routine|analysis|examination)|urinalysis|routine\s+urine(?:\s+examination)?)\b/i.test(text);
 const stool=/\b(?:stool|faecal|fecal)\s+(?:routine|analysis|examination|test)|\b(?:routine\s+stool|coproanalysis)\b/i.test(text);
 const blood=/\b(?:complete blood count|lipid profile|liver function test|renal function test|kidney function test|semen analysis)\b/i.test(text);
 if(urine&&stool||(urine||stool)&&blood)return 'mixed';
 if(urine)return 'urine';if(stool)return 'stool';
 return null;
}
export const isAdditionalSpecimen=specimen=>specimen==='urine'||specimen==='stool';
export function specimenMarker(specimen,name,result,unit='',referenceText='',source={}){
 if(!isAdditionalSpecimen(specimen)||!String(name??'').trim()||!String(result??'').trim())return null;
 if(pageSpecimen(name)||/^(?:specimen|sample|patient name|collection date|test name|parameter|investigation)\s*:?[ ]*$/i.test(String(name).trim()))return null;
 const rawName=String(name).trim(),printedValue=String(result).trim(),printedUnit=/^[-–—]?$/.test(String(unit??'').trim())?'':String(unit).trim();
 if(/^[?□�]+$/.test(printedValue))return null;
 const number=/^[+-]?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?$/.test(printedValue)?Number(printedValue.replaceAll(',','')):null;
 // Preserve ranges and written findings verbatim. Never use a midpoint or invent units.
 const value=number!==null&&Number.isFinite(number)?number:printedValue;
 const token=compact(rawName),aliases={specificgravity:'specificgravity',spgravity:'specificgravity'};
 return {key:`${specimen}-${aliases[token]??token}|${unitIdentity(printedUnit)}`,name:`${specimen==='urine'?'Urine':'Stool'} · ${rawName}`,rawName,specimen,value,unit:printedUnit,referenceText:String(referenceText??'').trim()||'Not printed in result row',qualitative:typeof value!=='number',...source};
}
