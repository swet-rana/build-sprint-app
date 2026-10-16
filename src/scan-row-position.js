const compact=s=>String(s??'').normalize('NFKD').toLowerCase().replace(/[^a-z0-9]/g,'');
const numeric=/^[<>≤≥]?[+-]?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?$/;
export function findScanRow(data,width,height,testName){
 const full=findExactRows(data,width,height,testName);
 if(full.length)return full.length===1?full[0]:null;
 // Vision can append a specimen and method printed on a separate line.
 // Keep the complete test identity (e.g. ionized calcium), removing only a known specimen suffix.
 const label=String(testName??'').split(/\s+-\s+(?:whole\s+blood|serum|plasma|blood|urine)\b/i)[0];
 if(label===testName)return null;
 const short=findExactRows(data,width,height,label);
 return short.length===1?short[0]:null;
}
function findExactRows(data,width,height,testName){
 const target=compact(testName);if(!target||!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0)return [];
 const words=(data.blocks??[]).flatMap(b=>(b.paragraphs??[]).flatMap(p=>(p.lines??[]).flatMap(l=>l.words??[]))).filter(w=>w.text?.trim()&&w.bbox&&[w.bbox.x0,w.bbox.y0,w.bbox.x1,w.bbox.y1].every(Number.isFinite)&&w.bbox.x0>=0&&w.bbox.y0>=0&&w.bbox.x1<=width&&w.bbox.y1<=height&&w.bbox.x1>w.bbox.x0&&w.bbox.y1>w.bbox.y0);
 const rows=[];
 for(const word of words.sort((a,b)=>(a.bbox.y0+a.bbox.y1)-(b.bbox.y0+b.bbox.y1))){
  const box=word.bbox,centre=(box.y0+box.y1)/2;
  let row=rows.find(r=>Math.abs(r.centre-centre)<=Math.max(2,Math.min(r.height,box.y1-box.y0)*.55));
  if(!row){row={centre,height:box.y1-box.y0,words:[]};rows.push(row);}row.words.push(word);
 }
 const matches=[];
 for(const row of rows){
  const tokens=row.words.sort((a,b)=>a.bbox.x0-b.bbox.x0);
  for(let start=0;start<tokens.length;start++){
   if(tokens.slice(0,start).some(w=>/[a-z]/i.test(w.text)))continue;
   let label='';
   for(let end=start;end<Math.min(tokens.length,start+20);end++){
    label+=compact(tokens[end].text);if(label.length>target.length)break;if(label!==target)continue;
    const nameWords=tokens.slice(start,end+1);if(nameWords.some(w=>w.confidence<80||!Number.isFinite(w.confidence)))break;
    let index=end+1;while(index<tokens.length&&!compact(tokens[index].text))index++;
    // Numeric-looking text identifies a table row only; it is never accepted as a clinical result here.
    const value=tokens[index];if(!value||!numeric.test(value.text.trim()))break;
    if(!tokens.slice(index+1).some(w=>w.confidence>=80&&/[a-z%µμ]/i.test(w.text)))break;
    const reliable=tokens.filter(w=>w.confidence>=80),left=Math.max(0,Math.min(...reliable.map(w=>w.bbox.x0))-4),right=Math.min(width,Math.max(...reliable.map(w=>w.bbox.x1))+4),top=Math.max(0,Math.min(...reliable.map(w=>w.bbox.y0))-3),bottom=Math.min(height,Math.max(...reliable.map(w=>w.bbox.y1))+3);
    matches.push({left:left/width,top:top/height,width:(right-left)/width,height:(bottom-top)/height});break;
   }
  }
 }
 return matches;
}
