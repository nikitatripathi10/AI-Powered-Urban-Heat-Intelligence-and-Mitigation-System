import { useState, useCallback } from "react";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import MapPanel from "../components/MapPanel";
import Diagnostics from "../components/Diagnostics";
import BottomPanel from "../components/BottomPanel";
import InterventionPlanner from "../components/InterventionPlanner";
import PlannerTimeline from "../components/PlannerTimeline";
import InterventionCatalogue from "../components/InterventionCatalogue";
import Toast from "../components/Toast";
import { useHotspots } from "../hooks/useHotspots";
import { useCityStats } from "../hooks/useCityStats";
import { useOptimization } from "../hooks/useOptimization";
import { useSimulation } from "../hooks/useSimulation";
import { useHeatTimeline } from "../hooks/useHeatTimeline";
import { useNotifications } from "../hooks/useNotifications";
import styles from "./Dashboard.module.css";

const DEFAULT_LAYERS = {
  compositeRisk: true, landSurfaceTemp: true,
  vegetationCover: false, populationVulnerability: true,
};

const CENTER_TABS = [
  { id: "map",      label: "Map",      icon: "◉" },
  { id: "planner",  label: "Planner",  icon: "◆" },
  { id: "timeline", label: "Timeline", icon: "▤" },
];

export default function Dashboard({ onNavigate }) {
  const [layers, setLayers]               = useState(DEFAULT_LAYERS);
  const [budget, setBudget]               = useState(65);
  const [centerTab, setCenterTab]         = useState("map");
  const [showCatalogue, setShowCatalogue] = useState(false);
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

  const handleOptimizationComplete = useCallback(({ message, type }) => {
    addToast(message, type === "error" ? "error" : "success");
    if (type !== "error") addToast("Risk levels updated", "info");
  }, [addToast]);

  const { isOptimizing, runOptimization } = useOptimization({
    setHotspots, selectedZone, city, budget, onComplete: handleOptimizationComplete,
  });

  const handleToggleLayer = useCallback(id => setLayers(p => ({ ...p, [id]: !p[id] })), []);

  const handleCityChange_ = useCallback(newCity => {
    handleCityChange(newCity);
    addToast(`Switched to ${newCity}`, "info");
  }, [handleCityChange, addToast]);

  return (
    <div className={styles.dashboard}>
      <Navbar
        city={city} onCityChange={handleCityChange_}
        stats={cityStats} isLoading={isLoading}
        onNavigate={onNavigate}
        onShowCatalogue={() => setShowCatalogue(true)}
      />

      <div className={styles.main}>
        <Sidebar
          city={city} layers={layers} onToggleLayer={handleToggleLayer}
          searchQuery={searchQuery} onSearchChange={setSearchQuery}
          activeFilters={activeFilters} onToggleFilter={toggleFilter}
          allLevels={allLevels} hotspots={hotspots} stats={cityStats}
          isLoading={isLoading} hour={hour} onHourChange={setHour} formatHour={formatHour}
        />

        <div className={styles.center}>
          <div className={styles.centerTabBar}>
            {CENTER_TABS.map(t => (
              <button key={t.id}
                className={`${styles.centerTab} ${centerTab===t.id ? styles.centerTabActive : ""}`}
                onClick={() => setCenterTab(t.id)} type="button">
                <span className={styles.centerTabIcon}>{t.icon}</span>{t.label}
              </button>
            ))}
          </div>

          <div className={styles.centerContent}>
            {centerTab === "map" && (
              <div className={styles.mapWrap}>
                <MapPanel
                  city={city} cityConfig={cityConfig} hotspots={displayHotspots}
                  layers={layers} onZoneSelect={selectZone} selectedZone={selectedZone}
                  pulseIds={pulseIds} isSimulating={isSimulating}
                />
              </div>
            )}
            {centerTab === "planner" && (
              <div className={styles.fullPanel}>
                <InterventionPlanner city={city} budget={budget} />
              </div>
            )}
            {centerTab === "timeline" && (
              <div className={styles.fullPanel}>
                <PlannerTimeline city={city} budget={budget} />
              </div>
            )}
          </div>
        </div>

        <Diagnostics
          city={city} selectedZone={selectedZone}
          stats={cityStats} isLoading={isLoading} isOptimizing={isOptimizing}
        />
      </div>

      <BottomPanel
        budget={budget} onBudgetChange={setBudget}
        onBudgetCommit={v => addToast(`Budget ₹${(v*0.5).toFixed(1)}M`, "info")}
        onReoptimize={runOptimization} isOptimizing={isOptimizing}
        stats={cityStats} city={city} hotspots={hotspots}
        isSimulating={isSimulating} onToggleSimulation={toggleSimulation}
      />

      {showCatalogue && <InterventionCatalogue onClose={() => setShowCatalogue(false)} />}
      <Toast toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
