import { memo } from "react";
import { motion } from "framer-motion";
import { useCities } from "../hooks/useCities";
import { SkeletonLine } from "./Skeleton";
import styles from "./Navbar.module.css";

function Navbar({ city, onCityChange, stats, isLoading }) {
  const { cities } = useCities();

  const navStats = [
    { label: "Zones Mapped",   value: String(stats?.zonesMapped ?? 0),  accent: "live" },
    { label: "Critical Zones", value: String(stats?.criticalZones ?? 0), accent: "heat" },
    { label: "People at Risk", value: stats?.peopleAtRisk ?? "0K",       accent: "heat" },
    { label: "Avg Temp",       value: `${stats?.avgTemperature ?? 0}°C`, accent: "live" },
  ];

  return (
    <motion.nav
      className={styles.navbar}
      initial={{ y: -64, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <div className={styles.logo}>
        <div className={styles.logoIcon}>
          <span className={styles.logoFlame}>◆</span>
        </div>
        <div className={styles.logoText}>
          <span className={styles.logoName}>THERMA</span>
          <span className={styles.logoSub}>Urban Heat Intelligence</span>
        </div>
      </div>

      <div className={styles.statsBlock}>
        <div className={styles.statsHeader}>
          <span className={styles.liveDot} />
          <span className={styles.statsLabel}>Live Status</span>
        </div>
        <div className={styles.stats}>
          {navStats.map((stat, i) => (
            <motion.div
              key={stat.label}
              className={styles.stat}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.08 }}
            >
              {isLoading ? (
                <SkeletonLine width={40} height={20} />
              ) : (
                <motion.span
                  key={stat.value}
                  className={`${styles.statValue} ${styles[stat.accent]}`}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  {stat.value}
                </motion.span>
              )}
              <span className={styles.statLabel}>{stat.label}</span>
            </motion.div>
          ))}
        </div>
      </div>

      <div className={styles.citySelector}>
        <span className={styles.cityLabel}>City</span>
        <select
          className={styles.citySelect}
          value={city}
          onChange={(e) => onCityChange(e.target.value)}
          aria-label="Select city"
        >
          {cities.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>
    </motion.nav>
  );
}

export default memo(Navbar);
