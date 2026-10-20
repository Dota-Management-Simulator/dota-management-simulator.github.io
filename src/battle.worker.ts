import { simulateBestOfThree } from "./battle";
import type { BattleConfig } from "./battle";
self.onmessage = (event: MessageEvent<BattleConfig>) => {
  try {
    const simulation = simulateBestOfThree(event.data, (games) =>
      self.postMessage({ type: "progress", games }),
    );
    self.postMessage({ type: "complete", simulation });
  } catch (error) {
    self.postMessage({
      type: "error",
      message:
        error instanceof Error
          ? error.message
          : "Match simulation failed. Please try again.",
    });
  }
};
