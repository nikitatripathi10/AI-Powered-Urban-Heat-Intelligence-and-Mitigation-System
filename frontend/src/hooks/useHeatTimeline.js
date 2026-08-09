import { useState, useCallback, useMemo } from "react";

function getHourOffset(hour) {
  return Math.max(0, 4 - Math.abs(hour - 14) * 0.35);
}

export function useHeatTimeline(hotspots) {
  const [hour, setHour] = useState(14);

  const displayHotspots = useMemo(() => {
    if (!hotspots) return [];
    const offset = getHourOffset(hour);
    return hotspots.map((h) => ({
      ...h,
      displayTemp: Math.round((h.temp + offset - 2) * 10) / 10,
    }));
  }, [hotspots, hour]);

  const handleHourChange = useCallback((newHour) => {
    setHour(Number(newHour));
  }, []);

  const formatHour = useCallback((h) => {
    const suffix = h >= 12 ? "PM" : "AM";
    return `${h % 12 || 12}:00 ${suffix}`;
  }, []);

  return { hour, setHour: handleHourChange, displayHotspots, formatHour };
}
