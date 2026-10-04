import test from 'node:test';
import assert from 'node:assert/strict';
import {fileError, matchesFileType, isSessionKey, MAX_FILE_SIZE} from '../convex/fileRules.js';

test('only supported nonempty files within the size limit are accepted',()=>{
  assert.equal(fileError(MAX_FILE_SIZE,'application/pdf'),null);
  assert.match(fileError(MAX_FILE_SIZE+1,'application/pdf'),/larger than 10 MB/);
  assert.match(fileError(0,'image/png'),/empty/);
  assert.match(fileError(10,'text/html'),/Choose a PDF/);
});
test('renaming a text file does not make it a PDF or photo',()=>{
  const text=new TextEncoder().encode('<html>fake report</html>');
  for (const type of ['application/pdf','image/jpeg','image/png','image/webp']) assert.equal(matchesFileType(text,type),false);
  assert.equal(matchesFileType(new TextEncoder().encode('%PDF-1.4'),'application/pdf'),true);
  assert.equal(matchesFileType(new Uint8Array([137,80,78,71,13,10,26,10]),'image/png'),true);
  assert.equal(matchesFileType(new Uint8Array([255,216,255]),'image/jpeg'),true);
  assert.equal(matchesFileType(new TextEncoder().encode('RIFF0000WEBP'),'image/webp'),true);
});
test('browser access keys must contain 32 random bytes in hexadecimal',()=>{
  assert.equal(isSessionKey('a'.repeat(64)),true);
  assert.equal(isSessionKey('a'.repeat(63)),false);
  assert.equal(isSessionKey('z'.repeat(64)),false);
});
