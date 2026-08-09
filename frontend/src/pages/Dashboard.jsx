import { useState, useCallback } from "react";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import MapPanel from "../components/MapPanel";
import Diagnostics from "../components/Diagnostics";
import BottomPanel from "../components/BottomPanel";
import Toast from "../components/Toast";
import { useHotspots } from "../hooks/useHotspots";
import { useCityStats } from "../hooks/useCityStats";
import { useOptimization } from "../hooks/useOptimization";
import { useSimulation } from "../hooks/useSimulation";
import { useHeatTimeline } from "../hooks/useHeatTimeline";
import { useNotifications } from "../hooks/useNotifications";
import styles from "./Dashboard.module.css";

const DEFAULT_LAYERS = {
  compositeRisk: true,
  landSurfaceTemp: true,
  vegetationCover: false,
  populationVulnerability: true,
};

export default function Dashboard() {
  const [layers, setLayers] = useState(DEFAULT_LAYERS);
  const [budget, setBudget] = useState(65);
  const { toasts, addToast, dismissToast } = useNotifications();

  const {
    city, hotspots, setHotspots, cityConfig, isLoading,
    selectedZone, selectZone,
    searchQuery, setSearchQuery,
    activeFilters, toggleFilter,
    allLevels, filteredHotspots,
    handleCityChange,
  } = useHotspots("Delhi");

  const cityStats = useCityStats(hotspots, budget);
  const { hour, setHour, displayHotspots, formatHour } = useHeatTimeline(filteredHotspots);
  const { isSimulating, pulseIds, toggleSimulation } = useSimulation({ setHotspots });

  const handleOptimizationComplete = useCallback(
    ({ message, type }) => {
      addToast(message, type === "error" ? "error" : "success");
      if (type !== "error") addToast("Risk levels reduced across target zones", "info");
    },
    [addToast]
  );

  const { isOptimizing, runOptimization } = useOptimization({
    setHotspots, selectedZone, city, budget,
    onComplete: handleOptimizationComplete,
  });

  const handleToggleLayer = useCallback((layerId) => {
    setLayers((prev) => ({ ...prev, [layerId]: !prev[layerId] }));
  }, []);

  const handleCityChangeWithToast = useCallback(
    (newCity) => {
      handleCityChange(newCity);
      addToast(`Switched to ${newCity}`, "info");
    },
    [handleCityChange, addToast]
  );

  return (
    <div className={styles.dashboard}>
      <div className={styles.ambientGlow} />

      <Navbar
        city={city}
        onCityChange={handleCityChangeWithToast}
        stats={cityStats}
        isLoading={isLoading}
      />

      <div className={styles.main}>
        <Sidebar
          city={city}
          layers={layers}
          onToggleLayer={handleToggleLayer}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          activeFilters={activeFilters}
          onToggleFilter={toggleFilter}
          allLevels={allLevels}
          hotspots={hotspots}
          stats={cityStats}
          isLoading={isLoading}
          hour={hour}
          onHourChange={setHour}
          formatHour={formatHour}
        />

        <div className={styles.center}>
          <MapPanel
            city={city}
            cityConfig={cityConfig}
            hotspots={displayHotspots}
            layers={layers}
            onZoneSelect={selectZone}
            selectedZone={selectedZone}
            pulseIds={pulseIds}
            isSimulating={isSimulating}
          />
        </div>

        <Diagnostics
          city={city}
          selectedZone={selectedZone}
          stats={cityStats}
          isLoading={isLoading}
          isOptimizing={isOptimizing}
        />
      </div>

      <BottomPanel
        budget={budget}
        onBudgetChange={setBudget}
        onBudgetCommit={(value) => addToast(`Budget updated to ₹${(value * 0.5).toFixed(1)}M`, "info")}
        onReoptimize={runOptimization}
        isOptimizing={isOptimizing}
        stats={cityStats}
        city={city}
        hotspots={hotspots}
        isSimulating={isSimulating}
        onToggleSimulation={toggleSimulation}
      />

      <Toast toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
