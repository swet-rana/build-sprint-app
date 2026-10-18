const pagesOf=pages=>[...new Set(pages.filter(page=>Number.isSafeInteger(page)&&page>0))].sort((a,b)=>a-b);
// Presentation only: use saved page metadata and the existing comparison groups.
export function reportInclusion(comparison,selectedReports=comparison.reports){
 return selectedReports.map(selected=>{
  const index=comparison.reports.findIndex(report=>report.id===selected.id),report=comparison.reports[index];
  const comparablePages=report?pagesOf(comparison.comparable.flatMap(test=>{
   const own=test.observations[index];
   return own&&test.observations.some((other,i)=>i!==index&&other&&other.unit===own.unit)?[own.page]:[];
  })):null;
  return {fileName:selected.name??report?.fileName??selected.fileName,totalPages:report?.pageCount??selected.pageCount??null,
   testPages:report?pagesOf(report.usedPages??report.markers.map(marker=>marker.page)):null,comparablePages};
 });
}
export function inclusionPageList(pages){
 if(pages===null)return 'Not available';
 return `${pages.length}${pages.length?` (pages ${pages.join(', ')})`:''}`;
}
