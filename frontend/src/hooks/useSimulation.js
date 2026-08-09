import { useState, useCallback, useRef, useEffect } from "react";

export function useSimulation({ setHotspots }) {
  const [isSimulating, setIsSimulating] = useState(false);
  const [pulseIds, setPulseIds] = useState([]);
  const intervalRef = useRef(null);

  const tick = useCallback(() => {
    setHotspots((prev) =>
      prev.map((h) => ({
        ...h,
        temp: Math.round(Math.max(30, Math.min(50, h.temp + (Math.random() - 0.5) * 1.2)) * 10) / 10,
        riskScore: Math.max(0, Math.min(100, h.riskScore + Math.round((Math.random() - 0.5) * 6))),
      }))
    );
    setPulseIds(Array.from({ length: 5 }, () => Math.floor(Math.random() * 50) + 1));
    setTimeout(() => setPulseIds([]), 1500);
  }, [setHotspots]);

  const startSimulation = useCallback(() => {
    if (intervalRef.current) return;
    setIsSimulating(true);
    tick();
    intervalRef.current = setInterval(tick, 3000);
  }, [tick]);

  const stopSimulation = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsSimulating(false);
    setPulseIds([]);
  }, []);

  const toggleSimulation = useCallback(() => {
    if (isSimulating) stopSimulation();
    else startSimulation();
  }, [isSimulating, startSimulation, stopSimulation]);

  useEffect(() => {
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  return { isSimulating, pulseIds, toggleSimulation };
}
