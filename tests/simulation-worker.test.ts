import { test } from "node:test";
import assert from "node:assert/strict";
import { startSimulationWorker } from "../src/simulation-worker";

test("worker launch/load/decoding failures release busy state exactly once and reject late results", () => {
  const prior = Object.getOwnPropertyDescriptor(globalThis, "Worker");
  let failAt = "", instance: FakeWorker;
  class FakeWorker {
    onmessage?: (event: unknown) => void;
    onerror?: (event: unknown) => void;
    onmessageerror?: () => void;
    stopped = false;
    constructor() { if (failAt === "constructor") throw Error("Worker unavailable"); instance = this; }
    postMessage() { if (failAt === "post") throw Error("Cannot clone request"); }
    terminate() { this.stopped = true; }
  }
  Object.defineProperty(globalThis, "Worker", { configurable: true, value: FakeWorker });
  try {
    for (failAt of ["constructor", "post", "load", "decode", ""]) {
      let busy = true, failures = 0, results = 0;
      const worker = startSimulationWorker(() => new Worker(new URL("file:///test-worker.js"), { type: "module" }), {}, () => { results++; }, () => { busy = false; failures++; });
      if (failAt === "load") instance!.onerror!({ preventDefault() {} });
      if (failAt === "decode") instance!.onmessageerror!();
      if (failAt) {
        assert.equal(busy, false, failAt); assert.equal(failures, 1, failAt);
        if (failAt !== "constructor") {
          instance!.onmessageerror!(); instance!.onmessage!({ data: { type: "complete" } });
          assert.equal(instance!.stopped, true);
          assert.equal(failures, 1); assert.equal(results, 0);
        }
      } else {
        assert.ok(worker); instance!.onmessage!({ data: { type: "complete" } });
        assert.equal(results, 1); assert.equal(failures, 0);
      }
    }
  } finally {
    if (prior) Object.defineProperty(globalThis, "Worker", prior); else Reflect.deleteProperty(globalThis, "Worker");
  }
});
