import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine, LabelList } from "recharts";
import { fetchModelMetrics, fetchScenarios } from "../utils/api";
import styles from "./Analytics.module.css";

const SCENARIO_COLORS = ["#4ade80","#38bdf8","#f97316","#fbbf24","#a78bfa"];

const FEATURE_ICONS = {
  impervious_fraction:"🏗️", ndvi:"🌿", albedo:"☀️", sky_view_factor:"🌌",
  building_height_m:"🏢", building_density:"🏘️", inv_dist_to_water:"💧",
  air_temp_c:"🌡️", humidity_pct:"💦", wind_speed_ms:"🌬️",
};

const Tip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className={styles.tooltip}>
      <span className={styles.ttLabel}>{label}</span>
      {payload.map((p,i) => <span key={i} className={styles.ttVal} style={{ color:p.color }}>{p.name}: {p.value}°C</span>)}
    </div>
  );
};

export default function Analytics() {
  const [metrics, setMetrics]     = useState(null);
  const [scenarios, setScenarios] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [enabled, setEnabled]     = useState(new Set());
  const [maxCount, setMaxCount]   = useState(null);

  useEffect(() => {
    Promise.all([fetchModelMetrics(), fetchScenarios()])
      .then(([m, s]) => {
        setMetrics(m);
        const sc = s.scenarios ?? [];
        setScenarios(sc);
        setEnabled(new Set(sc.map(x => x.intervention)));
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const toggleScenario = id =>
    setEnabled(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const displayScenarios = scenarios
    .filter(s => enabled.has(s.intervention))
    .slice(0, maxCount ?? scenarios.length);

  const barData = displayScenarios.map((s,i) => ({
    name: s.label.length > 26 ? s.label.slice(0,24)+"…" : s.label,
    "Mean (°C)": s.mean_reduction_c,
    "Max (°C)":  s.max_reduction_c,
    color: SCENARIO_COLORS[i % SCENARIO_COLORS.length],
  }));

  const cumulative = displayScenarios.reduce((sum,s) => sum+s.mean_reduction_c, 0).toFixed(2);

  if (loading) return (
    <div className={styles.page}>
      <div className={styles.skeletonList}>{[...Array(3)].map((_,i)=><div key={i} className={styles.skeleton}/>)}</div>
    </div>
  );
  if (error) return <div className={styles.page}><div className={styles.error}>Error: {error}</div></div>;

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Analytics</h1>
        <span className={styles.pageSub}>ML model performance · cooling scenario comparison</span>
      </div>

      <div className={styles.grid}>
        {metrics && (
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <span className={styles.cardTitle}>Model Performance</span>
              <span className={styles.cardBadge}>Random Forest</span>
            </div>
            <div className={styles.metricsRow}>
              <div className={styles.metricPill}>
                <span className={styles.metricVal} style={{ color:"var(--good)" }}>{metrics.mae_c}°C</span>
                <span className={styles.metricLbl}>MAE</span>
              </div>
              <div className={styles.metricPill}>
                <span className={styles.metricVal} style={{ color:"var(--accent)" }}>{metrics.r2}</span>
                <span className={styles.metricLbl}>R²</span>
              </div>
              <div className={styles.metricPill}>
                <span className={styles.metricVal} style={{ color:"var(--warn)" }}>{metrics.features?.length}</span>
                <span className={styles.metricLbl}>Features</span>
              </div>
            </div>
            <div className={styles.featureGrid}>
              {(metrics.features ?? []).map(f => (
                <div key={f} className={styles.featureChip}>
                  <span>{FEATURE_ICONS[f] ?? "📊"}</span>
                  <span>{f.replace(/_/g," ")}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className={`${styles.card} ${styles.wideCard}`}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>Cooling Scenario Comparison</span>
            <div className={styles.headerControls}>
              <span className={styles.cumLabel}>
                Total: <strong style={{ color:"var(--good)" }}>−{cumulative}°C</strong>
              </span>
              <select className={styles.maxSelect} value={maxCount??""} onChange={e=>setMaxCount(e.target.value?Number(e.target.value):null)}>
                <option value="">All</option>
                {[1,2,3,4].map(n=><option key={n} value={n}>Top {n}</option>)}
              </select>
            </div>
          </div>

          <div className={styles.toggleRow}>
            {scenarios.map((s,i) => (
              <button key={s.intervention}
                className={`${styles.scenarioChip} ${enabled.has(s.intervention)?styles.scenarioActive:""}`}
                style={enabled.has(s.intervention)?{borderColor:SCENARIO_COLORS[i%SCENARIO_COLORS.length],color:SCENARIO_COLORS[i%SCENARIO_COLORS.length]}:undefined}
                onClick={()=>toggleScenario(s.intervention)} type="button">
                {s.label.split("(")[0].trim()}
              </button>
            ))}
          </div>

          {barData.length === 0
            ? <div className={styles.emptyChart}>Select at least one scenario</div>
            : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={barData} layout="vertical" margin={{left:0,right:40,top:6,bottom:2}}>
                  <CartesianGrid horizontal={false} stroke="rgba(255,255,255,0.04)" />
                  <XAxis type="number" domain={[0,"dataMax + 0.5"]}
                    tick={{fill:"var(--text-dim)",fontSize:9}} axisLine={false} tickLine={false}
                    tickFormatter={v=>`${v}°C`} />
                  <YAxis type="category" dataKey="name" width={160}
                    tick={{fill:"var(--text-sub)",fontSize:9}} axisLine={false} tickLine={false} />
                  <Tooltip content={<Tip />} />
                  <ReferenceLine x={0} stroke="rgba(255,255,255,0.08)" />
                  <Bar dataKey="Mean (°C)" barSize={12} radius={[0,3,3,0]}>
                    {barData.map((d,i)=><Cell key={i} fill={d.color} fillOpacity={0.8}/>)}
                    <LabelList dataKey="Mean (°C)" position="right" formatter={v=>`${v}°C`}
                      style={{fill:"var(--text-sub)",fontSize:9}} />
                  </Bar>
                  <Bar dataKey="Max (°C)" barSize={5} radius={[0,3,3,0]}>
                    {barData.map((d,i)=><Cell key={i} fill={d.color} fillOpacity={0.3}/>)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )
          }

          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>{["Intervention","Cells","Mean red.","Max red.","Baseline","Scenario"].map(h=><th key={h} className={styles.th}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {displayScenarios.map((s,i) => (
                  <tr key={s.intervention} className={styles.tr}>
                    <td className={styles.td} style={{color:SCENARIO_COLORS[i%SCENARIO_COLORS.length]}}>{s.label}</td>
                    <td className={styles.td}>{s.n_cells_treated}</td>
                    <td className={styles.td}>{s.mean_reduction_c}°C</td>
                    <td className={styles.td}>{s.max_reduction_c}°C</td>
                    <td className={styles.td}>{s.baseline_mean_lst}°C</td>
                    <td className={styles.td}>{s.scenario_mean_lst}°C</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
