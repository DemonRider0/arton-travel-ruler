import type { Vector2 } from "@owlbear-rodeo/sdk";

export type MapId = "arton" | "lamnor";

export interface MapDefinition {
  id: MapId;
  label: string;
  sceneName: string;
  uploadName: string;
  referenceWidth: number;
  referenceHeight: number;
  scaleBarPixels: number;
  scaleBarKilometers: number;
}

export interface MapCalibration {
  version: 1;
  mapId: MapId;
  mapLabel: string;
  mapItemId: string;
  imageWidth: number;
  imageHeight: number;
  kilometersPerImagePixel: number;
  kilometersPerDay: number;
  calibratedAt: string;
}

export interface PendingMapImport {
  id: string;
  mapId: MapId;
  fileName: string;
  imageWidth: number;
  imageHeight: number;
  kilometersPerImagePixel: number;
  kilometersPerDay: number;
  createdAt: string;
}

export interface LegacyMeasurementMetadata {
  version: 1;
  measurementId: string;
  part: "ruler" | "start-marker" | "end-marker";
  mapId: MapId;
  distanceKilometers: number;
  travelDays: number;
  createdAt: string;
}

export interface RouteMeasurementMetadata {
  version: 2;
  measurementId: string;
  part: "segment" | "waypoint" | "label";
  partIndex: number;
  mapId: MapId;
  distanceKilometers: number;
  travelDays: number;
  createdAt: string;
}

export type MeasurementMetadata = LegacyMeasurementMetadata | RouteMeasurementMetadata;

export interface MeasurementPoints {
  start: Vector2;
  end: Vector2;
}
