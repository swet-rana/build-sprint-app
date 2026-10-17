import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {TEST_GLOSSARY,testExplanation,EXPLANATION_ENDING} from '../src/test-glossary.js';
import {testInfoButton,installTestExplainers} from '../src/test-explainer.js';
const setup=()=>{const dom=new JSDOM('<div id="summary-view"><label><input type="checkbox">CRP</label></div>',{pretendToBeVisual:true});const root=dom.window.document.querySelector('#summary-view');root.insertAdjacentHTML('beforeend',testInfoButton('CRP')+testInfoButton('PDW'));const cleanup=installTestExplainers(root);return {dom,doc:dom.window.document,root,cleanup};};
test('fixed glossary entries have MedlinePlus lab sources and the required closing sentence',()=>{
 const aliases=new Map();assert(TEST_GLOSSARY.length>50);
 for(const item of TEST_GLOSSARY){assert(item.text.endsWith(EXPLANATION_ENDING));assert(item.text.length<450);assert.equal(item.text.split(/[.!?](?:\s|$)/).filter(Boolean).length,2);const url=new URL(item.source);assert.equal(url.protocol,'https:');assert.equal(url.hostname,'medlineplus.gov');assert(url.pathname.startsWith('/lab-tests/'));assert(!/diagnos|treatment|medicine|your (?:level|value)|you (?:have|may have)/i.test(item.text));
  for(const alias of item.aliases){const key=alias.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');assert(!aliases.has(key)||aliases.get(key)===item.name,`Ambiguous alias: ${alias}`);aliases.set(key,item.name);assert.equal(testExplanation(alias),item);}}
 assert.equal(testExplanation('Hb').name,'Haemoglobin');assert.equal(testExplanation('A/G ratio').name,'Albumin/globulin ratio');assert.equal(testExplanation('Urine total protein'),null);assert.equal(testExplanation('Unknown marker'),null);assert.equal(testExplanation('PDW'),null);
});
test('info buttons open fixed copy and Source, without changing the checkbox or opening a report',()=>{
 const {dom,doc,root,cleanup}=setup();let reportClicks=0;root.addEventListener('click',()=>reportClicks++);const button=root.querySelector('[data-test-info="CRP"]');button.click();const panel=doc.querySelector('[role="dialog"]');assert(!panel.hidden);assert(panel.textContent.includes('CRP is a protein'));assert(panel.textContent.includes(EXPLANATION_ENDING));assert.equal(panel.querySelector('a').href,testExplanation('CRP').source);assert.equal(panel.querySelector('a').textContent,'Source: MedlinePlus');assert.equal(button.getAttribute('aria-expanded'),'true');assert.equal(doc.activeElement.getAttribute('aria-label'),'Close explanation');assert.equal(root.querySelector('input').checked,false);assert.equal(reportClicks,0);
 doc.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));assert(panel.hidden);assert.equal(doc.activeElement,button);assert.equal(button.getAttribute('aria-expanded'),'false');cleanup();assert.equal(doc.querySelector('[role="dialog"]'),null);dom.window.close();
});
test('unknown names show the promised fallback, no invented source, and one shared popup after new rows render',()=>{
 const {dom,doc,root,cleanup}=setup();root.querySelector('[data-test-info="PDW"]').click();const panel=doc.querySelector('[role="dialog"]');assert.equal(panel.querySelector('p').textContent,`Explanation coming soon. ${EXPLANATION_ENDING}`);assert.equal(panel.querySelector('a'),null);panel.querySelector('button').click();assert(panel.hidden);
 root.innerHTML=testInfoButton('Hb');root.querySelector('button').click();assert.equal(doc.querySelectorAll('[role="dialog"]').length,1);assert(panel.textContent.includes('oxygen-carrying protein'));doc.body.dispatchEvent(new dom.window.Event('pointerdown',{bubbles:true}));assert(panel.hidden);cleanup();dom.window.close();
});
