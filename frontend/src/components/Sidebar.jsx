import { memo, useCallback } from "react";
import SearchBar from "./SearchBar";
import StatisticsCharts from "./StatisticsCharts";
import HeatTimeline from "./HeatTimeline";
import { LEVEL_CONFIG } from "../data/hotspots";
import styles from "./Sidebar.module.css";

const LAYERS = [
  { id: "compositeRisk",           label: "Composite Risk",      icon: "◉", color: "orange" },
  { id: "landSurfaceTemp",         label: "Surface Temp",        icon: "▲", color: "orange" },
  { id: "vegetationCover",         label: "Vegetation Cover",    icon: "◈", color: "teal" },
  { id: "populationVulnerability", label: "Pop. Vulnerability",  icon: "◎", color: "teal" },
];

function Sidebar({
  city, layers, onToggleLayer,
  searchQuery, onSearchChange,
  activeFilters, onToggleFilter, allLevels,
  hotspots, stats, isLoading,
  hour, onHourChange, formatHour,
}) {
  const activeCount = Object.values(layers ?? {}).filter(Boolean).length;
  const handleSearch = useCallback(v => onSearchChange?.(v), [onSearchChange]);

  return (
    <aside className={styles.sidebar}>
      <div className={styles.header}>
        <span className={styles.headerTitle}>Layers</span>
        <span className={styles.headerBadge}>{activeCount} on</span>
      </div>

      <SearchBar value={searchQuery ?? ""} onChange={handleSearch} />

      <div className={styles.filterSection}>
        <span className={styles.filterTitle}>Filter by risk</span>
        <div className={styles.filterChips}>
          {(allLevels ?? []).map(level => {
            const active = activeFilters?.includes(level);
            return (
              <button key={level}
                className={`${styles.filterChip} ${active ? styles.filterActive : ""}`}
                onClick={() => onToggleFilter?.(level)}
                style={active ? { borderColor: LEVEL_CONFIG[level]?.color, color: LEVEL_CONFIG[level]?.color } : undefined}
                type="button"
              >
                {level.charAt(0).toUpperCase() + level.slice(1)}
              </button>
            );
          })}
        </div>
      </div>

      <div className={styles.layerList}>
        {LAYERS.map(layer => {
          const active = layers?.[layer.id];
          return (
            <button key={layer.id}
              className={`${styles.layerItem} ${active ? styles.active : ""} ${layer.color === "orange" ? styles.orangeAccent : styles.tealAccent}`}
              onClick={() => onToggleLayer(layer.id)}
              type="button"
            >
              <span className={styles.layerIcon}>{layer.icon}</span>
              <span className={styles.layerLabel}>{layer.label}</span>
              <div className={styles.toggle}>
                <div className={styles.toggleKnob} />
              </div>
            </button>
          );
        })}
      </div>

      <StatisticsCharts
        key={city}
        hotspots={hotspots}
        stats={stats}
        isLoading={isLoading}
        sectionLabel="Current State"
      />

      <HeatTimeline hour={hour} onHourChange={onHourChange} formatHour={formatHour} />

      <div className={styles.legend}>
        <span className={styles.legendTitle}>Risk Scale</span>
        <div className={styles.legendBar}>
          <div className={styles.legendGradient} />
        </div>
        <div className={styles.legendLabels}>
          <span>Low</span>
          <span>Critical</span>
        </div>
      </div>
    </aside>
  );
}

export default memo(Sidebar);
