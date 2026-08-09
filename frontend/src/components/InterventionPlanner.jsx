import { memo, useState, useEffect } from "react";
import { fetchInterventionPlan } from "../utils/api";
import styles from "./InterventionPlanner.module.css";

const LEVEL_COLOR = { extreme:"#f43f5e", high:"#f97316", moderate:"#fbbf24", safe:"#4ade80" };

function ZonePlanCard({ zone, index }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={styles.card} style={{ "--level-color": LEVEL_COLOR[zone.level] ?? "var(--accent)" }}>
      <button className={styles.cardHeader} onClick={() => setOpen(o => !o)} type="button">
        <span className={styles.rank}>#{index+1}</span>
        <div className={styles.cardTitle}>
          <span className={styles.cardIcon}>{zone.interventionIcon ?? "⚙️"}</span>
          <div className={styles.cardNameBlock}>
            <span className={styles.cardName}>{zone.interventionName}</span>
            <span className={styles.cardZone}>Zone {zone.zoneId} · {zone.streetDesc}</span>
          </div>
        </div>
        <span className={styles.levelBadge}
          style={{ background: `${LEVEL_COLOR[zone.level]}18`, color: LEVEL_COLOR[zone.level], borderColor: `${LEVEL_COLOR[zone.level]}44` }}>
          {zone.level}
        </span>
        <span className={styles.chevron}>{open ? "▴" : "▾"}</span>
      </button>

      <div className={styles.quickStats}>
        <Stat label="Cost"      value={`₹${zone.costCrore}Cr`}                                   accent="heat" />
        <Stat label="Cooling"   value={`−${zone.coolingImpactC}°C`}                              accent="future" />
        <Stat label="Timeline"  value={`${zone.timelineWeeksMin}–${zone.timelineWeeksMax}w`}     accent="live" />
        <Stat label="Protected" value={`${zone.peopleProtected}K`}                               accent="live" />
      </div>

      {open && (
        <div className={styles.cardDetail}>
          <div className={styles.detailGrid}>
            <div className={styles.detailBlock}>
              <span className={styles.detailLabel}>📍 Location</span>
              <span className={styles.detailValue}>{zone.streetDesc}</span>
              <span className={styles.detailCoords}>{zone.lat.toFixed(5)}°N, {zone.lng.toFixed(5)}°E</span>
            </div>
            <div className={styles.detailBlock}>
              <span className={styles.detailLabel}>🌡️ Heat driver</span>
              <span className={styles.detailValue}>{zone.dominantDriver}</span>
            </div>
            <div className={styles.detailBlock}>
              <span className={styles.detailLabel}>👥 Population</span>
              <span className={styles.detailValue}>{zone.population}K residents</span>
            </div>
            <div className={styles.detailBlock}>
              <span className={styles.detailLabel}>📉 Risk Δ</span>
              <span className={styles.detailValue} style={{ color:"var(--good)" }}>−{zone.riskScoreChange} pts</span>
            </div>
          </div>
          {zone.coBenefits?.length > 0 && (
            <div className={styles.coBenefits}>
              <span className={styles.detailLabel}>✨ Co-benefits</span>
              <div className={styles.coBenefitChips}>
                {zone.coBenefits.map(b => <span key={b} className={styles.coBenefitChip}>{b}</span>)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, accent }) {
  return (
    <div className={`${styles.stat} ${styles[`accent_${accent}`]}`}>
      <span className={styles.statVal}>{value}</span>
      <span className={styles.statLbl}>{label}</span>
    </div>
  );
}

function InterventionPlanner({ city, budget }) {
  const [plan, setPlan]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true); setError(null);
    fetchInterventionPlan(city, budget)
      .then(d => { if (!cancelled) { setPlan(d); setLoading(false); } })
      .catch(e => { if (!cancelled) { setError(e.message); setLoading(false); } });
    return () => { cancelled = true; };
  }, [city, budget]);

  return (
    <div className={styles.planner}>
      <div className={styles.header}>
        <span className={styles.headerTitle}>Intervention Planner</span>
        <span className={styles.headerSub}>{city} · ₹{(budget*0.5).toFixed(1)}M</span>
      </div>

      {loading && <div className={styles.skeletonList}>{[...Array(5)].map((_,i)=><div key={i} className={styles.skeleton}/>)}</div>}
      {error   && <div className={styles.error}>Failed to load: {error}</div>}

      {!loading && !error && plan && (
        <>
          <div className={styles.summary}>
            <SummaryCard label="Zones" value={plan.zonePlans?.length ?? 0} accent="live" />
            <SummaryCard label="Total cost" value={`₹${Object.values(plan.budgetAllocation??{}).reduce((a,b)=>a+b,0).toFixed(0)}Cr`} accent="live" />
            <SummaryCard label="Cooling" value={`−${plan.zonePlans?.reduce((s,z)=>s+z.coolingImpactC,0).toFixed(1)}°C`} accent="future" />
          </div>
          <div className={styles.zoneList}>
            {(plan.zonePlans??[]).map((zone,i) => <ZonePlanCard key={zone.zoneId} zone={zone} index={i} />)}
          </div>
        </>
      )}
    </div>
  );
}

function SummaryCard({ label, value, accent = "live" }) {
  return (
    <div className={`${styles.summaryCard} ${styles[`accent_${accent}`]}`}>
      <span className={styles.summaryVal}>{value}</span>
      <span className={styles.summaryLbl}>{label}</span>
    </div>
  );
}

export default memo(InterventionPlanner);
