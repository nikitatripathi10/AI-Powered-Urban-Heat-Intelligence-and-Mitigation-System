import { memo, useCallback } from "react";
import { motion } from "framer-motion";
import SearchBar from "./SearchBar";
import StatisticsCharts from "./StatisticsCharts";
import HeatTimeline from "./HeatTimeline";
import { LEVEL_CONFIG } from "../data/hotspots";
import styles from "./Sidebar.module.css";

const LAYERS = [
  { id: "compositeRisk",           label: "Composite Risk",           icon: "◉", color: "orange" },
  { id: "landSurfaceTemp",         label: "Land Surface Temperature", icon: "▲", color: "orange" },
  { id: "vegetationCover",         label: "Vegetation Cover",         icon: "◈", color: "teal" },
  { id: "populationVulnerability", label: "Population Vulnerability", icon: "◎", color: "teal" },
];

function Sidebar({
  city,
  layers,
  onToggleLayer,
  searchQuery,
  onSearchChange,
  activeFilters,
  onToggleFilter,
  allLevels,
  hotspots,
  stats,
  isLoading,
  hour,
  onHourChange,
  formatHour,
}) {
  const activeCount = Object.values(layers ?? {}).filter(Boolean).length;
  const handleSearch = useCallback((value) => onSearchChange?.(value), [onSearchChange]);

  return (
    <motion.aside
      className={styles.sidebar}
      initial={{ x: -240, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
    >
      <div className={styles.header}>
        <span className={styles.headerTitle}>Data Layers</span>
        <span className={styles.headerBadge}>{activeCount} active</span>
      </div>

      <SearchBar value={searchQuery ?? ""} onChange={handleSearch} />

      <div className={styles.filterSection}>
        <span className={styles.filterTitle}>Risk Filters</span>
        <div className={styles.filterChips}>
          {(allLevels ?? []).map((level) => {
            const active = activeFilters?.includes(level);
            return (
              <motion.button
                key={level}
                className={`${styles.filterChip} ${active ? styles.filterActive : ""}`}
                onClick={() => onToggleFilter?.(level)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                style={active ? { borderColor: LEVEL_CONFIG[level]?.color, color: LEVEL_CONFIG[level]?.color } : undefined}
                type="button"
              >
                {level.charAt(0).toUpperCase() + level.slice(1)}
              </motion.button>
            );
          })}
        </div>
      </div>

      <div className={styles.layerList}>
        {LAYERS.map((layer, i) => {
          const active = layers?.[layer.id];
          return (
            <motion.button
              key={layer.id}
              className={`${styles.layerItem} ${active ? styles.active : ""} ${layer.color === "orange" ? styles.orangeAccent : styles.tealAccent}`}
              onClick={() => onToggleLayer(layer.id)}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 + i * 0.08 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="button"
            >
              <span className={styles.layerIcon}>{layer.icon}</span>
              <span className={styles.layerLabel}>{layer.label}</span>
              <motion.div
                className={styles.toggle}
                animate={{
                  backgroundColor: active
                    ? layer.color === "orange" ? "var(--orange-primary)" : "var(--teal-primary)"
                    : "rgba(255,255,255,0.1)",
                }}
              >
                <motion.div
                  className={styles.toggleKnob}
                  animate={{ x: active ? 16 : 0 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              </motion.div>
            </motion.button>
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
    </motion.aside>
  );
}

export default memo(Sidebar);
