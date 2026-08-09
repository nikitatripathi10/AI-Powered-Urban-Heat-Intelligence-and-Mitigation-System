import { useState, useCallback, useEffect, useMemo } from "react";
import { fetchHotspots, fetchCityConfig } from "../utils/api";

const ALL_LEVELS = ["extreme", "high", "moderate", "safe"];

const FALLBACK_CONFIG = {
  center: [28.6139, 77.209],
  zoom: 11,
};

export function useHotspots(initialCity = "Delhi") {
  const [city, setCity] = useState(initialCity);
  const [hotspots, setHotspots] = useState([]);
  const [cityConfig, setCityConfig] = useState(FALLBACK_CONFIG);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedZoneId, setSelectedZoneId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilters, setActiveFilters] = useState([]);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    Promise.all([fetchHotspots(city), fetchCityConfig(city)])
      .then(([hotspotRes, configRes]) => {
        if (!cancelled) {
          setHotspots(hotspotRes.hotspots);
          setCityConfig(configRes);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message);
          setIsLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [city]);

  const selectedZone = useMemo(() => {
    if (selectedZoneId == null) return null;
    return hotspots.find((h) => h.id === selectedZoneId) ?? null;
  }, [hotspots, selectedZoneId]);

  const handleCityChange = useCallback((newCity) => {
    setCity(newCity);
    setSelectedZoneId(null);
    setSearchQuery("");
    setActiveFilters([]);
  }, []);

  const selectZone = useCallback((zone) => {
    setSelectedZoneId(zone?.id ?? null);
  }, []);

  const toggleFilter = useCallback((level) => {
    setActiveFilters((prev) =>
      prev.includes(level) ? prev.filter((l) => l !== level) : [...prev, level]
    );
  }, []);

  const filteredHotspots = useMemo(() => {
    let result = hotspots;
    if (activeFilters.length > 0) {
      result = result.filter((h) => activeFilters.includes(h.level));
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(
        (h) =>
          String(h.id).includes(q) ||
          h.level.toLowerCase().includes(q) ||
          String(h.riskScore).includes(q)
      );
    }
    return result;
  }, [hotspots, activeFilters, searchQuery]);

  return {
    city,
    hotspots,
    setHotspots,
    cityConfig,
    isLoading,
    error,
    selectedZone,
    selectZone,
    searchQuery,
    setSearchQuery,
    activeFilters,
    toggleFilter,
    allLevels: ALL_LEVELS,
    filteredHotspots,
    handleCityChange,
  };
}
