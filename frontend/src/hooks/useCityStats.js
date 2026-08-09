import { useMemo } from "react";
import { formatPopulation } from "../utils/formatters";

export function useCityStats(hotspots, budget = 65) {
  return useMemo(() => {
    if (!hotspots || hotspots.length === 0) {
      return {
        zonesMapped: 0,
        criticalZones: 0,
        peopleAtRisk: "0K",
        totalPopulation: 0,
        avgTemperature: 0,
        avgRiskScore: 0,
        protectedPopulation: "0K",
        tempReduction: 0,
        levelDistribution: { extreme: 0, high: 0, moderate: 0, safe: 0 },
      };
    }

    const totalPop = hotspots.reduce((sum, h) => sum + (Number(h.population) || 0), 0);
    const avgTemp = hotspots.reduce((sum, h) => sum + (Number(h.temp) || 0), 0) / hotspots.length;
    const avgRisk = hotspots.reduce((sum, h) => sum + (Number(h.riskScore) || 0), 0) / hotspots.length;

    const levelDistribution = hotspots.reduce(
      (acc, h) => { if (acc[h.level] !== undefined) acc[h.level]++; return acc; },
      { extreme: 0, high: 0, moderate: 0, safe: 0 }
    );

    return {
      zonesMapped: hotspots.length,
      criticalZones: hotspots.filter((h) => h.level === "extreme").length,
      peopleAtRisk: formatPopulation(totalPop),
      totalPopulation: totalPop,
      avgTemperature: Math.round(avgTemp * 10) / 10,
      avgRiskScore: Math.round(avgRisk),
      protectedPopulation: formatPopulation(Math.round((budget / 100) * totalPop)),
      tempReduction: (budget / 100) * 4.2,
      levelDistribution,
    };
  }, [hotspots, budget]);
}
