import OBR, { buildImageUpload, buildSceneUpload } from "@owlbear-rodeo/sdk";
import { DEFAULT_KM_PER_DAY } from "../shared/constants";
import type { MapId, PendingMapImport } from "../shared/models";
import { calculateKilometersPerPixel } from "../maps/calibration";
import { getMapDefinition } from "../maps/definitions";
import { readImageDimensions } from "./imageDimensions";
import { removePendingImport, savePendingImport } from "./pendingImports";

export async function importMapAsScene(file: File, mapId: MapId): Promise<PendingMapImport> {
  const role = await OBR.player.getRole();
  if (role !== "GM") {
    throw new Error("Apenas o mestre pode importar e calibrar mapas.");
  }

  const dimensions = await readImageDimensions(file);
  const kilometersPerImagePixel = calculateKilometersPerPixel(
    mapId,
    dimensions.width,
    dimensions.height,
  );
  const definition = getMapDefinition(mapId);
  const pendingImport: PendingMapImport = {
    id: crypto.randomUUID(),
    mapId,
    fileName: file.name,
    imageWidth: dimensions.width,
    imageHeight: dimensions.height,
    kilometersPerImagePixel,
    kilometersPerDay: DEFAULT_KM_PER_DAY,
    createdAt: new Date().toISOString(),
  };

  const baseMap = buildImageUpload(file)
    .name(definition.uploadName)
    .description(`Mapa de ${definition.label} importado localmente para a Régua de Viagem.`)
    .scale({ x: 1, y: 1 })
    .locked(true)
    .build();
  const scene = buildSceneUpload()
    .name(definition.sceneName)
    .baseMap(baseMap)
    .thumbnail(file)
    .gridOpacity(0)
    .gridScale("1km")
    .fogFilled(false)
    .build();

  savePendingImport(pendingImport);
  try {
    await OBR.assets.uploadScenes([scene]);
    return pendingImport;
  } catch (error) {
    removePendingImport(pendingImport.id);
    throw error;
  }
}
