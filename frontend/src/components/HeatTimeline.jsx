import { memo } from "react";
import { motion } from "framer-motion";
import styles from "./HeatTimeline.module.css";

function HeatTimeline({ hour, onHourChange, formatHour }) {
  return (
    <motion.div
      className={styles.timeline}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.2 }}
    >
      <div className={styles.header}>
        <span className={styles.title}>Heat Timeline</span>
        <span className={styles.hourLabel}>{formatHour(hour)}</span>
      </div>
      <div className={styles.sliderWrap}>
        <input
          type="range"
          min="0"
          max="23"
          value={hour}
          onChange={(e) => onHourChange(Number(e.target.value))}
          className={styles.slider}
          aria-label="Heat timeline hour"
        />
        <div className={styles.track}>
          <motion.div
            className={styles.fill}
            animate={{ width: `${(hour / 23) * 100}%` }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          />
        </div>
      </div>
      <div className={styles.labels}>
        <span>12 AM</span>
        <span>6 AM</span>
        <span>12 PM</span>
        <span>6 PM</span>
        <span>11 PM</span>
      </div>
    </motion.div>
  );
}

export default memo(HeatTimeline);
