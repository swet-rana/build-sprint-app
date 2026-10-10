import test from 'node:test';
import assert from 'node:assert/strict';
import {ensurePdfStreamIteration} from '../src/pdf-stream-compat.js';

function safariStream() {
  class SafariStream extends ReadableStream {}
  Object.defineProperty(SafariStream.prototype, Symbol.asyncIterator, {value: undefined, configurable: true});
  ensurePdfStreamIteration(SafariStream);
  return SafariStream;
}

test('Safari stream iteration preserves chunks and releases its reader on completion', async () => {
  const Stream = safariStream();
  const stream = new Stream({start(c) {c.enqueue({items: ['AMH']}); c.enqueue({items: ['FSH']}); c.close();}});
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  assert.deepEqual(chunks, [{items: ['AMH']}, {items: ['FSH']}]);
  assert.equal(stream.locked, false);
});

test('Safari stream iteration cancels on early exit and releases locks on reading errors', async () => {
  const Stream = safariStream();
  let cancelled = false;
  const stream = new Stream({start(c) {c.enqueue('first');}, cancel() {cancelled = true;}});
  for await (const chunk of stream) {assert.equal(chunk, 'first'); break;}
  assert.equal(cancelled, true);
  assert.equal(stream.locked, false);
  const error = new Error('PDF stream failed');
  const failed = new Stream({start(c) {c.error(error);}});
  await assert.rejects(async () => {for await (const chunk of failed) assert.fail(chunk);}, error);
  assert.equal(failed.locked, false);
});

test('PDF compatibility leaves native stream iteration unchanged', () => {
  const native = ReadableStream.prototype[Symbol.asyncIterator];
  ensurePdfStreamIteration();
  assert.equal(ReadableStream.prototype[Symbol.asyncIterator], native);
});
