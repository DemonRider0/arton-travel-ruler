import type { Item } from "@owlbear-rodeo/sdk";
import { describe, expect, it } from "vitest";
import { readMeasurementMetadata } from "../src/measurements/metadata";
import {
  cumulativeRouteDistancesInKilometers,
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
