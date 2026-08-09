import { useState, useCallback } from "react";
import { runOptimization } from "../utils/api";

export function useOptimization({ setHotspots, selectedZone, city, budget, onComplete }) {
  const [isOptimizing, setIsOptimizing] = useState(false);

  const runOptimizationHandler = useCallback(async () => {
    setIsOptimizing(true);
    try {
      const result = await runOptimization(city, budget);

      const reductionById = {};
      for (const p of result.placements) {
        reductionById[p.hotspot_id] = p.predicted_reduction_c;
      }

      if (selectedZone) {
        setHotspots((prev) =>
          prev.map((h) => {
            if (h.id !== selectedZone.id) return h;
            const reduction = reductionById[h.id] ?? 3;
            return {
              ...h,
              temp: Math.round((h.temp - reduction) * 10) / 10,
              riskScore: Math.max(h.riskScore - 15, 0),
            };
          })
        );
        onComplete?.({
          type: "zone",
          message: `Zone ${selectedZone.id} optimized — temp −${(reductionById[selectedZone.id] ?? 3).toFixed(1)}°C`,
        });
      } else {
        setHotspots((prev) =>
          prev.map((h) => {
            const reduction = reductionById[h.id];
            if (!reduction) return h;
            return {
              ...h,
              temp: Math.round((h.temp - reduction) * 10) / 10,
              riskScore: Math.max(h.riskScore - 10, 0),
            };
          })
        );
        onComplete?.({
          type: "city",
          message: `City-wide optimization complete — ${result.zones_treated} zones improved`,
        });
      }
    } catch {
      onComplete?.({ type: "error", message: "Optimization failed — please try again" });
    } finally {
      setIsOptimizing(false);
    }
  }, [city, budget, selectedZone, setHotspots, onComplete]);

  return { isOptimizing, runOptimization: runOptimizationHandler };
}
