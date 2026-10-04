const NUMBER = '[+-]?(?:\\d{1,3}(?:,\\d{3})+|\\d+)(?:\\.\\d+)?';
const numeric = new RegExp(`^${NUMBER}$`);
const clean = value => String(value ?? '').replace(/\s+/g,' ').trim();
const months={jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12};
export function normalizePatient(name) { return clean(name).toLowerCase().replace(/^(mrs|ms|mr|miss|dr)\.?\s*/,'').replace(/[^a-z0-9]/g,''); }
export function normalizeUnit(unit) { return clean(unit).toLowerCase().replace(/[µμ]/g,'u').replace(/\s/g,''); }
export function parseRange(text) {
  const input=clean(text).replace(/[–−]/g,'-').replace(/≥/g,'>=').replace(/≤/g,'<=');
  const interval=input.match(new RegExp(`^(${NUMBER})\\s*-\\s*(${NUMBER})$`));
  if(interval) return {low:Number(interval[1].replaceAll(',','')),high:Number(interval[2].replaceAll(',','')),lowInclusive:true,highInclusive:true};
  const bound=input.match(new RegExp(`^(<=?|>=?)\\s*(${NUMBER})(?:\\s+Desirable)?$`,'i'));
  if(bound){const n=Number(bound[2].replaceAll(',',''));return {low:bound[1].startsWith('>')?n:null,high:bound[1].startsWith('<')?n:null,lowInclusive:bound[1]==='>=',highInclusive:bound[1]==='<='};}
  return null;
}
export function rangeStatus(value,text) {
  const range=parseRange(text);if(!range)return 'unknown';
  if(range.low!==null&&(value<range.low||(!range.lowInclusive&&value===range.low)))return 'below';
  if(range.high!==null&&(value>range.high||(!range.highInclusive&&value===range.high)))return 'above';
  return 'within';
}
function parseDate(value){
  const match=value.match(/\b(\d{1,2})[\/-]([A-Za-z]{3}|\d{1,2})[\/-](\d{4})\b/);if(!match)return null;
  const day=Number(match[1]),month=months[match[2].toLowerCase()]??Number(match[2]),year=Number(match[3]);
  const date=new Date(Date.UTC(year,month-1,day));
  if(date.getUTCFullYear()!==year||date.getUTCMonth()!==month-1||date.getUTCDate()!==day)return null;
  return `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
}
export function rowsFromItems(items){
 const rows=[];
 for(const item of items.filter(i=>typeof i.str==='string'&&clean(i.str)).sort((a,b)=>b.transform[5]-a.transform[5]||a.transform[4]-b.transform[4])){
  let row=rows.find(r=>Math.abs(r.y-item.transform[5])<2.5);
  if(!row){row={y:item.transform[5],items:[]};rows.push(row);}row.items.push(item);
 }
 return rows.sort((a,b)=>b.y-a.y).map(r=>({...r,items:r.items.sort((a,b)=>a.transform[4]-b.transform[4]),text:clean(r.items.map(i=>i.str).join(' '))}));
}
function field(rows,label){
 for(const row of rows){const index=row.items.findIndex(i=>new RegExp(`^${label}\\s*:?$`,'i').test(clean(i.str)));if(index<0)continue;
  const next=row.items[index+1];if(next)return clean(next.str).replace(/^:\s*/,'');}
 return null;
}
function markerIdentity(name,unit){
 const raw=clean(name).toUpperCase().replace(/\s*,?\s*(SERUM|WHOLE BLOOD EDTA)\s*$/,'').trim();
 let key=raw.replace(/[^A-Z0-9]/g,''),display=raw;
 const labels=[[/^(TOTAL LEUCOCYTE COUNT|WHITE BLOOD CELL|WBC)/,'wbc','White blood cells'],[/^HA?EMOGLOBIN$/,'haemoglobin','Haemoglobin'],[/^(ESR\b|ERYTHROCYTE SEDIMENTATION RATE)/,'esr','ESR'],[/^(HBA1C,|GLYCOSYLATED HEMOGLOBIN \(HBA1C\))/,'hba1c','HbA1c'],[/^(TSH\b|THYROID STIMULATING HORMONE)/,'tsh','TSH'],[/^VITAMIN D\b/,'vitamin-d','Vitamin D'],[/^VITAMIN B12\b/,'vitamin-b12','Vitamin B12'],[/^C-REACTIVE PROTEIN/,'crp','C-reactive protein'],[/^(TRI-IODOTHYRONINE|T3, TOTAL)/,'t3','Total T3'],[/^(THYROXINE|T4, TOTAL)/,'t4','Total T4']];
 for(const [pattern,id,label] of labels)if(pattern.test(raw)){key=id;display=label;break;}
 return {key:`${key}|${normalizeUnit(unit)}`,name:display,rawName:clean(name)};
}
export function parseReport(pages){
 const candidates=[],identities=[],dates=[],usedPages=new Set(),warnings=[];
 for(const page of pages){
  const rows=rowsFromItems(page.items),patientName=field(rows,'Patient Name')??field(rows,'Name'),patientId=field(rows,'UHID/MR No')??field(rows,'Patient ID'),patientIdIssuer=field(rows,'UHID/MR No')?'apollo':field(rows,'Collection Date')?'tata-1mg':null,date=parseDate(field(rows,'Collected')??field(rows,'Collection Date')??'');
  if(!date||!patientName)continue;
  if(rows.some(r=>/COMPLETE URINE EXAMINATION|URINE ANALYSIS|URINALYSIS/i.test(r.text)))continue;
  const headerIndex=rows.findIndex(r=>r.items.some(i=>/^Test Name$/i.test(clean(i.str)))&&r.items.some(i=>/^Result$/i.test(clean(i.str)))&&r.items.some(i=>/^Unit$/i.test(clean(i.str))));
  if(headerIndex<0)continue;
  const header=rows[headerIndex];
  const centres=['Test Name','Result','Unit','Bio. Ref. Interval','Method'].map(label=>{const i=header.items.find(i=>clean(i.str).toLowerCase()===label.toLowerCase());return i?i.transform[4]+i.width/2:null;});
  if(centres.some(v=>v===null))continue;
  const bounds=centres.slice(1).map((value,i)=>(value+centres[i])/2);
  const cells=row=>{const out=['','','','',''];for(const i of row.items){const centre=i.transform[4]+i.width/2;const col=bounds.findIndex(b=>centre<b);const index=col<0?4:col;out[index]=clean(out[index]+' '+i.str);}return out;};
  let pageUsed=false;
  for(let n=headerIndex+1;n<rows.length;n++){
   const row=rows[n];if(/^(Comment|Comments|Interpretation|Note|Reference Range|Reference Group)\s*:/i.test(row.text)||row.y<100)break;
   let [name,result,unit,referenceText]=cells(row);
   if(!name||!numeric.test(result))continue;
   for(let k=n+1;k<rows.length;k++){
    if(/^(Comment|Comments|Interpretation|Note)\s*:/i.test(rows[k].text))break;
    const [continuation,number,unitContinuation,referenceContinuation]=cells(rows[k]);
    if(number||row.y-rows[k].y>=100||rows[k].y<100||/\bPage\s+\d+\s*(?:of|\/)/i.test(rows[k].text))break;
    if(row.y-rows[k].y<12){
     if(continuation)name=clean(name+' '+continuation);
     if(unitContinuation)unit=clean(unit+' '+unitContinuation);
    }else if(continuation||unitContinuation)break;
    if(referenceContinuation)referenceText=clean(referenceText+' '+referenceContinuation);
   }
   if(!unit&&!referenceText)continue;
   const value=Number(result.replaceAll(',',''));if(!Number.isFinite(value))continue;
   const identity=markerIdentity(name,unit);
   candidates.push({...identity,value,unit:unit||'Ratio',referenceText:referenceText||'Not printed in result row',page:page.page,sourceText:row.text,date});
   pageUsed=true;
  }
  if(pageUsed){usedPages.add(page.page);identities.push({patientName,patientId,patientIdIssuer});dates.push(date);}
 }
 if(!candidates.length)throw Error('No dated blood-test tables could be read. Use a text-readable lab PDF with test names, results, units and reference columns. Scanned photos need manual review.');
 if(new Set(identities.map(p=>p.patientId||normalizePatient(p.patientName))).size>1)throw Error('This file contains records for different people. Upload a separate file for each person.');
 if(new Set(dates).size>1)throw Error('This file contains blood tests from different dates. Upload each dated lab report separately.');
 const markers=new Map();
 for(const marker of candidates){const prior=markers.get(marker.key);if(prior&&prior.value!==marker.value)throw Error(`Conflicting values for ${marker.name} were found on different pages. Check the original before comparing.`);if(!prior)markers.set(marker.key,marker);}
 const excludedPages=pages.length-usedPages.size;
 if(excludedPages)warnings.push(`${excludedPages} of ${pages.length} pages were not used: attachments, non-blood results, notes, or pages without readable dated result tables.`);
 return {date:dates[0],patientName:identities[0].patientName,patientId:identities[0].patientId,patientIdIssuer:identities[0].patientIdIssuer,markers:[...markers.values()],usedPages:[...usedPages],excludedPages,pageCount:pages.length,warnings};
}
export function compareReports(a,b){
 if(a.patientId&&b.patientId&&a.patientIdIssuer===b.patientIdIssuer?a.patientId!==b.patientId:normalizePatient(a.patientName)!==normalizePatient(b.patientName))throw Error('These reports appear to belong to different people. Check the patient names before comparing.');
 if(a.date===b.date)throw Error('Choose reports from two different dates.');
 const [earlier,later]=a.date<b.date?[a,b]:[b,a];
 const old=new Map(earlier.markers.map(m=>[m.key,m]));
 const comparable=later.markers.filter(m=>old.has(m.key)).map(latest=>({key:latest.key,name:latest.name,unit:latest.unit,earlier:old.get(latest.key),later:latest,change:Number((latest.value-old.get(latest.key).value).toPrecision(10))}));
 if(!comparable.length)throw Error('No matching tests with the same units were found. Choose comparable blood reports.');
 const keys=new Set(comparable.map(m=>m.key));
 const unpaired=[...earlier.markers.filter(m=>!keys.has(m.key)).map(m=>({...m,date:earlier.date})),...later.markers.filter(m=>!keys.has(m.key)).map(m=>({...m,date:later.date}))];
 return {earlier,later,comparable,unpaired};
}

export function compareReportSeries(input){
 if(input.length<2||input.length>3)throw Error('Choose two or three uploaded PDFs.');
 for(let i=0;i<input.length;i++)for(let j=i+1;j<input.length;j++){
  const a=input[i],b=input[j];
  if(a.patientId&&b.patientId&&a.patientIdIssuer===b.patientIdIssuer?a.patientId!==b.patientId:normalizePatient(a.patientName)!==normalizePatient(b.patientName))throw Error('These reports appear to belong to different people. Check the patient names before comparing.');
  if(a.date===b.date)throw Error('Choose reports from different dates.');
 }
 const reports=[...input].sort((a,b)=>a.date.localeCompare(b.date));
 const groups=new Map();
 reports.forEach((report,index)=>report.markers.forEach(marker=>{
  if(!groups.has(marker.key))groups.set(marker.key,{key:marker.key,name:marker.name,unit:marker.unit,observations:Array(reports.length).fill(null)});
  groups.get(marker.key).observations[index]={...marker,date:report.date,report};
 }));
 const comparable=[],unpaired=[];
 for(const group of groups.values()){
  const found=group.observations.filter(Boolean);
  if(found.length<2){unpaired.push(found[0]);continue;}
  const earlier=found[0],later=found.at(-1);
  const missingLabels=group.observations.map((m,i)=>m?null:reports[i].markers.some(other=>other.key.split('|')[0]===group.key.split('|')[0])?'Different unit':'Not reported');
  comparable.push({...group,missingLabels,earlier,later,change:Number((later.value-earlier.value).toPrecision(10))});
 }
 if(!comparable.length)throw Error('No matching tests with the same units were found. Choose comparable blood reports.');
 return {reports,earlier:reports[0],later:reports.at(-1),comparable,unpaired};
}
