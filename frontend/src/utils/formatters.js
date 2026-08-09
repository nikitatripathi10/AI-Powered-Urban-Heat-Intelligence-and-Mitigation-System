export function parsePopulation(value) {
  if (value == null || value === "") return 0;
  if (typeof value === "number" && !Number.isNaN(value)) return value;
  const num = Number(String(value).replace(/K/gi, "").trim());
  return Number.isNaN(num) ? 0 : num;
}

export function formatPopulation(value) {
  return `${Math.round(parsePopulation(value))}K`;
}

export function formatTemperature(value) {
  const num = Number(value);
  return Number.isNaN(num) ? "—°C" : `${num.toFixed(1)}°C`;
}

export function formatRisk(value) {
  const num = Math.round(Number(value));
  return Number.isNaN(num) ? "—" : String(Math.max(0, Math.min(100, num)));
}
