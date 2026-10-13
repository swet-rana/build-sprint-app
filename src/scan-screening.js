// Screening only decides whether a page is worth attempting. It never supplies values
// or relaxes the unchanged 80% OCR acceptance rule.
const number='[+-]?\\d+(?:[.,]\\d+)?';
const unit='(?:%|(?:[munpkµμ]?g|[munpµμ]?mol|[munµμ]?iu|u|cells?|million|billion|copies)/(?:dl|ml|[µμu]?l|mm3|cumm)|/?(?:[µμu]l|mm3|cumm)|fl\\b|pg\\b|mm/hr\\b|seconds?\\b|sec\\b|ng\\b|mg\\b)';
const numericUnit=new RegExp(`${number}\\s*(?:[x×]\\s*10\\s*(?:\\^?\\s*[+-]?\\d+)?\\s*)?${unit}`,'i');
const range=new RegExp(`(?:${number}\\s*[-–−]\\s*${number}|[<>≤≥]=?\\s*${number})`);
export function scanPageCheck(data){
 const lines=(data.blocks??[]).flatMap(b=>(b.paragraphs??[]).flatMap(p=>(p.lines??[]).map(l=>(l.words??[]).map(w=>w.text??'').join(' '))));
 const text=lines.length?lines.join('\n'):String(data.text??'');
 const evidence=text.split(/[\r\n]+/).map(s=>s.trim()).filter(line=>{
  if(/^(?:pages?\b|phone\b|mobile\b|age\b|collected\b|collection date\b|test date\b|report(?:\s+(?:no|number))?\s*[:#])/i.test(line))return false;
  // A printed date is not a reference interval.
  const checked=line.replace(/\b\d{1,4}[-/]\d{1,2}[-/]\d{1,4}\b/g,'');
  return numericUnit.test(checked)||range.test(checked);
 });
 return evidence.length?{hasTestContent:true,evidence:evidence.slice(0,3),reason:'OCR found numbers with lab units or reference ranges.'}:{hasTestContent:false,evidence:[],reason:'Local OCR found no test-like numbers with lab units or reference ranges; skipped before AI vision. Check the original for omitted results.'};
}
