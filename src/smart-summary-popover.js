// Native popovers handle Escape and outside clicks; the small fallback supports
// older browsers. Source links keep the existing original-report viewer handler.
export function installSmartSourcePopovers(root){
 const doc=root.ownerDocument,win=doc.defaultView;
 const triggerFor=popover=>root.querySelector(`[popovertarget="${popover.id}"]`);
 const close=popover=>{if(popover.hidePopover)popover.hidePopover();else popover.removeAttribute('data-open');triggerFor(popover)?.setAttribute('aria-expanded','false');};
 const openPopovers=()=>[...root.querySelectorAll('.smart-source-popover')].filter(p=>p.hasAttribute('data-open')||(typeof p.showPopover==='function'&&p.matches(':popover-open')));
 const position=popover=>{const button=triggerFor(popover);if(!button)return;const b=button.getBoundingClientRect(),width=Math.min(320,win.innerWidth-32);popover.style.left=`${Math.max(16,Math.min(b.left,win.innerWidth-width-16))}px`;const h=popover.getBoundingClientRect().height;popover.style.top=`${b.bottom+8+h<=win.innerHeight-16?b.bottom+8:Math.max(16,b.top-h-8)}px`;};
 root.addEventListener('beforetoggle',event=>{if(event.target.matches('.smart-source-popover')&&event.newState==='open')position(event.target);},true);
 root.addEventListener('toggle',event=>{if(!event.target.matches('.smart-source-popover'))return;const open=event.newState==='open';triggerFor(event.target)?.setAttribute('aria-expanded',String(open));if(open)position(event.target);},true);
 root.addEventListener('click',event=>{
  const button=event.target.closest('.smart-source-trigger'),popover=event.target.closest('.smart-source-popover');
  if(button){const target=doc.getElementById(button.getAttribute('popovertarget'));if(target&&!target.showPopover){event.preventDefault();const wasOpen=target.hasAttribute('data-open');openPopovers().forEach(close);if(!wasOpen){target.setAttribute('data-open','');button.setAttribute('aria-expanded','true');position(target);}}}
  if(popover&&event.target.closest('[data-smart-source-close],[data-source]')){close(popover);triggerFor(popover)?.focus({preventScroll:true});}
 });
 doc.addEventListener('click',event=>{if(!root.contains(event.target)||!event.target.closest('.smart-source-trigger,.smart-source-popover'))openPopovers().filter(p=>p.hasAttribute('data-open')).forEach(close);});
 doc.addEventListener('keydown',event=>{if(event.key==='Escape')for(const popover of openPopovers().filter(p=>p.hasAttribute('data-open'))){close(popover);triggerFor(popover)?.focus({preventScroll:true});}});
 doc.addEventListener('scroll',event=>{if(!event.target.closest?.('.smart-source-popover'))openPopovers().forEach(close);},true);
 win.addEventListener('resize',()=>openPopovers().forEach(close));
}
