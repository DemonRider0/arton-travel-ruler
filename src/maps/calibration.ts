import type { Image, Vector2 } from "@owlbear-rodeo/sdk";
import { DEFAULT_KM_PER_DAY } from "../shared/constants";
import type { MapCalibration, MapId } from "../shared/models";
import { getMapDefinition } from "./definitions";

const ASPECT_RATIO_TOLERANCE = 0.015;

export interface ImageTransform {
  rotation: number;
  scale: Vector2;
}

export function calculateKilometersPerPixel(
  mapId: MapId,
  imageWidth: number,
  imageHeight: number,
): number {
  assertPositiveFinite(imageWidth, "largura");
  assertPositiveFinite(imageHeight, "altura");

  const definition = getMapDefinition(mapId);
  const widthRatio = imageWidth / definition.referenceWidth;
  const heightRatio = imageHeight / definition.referenceHeight;
  const ratioDifference = Math.abs(widthRatio - heightRatio) / Math.max(widthRatio, heightRatio);

  if (ratioDifference > ASPECT_RATIO_TOLERANCE) {
    throw new Error(
      `A proporção da imagem não corresponde ao mapa de ${definition.label}. ` +
        `Esperado aproximadamente ${definition.referenceWidth}×${definition.referenceHeight}.`,
    );
  }

  const resizeFactor = (widthRatio + heightRatio) / 2;
  const referenceKilometersPerPixel = definition.scaleBarKilometers / definition.scaleBarPixels;
  return referenceKilometersPerPixel / resizeFactor;
}

export function createCalibration(
  mapId: MapId,
  mapItemId: string,
  imageWidth: number,
  imageHeight: number,
  kilometersPerDay = DEFAULT_KM_PER_DAY,
): MapCalibration {
  assertPositiveFinite(kilometersPerDay, "quilômetros por dia");
  const definition = getMapDefinition(mapId);

  return {
    version: 1,
    mapId,
    mapLabel: definition.label,
    mapItemId,
    imageWidth,
    imageHeight,
    kilometersPerImagePixel: calculateKilometersPerPixel(mapId, imageWidth, imageHeight),
    kilometersPerDay,
    calibratedAt: new Date().toISOString(),
  };
}

export function worldVectorToImageVector(vector: Vector2, transform: ImageTransform): Vector2 {
  assertScale(transform.scale.x, "x");
  assertScale(transform.scale.y, "y");

  const angle = (-transform.rotation * Math.PI) / 180;
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);
  const unrotatedX = vector.x * cosine - vector.y * sine;
  const unrotatedY = vector.x * sine + vector.y * cosine;

  return {
    x: unrotatedX / transform.scale.x,
    y: unrotatedY / transform.scale.y,
  };
}

export function distanceInKilometers(
  start: Vector2,
  end: Vector2,
  transform: ImageTransform,
  kilometersPerImagePixel: number,
): number {
  assertPositiveFinite(kilometersPerImagePixel, "quilômetros por pixel");
  const worldVector = { x: end.x - start.x, y: end.y - start.y };
  const imageVector = worldVectorToImageVector(worldVector, transform);
  return Math.hypot(imageVector.x, imageVector.y) * kilometersPerImagePixel;
}

export function calculateTravelDays(distanceKilometers: number, kilometersPerDay: number): number {
  if (!Number.isFinite(distanceKilometers) || distanceKilometers < 0) {
    throw new Error("A distância deve ser um número finito e não negativo.");
  }
  assertPositiveFinite(kilometersPerDay, "quilômetros por dia");
  return distanceKilometers === 0 ? 0 : Math.ceil(distanceKilometers / kilometersPerDay);
}

export function getImageTransform(image: Image): ImageTransform {
  return { rotation: image.rotation, scale: image.scale };
}

function assertPositiveFinite(value: number, field: string): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`O valor de ${field} deve ser um número positivo.`);
  }
}

function assertScale(value: number, axis: string): void {
  if (!Number.isFinite(value) || value === 0) {
    throw new Error(`A escala ${axis} do mapa não pode ser zero.`);
  }
}
