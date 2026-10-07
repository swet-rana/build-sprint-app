import test from 'node:test';
import assert from 'node:assert/strict';
import {isAllowedOrigin} from '../convex/originRules.js';
test('uploads and originals permit both local preview ports and configured hosted app',()=>{
 const site='https://sample.convex.site';
 for(const origin of ['http://localhost:5173','http://localhost:5174','http://localhost:5175','http://localhost:5199','http://127.0.0.1:5174',site,null])assert.equal(isAllowedOrigin(origin,site),true);
 assert.equal(isAllowedOrigin('https://healthstats.example',site,'https://healthstats.example'),true);
 for(const origin of ['http://localhost:5174.evil.example','https://evil.example','http://localhost:5200','http://localhost:5172','http://localhost:5175/path','null'])assert.equal(isAllowedOrigin(origin,site),false);
});
