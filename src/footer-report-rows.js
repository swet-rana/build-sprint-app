// Only used for tables with an explicit Sample Collected on (SCT) footer.
// Separate reference blocks stay descriptive: no category is chosen for the patient.
export function footerResults(rows,headerIndex,cells,numeric,clean){
 const results=[];let pending;
 const stop=/^(?:Comments?\s*:|Interpretation\s*:|Clinical Significance|Please correlate|Pregnancy reference|Sample Collected|Sample Received|Report Released)/i;
 const isReference=/^Reference Range\s*:/i;
 for(let n=headerIndex+1;n<rows.length;n++){
  const row=rows[n];if(stop.test(row.text))break;
  if(/^Method\s*:/i.test(row.text)){pending=null;continue;}
  if(isReference.test(row.text)){
   const marker=results.at(-1);pending=null;
   let guidance=row.items.find(i=>/Guidance For Known Diabetics/i.test(i.str));
   const suffix=clean(row.text.replace(/^Reference Range\s*:\s*/i,'').split(/Guidance For Known Diabetics/i)[0]);
   const inline=suffix==='-'?'':suffix;
   const parts=inline?[inline]:[];let k=n+1;
   for(;k<rows.length;k++){
    const next=rows[k],[name,value,unit]=cells(next);
    const following=rows[k+1]&&cells(rows[k+1]);
    const splitName=name&&!value&&!unit&&!cells(next)[4]&&following&&numeric.test(following[1])&&following[2]&&next.y-rows[k+1].y<=30;
    if(stop.test(next.text)||/^Method\s*:/i.test(next.text)||(name&&numeric.test(value)&&unit)||splitName)break;
    guidance??=next.items.find(i=>/Guidance For Known Diabetics/i.test(i.str));
    if(isReference.test(next.text))continue;
    const text=clean(next.items.filter(i=>!guidance||i.transform[4]<guidance.transform[4]-5).map(i=>i.str).join(' '));
    if(text)parts.push(text);
   }
   if(marker&&parts.length)marker.referenceText=parts.join(' ');
   n=k-1;continue;
  }
  let [name,result,unit,referenceText,method]=cells(row);
  if(numeric.test(result)&&unit){
   if(!name&&pending&&pending.y-row.y<=30)name=pending.name;
   if(name)results.push({name,result,unit,referenceText:referenceText||'Not printed in result row',method,row});
   pending=null;
  }else if(name&&!result&&!unit&&!method){pending={name,y:row.y};}
  else pending=null;
 }
 return results;
}
