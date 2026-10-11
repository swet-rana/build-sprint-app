import test from 'node:test';
import assert from 'node:assert/strict';
import { trendPointStates } from '../src/trend-point-states.js';
const result = (value, referenceText = '10-20') => ({value, referenceText});
test('normal-only trends retain purple, including reference boundaries', () => {
 assert.deepEqual(trendPointStates([result(10), result(15), result(20)]), ['neutral','neutral','neutral']);
});
test('transitions in either direction show red outside and green within range', () => {
 assert.deepEqual(trendPointStates([result(5),result(15),result(25)]), ['out-of-range','normal-transition','out-of-range']);
 assert.deepEqual(trendPointStates([result(15),result(5)]), ['normal-transition','out-of-range']);
});
test('missing values and unknown ranges never become green; source ranges are respected', () => {
 assert.deepEqual(trendPointStates([result(5),null,result(15,''),result(25,'20-30')]), ['out-of-range',null,'neutral','normal-transition']);
 assert.deepEqual(trendPointStates([result(5),result(25)]), ['out-of-range','out-of-range']);
});
