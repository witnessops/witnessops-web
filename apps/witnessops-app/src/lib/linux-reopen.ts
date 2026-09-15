/** Only explicitly classified verifier contention is retryable. No result cache:
 * every attempt reaches authentication, authorization and source verification. */
export async function fetchLinuxCheck(runId: string, workspaceId: string, signal: AbortSignal, onBusy: () => void, fetcher: typeof fetch = fetch): Promise<Response> {
  for (let attempt = 0; ; attempt++) {
    signal.throwIfAborted();
    const response = await fetcher(`/api/linux-checks?id=${encodeURIComponent(runId)}`, {
      cache: 'no-store', credentials: 'same-origin', signal,
      headers: { 'X-WitnessOps-Workspace': workspaceId },
    });
    if (response.status !== 429 || attempt === 3) return response;
    const error = await response.clone().json().catch(() => null);
    if (error?.code !== 'verification_busy' || error.retryable !== true) return response;
    onBusy();
    await new Promise<void>((resolve, reject) => {
      signal.throwIfAborted();
      const abort = () => { clearTimeout(timer); reject(signal.reason); };
      const timer = setTimeout(() => { signal.removeEventListener('abort', abort); resolve(); }, 1000);
      signal.addEventListener('abort', abort, { once: true });
    });
  }
}
