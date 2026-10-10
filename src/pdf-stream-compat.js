// Older Safari supports stream readers but not the async iteration pdf.js uses.
export function ensurePdfStreamIteration(Stream = globalThis.ReadableStream) {
  if (!Stream || typeof Stream.prototype[Symbol.asyncIterator] === 'function') return;
  Object.defineProperty(Stream.prototype, Symbol.asyncIterator, {
    configurable: true,
    writable: true,
    value: async function* () {
      const reader = this.getReader();
      let finished = false;
      try {
        while (true) {
          const {done, value} = await reader.read();
          if (done) { finished = true; return; }
          yield value;
        }
      } finally {
        try { if (!finished) await reader.cancel(); }
        finally { reader.releaseLock(); }
      }
    },
  });
}

ensurePdfStreamIteration();
