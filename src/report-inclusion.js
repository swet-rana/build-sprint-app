const pagesOf=pages=>[...new Set(pages.filter(page=>Number.isSafeInteger(page)&&page>0))].sort((a,b)=>a-b);
function storedReportPages(report){
 const coverage=report.scanCoverage,totalPages=coverage?.pdfTotal??report.pageCount??coverage?.total??null;
 if(!coverage)return {totalPages,testPages:pagesOf(report.usedPages??report.markers.map(marker=>marker.page))};
 const skipped=new Set((coverage.skipped??[]).map(page=>page.page));
 // Match page details: native-text pages plus successfully read scan pages.
 // Complete legacy coverage can identify these by excluding its saved skipped pages.
 if(Number.isSafeInteger(totalPages)&&coverage.read+skipped.size===coverage.total){
  return {totalPages,testPages:Array.from({length:totalPages},(_,index)=>index+1).filter(page=>!skipped.has(page))};
 }
 const nativeCount=Math.max(0,(coverage.pdfTotal??coverage.total)-coverage.total);
 if(nativeCount&&!Array.isArray(coverage.textPages))return {totalPages,testPages:null};
 return {totalPages,testPages:pagesOf([...(coverage.textPages??[]).map(page=>page.page),...(report.usedPages??[]).filter(page=>!skipped.has(page))]).filter(page=>page<=totalPages)};
}
// Presentation only: use saved page metadata and the existing comparison groups.
export function reportInclusion(comparison,selectedReports=comparison.reports){
 return selectedReports.map(selected=>{
  const index=comparison.reports.findIndex(report=>report.id===selected.id),report=comparison.reports[index];
  const stored=report?storedReportPages(report):{totalPages:selected.pageCount??null,testPages:null};
  const resultPages=new Set(stored.testPages??[]);
  const comparablePages=report&&stored.testPages!==null?pagesOf(comparison.comparable.flatMap(test=>{
   const own=test.observations[index];
   return own&&resultPages.has(own.page)&&test.observations.some((other,i)=>i!==index&&other&&other.unit===own.unit)?[own.page]:[];
  })):null;
  return {fileName:selected.name??report?.fileName??selected.fileName,totalPages:stored.totalPages,
   testPages:stored.testPages,comparablePages};
 });
}
export function inclusionPageList(pages){
 if(pages===null)return 'Not available';
 return `${pages.length}${pages.length?` (pages ${pages.join(', ')})`:''}`;
}
