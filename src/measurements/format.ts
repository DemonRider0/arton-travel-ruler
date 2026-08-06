export function formatDistance(distanceKilometers: number): string {
  const rounded = Math.round(distanceKilometers);
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(rounded);
}

export function formatMeasurement(distanceKilometers: number, travelDays: number): string {
  const dayLabel = travelDays === 1 ? "dia" : "dias";
  return `${formatDistance(distanceKilometers)} km • ${travelDays} ${dayLabel}`;
}

export function formatMeasurementLabel(
  distanceKilometers: number,
  travelDays: number,
): string {
  const dayLabel = travelDays === 1 ? "dia" : "dias";
  return `${formatDistance(distanceKilometers)} km\n◷ ${travelDays} ${dayLabel}`;
}
