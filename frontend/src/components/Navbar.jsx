import { memo } from "react";
import { useCities } from "../hooks/useCities";
import { SkeletonLine } from "./Skeleton";
import styles from "./Navbar.module.css";

function Navbar({ city, onCityChange, stats, isLoading, onNavigate, onShowCatalogue }) {
  const { cities } = useCities();

  const navStats = [
    { label: "Zones",    value: String(stats?.zonesMapped ?? 0),  accent: "live" },
    { label: "Critical", value: String(stats?.criticalZones ?? 0), accent: "heat" },
    { label: "At risk",  value: stats?.peopleAtRisk ?? "0K",       accent: "heat" },
    { label: "Avg temp", value: `${stats?.avgTemperature ?? 0}°C`, accent: "live" },
  ];

  return (
    <nav className={styles.navbar}>
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
          <span className={styles.statsLabel}>Live</span>
        </div>
        <div className={styles.stats}>
          {navStats.map(stat => (
            <div key={stat.label} className={styles.stat}>
              {isLoading
                ? <SkeletonLine width={36} height={16} />
                : <span className={`${styles.statValue} ${styles[stat.accent]}`}>{stat.value}</span>
              }
              <span className={styles.statLabel}>{stat.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.citySelector}>
        <span className={styles.cityLabel}>City</span>
        <select className={styles.citySelect} value={city}
          onChange={e => onCityChange(e.target.value)} aria-label="Select city">
          {cities.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div className={styles.navActions}>
        <button className={styles.navBtn} onClick={() => onShowCatalogue?.()} type="button">
          Catalogue
        </button>
        <button className={styles.navBtn} onClick={() => onNavigate?.("analytics")} type="button">
          Analytics
        </button>
      </div>
    </nav>
  );
}

export default memo(Navbar);
