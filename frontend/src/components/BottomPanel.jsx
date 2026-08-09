import { memo, useCallback } from "react";
import { motion } from "framer-motion";
import { exportReport } from "../utils/exportReport";
import AnimatedNumber from "./AnimatedNumber";
import styles from "./BottomPanel.module.css";

function BottomPanel({
  budget,
  onBudgetChange,
  onBudgetCommit,
  onReoptimize,
  isOptimizing,
  stats,
  city,
  hotspots,
  isSimulating,
  onToggleSimulation,
}) {
  const tempReduction = stats?.tempReduction ?? (budget / 100) * 4.2;
  const protectedPop = stats?.protectedPopulation ?? "0K";

  const handleExport = useCallback(() => {
    exportReport({ city, stats, hotspots });
  }, [city, stats, hotspots]);

  return (
    <motion.div
      className={styles.bottomPanel}
      initial={{ y: 120, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut", delay: 0.25 }}
    >
      {/* ── Budget slider ── */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTitle}>Intervention Budget</span>
          <span className={styles.budgetValue}>₹{(budget * 0.5).toFixed(1)}M</span>
        </div>
        <div className={styles.sliderWrap}>
          <input
            type="range"
            min="0"
            max="100"
            value={budget}
            onChange={(e) => onBudgetChange(Number(e.target.value))}
            onMouseUp={(e) => onBudgetCommit?.(Number(e.target.value))}
            onTouchEnd={(e) => onBudgetCommit?.(Number(e.target.value))}
            className={styles.slider}
            aria-label="Intervention budget"
          />
          <div className={styles.sliderTrack}>
            <motion.div
              className={styles.sliderFill}
              animate={{ width: `${budget}%` }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            />
          </div>
        </div>
        <div className={styles.sliderLabels}>
          <span>₹0M</span>
          <span>₹50M</span>
        </div>
      </div>

      <div className={styles.divider} />

      {/* ── Projected outcomes — clearly distinguished as future state ── */}
      <div className={styles.projectedBlock}>
        <div className={styles.projectedHeader}>
          <span className={styles.projectedIcon}>◈</span>
          <span className={styles.projectedLabel}>Projected Outcomes</span>
          <span className={styles.projectedSub}>after budget deployment</span>
        </div>
        <div className={styles.outcomes}>
          <OutcomeCard
            label="Temp Reduction"
            value={<>−<AnimatedNumber value={tempReduction} decimals={1} suffix="°C" /></>}
            sub="projected city-wide"
          />
          <OutcomeCard
            label="Protected Population"
            value={protectedPop}
            sub="people shielded"
          />
        </div>
      </div>

      <div className={styles.divider} />

      {/* ── Actions ── */}
      <div className={styles.actions}>
        <motion.button
          className={`${styles.simBtn} ${isSimulating ? styles.simActive : ""}`}
          onClick={onToggleSimulation}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          type="button"
        >
          {isSimulating ? "■ Stop Simulation" : "▶ Start Simulation"}
        </motion.button>

        <motion.button
          className={styles.exportBtn}
          onClick={handleExport}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          type="button"
        >
          ↓ Export PDF
        </motion.button>

        <motion.button
          className={styles.optimizeBtn}
          onClick={onReoptimize}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          disabled={isOptimizing}
          type="button"
        >
          {isOptimizing ? (
            <motion.span
              className={styles.spinner}
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
          ) : (
            <span className={styles.btnIcon}>◆</span>
          )}
          {isOptimizing ? "AI Optimizing..." : "Run AI Optimization"}
        </motion.button>
      </div>
    </motion.div>
  );
}

function OutcomeCard({ label, value, sub }) {
  return (
    <div className={styles.outcomeCard}>
      <span className={styles.outcomeLabel}>{label}</span>
      <motion.span
        className={styles.outcomeValue}
        key={typeof value === "string" ? value : label}
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {value}
      </motion.span>
      <span className={styles.outcomeSub}>{sub}</span>
    </div>
  );
}

export default memo(BottomPanel);
