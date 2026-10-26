/** Worker construction/posting can fail synchronously; loading and message
 * decoding fail asynchronously. All three must release the UI's busy state. */
// Keep new Worker(new URL(..., import.meta.url)) at each call site so Vite
// recognizes and bundles the worker rather than inlining TypeScript as an asset.
export function startSimulationWorker(createWorker: () => Worker, request: unknown,
  onMessage: (event: MessageEvent, worker: Worker) => void, onFailure: () => void): Worker | null {
  let worker: Worker | undefined;
  let failed = false;
  const fail = () => {
    if (failed) return;
    failed = true;
    worker?.terminate();
    onFailure();
  };
  try {
    worker = createWorker();
    const current = worker;
    worker.onerror = event => { event.preventDefault(); fail(); };
    worker.onmessageerror = fail;
    worker.onmessage = event => { if (!failed) onMessage(event, current); };
    worker.postMessage(request);
    return failed ? null : worker;
  } catch {
    fail();
    return null;
  }
}
