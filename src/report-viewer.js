import './pdf-stream-compat.js';
import './report-viewer.css';

// Keep the underlying app mounted so selections and summary state survive Back.
export async function openReportViewer({name, load, page = 1, sourceTop, sourceName, sampleUrl}) {
  const app = document.querySelector('#app');
  const previousFocus = document.activeElement, previousScroll = window.scrollY;
  const viewer = document.createElement('section');
  viewer.className = 'original-viewer';
  viewer.setAttribute('aria-label', 'Original report');
  viewer.innerHTML = `<header><button type="button" class="viewer-back">← Back</button><h1></h1></header><div class="viewer-controls" hidden><button type="button" data-prev>Previous page</button><span aria-live="polite"></span><button type="button" data-next>Next page</button></div><p class="viewer-status" role="status">Opening your report…</p><div class="viewer-document"></div>`;
  viewer.querySelector('h1').textContent = name;
  const content = viewer.querySelector('.viewer-document'), status = viewer.querySelector('.viewer-status');
  const controls = viewer.querySelector('.viewer-controls');
  let closed = false, pdf, loadingTask, objectUrl, renderTask, rendering = false;
  const sourcePage=Number(page);
  const hasSource=Number.isFinite(sourceTop)&&sourceTop>=0&&sourceTop<=1;
  const sourceNote=document.createElement('p');sourceNote.className='viewer-source-note';sourceNote.hidden=true;
  controls.after(sourceNote);
  function showSource(documentElement){
    if(!hasSource||Number(page)!==sourcePage){sourceNote.hidden=true;return;}
    const highlight=document.createElement('div');highlight.className='viewer-source-highlight';
    highlight.style.top=`${Math.max(0,sourceTop-.012)*100}%`;
    highlight.setAttribute('aria-label',`${sourceName||'Selected result'} source row`);
    documentElement.append(highlight);
    sourceNote.textContent=`Showing ${sourceName||'the selected result'} on page ${page}. Highlight marks its original row.`;sourceNote.hidden=false;
    requestAnimationFrame(()=>{if(!closed)highlight.scrollIntoView({behavior:'instant',block:'center'});});
  }
  const oldHidden = app.hidden;
  function close() {
    if (closed) return;
    closed = true; renderTask?.cancel(); void loadingTask?.destroy();
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    viewer.remove(); app.hidden = oldHidden;
    window.scrollTo(0, previousScroll); previousFocus?.focus({preventScroll:true});
  }
  viewer.querySelector('.viewer-back').addEventListener('click',close);
  viewer.addEventListener('keydown', event => {if(event.key === 'Escape') close();});
  app.hidden = true; document.body.append(viewer); window.scrollTo(0,0);
  viewer.querySelector('.viewer-back').focus();
  async function renderPage() {
    if (closed || rendering) return;
    rendering = true;
    controls.querySelector('[data-prev]').disabled = true;
    controls.querySelector('[data-next]').disabled = true;
    try {
      const original = await pdf.getPage(page);
      if (closed) return;
      const viewport = original.getViewport({scale:1});
      const scale = Math.min(2, 1600 / viewport.width);
      const sized = original.getViewport({scale});
      const canvas = document.createElement('canvas');
      canvas.width = sized.width; canvas.height = sized.height;
      canvas.setAttribute('role','img'); canvas.setAttribute('aria-label',`${name}, page ${page} of ${pdf.numPages}`);
      renderTask = original.render({canvas,canvasContext:canvas.getContext('2d'),viewport:sized});
      await renderTask.promise;
      if (closed) return;
      const documentPage=document.createElement('div');documentPage.className='viewer-page';documentPage.append(canvas);
      content.replaceChildren(documentPage); status.hidden = true;showSource(documentPage);
      controls.querySelector('span').textContent = `Page ${page} of ${pdf.numPages}`;
    } finally {
      rendering = false;
      controls.querySelector('[data-prev]').disabled = page <= 1;
      controls.querySelector('[data-next]').disabled = page >= pdf.numPages;
    }
  }
  async function changePage(delta) {
    if(rendering || closed) return;
    page += delta;
    try { await renderPage(); } catch(error) {if(!closed){status.hidden=false;status.textContent='This page could not be displayed. Go back and try again.';}}
  }
  controls.querySelector('[data-prev]').addEventListener('click',()=>changePage(-1));
  controls.querySelector('[data-next]').addEventListener('click',()=>changePage(1));
  try {
    if (sampleUrl) {
      const frame = document.createElement('iframe');frame.src=sampleUrl;frame.title=name;
      content.append(frame);status.hidden=true;return;
    }
    const blob = await load();
    if(closed) return;
    if(blob.type === 'application/pdf') {
      const [{getDocument,GlobalWorkerOptions},{default:workerUrl}] = await Promise.all([import('pdfjs-dist/legacy/build/pdf.mjs'),import('pdfjs-dist/legacy/build/pdf.worker.min.mjs?url')]);
      GlobalWorkerOptions.workerSrc = workerUrl;
      loadingTask = getDocument({data:new Uint8Array(await blob.arrayBuffer())});
      pdf = await loadingTask.promise;
      if(closed){void loadingTask.destroy();return;}
      page = Math.max(1,Math.min(pdf.numPages,Number(page)||1));
      controls.hidden=false; await renderPage();
    } else {
      objectUrl=URL.createObjectURL(blob);
      const photo=document.createElement('img');photo.src=objectUrl;photo.alt=name;
      photo.addEventListener('error',()=>{status.hidden=false;status.textContent='This photo could not be displayed. Go back and try again.';});
      const documentPage=document.createElement('div');documentPage.className='viewer-page';documentPage.append(photo);content.append(documentPage);
      photo.addEventListener('load',()=>{if(!closed)showSource(documentPage);});status.hidden=true;
    }
  } catch(error) {
    if(!closed){status.hidden=false;status.textContent=error.message==='Failed to fetch'?'Could not open the report. Check your connection and try again.':`Could not open the report. ${error.message}`;}
  }
}
