const BASE_URL = import.meta.env.VITE_API_URL ?? "";

async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API ${path} → ${res.status}: ${body}`);
  }
  return res.json();
}

export const fetchCities = () => request("/api/cities");
export const fetchCityConfig = (city) => request(`/api/cities/${encodeURIComponent(city)}/config`);
export const fetchHotspots = (city) => request(`/api/cities/${encodeURIComponent(city)}/hotspots`);
export const fetchScenarios = () => request("/api/scenarios");
export const fetchOptimizationResult = () => request("/api/optimization");
export const fetchModelMetrics = () => request("/api/model-metrics");

export const runOptimization = (city, budget) =>
  request("/api/optimization/run", {
    method: "POST",
    body: JSON.stringify({ city, budget }),
  });
