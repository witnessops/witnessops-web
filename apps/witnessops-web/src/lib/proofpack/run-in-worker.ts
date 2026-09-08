import type { ProofpackInputFile, ProofpackResult } from './verify.mjs';
export function verifyInWorker(input: ProofpackInputFile, signal: AbortSignal): Promise<ProofpackResult> {
    return new Promise((resolve, reject) => {
        if (signal.aborted) {
            reject(new Error('Verification cancelled.'));
            return;
        }
        const worker = new Worker(new URL('./proofpack.worker.ts', import.meta.url), { type: 'module', name: 'local-audit-1.2.2' });
        let settled = false;
        const finish = (result?: ProofpackResult, message?: string) => { if (settled)
            return; settled = true; clearTimeout(timer); signal.removeEventListener('abort', abort); worker.terminate(); if (result)
            resolve(result);
        else
            reject(new Error(message ?? 'Local verification could not complete.')); };
        const abort = () => finish(undefined, 'Verification cancelled.');
        const timer = setTimeout(() => finish(undefined, 'Verification exceeded 45 seconds. No successful result was issued.'), 45000);
        signal.addEventListener('abort', abort, { once: true });
        worker.onmessage = (event: MessageEvent<{
            ok: boolean;
            result?: ProofpackResult;
            message?: string;
        }>) => finish(event.data.ok ? event.data.result : undefined, event.data.message);
        worker.onerror = event => { event.preventDefault(); finish(); };
        worker.onmessageerror = () => finish();
        try {
            worker.postMessage(input);
        }
        catch {
            finish();
        }
    });
}
