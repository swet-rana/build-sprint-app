export function summaryTests(comparison){
 return [
  ...comparison.comparable.map(test=>({...test,isComparable:!test.qualitative})),
  ...comparison.unpaired.map(test=>({
   key:test.key,name:test.name,unit:test.unit,rawName:test.rawName,qualitative:typeof test.value!=='number',isComparable:false,
   earlier:test,later:test,change:null,
   observations:comparison.reports.map(report=>report.id===test.report.id?test:null),
   missingLabels:comparison.reports.map(report=>report.id===test.report.id?null:report.markers.some(m=>m.key.split('|')[0]===test.key.split('|')[0])?'Different unit':'Not reported'),
  })),
 ];
}
