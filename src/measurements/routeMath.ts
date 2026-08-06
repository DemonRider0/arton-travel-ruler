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

export function getLastSegmentMidpoint(points: Vector2[]): Vector2 {
  const end = points.at(-1) ?? { x: 0, y: 0 };
  const start = points.at(-2) ?? end;
  return {
    x: (start.x + end.x) / 2,
    y: (start.y + end.y) / 2,
  };
}
