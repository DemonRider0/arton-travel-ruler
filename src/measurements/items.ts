import {
  buildLabel,
  buildLine,
  buildShape,
  type Item,
  type Label,
  type Line,
  type Shape,
  type Vector2,
} from "@owlbear-rodeo/sdk";
import { MEASUREMENT_COLORS, METADATA } from "../shared/constants";
import type {
  MapId,
  RouteMeasurementMetadata,
  RoutePointMeasurement,
} from "../shared/models";
import { formatMeasurementLabel } from "./format";
import { getLastPoint } from "./routeMath";
import {
  ROUTE_LABEL_POINTER_HEIGHT,
  type RouteVisualMetrics,
} from "./visualStyle";

export interface RouteVisuals {
  items: Item[];
  segmentIds: string[];
  markerIds: string[];
  labelId: string;
}

interface BuildRouteVisualsOptions {
  points: Vector2[];
  distanceKilometers: number;
  travelDays: number;
  mapId: MapId;
  measurementId: string;
  createdAt: string;
  persistent: boolean;
  kilometersPerDay: number;
  pointMeasurements: RoutePointMeasurement[];
  visualMetrics: RouteVisualMetrics;
}

export function buildRouteVisuals(options: BuildRouteVisualsOptions): RouteVisuals {
  if (options.points.length === 0) {
    throw new Error("Uma rota precisa de pelo menos um ponto.");
  }

  const segments = options.points.slice(1).map((end, index) =>
    buildSegment(options.points[index]!, end, options, index),
  );
  const markers = options.points.map((point, index) =>
    buildMarker(point, options, index),
  );
  const label = buildRouteLabel(options);
  const segmentItems = segments.map((builder) => builder.build());
  const markerItems = markers.map((builder) => builder.build());
  const labelItem = label.build();

  return {
    items: [...segmentItems, ...markerItems, labelItem],
    segmentIds: segmentItems.map((item) => item.id),
    markerIds: markerItems.map((item) => item.id),
    labelId: labelItem.id,
  };
}

function buildSegment(
  start: Vector2,
  end: Vector2,
  options: BuildRouteVisualsOptions,
  index: number,
): ReturnType<typeof buildLine> {
  const builder = buildLine()
    .name(`Trecho ${index + 1} da rota`)
    .startPosition(start)
    .endPosition(end)
    .strokeColor(MEASUREMENT_COLORS.line)
    .strokeOpacity(1)
    .strokeWidth(options.visualMetrics.lineWidth)
    .strokeDash(options.visualMetrics.lineDash)
    .layer("RULER")
    .locked(true)
    .disableHit(!options.persistent);
  addMetadata(builder, options, "segment", index, options.pointMeasurements[index + 1]);
  return builder;
}

function buildMarker(
  position: Vector2,
  options: BuildRouteVisualsOptions,
  index: number,
): ReturnType<typeof buildShape> {
  const builder = buildShape()
    .name(`Ponto ${index + 1} da rota`)
    .position(position)
    .width(options.visualMetrics.markerSize)
    .height(options.visualMetrics.markerSize)
    .shapeType("CIRCLE")
    .fillColor(MEASUREMENT_COLORS.markerFill)
    .fillOpacity(1)
    .strokeColor(MEASUREMENT_COLORS.markerStroke)
    .strokeOpacity(1)
    .strokeWidth(options.visualMetrics.markerStrokeWidth)
    .layer("RULER")
    .locked(true)
    .disableHit(!options.persistent);
  addMetadata(builder, options, "waypoint", index, options.pointMeasurements[index]);
  return builder;
}

function buildRouteLabel(options: BuildRouteVisualsOptions): ReturnType<typeof buildLabel> {
  const builder = buildLabel()
    .name("Distância e duração da rota")
    .position(getLastPoint(options.points))
    .plainText(formatMeasurementLabel(options.distanceKilometers, options.travelDays))
    .fontSize(14)
    .fontWeight(500)
    .lineHeight(1.15)
    .padding(4)
    .fillColor(MEASUREMENT_COLORS.labelText)
    .backgroundColor(MEASUREMENT_COLORS.labelBackground)
    .backgroundOpacity(0.96)
    .cornerRadius(6)
    .pointerDirection("DOWN")
    .pointerWidth(7)
    .pointerHeight(ROUTE_LABEL_POINTER_HEIGHT)
    .layer("RULER")
    .locked(true)
    .disableHit(!options.persistent);
  addMetadata(builder, options, "label", 0);
  return builder;
}

function addMetadata(
  builder: ReturnType<typeof buildLine | typeof buildShape | typeof buildLabel>,
  options: BuildRouteVisualsOptions,
  part: RouteMeasurementMetadata["part"],
  partIndex: number,
  pointMeasurement?: RoutePointMeasurement,
): void {
  if (!options.persistent) {
    return;
  }
  const metadata: RouteMeasurementMetadata = {
    version: 2,
    measurementId: options.measurementId,
    part,
    partIndex,
    mapId: options.mapId,
    distanceKilometers: options.distanceKilometers,
    travelDays: options.travelDays,
    kilometersPerDay: options.kilometersPerDay,
    cumulativeDistanceKilometers: pointMeasurement?.distanceKilometers,
    cumulativeTravelDays: pointMeasurement?.travelDays,
    createdAt: options.createdAt,
  };
  builder.metadata({ [METADATA.measurement]: metadata });
}

export function isLineItem(item: Item): item is Line {
  return item.type === "LINE";
}

export function isShapeItem(item: Item): item is Shape {
  return item.type === "SHAPE";
}

export function isLabelItem(item: Item): item is Label {
  return item.type === "LABEL";
}
