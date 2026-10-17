// Display only. Never use this label as a stored name, matching key or AI input.
const abbreviations=['HbA1c','LDL','HDL','VLDL','TSH','T3','T4','FT3','FT4','ALT','AST','SGPT','SGOT','GGT','ALP','RBC','WBC','MCV','MCH','MCHC','RDW','ESR','CRP','eGFR','BUN','PSA','B12','Vitamin D','pH'];
const canonical=new Map(abbreviations.map(name=>[name.toLowerCase(),name]));
const abbreviationPattern=new RegExp(`(?<![\\p{L}\\p{N}])(?:${abbreviations.join('|')})(?![\\p{L}\\p{N}])`,'giu');
// Protect unit spellings when a report includes them inside the test label.
const unitPattern=/(?<![\p{L}\p{N}])(?:(?:[munpkµμ]?g|[munpµμ]?mol|[mµμ]?IU|IU|U|cells|mEq|10\^\d+|\d+)\/(?:[dcmµμu]?L|mm3|mm\^3)|mmHg|fL|pg)(?![\p{L}\p{N}])/giu;
export function formatTestName(name){
 const units=[];
 let label=String(name??'').replace(/\s+/g,' ').trim().replace(unitPattern,unit=>{units.push(unit);return `\uE000${units.length-1}\uE001`;});
 label=label.replace(/(?<=\p{L})\s*[-‐‑–]\s*(?=\p{L})/gu,' ').replace(/\s+/g,' ').toLowerCase();
 label=label.replace(/\p{L}/u,letter=>letter.toUpperCase()).replace(abbreviationPattern,match=>canonical.get(match.toLowerCase()));
 return label.replace(/\uE000(\d+)\uE001/g,(_,index)=>units[Number(index)]);
}
