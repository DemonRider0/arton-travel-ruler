import OBR from "@owlbear-rodeo/sdk";
import {
  refreshRouteInteractions,
  registerRouteInteractionListeners,
} from "../measurements/routeInteractions";
import { applyPendingCalibration } from "../owlbear/sceneCalibration";
import { registerTravelRulerTool } from "../tool/registerTool";

OBR.onReady(() => {
  registerRouteInteractionListeners();
  void initializeScene();
  OBR.scene.onReadyChange((ready) => {
    if (ready) {
      void initializeScene(false);
    }
  });
});

async function initializeScene(registerTool = true): Promise<void> {
  if (registerTool) {
    await registerTravelRulerTool();
  }
  await applyPendingCalibration();
  await refreshRouteInteractions();
}
