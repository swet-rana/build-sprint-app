import {parseRange} from './lab-parser.js';
// Display-only interpretation. Extraction, stored reference text and unit conversion
// keep their existing paths and retain the full printed reference.
export function parseSummaryRange(text){
 const input=String(text??'').replace(/\s+/g,' ').trim();
 const plain=parseRange(input);if(plain)return plain;
 const labels=[...input.matchAll(/(\d+(?:\s*[-–]\s*\d+)?\s*(?:years?|yrs?|months?|mos?|days?)|[A-Za-z][A-Za-z ()/-]*?)\s*:\s*/gi)];
 const adult=/^adults?$/i;
 const ageLabel=/^(?:adults?|child(?:ren)?|p[ae]ediatric(?:s)?|infants?|neonates?|newborns?|adolescents?|\d.*(?:years?|yrs?|months?|mos?|days?))$/i;
 const hasAdult=labels.some(match=>adult.test(match[1].trim()));
 if(!hasAdult&&labels.some(match=>ageLabel.test(match[1].trim())))return null;
 const preferred=hasAdult?adult:/^(?:normal(?: range| values?)?|reference(?: range| interval)?|desirable(?: range)?|within range)$/i;
 const candidates=labels.flatMap((match,i)=>preferred.test(match[1].trim())?[parseRange(input.slice(match.index+match[0].length,labels[i+1]?.index??input.length).replace(/[;,|\s]+$/,''))]:[]);
 if(!candidates.length||candidates.some(r=>!r)||candidates.some(r=>JSON.stringify(r)!==JSON.stringify(candidates[0])))return null;
 return candidates[0];
}
export function summaryRangeStatus(value,text){
 if(typeof value!=='number'||!Number.isFinite(value))return 'unknown';
 const range=parseSummaryRange(text);if(!range)return 'unknown';
 if(range.low!==null&&(value<range.low||(!range.lowInclusive&&value===range.low)))return 'below';
 if(range.high!==null&&(value>range.high||(!range.highInclusive&&value===range.high)))return 'above';
 return 'within';
}
