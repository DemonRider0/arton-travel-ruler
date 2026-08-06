export interface RouteInteractionRequest {
  version: 1;
  requestId: string;
  sceneScope: string;
  measurementId: string;
  pointIndex: number;
  requestedAt: number;
  connectionId: string;
  playerName: string;
}

export function readRouteInteractionRequest(value: unknown): RouteInteractionRequest | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const candidate = value as Partial<RouteInteractionRequest>;
  if (
    candidate.version !== 1 ||
    typeof candidate.requestId !== "string" ||
    typeof candidate.sceneScope !== "string" ||
    typeof candidate.measurementId !== "string" ||
    !Number.isInteger(candidate.pointIndex) ||
    (candidate.pointIndex ?? -1) < 0 ||
    typeof candidate.requestedAt !== "number" ||
    !Number.isFinite(candidate.requestedAt) ||
    typeof candidate.connectionId !== "string" ||
    typeof candidate.playerName !== "string"
  ) {
    return null;
  }
  return candidate as RouteInteractionRequest;
}

export function chooseRouteInteractionWinner(
  requests: RouteInteractionRequest[],
  sceneScope: string,
  validMeasurementIds: ReadonlySet<string>,
): RouteInteractionRequest | null {
  const eligible = requests.filter(
    (request) =>
      request.sceneScope === sceneScope && validMeasurementIds.has(request.measurementId),
  );
  eligible.sort(compareRouteInteractionRequests);
  return eligible[0] ?? null;
}

export function getRouteInteractionQueuePosition(
  requestId: string,
  requests: RouteInteractionRequest[],
  sceneScope: string,
  validMeasurementIds: ReadonlySet<string>,
): number | null {
  const eligible = requests
    .filter(
      (request) =>
        request.sceneScope === sceneScope && validMeasurementIds.has(request.measurementId),
    )
    .sort(compareRouteInteractionRequests);
  const index = eligible.findIndex((request) => request.requestId === requestId);
  return index < 0 ? null : index + 1;
}

function compareRouteInteractionRequests(
  left: RouteInteractionRequest,
  right: RouteInteractionRequest,
): number {
  return left.requestedAt - right.requestedAt || left.requestId.localeCompare(right.requestId);
}
