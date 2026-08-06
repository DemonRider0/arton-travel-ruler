const REFERENCE_MAP_WORLD_WIDTH = 3229;
const MIN_VISUAL_SCALE = 0.2;

export const ROUTE_LABEL_POINTER_HEIGHT = 16;

export interface RouteVisualMetrics {
  lineWidth: number;
  lineDash: number[];
  markerSize: number;
  markerStrokeWidth: number;
}

export function getRouteVisualMetrics(
  imageWidth: number,
  mapScaleX: number,
): RouteVisualMetrics {
  if (!Number.isFinite(imageWidth) || imageWidth <= 0) {
    throw new Error("A largura do mapa deve ser positiva.");
  }
  if (!Number.isFinite(mapScaleX) || mapScaleX === 0) {
    throw new Error("A escala horizontal do mapa não pode ser zero.");
  }

  const visualScale = Math.max(
    (imageWidth * Math.abs(mapScaleX)) / REFERENCE_MAP_WORLD_WIDTH,
    MIN_VISUAL_SCALE,
  );
  return {
    lineWidth: 2 * visualScale,
    lineDash: [8 * visualScale, 6 * visualScale],
    markerSize: 9 * visualScale,
    markerStrokeWidth: 1.25 * visualScale,
  };
}
