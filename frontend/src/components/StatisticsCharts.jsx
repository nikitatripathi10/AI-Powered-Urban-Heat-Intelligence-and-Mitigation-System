import { memo, useMemo } from "react";
import { motion } from "framer-motion";
import {
  PieChart, Pie, Cell,
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";
import styles from "./StatisticsCharts.module.css";

const LEVEL_COLORS = {
  extreme: "#f43f5e",
  high:    "#f97316",
  moderate:"#fbbf24",
  safe:    "#4ade80",
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className={styles.tooltip}>
      <span className={styles.tooltipLabel}>{label ?? payload[0]?.name}</span>
      <span className={styles.tooltipValue}>{payload[0]?.value}</span>
    </div>
  );
};

function StatisticsCharts({ hotspots, stats, isLoading, sectionLabel }) {
  const pieData = useMemo(() => {
    if (!stats?.levelDistribution) return [];
    return Object.entries(stats.levelDistribution)
      .filter(([, count]) => count > 0)
      .map(([level, count]) => ({
        name: level.charAt(0).toUpperCase() + level.slice(1),
        value: count,
        color: LEVEL_COLORS[level],
      }));
  }, [stats]);

  const barData = useMemo(() => {
    if (!hotspots?.length) return [];
    return hotspots.slice(0, 8).map((h) => ({
      name: `Z${h.id}`,
      temp: Number(h.temp) || 0,
    }));
  }, [hotspots]);

  const heatData = useMemo(() => {
    if (!hotspots?.length) return [];
    const buckets = [
      { range: "30-35°C", count: 0 },
      { range: "35-40°C", count: 0 },
      { range: "40-45°C", count: 0 },
      { range: "45-50°C", count: 0 },
    ];
    hotspots.forEach((h) => {
      const t = Number(h.temp) || 0;
      if (t < 35) buckets[0].count++;
      else if (t < 40) buckets[1].count++;
      else if (t < 45) buckets[2].count++;
      else buckets[3].count++;
    });
    return buckets;
  }, [hotspots]);

  if (isLoading) {
    return (
      <div className={styles.charts}>
        <div className={styles.chartSkeleton} />
        <div className={styles.chartSkeleton} />
      </div>
    );
  }

  if (!hotspots?.length) return null;

  return (
    <motion.div
      className={styles.charts}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      {sectionLabel && (
        <div className={styles.sectionHeader}>
          <span className={styles.sectionDot} />
          <span className={styles.sectionLabel}>{sectionLabel}</span>
        </div>
      )}

      <div className={styles.chartBlock}>
        <span className={styles.chartTitle}>Risk Distribution</span>
        <ResponsiveContainer width="100%" height={120}>
          <PieChart>
            <Pie data={pieData} cx="50%" cy="50%" innerRadius={30} outerRadius={50} paddingAngle={3} dataKey="value">
              {pieData.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className={styles.chartBlock}>
        <span className={styles.chartTitle}>Zone Temperatures</span>
        <ResponsiveContainer width="100%" height={120}>
          <BarChart data={barData} barSize={12}>
            <XAxis dataKey="name" tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 9 }} axisLine={false} tickLine={false} />
            <YAxis hide domain={[30, 50]} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="temp" fill="var(--heat-primary)" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className={styles.chartBlock}>
        <span className={styles.chartTitle}>Heat Distribution</span>
        <ResponsiveContainer width="100%" height={100}>
          <BarChart data={heatData} barSize={16}>
            <XAxis dataKey="range" tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 8 }} axisLine={false} tickLine={false} />
            <YAxis hide />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="count" fill="var(--live-primary)" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}

export default memo(StatisticsCharts);
