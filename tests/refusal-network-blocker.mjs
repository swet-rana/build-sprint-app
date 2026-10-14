// Preloaded by the refusal audit: even a broken guard cannot send a request.
globalThis.fetch=async()=>{throw Error('NETWORK ATTEMPT: refusal check must stop before any network request.');};
