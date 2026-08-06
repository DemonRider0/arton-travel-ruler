import type { MapDefinition, MapId } from "../shared/models";

/**
 * Cadastro central de mapas. Novos mapas entram aqui e não exigem mudanças na
 * matemática, na persistência ou na ferramenta de medição.
 *
 * Os comprimentos abaixo foram medidos nas barras de escala das imagens
 * oficiais fornecidas para o projeto.
 */
export const MAP_DEFINITIONS: Record<MapId, MapDefinition> = {
  arton: {
    id: "arton",
    label: "Arton",
    sceneName: "Arton — Régua de Viagem",
    uploadName: "[Régua de Viagem] Mapa de Arton",
    referenceWidth: 3229,
    referenceHeight: 2166,
    scaleBarPixels: 394,
    scaleBarKilometers: 1000,
  },
  lamnor: {
    id: "lamnor",
    label: "Lamnor",
    sceneName: "Lamnor — Régua de Viagem",
    uploadName: "[Régua de Viagem] Mapa de Lamnor",
    referenceWidth: 1215,
    referenceHeight: 991,
    scaleBarPixels: 147,
    scaleBarKilometers: 1000,
  },
};

export const MAP_IDS = Object.keys(MAP_DEFINITIONS) as MapId[];

export function getMapDefinition(mapId: MapId): MapDefinition {
  return MAP_DEFINITIONS[mapId];
}
