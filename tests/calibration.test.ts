import { describe, expect, it } from "vitest";
import {
  calculateKilometersPerPixel,
  calculateTravelDays,
  distanceInKilometers,
  worldVectorToImageVector,
} from "../src/maps/calibration";

describe("calibração dos mapas", () => {
  it("usa a barra de 1000 km do mapa de Arton", () => {
    expect(calculateKilometersPerPixel("arton", 3229, 2166)).toBeCloseTo(1000 / 394, 10);
  });

  it("usa a barra de 1000 km do mapa de Lamnor", () => {
    expect(calculateKilometersPerPixel("lamnor", 1215, 991)).toBeCloseTo(1000 / 147, 10);
  });

  it("mantém a distância em uma cópia redimensionada proporcionalmente", () => {
    const original = calculateKilometersPerPixel("arton", 3229, 2166);
    const doubled = calculateKilometersPerPixel("arton", 6458, 4332);
    expect(doubled).toBeCloseTo(original / 2, 10);
  });

  it("rejeita uma imagem com recorte ou proporção incompatível", () => {
    expect(() => calculateKilometersPerPixel("arton", 2000, 2000)).toThrow(/proporção/i);
  });
});

describe("matemática da régua", () => {
  it("calcula uma distância euclidiana 3-4-5", () => {
    const distance = distanceInKilometers(
      { x: 10, y: 20 },
      { x: 13, y: 24 },
      { rotation: 0, scale: { x: 1, y: 1 } },
      2,
    );
    expect(distance).toBeCloseTo(10, 10);
  });

  it("desfaz escala e rotação do item de mapa", () => {
    const imageVector = worldVectorToImageVector(
      { x: -8, y: 6 },
      { rotation: 90, scale: { x: 2, y: 4 } },
    );
    expect(imageVector.x).toBeCloseTo(3, 10);
    expect(imageVector.y).toBeCloseTo(2, 10);
  });

  it("calcula a distância correta com escala não uniforme e rotação", () => {
    const distance = distanceInKilometers(
      { x: 0, y: 0 },
      { x: -8, y: 6 },
      { rotation: 90, scale: { x: 2, y: 4 } },
      10,
    );
    expect(distance).toBeCloseTo(Math.sqrt(13) * 10, 10);
  });

  it("arredonda dias para cima e preserva distância zero", () => {
    expect(calculateTravelDays(0, 36)).toBe(0);
    expect(calculateTravelDays(36, 36)).toBe(1);
    expect(calculateTravelDays(36.01, 36)).toBe(2);
  });

  it("rejeita velocidade de viagem inválida", () => {
    expect(() => calculateTravelDays(10, 0)).toThrow(/positivo/i);
  });
});
