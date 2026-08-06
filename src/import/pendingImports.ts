import { PENDING_IMPORTS_STORAGE_KEY } from "../shared/constants";
import type { PendingMapImport } from "../shared/models";

export function getPendingImports(): PendingMapImport[] {
  try {
    const stored = localStorage.getItem(PENDING_IMPORTS_STORAGE_KEY);
    if (!stored) {
      return [];
    }
    const parsed: unknown = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed.filter(isPendingMapImport) : [];
  } catch {
    return [];
  }
}

export function savePendingImport(pendingImport: PendingMapImport): void {
  const imports = getPendingImports().filter((entry) => entry.id !== pendingImport.id);
  imports.push(pendingImport);
  localStorage.setItem(PENDING_IMPORTS_STORAGE_KEY, JSON.stringify(imports));
}

export function removePendingImport(id: string): void {
  const imports = getPendingImports().filter((entry) => entry.id !== id);
  localStorage.setItem(PENDING_IMPORTS_STORAGE_KEY, JSON.stringify(imports));
}

function isPendingMapImport(value: unknown): value is PendingMapImport {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value as Partial<PendingMapImport>;
  return (
    typeof candidate.id === "string" &&
    (candidate.mapId === "arton" || candidate.mapId === "lamnor") &&
    typeof candidate.imageWidth === "number" &&
    typeof candidate.imageHeight === "number" &&
    typeof candidate.kilometersPerImagePixel === "number" &&
    typeof candidate.kilometersPerDay === "number"
  );
}
