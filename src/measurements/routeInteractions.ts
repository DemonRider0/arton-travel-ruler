import OBR, { type Item, type Label, type Shape } from "@owlbear-rodeo/sdk";
import { calculateTravelDays, getImageTransform } from "../maps/calibration";
import { getCalibratedMapItem, getSceneCalibration } from "../owlbear/sceneCalibration";
import { METADATA } from "../shared/constants";
import type { RouteMeasurementMetadata } from "../shared/models";
import { formatMeasurementLabel } from "./format";
import { isLabelItem, isLineItem, isShapeItem } from "./items";
import { readMeasurementMetadata } from "./metadata";
import { cumulativeRouteDistancesInKilometers } from "./routeMath";
import { getRouteVisualMetrics } from "./visualStyle";

let selectionListenerRegistered = false;
let selectedMeasurementId: string | null = null;
let selectionRevision = 0;

export function registerRouteSelectionListener(): void {
  if (selectionListenerRegistered) {
    return;
  }
  selectionListenerRegistered = true;
  OBR.player.onChange((player) => {
    void handleSelectionChange(player.selection);
  });
}

export async function refreshRouteInteractions(): Promise<void> {
  selectedMeasurementId = null;
  await refreshRouteAppearance();
  await handleSelectionChange(await OBR.player.getSelection());
}

async function refreshRouteAppearance(): Promise<void> {
  const calibration = await getSceneCalibration();
  if (!calibration) {
    return;
  }
  const mapItem = await getCalibratedMapItem(calibration);
  const metrics = getRouteVisualMetrics(calibration.imageWidth, mapItem.scale.x);
  const items = await getRouteItems();
  const finalWaypointByMeasurement = getFinalWaypoints(items);

  await OBR.scene.items.updateItems(items, (draftItems) => {
    for (const item of draftItems as Item[]) {
      const metadata = readMeasurementMetadata(item);
      if (!metadata || metadata.version !== 2) {
        continue;
      }
      item.locked = true;
      item.disableHit = false;

      if (isLineItem(item) && metadata.part === "segment") {
        item.style.strokeWidth = metrics.lineWidth;
        item.style.strokeDash = metrics.lineDash;
      } else if (isShapeItem(item) && metadata.part === "waypoint") {
        item.width = metrics.markerSize;
        item.height = metrics.markerSize;
        item.style.strokeWidth = metrics.markerStrokeWidth;
      } else if (isLabelItem(item) && metadata.part === "label") {
        const finalWaypoint = finalWaypointByMeasurement.get(metadata.measurementId);
        if (finalWaypoint) {
          item.position = finalWaypoint.position;
        }
        item.text.plainText = formatMeasurementLabel(
          metadata.distanceKilometers,
          metadata.travelDays,
        );
      }
    }
  });
}

async function handleSelectionChange(selection: string[] | undefined): Promise<void> {
  const revision = ++selectionRevision;
  if (!(await OBR.scene.isReady())) {
    selectedMeasurementId = null;
    return;
  }
  const selectedItems = selection?.length
    ? await OBR.scene.items.getItems(selection)
    : [];
  if (revision !== selectionRevision) {
    return;
  }

  const waypoint = selectedItems.find((item) => {
    const metadata = readMeasurementMetadata(item);
    return metadata?.version === 2 && metadata.part === "waypoint";
  });
  const waypointMetadata = waypoint
    ? (readMeasurementMetadata(waypoint) as RouteMeasurementMetadata)
    : null;
  const nextMeasurementId = waypointMetadata?.measurementId ?? null;

  if (selectedMeasurementId && selectedMeasurementId !== nextMeasurementId) {
    await updateRouteLabel(selectedMeasurementId, null);
  }
  if (revision !== selectionRevision) {
    return;
  }

  if (waypoint && waypointMetadata) {
    await updateRouteLabel(waypointMetadata.measurementId, waypointMetadata.partIndex);
  }
  if (revision === selectionRevision) {
    selectedMeasurementId = nextMeasurementId;
  }
}

async function updateRouteLabel(
  measurementId: string,
  selectedPointIndex: number | null,
): Promise<void> {
  const items = (await getRouteItems()).filter((item) => {
    const metadata = readMeasurementMetadata(item);
    return metadata?.measurementId === measurementId;
  });
  const label = items.find((item): item is Label => {
    const metadata = readMeasurementMetadata(item);
    return isLabelItem(item) && metadata?.version === 2 && metadata.part === "label";
  });
  if (!label) {
    return;
  }
  const labelMetadata = readMeasurementMetadata(label) as RouteMeasurementMetadata;
  const waypoints = getSortedWaypoints(items);
  const targetWaypoint = selectedPointIndex === null
    ? waypoints.at(-1)
    : waypoints.find(({ metadata }) => metadata.partIndex === selectedPointIndex);
  if (!targetWaypoint) {
    return;
  }

  const selectedMetadata = targetWaypoint.metadata;
  const display = selectedPointIndex === null
    ? {
        distanceKilometers: labelMetadata.distanceKilometers,
        travelDays: labelMetadata.travelDays,
      }
    : await getPointMeasurement(waypoints, selectedMetadata, labelMetadata);

  await OBR.scene.items.updateItems([label], (labels) => {
    const draftLabel = labels[0] as Label | undefined;
    if (!draftLabel) {
      return;
    }
    draftLabel.position = targetWaypoint.item.position;
    draftLabel.text.plainText = formatMeasurementLabel(
      display.distanceKilometers,
      display.travelDays,
    );
  });
}

async function getPointMeasurement(
  waypoints: Array<{ item: Shape; metadata: RouteMeasurementMetadata }>,
  selectedMetadata: RouteMeasurementMetadata,
  labelMetadata: RouteMeasurementMetadata,
): Promise<{ distanceKilometers: number; travelDays: number }> {
  if (
    typeof selectedMetadata.cumulativeDistanceKilometers === "number" &&
    typeof selectedMetadata.cumulativeTravelDays === "number"
  ) {
    return {
      distanceKilometers: selectedMetadata.cumulativeDistanceKilometers,
      travelDays: selectedMetadata.cumulativeTravelDays,
    };
  }

  const calibration = await getSceneCalibration();
  if (!calibration) {
    return {
      distanceKilometers: labelMetadata.distanceKilometers,
      travelDays: labelMetadata.travelDays,
    };
  }
  const mapItem = await getCalibratedMapItem(calibration);
  const distances = cumulativeRouteDistancesInKilometers(
    waypoints.map(({ item }) => item.position),
    getImageTransform(mapItem),
    calibration.kilometersPerImagePixel,
  );
  const selectedArrayIndex = waypoints.findIndex(
    ({ metadata }) => metadata.partIndex === selectedMetadata.partIndex,
  );
  const exactDistance = distances[selectedArrayIndex] ?? labelMetadata.distanceKilometers;
  const kilometersPerDay = labelMetadata.kilometersPerDay ?? calibration.kilometersPerDay;
  return {
    distanceKilometers: Math.round(exactDistance * 10) / 10,
    travelDays: calculateTravelDays(exactDistance, kilometersPerDay),
  };
}

function getFinalWaypoints(items: Item[]): Map<string, Shape> {
  const result = new Map<string, { item: Shape; index: number }>();
  for (const item of items) {
    const metadata = readMeasurementMetadata(item);
    if (!isShapeItem(item) || metadata?.version !== 2 || metadata.part !== "waypoint") {
      continue;
    }
    const current = result.get(metadata.measurementId);
    if (!current || metadata.partIndex > current.index) {
      result.set(metadata.measurementId, { item, index: metadata.partIndex });
    }
  }
  return new Map([...result].map(([id, value]) => [id, value.item]));
}

function getSortedWaypoints(
  items: Item[],
): Array<{ item: Shape; metadata: RouteMeasurementMetadata }> {
  return items
    .flatMap((item) => {
      const metadata = readMeasurementMetadata(item);
      return isShapeItem(item) && metadata?.version === 2 && metadata.part === "waypoint"
        ? [{ item, metadata }]
        : [];
    })
    .sort((left, right) => left.metadata.partIndex - right.metadata.partIndex);
}

async function getRouteItems(): Promise<Item[]> {
  return OBR.scene.items.getItems((item) => Boolean(item.metadata[METADATA.measurement]));
}
