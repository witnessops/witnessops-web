import { BundleError, verifyBundle } from './bundle';
import type { ProofpackInputFile } from './verify.mjs';
self.onmessage = async (event: MessageEvent<ProofpackInputFile>) => {
    try {
        self.postMessage({ ok: true, result: await verifyBundle(event.data) });
    }
    catch (error) {
        self.postMessage({ ok: false, message: error instanceof BundleError ? error.message : 'Local verification could not complete. No report was generated.' });
    }
};
