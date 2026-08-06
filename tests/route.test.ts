import type { Item } from "@owlbear-rodeo/sdk";
import { describe, expect, it } from "vitest";
import { shouldDisableRouteHit } from "../src/measurements/hitBehavior";
import { readMeasurementMetadata } from "../src/measurements/metadata";
import {
  cumulativeRouteDistancesInKilometers,
  findNearestPointIndex,
  getLastPoint,
  isNearPoint,
  routeDistanceInKilometers,
} from "../src/measurements/routeMath";
import { getRouteVisualMetrics } from "../src/measurements/visualStyle";
import { METADATA } from "../src/shared/constants";

describe("rotas com vários trechos", () => {
  it("soma cada trecho em vez de medir apenas do início ao fim", () => {
    const distance = routeDistanceInKilometers(
      [
        { x: 0, y: 0 },
        { x: 3, y: 4 },
        { x: 6, y: 8 },
      ],
      { rotation: 0, scale: { x: 1, y: 1 } },
      2,
    );
    expect(distance).toBeCloseTo(20, 10);
  });

  it("mantém a soma correta com rotação e escala do mapa", () => {
    const distance = routeDistanceInKilometers(
      [
        { x: 0, y: 0 },
        { x: -8, y: 6 },
        { x: -16, y: 12 },
      ],
      { rotation: 90, scale: { x: 2, y: 4 } },
      10,
    );
    expect(distance).toBeCloseTo(2 * Math.sqrt(13) * 10, 10);
  });

  it("converte a tolerância de clique da tela para a escala da cena", () => {
    expect(isNearPoint({ x: 30, y: 0 }, { x: 0, y: 0 }, 0.5, 16)).toBe(true);
    expect(isNearPoint({ x: 33, y: 0 }, { x: 0, y: 0 }, 0.5, 16)).toBe(false);
    expect(isNearPoint({ x: 0, y: 0 }, { x: 0, y: 0 }, 0)).toBe(false);
  });

  it("calcula a distância acumulada desde o primeiro ponto", () => {
    expect(
      cumulativeRouteDistancesInKilometers(
        [
          { x: 0, y: 0 },
          { x: 3, y: 4 },
          { x: 6, y: 8 },
        ],
        { rotation: 0, scale: { x: 1, y: 1 } },
        2,
      ),
    ).toEqual([0, 10, 20]);
  });

  it("encontra de forma consistente qualquer ponto de uma rota A-E", () => {
    const points = [
      { x: 0, y: 0 },
      { x: 100, y: 20 },
      { x: 200, y: 0 },
      { x: 300, y: 20 },
      { x: 400, y: 0 },
    ];
    expect(findNearestPointIndex({ x: 103, y: 18 }, points, 1)).toBe(1);
    expect(findNearestPointIndex({ x: 199, y: 4 }, points, 1)).toBe(2);
    expect(findNearestPointIndex({ x: 297, y: 23 }, points, 1)).toBe(3);
    expect(findNearestPointIndex({ x: 250, y: 80 }, points, 1)).toBeNull();
  });

  it("escolhe o ponto mais próximo quando duas áreas de clique se sobrepõem", () => {
    expect(
      findNearestPointIndex(
        { x: 11, y: 0 },
        [
          { x: 0, y: 0 },
          { x: 18, y: 0 },
        ],
        1,
      ),
    ).toBe(1);
  });

  it("posiciona o rótulo no último ponto", () => {
    expect(
      getLastPoint([
        { x: 1, y: 2 },
        { x: 9, y: 10 },
        { x: 13, y: 20 },
      ]),
    ).toEqual({ x: 13, y: 20 });
  });
});

describe("normalização visual entre mapas", () => {
  it("reduz os itens de Lamnor na proporção de sua largura", () => {
    const arton = getRouteVisualMetrics(3229, 1);
    const lamnor = getRouteVisualMetrics(1215, 1);
    expect(arton.lineWidth).toBe(2);
    expect(lamnor.lineWidth / arton.lineWidth).toBeCloseTo(1215 / 3229, 10);
    expect(lamnor.markerSize / arton.markerSize).toBeCloseTo(1215 / 3229, 10);
  });

  it("preserva o tamanho visual projetado quando cada mapa cabe na mesma largura", () => {
    const arton = getRouteVisualMetrics(3229, 1);
    const lamnor = getRouteVisualMetrics(1215, 1);
    expect(arton.lineWidth * 1).toBeCloseTo(lamnor.lineWidth * (3229 / 1215), 10);
    expect(arton.markerSize * 1).toBeCloseTo(lamnor.markerSize * (3229 / 1215), 10);
  });
});

describe("áreas clicáveis da rota", () => {
  it("deixa somente os pontos capturarem cliques", () => {
    expect(shouldDisableRouteHit("segment", true)).toBe(true);
    expect(shouldDisableRouteHit("waypoint", true)).toBe(false);
    expect(shouldDisableRouteHit("label", true)).toBe(true);
  });

  it("impede que todos os itens da prévia capturem cliques", () => {
    expect(shouldDisableRouteHit("segment", false)).toBe(true);
    expect(shouldDisableRouteHit("waypoint", false)).toBe(true);
    expect(shouldDisableRouteHit("label", false)).toBe(true);
  });
});

describe("metadados persistentes", () => {
  it("lê o formato de rota atual", () => {
    const metadata = {
      version: 2,
      measurementId: "route-1",
      part: "segment",
      partIndex: 0,
      mapId: "arton",
      distanceKilometers: 120,
      travelDays: 4,
      createdAt: "2026-08-06T00:00:00.000Z",
    };
    expect(readMeasurementMetadata(itemWithMetadata(metadata))).toEqual(metadata);
  });

  it("continua reconhecendo medições da versão anterior", () => {
    const metadata = {
      version: 1,
      measurementId: "legacy-1",
      part: "ruler",
      mapId: "lamnor",
      distanceKilometers: 500,
      travelDays: 14,
      createdAt: "2026-08-05T00:00:00.000Z",
    };
    expect(readMeasurementMetadata(itemWithMetadata(metadata))).toEqual(metadata);
  });

  it("ignora itens de outras extensões ou metadados incompletos", () => {
    expect(readMeasurementMetadata(itemWithMetadata({ version: 2 }))).toBeNull();
  });
});

function itemWithMetadata(value: object): Item {
  return {
    metadata: { [METADATA.measurement]: value },
  } as unknown as Item;
}
