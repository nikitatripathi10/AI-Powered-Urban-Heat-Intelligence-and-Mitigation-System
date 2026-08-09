import { memo, useState } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { formatPopulation, formatRisk } from "../utils/formatters";
import { getRecommendations, getCityDefaultRecommendations } from "../utils/recommendations";
import AnimatedNumber from "./AnimatedNumber";
import { SkeletonPanel } from "./Skeleton";
import styles from "./Diagnostics.module.css";

const LAND_USE_COLORS = ["#38bdf8","#f97316","#fbbf24","#4ade80","#a78bfa"];

const COST_RANKED_STEPS = {
  extreme: [
    { action: "Deploy misting stations at transit nodes",          costCrore: "2–6",   impact: "−3°C fast" },
    { action: "Install green walls on south-facing facades",        costCrore: "6–15",  impact: "−1.5°C" },
    { action: "Build water retention pond",                         costCrore: "12–25", impact: "−4°C + flood" },
  ],
  high: [
    { action: "Apply cool/high-albedo roof coating",                costCrore: "3–8",   impact: "−1.5°C" },
    { action: "Plant tree canopy corridor along main roads",         costCrore: "4–10",  impact: "−2.5°C" },
    { action: "Create urban pocket park (500 m²)",                  costCrore: "15–25", impact: "−3°C local" },
  ],
  moderate: [
    { action: "Install permeable pavement in parking zones",        costCrore: "5–12",  impact: "−1°C" },
    { action: "Apply reflective road surface coating",              costCrore: "3–7",   impact: "−0.7°C" },
    { action: "Add bus-shelter green roofs",                        costCrore: "1–3",   impact: "−0.5°C" },
  ],
  safe: [
    { action: "Maintain existing green infrastructure",             costCrore: "<1",    impact: "preserve" },
    { action: "Monitor for encroachment quarterly",                 costCrore: "<0.5",  impact: "preventive" },
    { action: "Reallocate budget to extreme zones",                 costCrore: "0",     impact: "savings" },
  ],
};

function LandUsePie({ landUse }) {
  if (!landUse) return null;
  const data = Object.entries(landUse).map(([name, value]) => ({ name, value }));
  return (
    <div className={styles.landUsePie}>
      <span className={styles.subTitle}>Land Use Breakdown</span>
      <div className={styles.luRow}>
        <ResponsiveContainer width={72} height={72}>
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" innerRadius={18} outerRadius={32} dataKey="value" paddingAngle={2}>
              {data.map((_, i) => <Cell key={i} fill={LAND_USE_COLORS[i % LAND_USE_COLORS.length]} />)}
            </Pie>
            <Tooltip content={({ active, payload }) =>
              active && payload?.length
                ? <div className={styles.luTooltip}><span>{payload[0].name}</span><span>{payload[0].value}%</span></div>
                : null}
            />
          </PieChart>
        </ResponsiveContainer>
        <ul className={styles.luLegend}>
          {data.map((d, i) => (
            <li key={d.name} className={styles.luItem}>
              <span className={styles.luDot} style={{ background: LAND_USE_COLORS[i % LAND_USE_COLORS.length] }} />
              <span className={styles.luName}>{d.name}</span>
              <span className={styles.luVal}>{d.value}%</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function CostRankedSteps({ level }) {
  const steps = COST_RANKED_STEPS[level] ?? COST_RANKED_STEPS.moderate;
  return (
    <div className={styles.stepsBlock}>
      <span className={styles.subTitle}>Actions — by cost-effectiveness</span>
      <ol className={styles.stepsList}>
        {steps.map((s, i) => (
          <li key={i} className={styles.stepItem}>
            <span className={styles.stepNum}>{i + 1}</span>
            <div className={styles.stepBody}>
              <span className={styles.stepAction}>{s.action}</span>
              <div className={styles.stepMeta}>
                <span className={styles.stepCost}>₹{s.costCrore} Cr</span>
                <span className={styles.stepImpact}>{s.impact}</span>
              </div>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

function Diagnostics({ city, selectedZone, stats, isLoading, isOptimizing }) {
  const [activeTab, setActiveTab] = useState("overview");

  if (isLoading) return (
    <aside className={styles.diagnostics}><SkeletonPanel count={4} /></aside>
  );
  if (!stats) return null;

  const hasZone = !!selectedZone;
  const data = hasZone
    ? { temp: selectedZone.temp, risk: selectedZone.riskScore, population: formatPopulation(selectedZone.population), recommendations: getRecommendations(selectedZone.level) }
    : { temp: stats.avgTemperature, risk: stats.avgRiskScore, population: stats.peopleAtRisk, recommendations: getCityDefaultRecommendations(city, stats) };

  return (
    <aside className={styles.diagnostics}>
      <div className={styles.header}>
        <span className={styles.headerTitle}>Diagnostics</span>
        {hasZone && <span className={styles.zoneBadge}>Zone {selectedZone.id}</span>}
      </div>

      {hasZone && (
        <div className={styles.tabBar}>
          {["overview","deepdive"].map(t => (
            <button key={t}
              className={`${styles.tab} ${activeTab === t ? styles.tabActive : ""}`}
              onClick={() => setActiveTab(t)} type="button">
              {t === "overview" ? "Overview" : "Deep Dive"}
            </button>
          ))}
        </div>
      )}

      {isOptimizing && (
        <div className={styles.optimizingBanner}>
          <span className={styles.spinner} /> Optimizing...
        </div>
      )}

      {/* ── OVERVIEW ── */}
      {(!hasZone || activeTab === "overview") && (
        <div className={styles.tabContent}>
          <div className={styles.metrics}>
            <MetricCard label="Temperature" value={<AnimatedNumber value={Number(data.temp)||0} decimals={1} suffix="°C" />} unit="LST" color="orange" />
            <MetricCard label="Risk Score"  value={<AnimatedNumber value={Number(data.risk)||0}  decimals={0} />} unit="/ 100" color="orange" />
            <MetricCard label="Population"  value={data.population} unit="at risk" color="teal" />
          </div>

          <div className={styles.riskBar}>
            <div className={styles.riskBarHeader}>
              <span>Risk Level</span>
              <span className={styles.riskValue}>{formatRisk(data.risk)}%</span>
            </div>
            <div className={styles.riskTrack}>
              <div className={styles.riskFill} style={{ width: `${Math.min(Number(data.risk)||0, 100)}%` }} />
            </div>
          </div>

          <div className={styles.recommendations}>
            <div className={styles.recHeader}><span className={styles.recIcon}>◆</span><span>Recommendations</span></div>
            <ul className={styles.recList}>
              {(data.recommendations ?? []).map((rec, i) => (
                <li key={i} className={styles.recItem}>
                  <span className={styles.recDot} />
                  {rec}
                </li>
              ))}
            </ul>
          </div>

          {hasZone && selectedZone.intervention && (
            <div className={styles.interventionChip}>
              <span className={styles.chipIcon}>{selectedZone.interventionIcon ?? "⚙️"}</span>
              <div className={styles.chipBody}>
                <span className={styles.chipLabel}>Recommended intervention</span>
                <span className={styles.chipName}>{selectedZone.intervention.replace(/_/g," ").replace(/\b\w/g, c => c.toUpperCase())}</span>
              </div>
              <div className={styles.chipStats}>
                <span className={styles.chipStat}>₹{selectedZone.interventionCostCrore}Cr</span>
                <span className={styles.chipStat}>−{selectedZone.coolingImpactC}°C</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── DEEP DIVE ── */}
      {hasZone && activeTab === "deepdive" && (
        <div className={`${styles.tabContent} ${styles.deepDive}`}>
          <div className={styles.driverBlock}>
            <span className={styles.subTitle}>Why it's hot</span>
            <div className={styles.driverCard}>
              <span className={styles.driverIcon}>🌡️</span>
              <div>
                <span className={styles.driverLabel}>Dominant driver</span>
                <span className={styles.driverText}>{selectedZone.dominantDriver ?? "Urban heat island effect"}</span>
              </div>
            </div>
          </div>

          <LandUsePie landUse={selectedZone.landUse} />

          <div className={styles.metaGrid}>
            {[
              { label: "Area",       value: `${selectedZone.areaKm2 ?? "—"} km²` },
              { label: "Excess LST", value: `+${selectedZone.meanExcessC ?? "—"}°C` },
              { label: "Peak LST",   value: `${selectedZone.maxLstC ?? "—"}°C` },
              { label: "Cover",      value: (selectedZone.lulc ?? "built_up").replace(/_/g," ") },
            ].map(({ label, value }) => (
              <div key={label} className={styles.metaCard}>
                <span className={styles.metaLabel}>{label}</span>
                <span className={styles.metaValue}>{value}</span>
              </div>
            ))}
          </div>

          <div className={styles.impactRow}>
            {[
              { label: "Cooling",   value: `−${selectedZone.coolingImpactC}°C`,                          color: "future" },
              { label: "Protected", value: `${selectedZone.peopleProtected}K`,                            color: "live" },
              { label: "Risk Δ",    value: `−${selectedZone.riskScoreChange} pts`,                        color: "heat" },
              { label: "Timeline",  value: `${selectedZone.timelineWeeksMin}–${selectedZone.timelineWeeksMax}w`, color: "live" },
            ].map(({ label, value, color }) => (
              <div key={label} className={`${styles.impactCard} ${styles[`impact_${color}`]}`}>
                <span className={styles.impactVal}>{value}</span>
                <span className={styles.impactLbl}>{label}</span>
              </div>
            ))}
          </div>

          <CostRankedSteps level={selectedZone.level} />
        </div>
      )}
    </aside>
  );
}

function MetricCard({ label, value, unit, color }) {
  return (
    <div className={`${styles.metricCard} ${styles[color]}`}>
      <span className={styles.metricLabel}>{label}</span>
      <span className={styles.metricValue}>{value}</span>
      <span className={styles.metricUnit}>{unit}</span>
    </div>
  );
}

export default memo(Diagnostics);
