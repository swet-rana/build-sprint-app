import test from 'node:test';
import assert from 'node:assert/strict';
import {analysisCountError} from '../src/analysis-rules.js';
test('analysis accepts two through ten reports and rejects fewer or more',()=>{
 for(const count of [2,3,10])assert.equal(analysisCountError(count),null);
 for(const count of [0,1])assert.match(analysisCountError(count),/at least two/);
 for(const count of [11,20,100])assert.match(analysisCountError(count),/up to 10/);
});
