// Counts and provenance only. Never expose patient names or test values here.
export function reportPageDetails(report){
 const coverage=report.scanCoverage,total=coverage?.pdfTotal??report.pageCount??coverage?.total;
 if(!Number.isSafeInteger(total)||total<1)return [];
 const native=new Map((coverage?.textPages??[]).map(page=>[page.page,page]));
 const read=new Map((coverage?.readPages??[]).map(page=>[page.page,page]));
 const skipped=new Map((coverage?.skipped??[]).map(page=>[page.page,page.reason]));
 const used=new Set(report.usedPages??[]),markers=report.markers??[];
 return Array.from({length:total},(_,index)=>{
  const page=index+1,rows=markers.filter(marker=>marker.page===page);
  if(skipped.has(page))return {page,path:'skipped',reason:skipped.get(page).replace('no supported blood or semen result table','no supported test result table')};
  if(report.unavailable)return {page,path:'skipped',reason:'Saved reading details are not available for this page.'};
  const saved=read.get(page),text=native.get(page);
  let path=saved?.path;
  if(!path){
   if(text||!coverage)path='text';
   else if(rows.some(marker=>marker.readPath==='vision'))path='AI vision';
   else if(rows.length||used.has(page))path=coverage.ocr===0?'AI vision':coverage.vision===0||rows.length?'local OCR':'local OCR / AI vision (exact method not saved)';
   else return {page,path:'skipped',reason:'This page was not included in the saved reading.'};
  }
  const tests=Number.isSafeInteger(text?.tests)?text.tests:Number.isSafeInteger(saved?.tests)?saved.tests:rows.length;
  return {page,path,tests,...(!tests?{reason:used.has(page)?'No additional test results were retained for this page.':'No supported test results were found in the saved reading.'}:{})};
 });
}
export function pageDetailLine(row){return `Page ${row.page}: ${row.path} — ${row.tests?`${row.tests} test ${row.tests===1?'result':'results'} found`:row.reason}`;}
