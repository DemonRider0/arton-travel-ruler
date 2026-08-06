import OBR, {
  type Item,
  type Label,
  type Player,
  type Shape,
} from "@owlbear-rodeo/sdk";
import { calculateTravelDays, getImageTransform } from "../maps/calibration";
import { getCalibratedMapItem, getSceneCalibration } from "../owlbear/sceneCalibration";
import { METADATA } from "../shared/constants";
import type { RouteMeasurementMetadata } from "../shared/models";
import { formatMeasurementLabel } from "./format";
import { shouldDisableRouteHit } from "./hitBehavior";
import {
  chooseRouteInteractionWinner,
  getRouteInteractionQueuePosition,
  readRouteInteractionRequest,
  type RouteInteractionRequest,
} from "./interactionQueue";
import { isLabelItem, isLineItem, isShapeItem } from "./items";
import { readMeasurementMetadata } from "./metadata";
import { cumulativeRouteDistancesInKilometers } from "./routeMath";
import {
  getRouteVisualMetrics,
  ROUTE_LABEL_POINTER_HEIGHT,
} from "./visualStyle";

let listenersRegistered = false;
let currentSceneScope: string | null = null;
let localConnectionId = "";
let localPlayerName = "Jogador";
let localRequest: RouteInteractionRequest | null = null;
let partyPlayers: Player[] = [];
let displayedMeasurementId: string | null = null;
let displayedInteractionKey: string | null = null;
let routeSignature = "";
let coordinationRevision = 0;
let localRequestWasQueued = false;

export function registerRouteInteractionListeners(): void {
  if (listenersRegistered) {
    return;
  }
  listenersRegistered = true;

  OBR.player.onChange((player) => {
    localConnectionId = player.connectionId;
    localPlayerName = player.name;
    localRequest = readRouteInteractionRequest(player.metadata[METADATA.interactionRequest]);
    void reconcileInteractionQueue();
  });
  OBR.party.onChange((players) => {
    partyPlayers = players;
    void reconcileInteractionQueue();
  });
  OBR.scene.items.onChange((items) => {
    const nextSignature = createRouteSignature(items);
    if (nextSignature !== routeSignature) {
      routeSignature = nextSignature;
      void reconcileInteractionQueue(getVersionTwoRouteItems(items));
    }
  });
}

export async function refreshRouteInteractions(): Promise<void> {
  const calibration = await getSceneCalibration();
  currentSceneScope = calibration?.mapItemId ?? null;
  displayedMeasurementId = null;
  displayedInteractionKey = null;

  await hydrateInteractionState();
  if (localRequest && localRequest.sceneScope !== currentSceneScope) {
    localRequest = null;
    await OBR.player.setMetadata({ [METADATA.interactionRequest]: null });
  }

  await refreshRouteAppearance();
  const items = await getRouteItems();
  routeSignature = createRouteSignature(items);
  await reconcileInteractionQueue(items);
}

export function hasLocalRouteInteraction(): boolean {
  return Boolean(localRequest && localRequest.sceneScope === currentSceneScope);
}

export async function requestRoutePointInteraction(
  metadata: RouteMeasurementMetadata,
): Promise<"ACTIVE" | "QUEUED" | "RELEASED"> {
  if (!currentSceneScope) {
    throw new Error("Abra uma cena calibrada antes de consultar uma rota.");
  }
  if (!localConnectionId) {
    await hydrateInteractionState();
  }

  if (
    localRequest?.sceneScope === currentSceneScope &&
    localRequest.measurementId === metadata.measurementId &&
    localRequest.pointIndex === metadata.partIndex
  ) {
    await releaseRouteInteraction();
    return "RELEASED";
  }

  const existingRequest = localRequest?.sceneScope === currentSceneScope
    ? localRequest
    : null;
  const request: RouteInteractionRequest = {
    version: 1,
    requestId: existingRequest?.requestId ?? crypto.randomUUID(),
    sceneScope: currentSceneScope,
    measurementId: metadata.measurementId,
    pointIndex: metadata.partIndex,
    requestedAt: existingRequest?.requestedAt ?? Date.now(),
    connectionId: localConnectionId,
    playerName: localPlayerName,
  };
  localRequest = request;
  await OBR.player.setMetadata({ [METADATA.interactionRequest]: request });

  const state = await reconcileInteractionQueue();
  if (state.winner?.requestId === request.requestId) {
    localRequestWasQueued = false;
    return "ACTIVE";
  }

  localRequestWasQueued = true;
  const positionText = state.localQueuePosition && state.localQueuePosition > 1
    ? ` Você está na posição ${state.localQueuePosition} da fila.`
    : "";
  const ownerName = state.winner?.playerName ?? "outro jogador";
  await OBR.notification.show(
    `${ownerName} está consultando a régua.${positionText}`,
    "INFO",
  );
  return "QUEUED";
}

export async function releaseRouteInteraction(showNotification = false): Promise<boolean> {
  if (!localRequest) {
    return false;
  }
  localRequest = null;
  localRequestWasQueued = false;
  await OBR.player.setMetadata({ [METADATA.interactionRequest]: null });
  await reconcileInteractionQueue();
  if (showNotification) {
    await OBR.notification.show("Consulta da régua liberada.", "INFO");
  }
  return true;
}

async function hydrateInteractionState(): Promise<void> {
  const [connectionId, playerName, metadata, players] = await Promise.all([
    OBR.player.getConnectionId(),
    OBR.player.getName(),
    OBR.player.getMetadata(),
    OBR.party.getPlayers(),
  ]);
  localConnectionId = connectionId;
  localPlayerName = playerName;
  localRequest = readRouteInteractionRequest(metadata[METADATA.interactionRequest]);
  partyPlayers = players;
}

async function refreshRouteAppearance(): Promise<void> {
  if (!(await canUpdateSharedRouteItems())) {
    return;
  }
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

      if (isLineItem(item) && metadata.part === "segment") {
        item.disableHit = shouldDisableRouteHit(metadata.part, true);
        item.style.strokeWidth = metrics.lineWidth;
        item.style.strokeDash = metrics.lineDash;
      } else if (isShapeItem(item) && metadata.part === "waypoint") {
        item.disableHit = shouldDisableRouteHit(metadata.part, true);
        item.width = metrics.markerSize;
        item.height = metrics.markerSize;
        item.style.strokeWidth = metrics.markerStrokeWidth;
      } else if (isLabelItem(item) && metadata.part === "label") {
        item.disableHit = shouldDisableRouteHit(metadata.part, true);
        const finalWaypoint = finalWaypointByMeasurement.get(metadata.measurementId);
        if (finalWaypoint) {
          item.position = finalWaypoint.position;
        }
        item.style.pointerHeight = ROUTE_LABEL_POINTER_HEIGHT;
        item.text.plainText = formatMeasurementLabel(
          metadata.distanceKilometers,
          metadata.travelDays,
        );
      }
    }
  });
}

async function reconcileInteractionQueue(
  knownItems?: Item[],
): Promise<{
  winner: RouteInteractionRequest | null;
  localQueuePosition: number | null;
}> {
  const revision = ++coordinationRevision;
  if (!currentSceneScope || !(await OBR.scene.isReady())) {
    displayedMeasurementId = null;
    displayedInteractionKey = null;
    return { winner: null, localQueuePosition: null };
  }

  const items = knownItems ?? await getRouteItems();
  const validMeasurementIds = getMeasurementIds(items);
  const requests = collectInteractionRequests();
  const winner = chooseRouteInteractionWinner(
    requests,
    currentSceneScope,
    validMeasurementIds,
  );
  const localQueuePosition = localRequest
    ? getRouteInteractionQueuePosition(
        localRequest.requestId,
        requests,
        currentSceneScope,
        validMeasurementIds,
      )
    : null;
  if (revision !== coordinationRevision) {
    return { winner, localQueuePosition };
  }

  const canUpdateSharedRoute = await canUpdateSharedRouteItems();
  if (revision !== coordinationRevision) {
    return { winner, localQueuePosition };
  }
  const nextInteractionKey = winner
    ? `${winner.requestId}:${winner.measurementId}:${winner.pointIndex}`
    : null;
  if (nextInteractionKey !== displayedInteractionKey) {
    if (
      canUpdateSharedRoute &&
      displayedMeasurementId &&
      displayedMeasurementId !== winner?.measurementId
    ) {
      await updateRouteLabel(displayedMeasurementId, null);
    }
    if (revision !== coordinationRevision) {
      return { winner, localQueuePosition };
    }
    if (canUpdateSharedRoute && winner) {
      await updateRouteLabel(winner.measurementId, winner.pointIndex);
    }
    if (revision === coordinationRevision) {
      displayedMeasurementId = winner?.measurementId ?? null;
      displayedInteractionKey = nextInteractionKey;
    }
  }

  if (
    localRequestWasQueued &&
    localRequest &&
    winner?.requestId === localRequest.requestId
  ) {
    localRequestWasQueued = false;
    await OBR.notification.show("Agora você pode consultar a régua.", "SUCCESS");
  }
  return { winner, localQueuePosition };
}

function collectInteractionRequests(): RouteInteractionRequest[] {
  const requests = [
    localRequest,
    ...partyPlayers.map((player) =>
      readRouteInteractionRequest(player.metadata[METADATA.interactionRequest]),
    ),
  ].filter((request): request is RouteInteractionRequest => Boolean(request));
  return [...new Map(requests.map((request) => [request.requestId, request])).values()];
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
    draftLabel.style.pointerHeight = ROUTE_LABEL_POINTER_HEIGHT;
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

function getMeasurementIds(items: Item[]): Set<string> {
  return new Set(
    items.flatMap((item) => {
      const metadata = readMeasurementMetadata(item);
      return metadata?.version === 2 ? [metadata.measurementId] : [];
    }),
  );
}

function getVersionTwoRouteItems(items: Item[]): Item[] {
  return items.filter((item) => readMeasurementMetadata(item)?.version === 2);
}

function createRouteSignature(items: Item[]): string {
  return getVersionTwoRouteItems(items)
    .map((item) => item.id)
    .sort()
    .join("|");
}

async function getRouteItems(): Promise<Item[]> {
  return OBR.scene.items.getItems((item) => Boolean(item.metadata[METADATA.measurement]));
}

async function canUpdateSharedRouteItems(): Promise<boolean> {
  const [role, hasUpdatePermission] = await Promise.all([
    OBR.player.getRole(),
    OBR.player.hasPermission("RULER_UPDATE"),
  ]);
  return role === "GM" || hasUpdatePermission;
}
