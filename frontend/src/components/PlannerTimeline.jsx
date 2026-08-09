import { memo, useState, useEffect } from "react";
import { fetchInterventionPlan } from "../utils/api";
import styles from "./PlannerTimeline.module.css";

const PHASE_COLORS = ["#38bdf8","#f97316","#4ade80"];
const PHASE_SPANS  = [{start:0,end:16.7},{start:16.7,end:50},{start:50,end:100}];

function PhaseCard({ phase, index, open, onToggle }) {
  const color = PHASE_COLORS[index];
  const span  = PHASE_SPANS[index];
  return (
    <div className={styles.phaseBlock}>
      <div className={styles.ganttRow}>
        <span className={styles.phaseLabel} style={{ color }}>{phase.label}</span>
        <div className={styles.ganttTrack}>
          <div className={styles.ganttBar}
            style={{ left:`${span.start}%`, width:`${span.end-span.start}%`, background:color }} />
          <div className={styles.milestone} style={{ left:`${span.end}%`, background:color }} />
        </div>
        <span className={styles.phasePeriod}>{phase.period}</span>
      </div>

      <div className={styles.phaseSummary} style={{ borderColor:`${color}28` }}>
        <button className={styles.summaryHeader} onClick={onToggle} type="button">
          <div className={styles.summaryStats}>
            <Chip label="Zones"   value={phase.zoneCount}           color={color} />
            <Chip label="Cost"    value={`₹${phase.totalCostCrore}Cr`} color={color} />
            <Chip label="Cooling" value={`−${phase.totalCoolingC}°C`}  color={color} />
            <Chip label="People"  value={`${phase.totalPeopleProtected??0}K`} color={color} />
          </div>
          <div className={styles.summaryMeta}>
            <span className={styles.summaryDesc}>{phase.description}</span>
            <span className={styles.chevron} style={{ color }}>{open?"▴":"▾"}</span>
          </div>
        </button>

        {open && (
          <div>
            {phase.zones?.length > 0 ? (
              <div className={styles.zoneGrid}>
                {phase.zones.map(z => (
                  <div key={z.zoneId} className={styles.zoneChip} style={{ borderColor:`${color}28` }}>
                    <span className={styles.zoneChipIcon}>{z.interventionIcon ?? "⚙️"}</span>
                    <div className={styles.zoneChipBody}>
                      <span className={styles.zoneChipName}>{z.interventionName}</span>
                      <span className={styles.zoneChipZone}>Zone {z.zoneId}</span>
                    </div>
                    <div className={styles.zoneChipStats}>
                      <span style={{ color:"var(--warn)", fontSize:"10px", fontFamily:"var(--font-mono)" }}>₹{z.costCrore}Cr</span>
                      <span style={{ color:"var(--good)", fontSize:"10px", fontFamily:"var(--font-mono)" }}>−{z.coolingImpactC}°C</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.emptyPhase}>No zones at current budget</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Chip({ label, value, color }) {
  return (
    <div className={styles.chip} style={{ borderColor:`${color}28` }}>
      <span className={styles.chipVal} style={{ color }}>{value}</span>
      <span className={styles.chipLbl}>{label}</span>
    </div>
  );
}

function PlannerTimeline({ city, budget }) {
  const [plan, setPlan]           = useState(null);
  const [loading, setLoading]     = useState(true);
  const [openPhase, setOpenPhase] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchInterventionPlan(city, budget)
      .then(d => { if (!cancelled) { setPlan(d); setLoading(false); } })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [city, budget]);

  return (
    <div className={styles.timeline}>
      <div className={styles.header}>
        <span className={styles.headerTitle}>Implementation Timeline</span>
        <span className={styles.headerSub}>{city} · 18-month rollout</span>
      </div>

      <div className={styles.ruler}>
        {["0","3mo","6mo","9mo","12mo","15mo","18mo"].map((t,i) => (
          <span key={t} className={styles.rulerMark} style={{ left:`${(i/6)*100}%` }}>{t}</span>
        ))}
      </div>

      {loading && <div className={styles.skeletonList}>{[...Array(3)].map((_,i)=><div key={i} className={styles.skeleton}/>)}</div>}

      {!loading && plan?.phases && (
        <div className={styles.phases}>
          {plan.phases.map((ph,i) => (
            <PhaseCard key={ph.label} phase={ph} index={i}
              open={openPhase===i} onToggle={() => setOpenPhase(openPhase===i ? -1 : i)} />
          ))}
        </div>
      )}

      <div className={styles.legend}>
        <span className={styles.legendItem} style={{ color:"#38bdf8" }}>● Phase 1 — Quick wins</span>
        <span className={styles.legendItem} style={{ color:"#f97316" }}>● Phase 2 — Medium-term</span>
        <span className={styles.legendItem} style={{ color:"#4ade80" }}>● Phase 3 — Long-term</span>
      </div>
    </div>
  );
}

export default memo(PlannerTimeline);
