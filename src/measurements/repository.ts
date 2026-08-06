import OBR, { type Item } from "@owlbear-rodeo/sdk";
import { METADATA } from "../shared/constants";
import type { MeasurementMetadata } from "../shared/models";
import { readMeasurementMetadata } from "./metadata";

export async function deleteLastMeasurement(): Promise<number> {
  const entries = await getMeasurementEntries();
  if (entries.length === 0) {
    return 0;
  }

  const latest = entries.reduce((current, candidate) =>
    candidate.metadata.createdAt > current.metadata.createdAt ? candidate : current,
  );
  const ids = entries
    .filter((entry) => entry.metadata.measurementId === latest.metadata.measurementId)
    .map((entry) => entry.item.id);
  await OBR.scene.items.deleteItems(ids);
  return ids.length;
}

export async function deleteAllMeasurements(): Promise<number> {
  const entries = await getMeasurementEntries();
  const ids = entries.map((entry) => entry.item.id);
  if (ids.length > 0) {
    await OBR.scene.items.deleteItems(ids);
  }
  return ids.length;
}

export async function deleteMeasurementsSelected(items: Item[]): Promise<number> {
  const measurementIds = new Set(
    items.flatMap((item) => {
      const metadata = readMeasurementMetadata(item);
      return metadata ? [metadata.measurementId] : [];
    }),
  );
  if (measurementIds.size === 0) {
    return 0;
  }

  const entries = await getMeasurementEntries();
  const ids = entries
    .filter((entry) => measurementIds.has(entry.metadata.measurementId))
    .map((entry) => entry.item.id);
  if (ids.length > 0) {
    await OBR.scene.items.deleteItems(ids);
  }
  return ids.length;
}

async function getMeasurementEntries(): Promise<
  Array<{ item: Item; metadata: MeasurementMetadata }>
> {
  const items = await OBR.scene.items.getItems((item) => Boolean(item.metadata[METADATA.measurement]));
  return items.flatMap((item) => {
    const metadata = readMeasurementMetadata(item);
    return metadata ? [{ item, metadata }] : [];
  });
}
