import OBR from "@owlbear-rodeo/sdk";
import { applyPendingCalibration } from "../owlbear/sceneCalibration";
import { registerTravelRulerTool } from "../tool/registerTool";

OBR.onReady(() => {
  void registerTravelRulerTool();
  void applyPendingCalibration();
  OBR.scene.onReadyChange((ready) => {
    if (ready) {
      void applyPendingCalibration();
    }
  });
});
