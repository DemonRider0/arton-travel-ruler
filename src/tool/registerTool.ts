import OBR, {
  type Image,
  type Item,
  type ToolEvent,
  type ToolModeFilter,
  type Vector2,
} from "@owlbear-rodeo/sdk";
import { calculateTravelDays, getImageTransform } from "../maps/calibration";
import {
  buildRouteVisuals,
  isLabelItem,
  isLineItem,
  isShapeItem,
  type RouteVisuals,
} from "../measurements/items";
import {
  deleteAllMeasurements,
  deleteLastMeasurement,
  deleteMeasurementsSelected,
} from "../measurements/repository";
import { formatMeasurement, formatMeasurementLabel } from "../measurements/format";
import {
  cumulativeRouteDistancesInKilometers,
  getLastPoint,
  isNearPoint,
  routeDistanceInKilometers,
} from "../measurements/routeMath";
import { readMeasurementMetadata } from "../measurements/metadata";
import {
  hasLocalRouteInteraction,
  releaseRouteInteraction,
  requestRoutePointInteraction,
} from "../measurements/routeInteractions";
import { getRouteVisualMetrics, type RouteVisualMetrics } from "../measurements/visualStyle";
import { getCalibratedMapItem, getSceneCalibration } from "../owlbear/sceneCalibration";
import { IDS, METADATA } from "../shared/constants";
import type { MapCalibration, RoutePointMeasurement } from "../shared/models";

interface ActiveRoute {
  points: Vector2[];
  calibration: MapCalibration;
  mapItem: Image;
  preview: RouteVisuals;
  previewId: string;
  visualMetrics: RouteVisualMetrics;
}

let activeRoute: ActiveRoute | null = null;
let latestPointer: Vector2 | null = null;
let previewFrame: number | null = null;

export async function registerTravelRulerTool(): Promise<void> {
  const toolIcon = assetUrl("tool.svg");
  const activeFilter: ToolModeFilter = {
    activeTools: [IDS.tool],
    activeModes: [IDS.measureMode],
  };

  await OBR.tool.create({
    id: IDS.tool,
    icons: [{ icon: toolIcon, label: "Régua de viagem" }],
    defaultMode: IDS.measureMode,
  });

  await OBR.tool.createMode({
    id: IDS.measureMode,
    icons: [{ icon: toolIcon, label: "Traçar rota" }],
    cursors: [{ cursor: "crosshair", filter: activeFilter }],
    preventDrag: activeFilter,
    onToolClick: (_context, event) => handleToolClick(event),
    onToolMove: (_context, event) => schedulePreview(event.pointerPosition),
    onKeyDown: (_context, event) => {
      if (event.key === "Escape") {
        if (activeRoute) {
          void cancelRoute(true);
        } else {
          void releaseRouteInteraction(true);
        }
      }
    },
    onDeactivate: () => {
      void cancelRoute(false);
      void releaseRouteInteraction();
    },
  });

  await OBR.tool.createAction({
    id: IDS.cancelAction,
    icons: [{ icon: assetUrl("cancel.svg"), label: "Cancelar rota", filter: activeFilter }],
    onClick: () => {
      if (activeRoute) {
        void cancelRoute(true);
      } else {
        void releaseRouteInteraction(true);
      }
    },
  });

  await OBR.tool.createAction({
    id: IDS.deleteLastAction,
    icons: [{ icon: assetUrl("delete-last.svg"), label: "Apagar última rota", filter: activeFilter }],
    onClick: () => {
      void handleDeleteLast();
    },
  });

  await OBR.tool.createAction({
    id: IDS.deleteAllAction,
    icons: [{ icon: assetUrl("delete-all.svg"), label: "Apagar todas as rotas", filter: activeFilter }],
    onClick: () => {
      void handleDeleteAll();
    },
  });

  await OBR.contextMenu.create({
    id: IDS.deleteRouteContextMenu,
    icons: [
      {
        icon: assetUrl("delete-route.svg"),
        label: "Apagar rota selecionada",
        filter: {
          min: 1,
          permissions: ["DELETE"],
          some: [
            {
              key: ["metadata", METADATA.measurement],
              value: undefined,
              operator: "!=",
            },
          ],
        },
      },
    ],
    onClick: (context) => {
      void handleDeleteSelected(context.items);
    },
  });
}

async function handleToolClick(event: ToolEvent): Promise<boolean> {
  try {
    const targetMetadata = event.target ? readMeasurementMetadata(event.target) : null;
    if (
      !activeRoute &&
      targetMetadata?.version === 2 &&
      targetMetadata.part === "waypoint"
    ) {
      await OBR.player.deselect();
      await requestRoutePointInteraction(targetMetadata);
      return true;
    }
    if (!activeRoute && targetMetadata) {
      await releaseRouteInteraction();
      await OBR.player.select([event.target!.id], true);
      return true;
    }
    if (!activeRoute && hasLocalRouteInteraction()) {
      await releaseRouteInteraction(true);
      return true;
    }
    if (!activeRoute) {
      await beginRoute(event.pointerPosition);
    } else {
      await addWaypointOrFinish(event.pointerPosition);
    }
  } catch (error) {
    await OBR.notification.show(errorMessage(error), "ERROR");
    await cancelRoute(false);
  }
  return true;
}

async function beginRoute(start: Vector2): Promise<void> {
  await releaseRouteInteraction();
  await requirePermission("RULER_CREATE", "criar rotas");
  const calibration = await getSceneCalibration();
  if (!calibration) {
    throw new Error("Calibre o mapa desta cena no painel da extensão antes de medir.");
  }
  const mapItem = await getCalibratedMapItem(calibration);
  await OBR.player.deselect();
  const previewId = crypto.randomUUID();
  const points = [start];
  const visualMetrics = getRouteVisualMetrics(calibration.imageWidth, mapItem.scale.x);
  const preview = buildPreview(
    points,
    start,
    calibration,
    mapItem,
    previewId,
    visualMetrics,
  );
  await OBR.scene.local.addItems(preview.items);
  activeRoute = { points, calibration, mapItem, preview, previewId, visualMetrics };
}

async function addWaypointOrFinish(point: Vector2): Promise<void> {
  const route = activeRoute;
  if (!route) {
    return;
  }
  const lastPoint = route.points.at(-1);
  if (!lastPoint) {
    return;
  }

  const viewportScale = await OBR.viewport.getScale();
  if (isNearPoint(point, lastPoint, viewportScale)) {
    if (route.points.length < 2) {
      await OBR.notification.show("Escolha um segundo ponto antes de finalizar a rota.", "INFO");
      return;
    }
    await finishRoute();
    return;
  }

  route.points.push(point);
  await rebuildPreview(point);
}

async function finishRoute(): Promise<void> {
  const route = activeRoute;
  if (!route || route.points.length < 2) {
    return;
  }
  await requirePermission("RULER_CREATE", "criar rotas");
  const result = calculateRoute(route.points, route);
  const pointMeasurements = calculatePointMeasurements(route.points, route);
  const visuals = buildRouteVisuals({
    points: route.points,
    distanceKilometers: result.distanceKilometers,
    travelDays: result.travelDays,
    mapId: route.calibration.mapId,
    measurementId: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    persistent: true,
    kilometersPerDay: route.calibration.kilometersPerDay,
    pointMeasurements,
    visualMetrics: route.visualMetrics,
  });

  await OBR.scene.items.addItems(visuals.items);
  await clearPreview();
  await OBR.notification.show(
    `Rota salva: ${formatMeasurement(result.distanceKilometers, result.travelDays)}.`,
    "SUCCESS",
  );
}

function schedulePreview(pointer: Vector2): void {
  if (!activeRoute) {
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
  const route = activeRoute;
  if (!route) {
    return;
  }
  const previewPoints = [...route.points, end];
  const result = calculateRoute(previewPoints, route);
  const lastSegmentId = route.preview.segmentIds.at(-1);
  const lastMarkerId = route.preview.markerIds.at(-1);
  const ids = [lastSegmentId, lastMarkerId, route.preview.labelId].filter(
    (id): id is string => Boolean(id),
  );

  await OBR.scene.local.updateItems(
    ids,
    (items) => {
      for (const item of items as Item[]) {
        if (isLineItem(item)) {
          item.endPosition = end;
        } else if (isShapeItem(item)) {
          item.position = end;
        } else if (isLabelItem(item)) {
          item.position = getLastPoint(previewPoints);
          item.text.plainText = formatMeasurementLabel(
            result.distanceKilometers,
            result.travelDays,
          );
        }
      }
    },
    true,
  );
}

async function rebuildPreview(provisionalEnd: Vector2): Promise<void> {
  const route = activeRoute;
  if (!route) {
    return;
  }
  const previousIds = route.preview.items.map((item) => item.id);
  const nextPreview = buildPreview(
    route.points,
    provisionalEnd,
    route.calibration,
    route.mapItem,
    route.previewId,
    route.visualMetrics,
  );
  await OBR.scene.local.deleteItems(previousIds);
  await OBR.scene.local.addItems(nextPreview.items);
  route.preview = nextPreview;
}

function buildPreview(
  points: Vector2[],
  provisionalEnd: Vector2,
  calibration: MapCalibration,
  mapItem: Image,
  previewId: string,
  visualMetrics: RouteVisualMetrics,
): RouteVisuals {
  const previewPoints = [...points, provisionalEnd];
  const result = calculateRoute(previewPoints, { calibration, mapItem });
  const pointMeasurements = calculatePointMeasurements(previewPoints, { calibration, mapItem });
  return buildRouteVisuals({
    points: previewPoints,
    distanceKilometers: result.distanceKilometers,
    travelDays: result.travelDays,
    mapId: calibration.mapId,
    measurementId: previewId,
    createdAt: new Date().toISOString(),
    persistent: false,
    kilometersPerDay: calibration.kilometersPerDay,
    pointMeasurements,
    visualMetrics,
  });
}

function calculatePointMeasurements(
  points: Vector2[],
  route: Pick<ActiveRoute, "calibration" | "mapItem">,
): RoutePointMeasurement[] {
  const distances = cumulativeRouteDistancesInKilometers(
    points,
    getImageTransform(route.mapItem),
    route.calibration.kilometersPerImagePixel,
  );
  return distances.map((distance) => ({
    distanceKilometers: Math.round(distance * 10) / 10,
    travelDays: calculateTravelDays(distance, route.calibration.kilometersPerDay),
  }));
}

function calculateRoute(
  points: Vector2[],
  route: Pick<ActiveRoute, "calibration" | "mapItem">,
): { distanceKilometers: number; travelDays: number } {
  const exactDistance = routeDistanceInKilometers(
    points,
    getImageTransform(route.mapItem),
    route.calibration.kilometersPerImagePixel,
  );
  return {
    distanceKilometers: Math.round(exactDistance * 10) / 10,
    travelDays: calculateTravelDays(exactDistance, route.calibration.kilometersPerDay),
  };
}

async function cancelRoute(showNotification: boolean): Promise<void> {
  const hadRoute = Boolean(activeRoute);
  await clearPreview();
  if (showNotification && hadRoute) {
    await OBR.notification.show("Rota cancelada.", "INFO");
  }
}

async function clearPreview(): Promise<void> {
  if (previewFrame !== null) {
    cancelAnimationFrame(previewFrame);
    previewFrame = null;
  }
  latestPointer = null;
  const previewIds = activeRoute?.preview.items.map((item) => item.id) ?? [];
  activeRoute = null;
  if (previewIds.length > 0) {
    await OBR.scene.local.deleteItems(previewIds);
  }
}

async function handleDeleteLast(): Promise<void> {
  try {
    await releaseRouteInteraction();
    await requirePermission("RULER_DELETE", "apagar rotas");
    await cancelRoute(false);
    const count = await deleteLastMeasurement();
    await OBR.notification.show(
      count > 0 ? "Última rota apagada." : "Não há rotas para apagar.",
      count > 0 ? "SUCCESS" : "INFO",
    );
  } catch (error) {
    await OBR.notification.show(errorMessage(error), "ERROR");
  }
}

async function handleDeleteAll(): Promise<void> {
  try {
    await releaseRouteInteraction();
    await requirePermission("RULER_DELETE", "apagar rotas");
    await cancelRoute(false);
    const count = await deleteAllMeasurements();
    await OBR.notification.show(
      count > 0 ? "Todas as rotas foram apagadas." : "Não há rotas para apagar.",
      count > 0 ? "SUCCESS" : "INFO",
    );
  } catch (error) {
    await OBR.notification.show(errorMessage(error), "ERROR");
  }
}

async function handleDeleteSelected(items: Item[]): Promise<void> {
  try {
    await releaseRouteInteraction();
    await requirePermission("RULER_DELETE", "apagar rotas");
    const count = await deleteMeasurementsSelected(items);
    await OBR.notification.show(
      count > 0 ? "Rota selecionada apagada." : "Nenhuma rota da extensão foi selecionada.",
      count > 0 ? "SUCCESS" : "INFO",
    );
  } catch (error) {
    await OBR.notification.show(errorMessage(error), "ERROR");
  }
}

async function requirePermission(
  permission: "RULER_CREATE" | "RULER_DELETE",
  action: string,
): Promise<void> {
  if (!(await OBR.player.hasPermission(permission))) {
    throw new Error(
      `A sala não permite que jogadores usem a camada de régua para ${action}. ` +
        "O mestre pode liberar essa permissão nas configurações da sala.",
    );
  }
}

function assetUrl(fileName: string): string {
  return new URL(fileName, window.location.href).href;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Não foi possível concluir a operação.";
}
