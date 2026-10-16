// Presentation only: never changes which pages or results are accepted.
export function textPageReason({tests}){return tests?`Read as text, ${tests} ${tests===1?'test':'tests'} found.`:'Read as text, no test results found.';}
export function pageExplanations(coverage){
 return [...(coverage.skipped??[]),...(coverage.textPages??[]).map(page=>({page:page.page,reason:textPageReason(page)}))].sort((a,b)=>a.page-b.page);
}
export function pdfPageTotal(coverage){
 if(!coverage.pdfTotal)return '';
 const text=coverage.pdfTotal-coverage.total,skipped=coverage.skipped.length,unfinished=Math.max(0,coverage.total-coverage.read-skipped);
 return `PDF total: ${coverage.pdfTotal} pages = ${text} read as text + ${coverage.read} scan/fallback ${coverage.read===1?'page':'pages'} read + ${skipped} skipped${unfinished?` + ${unfinished} scan/fallback pages not finished`:''}.`;
}
