import {
  buildRuler,
  buildShape,
  type Item,
  type Shape,
  type Vector2,
} from "@owlbear-rodeo/sdk";
import { MEASUREMENT_COLORS, METADATA } from "../shared/constants";
import type { MapId, MeasurementMetadata } from "../shared/models";
import { formatMeasurement } from "./format";

const MARKER_SIZE = 18;

export interface MeasurementVisuals {
  items: Item[];
  rulerId: string;
  startMarkerId: string;
  endMarkerId: string;
}

interface BuildVisualsOptions {
  start: Vector2;
  end: Vector2;
  distanceKilometers: number;
  travelDays: number;
  mapId: MapId;
  measurementId: string;
  createdAt: string;
  persistent: boolean;
}

export function buildMeasurementVisuals(options: BuildVisualsOptions): MeasurementVisuals {
  const label = formatMeasurement(options.distanceKilometers, options.travelDays);
  const ruler = buildRuler()
    .name("Distância de viagem")
    .startPosition(options.start)
    .endPosition(options.end)
    .measurement(label)
    .variant("DASHED")
    .locked(true)
    .disableHit(true);
  const startMarker = buildMarker(options.start, "Início da viagem");
  const endMarker = buildMarker(options.end, "Fim da viagem");

  if (options.persistent) {
    ruler.metadata({
      [METADATA.measurement]: buildMetadata(options, "ruler"),
    });
    startMarker.metadata({
      [METADATA.measurement]: buildMetadata(options, "start-marker"),
    });
    endMarker.metadata({
      [METADATA.measurement]: buildMetadata(options, "end-marker"),
    });
  }

  const rulerItem = ruler.build();
  const startMarkerItem = startMarker.build();
  const endMarkerItem = endMarker.build();

  return {
    items: [rulerItem, startMarkerItem, endMarkerItem],
    rulerId: rulerItem.id,
    startMarkerId: startMarkerItem.id,
    endMarkerId: endMarkerItem.id,
  };
}

function buildMarker(position: Vector2, name: string): ReturnType<typeof buildShape> {
  return buildShape()
    .name(name)
    .position(position)
    .width(MARKER_SIZE)
    .height(MARKER_SIZE)
    .shapeType("CIRCLE")
    .fillColor(MEASUREMENT_COLORS.markerFill)
    .fillOpacity(1)
    .strokeColor(MEASUREMENT_COLORS.markerStroke)
    .strokeOpacity(1)
    .strokeWidth(3)
    .layer("RULER")
    .locked(true)
    .disableHit(true);
}

function buildMetadata(
  options: BuildVisualsOptions,
  part: MeasurementMetadata["part"],
): MeasurementMetadata {
  return {
    version: 1,
    measurementId: options.measurementId,
    part,
    mapId: options.mapId,
    distanceKilometers: options.distanceKilometers,
    travelDays: options.travelDays,
    createdAt: options.createdAt,
  };
}

export function isShapeItem(item: Item): item is Shape {
  return item.type === "SHAPE";
}
