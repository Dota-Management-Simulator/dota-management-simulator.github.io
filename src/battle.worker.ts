import { simulateSeries } from "./battle";
import type { BattleConfig } from "./battle";
import { LiveBattleSession } from "./live-battle";
import type { LiveRequest } from "./live-battle";
let session:LiveBattleSession|undefined;
self.onmessage = (event: MessageEvent<BattleConfig | LiveRequest>) => {
  try {
    if("type" in event.data){
      if(event.data.type==="start-live"){session=new LiveBattleSession(event.data.config);self.postMessage(session.update());}
      else {if(!session)throw Error("No live map is running");self.postMessage(session.command(event.data));}
      return;
    }
    const simulation = simulateSeries(event.data, (games) =>
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
