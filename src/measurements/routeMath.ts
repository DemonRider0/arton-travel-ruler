import type { Vector2 } from "@owlbear-rodeo/sdk";
import {
  distanceInKilometers,
  type ImageTransform,
} from "../maps/calibration";

export function routeDistanceInKilometers(
  points: Vector2[],
  transform: ImageTransform,
  kilometersPerImagePixel: number,
): number {
  let total = 0;
  for (let index = 1; index < points.length; index += 1) {
    total += distanceInKilometers(
      points[index - 1]!,
      points[index]!,
      transform,
      kilometersPerImagePixel,
    );
  }
  return total;
}

export function cumulativeRouteDistancesInKilometers(
  points: Vector2[],
  transform: ImageTransform,
  kilometersPerImagePixel: number,
): number[] {
  const distances = [0];
  for (let index = 1; index < points.length; index += 1) {
    const segmentDistance = distanceInKilometers(
      points[index - 1]!,
      points[index]!,
      transform,
      kilometersPerImagePixel,
    );
    distances.push(distances[index - 1]! + segmentDistance);
  }
  return distances;
}

export function isNearPoint(
  point: Vector2,
  target: Vector2,
  viewportScale: number,
  toleranceInScreenPixels = 16,
): boolean {
  if (!Number.isFinite(viewportScale) || viewportScale <= 0) {
    return false;
  }
  const worldTolerance = toleranceInScreenPixels / viewportScale;
  return Math.hypot(point.x - target.x, point.y - target.y) <= worldTolerance;
}

export function findNearestPointIndex(
  point: Vector2,
  candidates: Vector2[],
  viewportScale: number,
  toleranceInScreenPixels = 20,
): number | null {
  if (!Number.isFinite(viewportScale) || viewportScale <= 0) {
    return null;
  }

  const worldTolerance = toleranceInScreenPixels / viewportScale;
  const maximumDistanceSquared = worldTolerance * worldTolerance;
  let nearestIndex: number | null = null;
  let nearestDistanceSquared = Number.POSITIVE_INFINITY;

  candidates.forEach((candidate, index) => {
    const deltaX = point.x - candidate.x;
    const deltaY = point.y - candidate.y;
    const distanceSquared = deltaX * deltaX + deltaY * deltaY;
    if (
      distanceSquared <= maximumDistanceSquared &&
      distanceSquared < nearestDistanceSquared
    ) {
      nearestIndex = index;
      nearestDistanceSquared = distanceSquared;
    }
  });

  return nearestIndex;
}

export function getLastPoint(points: Vector2[]): Vector2 {
  return points.at(-1) ?? { x: 0, y: 0 };
}
