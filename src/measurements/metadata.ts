import type { Item } from "@owlbear-rodeo/sdk";
import { METADATA } from "../shared/constants";
import type { MeasurementMetadata } from "../shared/models";

export function readMeasurementMetadata(item: Item): MeasurementMetadata | null {
  const value = item.metadata[METADATA.measurement];
  if (!value || typeof value !== "object") {
    return null;
  }
  const candidate = value as Partial<MeasurementMetadata>;
  if (!hasCommonMetadata(candidate)) {
    return null;
  }

  if (
    candidate.version === 1 &&
    (candidate.part === "ruler" ||
      candidate.part === "start-marker" ||
      candidate.part === "end-marker")
  ) {
    return candidate as MeasurementMetadata;
  }

  if (
    candidate.version === 2 &&
    (candidate.part === "segment" || candidate.part === "waypoint" || candidate.part === "label") &&
    typeof candidate.partIndex === "number"
  ) {
    return candidate as MeasurementMetadata;
  }

  return null;
}

function hasCommonMetadata(candidate: Partial<MeasurementMetadata>): boolean {
  return (
    (candidate.version === 1 || candidate.version === 2) &&
    typeof candidate.measurementId === "string" &&
    (candidate.mapId === "arton" || candidate.mapId === "lamnor") &&
    typeof candidate.distanceKilometers === "number" &&
    typeof candidate.travelDays === "number" &&
    typeof candidate.createdAt === "string"
  );
}
