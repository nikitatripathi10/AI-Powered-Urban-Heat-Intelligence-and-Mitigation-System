const RECOMMENDATIONS = {
  extreme: [
    "Deploy 24/7 cooling shelters immediately",
    "Issue emergency heat-health alerts to residents",
    "Activate mobile cooling units at transit nodes",
  ],
  high: [
    "Install reflective cool roofs on priority buildings",
    "Increase tree canopy along arterial roads",
    "Schedule water misting during peak hours",
  ],
  moderate: [
    "Expand green corridors near pedestrian zones",
    "Add bus shelter cooling stations",
    "Install permeable pavement in parking areas",
  ],
  safe: [
    "Monitor zone for urban encroachment",
    "Maintain current green infrastructure",
    "Low priority — budget can be reallocated",
  ],
};

export function getRecommendations(level) {
  return RECOMMENDATIONS[level] ?? getCityDefaultRecommendations("", {});
}

export function getCityDefaultRecommendations(city, stats) {
  return [
    "Select a hotspot on the map to view zone diagnostics",
    `${stats?.zonesMapped ?? 0} heat zones mapped across ${city}`,
    `${stats?.criticalZones ?? 0} extreme-risk zones require immediate intervention`,
  ];
}
