import { useEffect, useState } from "react";
import { fetchOptimizationResult } from "../utils/api";

export default function Compare() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchOptimizationResult()
      .then(setResult)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ padding: "2rem" }}>Loading comparison…</div>;
  if (error) return <div style={{ padding: "2rem", color: "red" }}>Error: {error}</div>;

  const beforeLST = result?.placements?.[0]
    ? (
        result.placements.reduce((s, p) => s + p.predicted_reduction_c, 0) /
          result.placements.length +
        40
      ).toFixed(1)
    : "—";

  const afterLST = (beforeLST - result?.mean_hotspot_reduction_c ?? 0).toFixed(1);

  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>Before vs After Optimization</h1>

      <div style={{ display: "flex", gap: "3rem", marginBottom: "2rem" }}>
        <div>
          <h2>Before</h2>
          <p>Baseline Mean LST: {beforeLST} °C</p>
          <p>Budget used: ₹{result.budget_used}M</p>
        </div>
        <div>
          <h2>After</h2>
          <p>Reduced Mean LST: {afterLST} °C</p>
          <p>
            Total reduction: {result.total_predicted_reduction_c} °C across{" "}
            {result.placements.length} zones
          </p>
        </div>
      </div>

      <h2>Intervention Mix</h2>
      <ul>
        {Object.entries(result.intervention_mix).map(([key, count]) => (
          <li key={key}>
            {key.replace(/_/g, " ")}: {count} zones
          </li>
        ))}
      </ul>
    </div>
  );
}
