import { memo, useCallback, useState, useEffect } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts";
import { exportReport } from "../utils/exportReport";
import { fetchInterventionPlan } from "../utils/api";
import AnimatedNumber from "./AnimatedNumber";
import styles from "./BottomPanel.module.css";

const ALLOC_COLORS = ["#4ade80","#38bdf8","#f97316","#fbbf24","#a78bfa","#f43f5e","#34d399","#fb923c"];

const Tip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className={styles.tooltip}>
      {label && <span className={styles.ttLabel}>{label}</span>}
      {payload.map((p, i) => (
        <span key={i} className={styles.ttVal} style={{ color: p.color ?? "var(--good)" }}>
          {p.name}: {typeof p.value === "number" ? p.value.toFixed(2) : p.value}
        </span>
      ))}
    </div>
  );
};

function BottomPanel({ budget, onBudgetChange, onBudgetCommit, onReoptimize, isOptimizing, stats, city, hotspots, isSimulating, onToggleSimulation }) {
  const [activeTab, setActiveTab] = useState("outcomes");
  const [plan, setPlan]           = useState(null);
  const [planLoading, setPlanLoading] = useState(false);

  const tempReduction = stats?.tempReduction ?? (budget / 100) * 4.2;
  const protectedPop  = stats?.protectedPopulation ?? "0K";
  const budgetMrs     = (budget * 0.5).toFixed(1);

  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(() => {
      setPlanLoading(true);
      fetchInterventionPlan(city, budget)
        .then(d => { if (!cancelled) setPlan(d); })
        .catch(() => {})
        .finally(() => { if (!cancelled) setPlanLoading(false); });
    }, 400);
    return () => { cancelled = true; clearTimeout(t); };
  }, [city, budget]);

  const handleExport = useCallback(() => exportReport({ city, stats, hotspots, plan }), [city, stats, hotspots, plan]);

  const allocData = plan?.budgetAllocation
    ? Object.entries(plan.budgetAllocation).map(([k,v],i) => ({
        name: k.replace(/_/g," ").replace(/\b\w/g,c=>c.toUpperCase()),
        value: v, color: ALLOC_COLORS[i % ALLOC_COLORS.length],
      }))
    : [];

  const priorityZones = plan?.zonePlans?.slice(0,8) ?? [];
  const curveData     = plan?.costImpactCurve ?? [];

  return (
    <div className={styles.bottomPanel}>
      {/* slider */}
      <div className={styles.sliderSection}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTitle}>Budget</span>
          <span className={styles.budgetValue}>₹{budgetMrs}M</span>
        </div>
        <div className={styles.sliderWrap}>
          <input type="range" min="0" max="100" value={budget}
            onChange={e => onBudgetChange(Number(e.target.value))}
            onMouseUp={e => onBudgetCommit?.(Number(e.target.value))}
            onTouchEnd={e => onBudgetCommit?.(Number(e.target.value))}
            className={styles.slider} aria-label="Intervention budget"
          />
          <div className={styles.sliderTrack}>
            <div className={styles.sliderFill} style={{ width: `${budget}%` }} />
          </div>
        </div>
        <div className={styles.sliderLabels}><span>₹0M</span><span>₹50M</span></div>
      </div>

      <div className={styles.divider} />

      {/* tabbed data */}
      <div className={styles.dataSection}>
        <div className={styles.tabBar}>
          {[{id:"outcomes",label:"Projected"},{id:"allocation",label:"Allocation"},{id:"curve",label:"Curve"}].map(t => (
            <button key={t.id}
              className={`${styles.tab} ${activeTab === t.id ? styles.tabActive : ""}`}
              onClick={() => setActiveTab(t.id)} type="button">{t.label}</button>
          ))}
        </div>

        <div className={styles.tabPane}>
          {/* OUTCOMES */}
          {activeTab === "outcomes" && (
            <div className={styles.outcomes}>
              <OutcomeCard label="Temp reduction" value={<>−<AnimatedNumber value={tempReduction} decimals={1} suffix="°C" /></>} sub="projected" accent="future" />
              <OutcomeCard label="Protected pop." value={protectedPop} sub="people" accent="future" />
              <OutcomeCard label="Budget" value={`₹${budgetMrs}M`} sub="allocated" accent="live" />
            </div>
          )}

          {/* ALLOCATION */}
          {activeTab === "allocation" && (
            <div className={styles.allocPane}>
              {planLoading ? <span className={styles.loadingText}>loading…</span> : allocData.length === 0 ? <span className={styles.loadingText}>no data</span> : (
                <>
                  <div className={styles.allocChart}>
                    <ResponsiveContainer width={80} height={80}>
                      <PieChart>
                        <Pie data={allocData} cx="50%" cy="50%" innerRadius={22} outerRadius={36} dataKey="value" paddingAngle={2}>
                          {allocData.map((d,i) => <Cell key={i} fill={d.color} />)}
                        </Pie>
                        <Tooltip content={({active,payload}) => active&&payload?.length ? <div className={styles.tooltip}><span className={styles.ttLabel}>{payload[0].name}</span><span className={styles.ttVal}>₹{payload[0].value}Cr</span></div> : null} />
                      </PieChart>
                    </ResponsiveContainer>
                    <ul className={styles.allocLegend}>
                      {allocData.map(d => (
                        <li key={d.name} className={styles.allocItem}>
                          <span className={styles.allocDot} style={{ background: d.color }} />
                          <span className={styles.allocName}>{d.name}</span>
                          <span className={styles.allocVal}>₹{d.value}Cr</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className={styles.priorityList}>
                    <span className={styles.priorityTitle}>Spend order</span>
                    {priorityZones.map((z,i) => (
                      <div key={z.zoneId} className={styles.priorityRow}>
                        <span className={styles.priorityRank}>{i+1}</span>
                        <span className={styles.priorityZone}>Z{z.zoneId}</span>
                        <span className={`${styles.priorityLevel} ${styles[`level_${z.level}`]}`}>{z.level}</span>
                        <span className={styles.priorityCost}>₹{z.costCrore}Cr</span>
                        <span className={styles.priorityImpact}>−{z.coolingImpactC}°C</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* CURVE */}
          {activeTab === "curve" && (
            <div className={styles.curvePane}>
              {planLoading ? <span className={styles.loadingText}>loading…</span> : curveData.length === 0 ? <span className={styles.loadingText}>no data</span> : (
                <>
                  <span className={styles.curveLabel}>Cooling °C per ₹Crore</span>
                  <ResponsiveContainer width="100%" height={76}>
                    <LineChart data={curveData} margin={{top:4,right:8,bottom:0,left:-20}}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="budget" tick={{fill:"var(--text-dim)",fontSize:8}} axisLine={false} tickLine={false} tickFormatter={v=>`₹${v}`} />
                      <YAxis tick={{fill:"var(--text-dim)",fontSize:8}} axisLine={false} tickLine={false} />
                      <Tooltip content={<Tip />} />
                      <Line type="monotone" dataKey="coolingC" stroke="var(--good)" strokeWidth={1.5} dot={false} name="Cooling °C" />
                    </LineChart>
                  </ResponsiveContainer>
                  <span className={styles.curveNote}>Diminishing returns after ₹{curveData[Math.floor(curveData.length*0.4)]?.budget ?? "—"}Cr</span>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <div className={styles.divider} />

      {/* actions */}
      <div className={styles.actions}>
        <button className={`${styles.simBtn} ${isSimulating ? styles.simActive : ""}`}
          onClick={onToggleSimulation} type="button">
          {isSimulating ? "■ Stop" : "▶ Simulate"}
        </button>
        <button className={styles.exportBtn} onClick={handleExport} type="button">↓ Export PDF</button>
        <button className={styles.optimizeBtn} onClick={onReoptimize} disabled={isOptimizing} type="button">
          {isOptimizing ? <span className={styles.spinner} /> : <span className={styles.btnIcon}>◆</span>}
          {isOptimizing ? "Optimizing…" : "Run AI Optimization"}
        </button>
      </div>
    </div>
  );
}

function OutcomeCard({ label, value, sub, accent = "future" }) {
  return (
    <div className={`${styles.outcomeCard} ${styles[`accent_${accent}`]}`}>
      <span className={styles.outcomeLabel}>{label}</span>
      <span className={styles.outcomeValue}>{value}</span>
      <span className={styles.outcomeSub}>{sub}</span>
    </div>
  );
}

export default memo(BottomPanel);
