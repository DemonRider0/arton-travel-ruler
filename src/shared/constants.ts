export const EXTENSION_ID = "com.demonrider.arton-travel-ruler";

export const IDS = {
  tool: `${EXTENSION_ID}/tool`,
  measureMode: `${EXTENSION_ID}/mode/measure`,
  cancelAction: `${EXTENSION_ID}/action/cancel`,
  deleteLastAction: `${EXTENSION_ID}/action/delete-last`,
  deleteAllAction: `${EXTENSION_ID}/action/delete-all`,
} as const;

export const METADATA = {
  calibration: `${EXTENSION_ID}/calibration`,
  measurement: `${EXTENSION_ID}/measurement`,
} as const;

export const MEASUREMENT_COLORS = {
  line: "#F5C451",
  markerFill: "#4B2A68",
  markerStroke: "#FFFFFF",
} as const;

export const DEFAULT_KM_PER_DAY = 36;
export const PENDING_IMPORTS_STORAGE_KEY = `${EXTENSION_ID}/pending-imports`;
