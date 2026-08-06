import OBR from "@owlbear-rodeo/sdk";
import {
  refreshRouteInteractions,
  registerRouteSelectionListener,
} from "../measurements/routeInteractions";
import { applyPendingCalibration } from "../owlbear/sceneCalibration";
import { registerTravelRulerTool } from "../tool/registerTool";

OBR.onReady(() => {
  registerRouteSelectionListener();
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
