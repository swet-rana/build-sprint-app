import {testExplanation,EXPLANATION_ENDING} from './test-glossary.js';
const escape=text=>String(text??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const testInfoButton=name=>`<button type="button" class="test-info-button" data-test-info="${escape(name)}" aria-label="About ${escape(name)}" aria-haspopup="dialog" aria-expanded="false"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="M12 11v6m0-10v2"/></svg></button>`;
// One delegated listener also covers freshly rendered comparison and AI-summary rows.
export function installTestExplainers(root){
 const doc=root.ownerDocument,win=doc.defaultView;
 const panel=doc.createElement('div');panel.className='test-explainer';panel.hidden=true;panel.setAttribute('role','dialog');const titleId=`test-explainer-title-${root.id}`;panel.setAttribute('aria-labelledby',titleId);
 doc.body.append(panel);let trigger=null;
 function close(restore=false){const previous=trigger;panel.hidden=true;trigger?.setAttribute('aria-expanded','false');trigger=null;if(restore&&previous?.isConnected)previous.focus();}
 function position(){
  if(!trigger)return;if(!trigger.isConnected){close();return;}const r=trigger.getBoundingClientRect(),w=win.innerWidth,h=win.innerHeight;
  panel.style.width=`${Math.min(360,w-24)}px`;
  const box=panel.getBoundingClientRect();panel.style.left=`${Math.max(12,Math.min(r.left,w-box.width-12))}px`;
  panel.style.top=`${Math.max(12,Math.min(r.bottom+6,h-box.height-12))}px`;
 }
 function click(event){
  const button=event.target.closest?.('[data-test-info]');if(!button||!root.contains(button))return;
  event.preventDefault();event.stopPropagation();if(trigger===button){close(true);return;}close();trigger=button;
  const name=button.dataset.testInfo,item=testExplanation(name);
  panel.innerHTML=`<div class="test-explainer-heading"><h2 id="${titleId}">${escape(name)}</h2><button type="button" class="test-explainer-close" aria-label="Close explanation">×</button></div><p>${escape(item?.text??`Explanation coming soon. ${EXPLANATION_ENDING}`)}</p>${item?`<a href="${escape(item.source)}" target="_blank" rel="noopener noreferrer" referrerpolicy="no-referrer">Source<span class="sr-only">: MedlinePlus</span></a>`:''}`;
  button.setAttribute('aria-expanded','true');panel.hidden=false;position();panel.querySelector('button').focus();
 }
 const outside=event=>{if(trigger&&!panel.contains(event.target)&&!trigger.contains(event.target))close();};
 const key=event=>{if(event.key==='Escape'&&trigger){event.preventDefault();close(true);}};
 const panelClick=event=>{if(event.target.closest('.test-explainer-close'))close(true);};
 root.addEventListener('click',click,true);doc.addEventListener('pointerdown',outside);doc.addEventListener('focusin',outside);doc.addEventListener('keydown',key);panel.addEventListener('click',panelClick);
 win.addEventListener('resize',position);doc.addEventListener('scroll',position,true);
 return ()=>{close();panel.remove();root.removeEventListener('click',click,true);doc.removeEventListener('pointerdown',outside);doc.removeEventListener('focusin',outside);doc.removeEventListener('keydown',key);win.removeEventListener('resize',position);doc.removeEventListener('scroll',position,true);};
}
