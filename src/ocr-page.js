const clean=s=>String(s||'').replace(/\s+/g,' ').trim();
const norm=s=>clean(s).toLowerCase().replace(/[^a-z0-9]/g,'');
const labels=[['Patient Name',['patient','name']],['Collection Date',['collection','date']],['Collected',['collected']],['Patient ID',['patient','id']],['UHID/MR No',['uhidmr','no']],['Name',['name']]];
const headers=[['Test Name',[/^(test|investigation)$/,/^name$/]],['Result',[/^(result|value)$/]],['Unit',[/^units?$/]],['Bio. Ref. Interval',[/^(bio|biological)$/, /^ref(erence)?$/, /^(interval|range)$/]],['Method',[/^method$/]]];
function phrase(words,tokens){for(let i=0;i<=words.length-tokens.length;i++)if(tokens.every((t,j)=>t instanceof RegExp?t.test(norm(words[i+j].text)):norm(words[i+j].text)===t))return {start:i,end:i+tokens.length,words:words.slice(i,i+tokens.length)};return null;}
function confidenceError(message,words,page,field){
 const error=Error(message);error.code='LOW_CONFIDENCE';
 error.diagnostics={kind:'ocr-low-confidence',page,field,threshold:80,lowConfidenceWords:words.filter(w=>w.confidence<80).map(w=>({text:w.text,confidence:w.confidence,bbox:{...w.bbox}}))};
 return error;
}
export function ocrPage(data,width,height,page=1){
 const words=(data.blocks||[]).flatMap(b=>(b.paragraphs||[]).flatMap(p=>(p.lines||[]).flatMap(l=>l.words||[]))).filter(w=>clean(w.text));
 if(!words.length){const error=Error('No readable text found. Upload a clearer, upright photo or scan.');error.code='NO_TEXT';throw error;}
 const rows=[];
 for(const word of words.sort((a,b)=>(a.bbox.y0+a.bbox.y1)-(b.bbox.y0+b.bbox.y1)||a.bbox.x0-b.bbox.x0)){
  const y=(word.bbox.y0+word.bbox.y1)/2;
  let row=rows.find(r=>Math.abs(r.y-y)<height/150);
  if(!row){row={y,words:[]};rows.push(row);}row.words.push(word);
 }
 rows.sort((a,b)=>a.y-b.y);rows.forEach(r=>r.words.sort((a,b)=>a.bbox.x0-b.bbox.x0));
 const items=[];const item=(str,x,y,w=10)=>({str:clean(str),width:w,transform:[1,0,0,1,x,y],sourceTop:(900-y)/800});
 for(const row of rows){
  const y=900-row.y/height*800;
  for(const [label,tokens] of labels){
   const found=phrase(row.words,tokens);if(!found||label==='Name'&&found.start!==0)continue;
   const nextLabels=labels.map(([,t])=>phrase(row.words.slice(found.end),t)).filter(Boolean);
   const end=nextLabels.length?found.end+Math.min(...nextLabels.map(f=>f.start)):row.words.length;
   const valueWords=row.words.slice(found.end,end);
   if(valueWords.length&&[...found.words,...valueWords].some(w=>w.confidence<80))throw confidenceError(`Could not read ${label.toLowerCase()} confidently. Upload a clearer photo or scan.`,[...found.words,...valueWords],page,label);
   if(valueWords.length){items.push(item(label,found.words[0].bbox.x0/width*600,y));items.push(item(valueWords.map(w=>w.text).join(' ').replace(/^\s*:\s*/,''),valueWords[0].bbox.x0/width*600,y));}
  }
 }
 let headerRow,foundHeaders;
 for(const row of rows){const found=headers.map(([label,tokens])=>({label,found:phrase(row.words,tokens)}));if(found.slice(0,4).every(f=>f.found)){headerRow=row;foundHeaders=found;break;}}
 const pageText=clean(data.text||words.map(w=>w.text).join(' '));
 if(/\bSEMEN (?:ANALYSIS|EXAMINATION)|\bSPERM DNA FRAGMENTATION\b/i.test(pageText))items.push(item('SEMEN ANALYSIS',20,895));
 if(/post[ -]?wash|pre[ -]?wash|washed sample|sperm preparation/i.test(pageText))items.push(item('Washed sample',20,885));
 const informationPage=/\blet[’']?s? understand the critical markers in detail that require your focus\b/i.test(pageText)&&!/(patient name|collection date|collected|test name|reference interval|\bresult\b)/i.test(pageText);
 if(!headerRow&&informationPage)return {page,items:[],exclusionReason:'information page'};
 if(!headerRow){const error=Error('Could not read the test, result, unit and reference columns. Upload a clearer full-page photo or scan.');error.code='NO_TABLE';throw error;}
 const centres=foundHeaders.map(f=>f.found?(f.found.words[0].bbox.x0+f.found.words.at(-1).bbox.x1)/2/width*600:590);
 if(centres.some((c,i)=>i&&c<=centres[i-1]))throw Error('The report columns could not be read correctly. Upload an upright full-page image.');
 const headerY=900-headerRow.y/height*800;
 foundHeaders.forEach((f,i)=>items.push(item(f.label,centres[i]-5,headerY)));
 const boundaries=centres.slice(1).map((c,i)=>(c+centres[i])/2);
 for(const row of rows.filter(r=>r.y>headerRow.y+height/150)){
  const cells=Array.from({length:5},()=>[]);
  for(const word of row.words){const x=(word.bbox.x0+word.bbox.x1)/2/width*600;const col=boundaries.findIndex(b=>x<b);cells[col<0?4:col].push(word);}
  const result=clean(cells[1].map(w=>w.text).join(' '));
  if(/^[+-]?[\d,]+(?:\.\d+)?$/.test(result)&&cells.slice(0,4).flat().some(w=>w.confidence<80))throw confidenceError('A test result could not be read confidently. Upload a sharper photo or scan; no uncertain values were included.',cells.slice(0,4).flat(),page,'test result');
  const y=900-row.y/height*800;
  cells.forEach((words,i)=>{if(words.length)items.push(item(words.map(w=>w.text).join(' '),centres[i]-5,y));});
 }
 // Branding is evidence only; it never supplies missing identity, dates or values.
 const branding=words.map(w=>w.text).join(' ');
 if(/Apollo\s+(Diagnostics|Hospitals?|Health)/i.test(branding))items.push(item('Apollo Diagnostics',20,890));
 if(/Tata\s*1\s*mg/i.test(branding))items.push(item('Tata 1mg',20,890));
 return {page,items};
}
