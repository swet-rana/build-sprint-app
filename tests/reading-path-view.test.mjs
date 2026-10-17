import test from 'node:test';import assert from 'node:assert/strict';import {JSDOM} from 'jsdom';
import {showReportReadingPath,readingPathSentence} from '../src/reading-path-view.js';
test('text and AI reading notes use plain copy and hide the exact path in closed Details',()=>{
 for(const [path,copy] of [['text','Read directly from the PDF.'],['scan (AI vision) + text fallback (AI vision)','Some pages were scanned images, read by AI. Check values against the original.']]){
  const dom=new JSDOM('<li><div class="selected-report-details"></div></li>'),item=dom.window.document.querySelector('li');showReportReadingPath(item,path);
  assert.equal(item.querySelector('.reading-path').textContent,copy);const details=item.querySelector('details');assert.equal(details.open,false);assert.equal(details.querySelector('summary').textContent,'Details');assert(details.textContent.includes(`Reading path: ${path}`));assert(details.textContent.includes(copy));
  details.open=true;showReportReadingPath(item,path);assert.equal(item.querySelectorAll('details').length,1);assert.equal(details.open,true);assert.equal(item.querySelectorAll('[data-reading-path-detail]').length,1);
 }
});
test('an existing Details control is reused and its existing information is preserved',()=>{
 const dom=new JSDOM('<li><div class="selected-report-details"></div><details open><summary>Details</summary><p>Existing fictional information</p></details></li>'),item=dom.window.document.querySelector('li');showReportReadingPath(item,'text');
 assert.equal(item.querySelectorAll('details').length,1);assert.equal(item.querySelector('details').open,true);assert(item.querySelector('details').textContent.includes('Existing fictional information'));showReportReadingPath(item,null);assert.equal(item.querySelectorAll('.reading-path').length,0);assert(item.querySelector('details').textContent.includes('Existing fictional information'));
});
test('unfinished and OCR-only paths never falsely claim a completed AI reading',()=>{
 assert.equal(readingPathSentence('scan (AI vision) · page 2: reading'),'Reading this report…');assert.equal(readingPathSentence('scan (AI vision) · page 2: failed'),'Reading stopped. Please check the message below.');assert(!readingPathSentence('scan (OCR)').includes('AI'));
});
