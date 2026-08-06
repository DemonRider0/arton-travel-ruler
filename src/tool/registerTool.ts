import OBR, {
  isRuler,
  type Image,
  type Item,
  type ToolFilter,
  type ToolModeFilter,
  type ToolEvent,
  type Vector2,
} from "@owlbear-rodeo/sdk";
import { calculateTravelDays, distanceInKilometers, getImageTransform } from "../maps/calibration";
import { buildMeasurementVisuals, isShapeItem, type MeasurementVisuals } from "../measurements/items";
import { deleteAllMeasurements, deleteLastMeasurement } from "../measurements/repository";
import { formatMeasurement } from "../measurements/format";
import { getCalibratedMapItem, getSceneCalibration } from "../owlbear/sceneCalibration";
import { IDS } from "../shared/constants";
import type { MapCalibration } from "../shared/models";

interface ActiveMeasurement {
  start: Vector2;
  calibration: MapCalibration;
  mapItem: Image;
  preview: MeasurementVisuals;
}

let activeMeasurement: ActiveMeasurement | null = null;
let latestPointer: Vector2 | null = null;
let previewFrame: number | null = null;

export async function registerTravelRulerTool(): Promise<void> {
  const toolIcon = assetUrl("icon.svg");
  const toolFilter: ToolFilter = { roles: ["GM"] };
  const activeFilter: ToolModeFilter = {
    activeTools: [IDS.tool],
    activeModes: [IDS.measureMode],
    roles: ["GM"],
  };

  await OBR.tool.create({
    id: IDS.tool,
    icons: [{ icon: toolIcon, label: "Régua de viagem", filter: toolFilter }],
    disabled: { roles: ["PLAYER"] },
    defaultMode: IDS.measureMode,
  });

  await OBR.tool.createMode({
    id: IDS.measureMode,
    icons: [{ icon: toolIcon, label: "Medir viagem", filter: toolFilter }],
    cursors: [{ cursor: "crosshair", filter: activeFilter }],
    preventDrag: activeFilter,
    onToolClick: (_context, event) => handleToolClick(event),
    onToolMove: (_context, event) => schedulePreview(event.pointerPosition),
    onKeyDown: (_context, event) => {
      if (event.key === "Escape") {
        void cancelMeasurement(true);
      }
    },
    onDeactivate: () => {
      void cancelMeasurement(false);
    },
  });

  await OBR.tool.createAction({
    id: IDS.cancelAction,
    icons: [{ icon: assetUrl("cancel.svg"), label: "Cancelar medição", filter: activeFilter }],
    disabled: { roles: ["PLAYER"] },
    onClick: () => {
      void cancelMeasurement(true);
    },
  });

  await OBR.tool.createAction({
    id: IDS.deleteLastAction,
    icons: [{ icon: assetUrl("delete-last.svg"), label: "Apagar última medição", filter: activeFilter }],
    disabled: { roles: ["PLAYER"] },
    onClick: () => {
      void handleDeleteLast();
    },
  });

  await OBR.tool.createAction({
    id: IDS.deleteAllAction,
    icons: [{ icon: assetUrl("delete-all.svg"), label: "Apagar todas as medições", filter: activeFilter }],
    disabled: { roles: ["PLAYER"] },
    onClick: () => {
      void handleDeleteAll();
    },
  });
}

async function handleToolClick(event: ToolEvent): Promise<boolean> {
  try {
    if (!activeMeasurement) {
      await beginMeasurement(event.pointerPosition);
    } else {
      await finishMeasurement(event.pointerPosition);
    }
  } catch (error) {
    await OBR.notification.show(errorMessage(error), "ERROR");
    await cancelMeasurement(false);
  }
  return true;
}

async function beginMeasurement(start: Vector2): Promise<void> {
  const calibration = await getSceneCalibration();
  if (!calibration) {
    throw new Error("Calibre o mapa desta cena no painel da extensão antes de medir.");
  }
  const mapItem = await getCalibratedMapItem(calibration);
  const preview = buildMeasurementVisuals({
    start,
    end: start,
    distanceKilometers: 0,
    travelDays: 0,
    mapId: calibration.mapId,
    measurementId: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    persistent: false,
  });
  await OBR.scene.local.addItems(preview.items);
  activeMeasurement = { start, calibration, mapItem, preview };
}

async function finishMeasurement(end: Vector2): Promise<void> {
  const measurement = activeMeasurement;
  if (!measurement) {
    return;
  }

  const result = calculateMeasurement(measurement, end);
  const createdAt = new Date().toISOString();
  const visuals = buildMeasurementVisuals({
    start: measurement.start,
    end,
    distanceKilometers: result.distanceKilometers,
    travelDays: result.travelDays,
    mapId: measurement.calibration.mapId,
    measurementId: crypto.randomUUID(),
    createdAt,
    persistent: true,
  });

  await OBR.scene.items.addItems(visuals.items);
  await clearPreview();
  await OBR.notification.show(
    formatMeasurement(result.distanceKilometers, result.travelDays),
    "SUCCESS",
  );
}

function schedulePreview(pointer: Vector2): void {
  if (!activeMeasurement) {
    return;
  }
  latestPointer = pointer;
  if (previewFrame !== null) {
    return;
  }
  previewFrame = requestAnimationFrame(() => {
    previewFrame = null;
    const target = latestPointer;
    latestPointer = null;
    if (target) {
      void updatePreview(target);
    }
  });
}

async function updatePreview(end: Vector2): Promise<void> {
  const measurement = activeMeasurement;
  if (!measurement) {
    return;
  }
  const result = calculateMeasurement(measurement, end);
  const preview = measurement.preview;
  await OBR.scene.local.updateItems(
    [preview.rulerId, preview.endMarkerId],
    (items) => {
      for (const item of items as Item[]) {
        if (isRuler(item)) {
          item.endPosition = end;
          item.measurement = formatMeasurement(result.distanceKilometers, result.travelDays);
        } else if (isShapeItem(item)) {
          item.position = end;
        }
      }
    },
    true,
  );
}

function calculateMeasurement(
  measurement: ActiveMeasurement,
  end: Vector2,
): { distanceKilometers: number; travelDays: number } {
  const distance = distanceInKilometers(
    measurement.start,
    end,
    getImageTransform(measurement.mapItem),
    measurement.calibration.kilometersPerImagePixel,
  );
  const distanceKilometers = Math.round(distance * 10) / 10;
  return {
    distanceKilometers,
    travelDays: calculateTravelDays(distance, measurement.calibration.kilometersPerDay),
  };
}

async function cancelMeasurement(showNotification: boolean): Promise<void> {
  const hadMeasurement = Boolean(activeMeasurement);
  await clearPreview();
  if (showNotification && hadMeasurement) {
    await OBR.notification.show("Medição cancelada.", "INFO");
  }
}

async function clearPreview(): Promise<void> {
  if (previewFrame !== null) {
    cancelAnimationFrame(previewFrame);
    previewFrame = null;
  }
  latestPointer = null;
  const previewIds = activeMeasurement?.preview.items.map((item) => item.id) ?? [];
  activeMeasurement = null;
  if (previewIds.length > 0) {
    await OBR.scene.local.deleteItems(previewIds);
  }
}

async function handleDeleteLast(): Promise<void> {
  await cancelMeasurement(false);
  const count = await deleteLastMeasurement();
  await OBR.notification.show(
    count > 0 ? "Última medição apagada." : "Não há medições para apagar.",
    count > 0 ? "SUCCESS" : "INFO",
  );
}

async function handleDeleteAll(): Promise<void> {
  await cancelMeasurement(false);
  const count = await deleteAllMeasurements();
  await OBR.notification.show(
    count > 0 ? "Todas as medições foram apagadas." : "Não há medições para apagar.",
    count > 0 ? "SUCCESS" : "INFO",
  );
}

function assetUrl(fileName: string): string {
  return new URL(fileName, window.location.href).href;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Não foi possível concluir a medição.";
}
