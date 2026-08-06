import OBR, { isImage, type Image, type Metadata } from "@owlbear-rodeo/sdk";
import { METADATA } from "../shared/constants";
import type { MapCalibration, MapId, PendingMapImport } from "../shared/models";
import { createCalibration } from "../maps/calibration";
import { getMapDefinition } from "../maps/definitions";
import { getPendingImports, removePendingImport } from "../import/pendingImports";

export function readCalibration(metadata: Metadata): MapCalibration | null {
  const value = metadata[METADATA.calibration];
  if (!value || typeof value !== "object") {
    return null;
  }
  const candidate = value as Partial<MapCalibration>;
  if (
    candidate.version !== 1 ||
    (candidate.mapId !== "arton" && candidate.mapId !== "lamnor") ||
    typeof candidate.mapItemId !== "string" ||
    typeof candidate.imageWidth !== "number" ||
    typeof candidate.imageHeight !== "number" ||
    typeof candidate.kilometersPerImagePixel !== "number" ||
    typeof candidate.kilometersPerDay !== "number"
  ) {
    return null;
  }
  return candidate as MapCalibration;
}

export async function getSceneCalibration(): Promise<MapCalibration | null> {
  if (!(await OBR.scene.isReady())) {
    return null;
  }
  return readCalibration(await OBR.scene.getMetadata());
}

export async function saveSceneCalibration(calibration: MapCalibration): Promise<void> {
  await OBR.scene.setMetadata({ [METADATA.calibration]: calibration });
}

export async function applyPendingCalibration(): Promise<MapCalibration | null> {
  if (!(await OBR.scene.isReady())) {
    return null;
  }

  const existing = await getSceneCalibration();
  if (existing) {
    return existing;
  }
  if ((await OBR.player.getRole()) !== "GM") {
    return null;
  }

  const mapItems = await getMapImages();
  const pendingImports = getPendingImports().sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  for (const pendingImport of pendingImports) {
    const definition = getMapDefinition(pendingImport.mapId);
    const mapItem = mapItems.find(
      (item) =>
        item.name === definition.uploadName &&
        item.image.width === pendingImport.imageWidth &&
        item.image.height === pendingImport.imageHeight,
    );
    if (!mapItem) {
      continue;
    }

    const calibration = calibrationForMapItem(pendingImport.mapId, mapItem, pendingImport);
    await saveSceneCalibration(calibration);
    removePendingImport(pendingImport.id);
    await OBR.notification.show(
      `${definition.label} calibrado: ${pendingImport.imageWidth}×${pendingImport.imageHeight}px.`,
      "SUCCESS",
    );
    return calibration;
  }

  return null;
}

export async function calibrateCurrentScene(mapId: MapId): Promise<MapCalibration> {
  if (!(await OBR.scene.isReady())) {
    throw new Error("Abra uma cena antes de calibrar o mapa.");
  }
  if ((await OBR.player.getRole()) !== "GM") {
    throw new Error("Apenas o mestre pode calibrar a cena.");
  }

  const mapItems = await getMapImages();
  const preferredName = getMapDefinition(mapId).uploadName;
  const mapItem = mapItems.find((item) => item.name === preferredName) ?? mapItems[0];
  if (!mapItem) {
    throw new Error("A cena atual não possui uma imagem na camada MAP.");
  }

  const current = await getSceneCalibration();
  const calibration = createCalibration(
    mapId,
    mapItem.id,
    mapItem.image.width,
    mapItem.image.height,
    current?.kilometersPerDay,
  );
  await saveSceneCalibration(calibration);
  return calibration;
}

export async function updateTravelSpeed(kilometersPerDay: number): Promise<MapCalibration> {
  const calibration = await getSceneCalibration();
  if (!calibration) {
    throw new Error("A cena ainda não está calibrada.");
  }
  if (!Number.isFinite(kilometersPerDay) || kilometersPerDay <= 0) {
    throw new Error("Informe uma velocidade maior que zero.");
  }
  const updated = { ...calibration, kilometersPerDay };
  await saveSceneCalibration(updated);
  return updated;
}

export async function getCalibratedMapItem(calibration: MapCalibration): Promise<Image> {
  const items = await OBR.scene.items.getItems(
    (item): item is Image => isImage(item) && item.id === calibration.mapItemId,
  );
  const mapItem = items[0];
  if (!mapItem) {
    throw new Error("O mapa calibrado não está mais presente na cena.");
  }
  return mapItem;
}

async function getMapImages(): Promise<Image[]> {
  return OBR.scene.items.getItems((item): item is Image => isImage(item) && item.layer === "MAP");
}

function calibrationForMapItem(
  mapId: MapId,
  item: Image,
  pendingImport: PendingMapImport,
): MapCalibration {
  return createCalibration(
    mapId,
    item.id,
    item.image.width,
    item.image.height,
    pendingImport.kilometersPerDay,
  );
}
