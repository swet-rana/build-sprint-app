import {resolveReportIdentity} from './report-identity.js';
export async function confirmReportIdentity(sources,confirm){
 const result=resolveReportIdentity(sources);
 if(!result.needsConfirmation)return result;
 if(!confirm){const error=Error('Confirm whether the names in this report belong to the same person.');error.code='IDENTITY_CONFIRMATION_REQUIRED';throw error;}
 if(await confirm(result.conflict))return resolveReportIdentity(sources,{samePerson:true});
 const error=Error('Upload a separate file for each person.');error.code='IDENTITY_REPORT_REMOVED';throw error;
}
// Names exist only in this live prompt; the saved choice contains no names.
export function createIdentityConfirmation(box,{storage,scope,onRemove=()=>{}}){
 const answers=new Map();
 return async function ask(file,conflict){
  const key=JSON.stringify(['healthstats-identity-answer',scope,file.id,file.contentHash??null]);
  let saved=answers.get(key);try{saved??=storage?.getItem(key);}catch{}
  if(saved==='yes')return true;
  if(saved==='no'){onRemove(file.id);box.hidden=false;box.textContent='Upload a separate file for each person.';return false;}
  box.replaceChildren();box.hidden=false;box.setAttribute('role','region');box.setAttribute('aria-label','Confirm report names');box.tabIndex=-1;
  const document=box.ownerDocument,p=document.createElement('p');
  p.textContent=`This report shows two names: ${conflict[0].patientName} (page ${conflict[0].page}) and ${conflict[1].patientName} (page ${conflict[1].page}). Are these the same person?`;
  const actions=document.createElement('div');actions.className='identity-confirmation-actions';box.append(p,actions);
  return new Promise(resolve=>{
   for(const [answer,label] of [['yes','Yes, same person'],['no','No, remove this report']]){
    const button=document.createElement('button');button.type='button';button.className=answer==='yes'?'primary':'secondary';button.dataset.identityAnswer=answer;button.textContent=label;
    button.addEventListener('click',()=>{
     answers.set(key,answer);try{storage?.setItem(key,answer);}catch{}
     box.replaceChildren();box.hidden=answer==='yes';
     if(answer==='no'){box.textContent='Upload a separate file for each person.';onRemove(file.id);}
     resolve(answer==='yes');
    },{once:true});actions.append(button);
   }
   box.focus({preventScroll:true});box.scrollIntoView?.({behavior:'smooth',block:'center'});
  });
 };
}
