import { memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { formatPopulation, formatRisk } from "../utils/formatters";
import { getRecommendations, getCityDefaultRecommendations } from "../utils/recommendations";
import AnimatedNumber from "./AnimatedNumber";
import { SkeletonPanel } from "./Skeleton";
import styles from "./Diagnostics.module.css";

function Diagnostics({ city, selectedZone, stats, isLoading, isOptimizing }) {
  if (isLoading) {
    return (
      <aside className={styles.diagnostics}>
        <SkeletonPanel count={4} />
      </aside>
    );
  }

  if (!stats) return null;

  const data = selectedZone
    ? {
        temp: selectedZone.temp,
        risk: selectedZone.riskScore,
        population: formatPopulation(selectedZone.population),
        recommendations: getRecommendations(selectedZone.level),
      }
    : {
        temp: stats.avgTemperature,
        risk: stats.avgRiskScore,
        population: stats.peopleAtRisk,
        recommendations: getCityDefaultRecommendations(city, stats),
      };

  const panelKey = selectedZone ? `zone-${selectedZone.id}` : `city-${city}`;

  return (
    <motion.aside
      className={styles.diagnostics}
      initial={{ x: 300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut", delay: 0.2 }}
    >
      <div className={styles.header}>
        <span className={styles.headerTitle}>Zone Diagnostics</span>
        {selectedZone && (
          <motion.span className={styles.zoneBadge} initial={{ scale: 0 }} animate={{ scale: 1 }}>
            Zone {selectedZone.id}
          </motion.span>
        )}
      </div>

      {isOptimizing && (
        <motion.div
          className={styles.optimizingBanner}
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
        >
          <span className={styles.spinner} />
          AI Optimizing zone metrics...
        </motion.div>
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={panelKey}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.35 }}
        >
          <div className={styles.metrics}>
            <MetricCard
              label="Temperature"
              value={<AnimatedNumber value={Number(data.temp) || 0} decimals={1} suffix="°C" />}
              unit="LST"
              color="orange"
            />
            <MetricCard
              label="Risk Score"
              value={<AnimatedNumber value={Number(data.risk) || 0} decimals={0} />}
              unit="/ 100"
              color="orange"
            />
            <MetricCard
              label="Population"
              value={data.population}
              unit="at risk"
              color="teal"
            />
          </div>

          <div className={styles.riskBar}>
            <div className={styles.riskBarHeader}>
              <span>Risk Level</span>
              <span className={styles.riskValue}>{formatRisk(data.risk)}%</span>
            </div>
            <div className={styles.riskTrack}>
              <motion.div
                className={styles.riskFill}
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(Number(data.risk) || 0, 100)}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              />
            </div>
          </div>

          <div className={styles.recommendations}>
            <div className={styles.recHeader}>
              <span className={styles.recIcon}>◆</span>
              <span>AI Recommendations</span>
            </div>
            <ul className={styles.recList}>
              {(data.recommendations ?? []).map((rec, i) => (
                <motion.li
                  key={`${panelKey}-${i}`}
                  className={styles.recItem}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.08 }}
                >
                  <span className={styles.recDot} />
                  {rec}
                </motion.li>
              ))}
            </ul>
          </div>
        </motion.div>
      </AnimatePresence>
    </motion.aside>
  );
}

function MetricCard({ label, value, unit, color }) {
  return (
    <div className={`${styles.metricCard} ${styles[color]}`}>
      <span className={styles.metricLabel}>{label}</span>
      <motion.span
        className={styles.metricValue}
        key={typeof value === "string" ? value : label}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {value}
      </motion.span>
      <span className={styles.metricUnit}>{unit}</span>
    </div>
  );
}

export default memo(Diagnostics);
