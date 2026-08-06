import type { RouteMeasurementMetadata } from "../shared/models";

export function shouldDisableRouteHit(
  part: RouteMeasurementMetadata["part"],
  persistent: boolean,
): boolean {
  return !persistent || part !== "waypoint";
}
