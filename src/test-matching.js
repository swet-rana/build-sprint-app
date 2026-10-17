import {formatTestName} from './format-test-name.js';
import {localStandard,mappingKey,standardTest,validStandardMatch,conversionFactor} from '../convex/testMappingRules.js';
import {parseRange} from './lab-parser.js';
import {unitIdentity} from './test-names.js';
const scaled=(value,factor)=>Number((value*factor).toPrecision(12));
function convertedRange(text,factor){
 if(factor===1)return text;
 const range=parseRange(text);if(!range)return `Range not converted; check original: ${text}`;
 if(range.low!==null&&range.high!==null)return `${scaled(range.low,factor)}-${scaled(range.high,factor)}`;
 if(range.low!==null)return `${range.lowInclusive?'>=':'>'}${scaled(range.low,factor)}`;
 return `${range.highInclusive?'<=':'<'}${scaled(range.high,factor)}`;
}
export function originalResultTitle(marker){const source=marker.original??{name:marker.rawName??marker.name,value:marker.value,unit:marker.unit,referenceText:marker.referenceText};return `Original report: ${formatTestName(source.name)}: ${source.value} ${source.unit}. Reference: ${source.referenceText}`;}
export async function normalizeReportTests(reports,resolve){
 if(!resolve)return reports;
 const unknown=new Map();
 for(const report of reports)for(const marker of report.markers){
  if(['semen','urine','stool'].includes(marker.specimen)||/^(?:semen|urine|stool)-/.test(marker.key))continue;
  const entry={name:marker.rawName??marker.name,unit:marker.unit,specimen:'blood',method:marker.method??''};
  if(!localStandard(entry.name,entry.unit))unknown.set(mappingKey(entry),entry);
 }
 const mappings=new Map();
 if(unknown.size){const entries=[...unknown.values()];for(let i=0;i<entries.length;i+=50){const results=await resolve(entries.slice(i,i+50));for(const match of results)mappings.set(mappingKey(match),match);}}
 return reports.map(report=>{
  const warnings=[...report.warnings],markers=[];
  for(const marker of report.markers){
   if(['semen','urine','stool'].includes(marker.specimen)||/^(?:semen|urine|stool)-/.test(marker.key)){markers.push(marker);continue;}
   const entry={name:marker.rawName??marker.name,unit:marker.unit,specimen:'blood',method:marker.method??''},cached=mappings.get(mappingKey(entry));
   const standard=localStandard(entry.name,entry.unit)??(cached?.status==='mapped'&&validStandardMatch(entry.name,cached.standardId)?standardTest(cached.standardId):null);
   if(!standard){markers.push(marker);if(cached&&cached.status!=='mapped')warnings.push(`${entry.name}: name matching ${cached.status}; original name and units retained.`);continue;}
   const factor=conversionFactor(standard.id,marker.unit);
   if(factor===null){markers.push(marker);warnings.push(`${entry.name}: ${marker.unit} cannot be safely converted to ${standard.unit}; original result retained.`);continue;}
   const converted={...marker,key:`${standard.id}|${unitIdentity(standard.unit)}`,name:standard.name,unit:standard.unit,value:scaled(marker.value,factor),referenceText:convertedRange(marker.referenceText,factor),original:{name:entry.name,value:marker.value,unit:marker.unit,referenceText:marker.referenceText},conversionFactor:factor,...(cached?.mappingId?{mappingId:cached.mappingId}:{})};
   const prior=markers.find(m=>m.key===converted.key);if(prior&&prior.value!==converted.value)throw Error(`Conflicting ${standard.name} values remain after name matching. Check the originals.`);
   if(!prior)markers.push(converted);
  }
  return {...report,markers,warnings};
 });
}
