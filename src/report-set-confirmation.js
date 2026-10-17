import {patientNamesMatch} from './patient-name-match.js';
export async function confirmReportSet(reports,ask){
 for(let i=0;i<reports.length;i++)for(let j=i+1;j<reports.length;j++)if(!patientNamesMatch(reports[i].patientName,reports[j].patientName))return ask?Boolean(await ask()):false;
 return true;
}
// Scope approval to the same files and browser. No patient names enter storage or messages.
export function createReportSetConfirmation(box,{storage,scope,onChangeSelection=()=>{}}){
 const approved=new Set();
 return async function ask(reports){
  const files=reports.map(r=>[r.id,r.contentHash??null]).sort((a,b)=>a[0].localeCompare(b[0]));
  const key=JSON.stringify(['healthstats-report-set-answer',scope,files]);
  let saved=approved.has(key);try{saved||=storage?.getItem(key)==='yes';}catch{}
  if(saved)return true;
  box.replaceChildren();box.hidden=false;box.setAttribute('role','region');box.setAttribute('aria-label','Confirm selected reports');box.tabIndex=-1;
  const document=box.ownerDocument,p=document.createElement('p');p.textContent='These reports show different names. Are they the same person?';
  const actions=document.createElement('div');actions.className='identity-confirmation-actions';box.append(p,actions);
  return new Promise(resolve=>{
   for(const [answer,label] of [['yes','Yes, compare them'],['no','No, let me change my selection']]){
    const button=document.createElement('button');button.type='button';button.dataset.reportSetAnswer=answer;button.className=answer==='yes'?'primary':'secondary';button.textContent=label;
    button.addEventListener('click',()=>{
     if(answer==='yes'){approved.add(key);try{storage?.setItem(key,'yes');}catch{}}
     box.replaceChildren();box.hidden=true;
     if(answer==='no')onChangeSelection();
     resolve(answer==='yes');
    },{once:true});actions.append(button);
   }
   box.focus({preventScroll:true});box.scrollIntoView?.({behavior:'smooth',block:'center'});
  });
 };
}
