export function readingPathSentence(path){
 if(/paused/i.test(path))return 'Reading paused. Please check the message below.';
 if(/failed/i.test(path))return 'Reading stopped. Please check the message below.';
 if(/:\s*(?:reading|succeeded)\b/i.test(path))return 'Reading this report…';
 if(/AI vision/i.test(path))return 'Some pages were scanned images, read by AI. Check values against the original.';
 if(/scan/i.test(path))return 'Some pages were scanned images. Check values against the original.';
 return 'Read directly from the PDF.';
}
export function showReportReadingPath(item,path){
 let row=item.querySelector('.reading-path-presentation');
 if(!path){row?.remove();item.querySelector('[data-reading-path-detail]')?.remove();return;}
 if(!row){row=item.ownerDocument.createElement('div');row.className='reading-path-presentation';item.append(row);}
 let label=row.querySelector('.reading-path');
 if(!label){label=item.ownerDocument.createElement('p');label.className='reading-path';row.prepend(label);}
 const sentence=readingPathSentence(path);label.textContent=sentence;label.title=sentence;
 let details=[...item.querySelectorAll('details')].find(el=>el.querySelector('summary')?.textContent.trim().toLowerCase()==='details');
 if(!details){details=item.ownerDocument.createElement('details');details.className='reading-path-details';const summary=item.ownerDocument.createElement('summary');summary.textContent='Details';details.append(summary);row.append(details);}
 let content=details.querySelector('[data-reading-path-detail]');
 if(!content){content=item.ownerDocument.createElement('div');content.dataset.readingPathDetail='';details.append(content);}
 content.replaceChildren();
 for(const text of [sentence,`Reading path: ${path}`]){const p=item.ownerDocument.createElement('p');p.textContent=text;content.append(p);}
}
