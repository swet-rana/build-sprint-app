import test from 'node:test';import assert from 'node:assert/strict';
import {parseSummaryRange,summaryRangeStatus} from '../src/summary-range.js';
import {trendPointStates} from '../src/trend-point-states.js';
const bands='Normal: < 150 Borderline High: 150-199 High: 200-499 Very High: > 500';
test('summary uses only the explicitly normal band and keeps its strict boundary',()=>{
 assert.deepEqual(parseSummaryRange(bands),{low:null,high:150,lowInclusive:false,highInclusive:false});
 assert.equal(summaryRangeStatus(149,bands),'within');assert.equal(summaryRangeStatus(150,bands),'above');
 for(const label of ['Normal range','Reference range','Desirable','Within range'])assert.equal(summaryRangeStatus(90,`${label}: 70-100 High: >100`),'within');
 assert.deepEqual(trendPointStates([{value:180,referenceText:bands},{value:120,referenceText:bands}]),['out-of-range','normal-transition']);
});
test('unidentified, conflicting or conditional bands stay unclear instead of borrowing a high or sex-specific band',()=>{
 for(const text of ['Borderline High: 150-199 High: 200-499','Normal: see chart High: >200','Normal: <150 Desirable: <100','Male: 10-20 Female: 5-15','Normal male: 10-20 Normal female: 5-15'])assert.equal(parseSummaryRange(text),null,text);
 assert.equal(summaryRangeStatus(120,'Borderline High: 150-199 High: 200-499'),'unknown');
 assert.deepEqual(trendPointStates([{value:180,referenceText:bands},{value:120,referenceText:'See original'}]),['out-of-range','neutral']);
 assert.equal(summaryRangeStatus(10,'10-20'),'within');assert.equal(summaryRangeStatus(20,'<20'),'above');
});
