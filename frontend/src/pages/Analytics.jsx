import { useEffect, useState } from "react";
import { fetchModelMetrics, fetchScenarios } from "../utils/api";

export default function Analytics() {
  const [metrics, setMetrics] = useState(null);
  const [scenarios, setScenarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([fetchModelMetrics(), fetchScenarios()])
      .then(([metricsData, scenariosData]) => {
        setMetrics(metricsData);
        setScenarios(scenariosData.scenarios ?? []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ padding: "2rem" }}>Loading analytics…</div>;
  if (error) return <div style={{ padding: "2rem", color: "red" }}>Error: {error}</div>;

  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>Analytics</h1>

      {metrics && (
        <section style={{ marginBottom: "2rem" }}>
          <h2>Model Performance</h2>
          <p>MAE: {metrics.mae_c} °C</p>
          <p>R²: {metrics.r2}</p>
          <h3>Input Features</h3>
          <ul>
            {metrics.features.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2>Cooling Scenario Effectiveness</h2>
        <table style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead>
            <tr>
              {["Intervention", "Cells treated", "Mean reduction (°C)", "Max reduction (°C)", "Baseline LST (°C)", "Scenario LST (°C)"].map(
                (h) => (
                  <th
                    key={h}
                    style={{ border: "1px solid #ccc", padding: "0.5rem", textAlign: "left" }}
                  >
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {scenarios.map((s) => (
              <tr key={s.intervention}>
                <td style={{ border: "1px solid #ccc", padding: "0.5rem" }}>{s.label}</td>
                <td style={{ border: "1px solid #ccc", padding: "0.5rem" }}>{s.n_cells_treated}</td>
                <td style={{ border: "1px solid #ccc", padding: "0.5rem" }}>{s.mean_reduction_c}</td>
                <td style={{ border: "1px solid #ccc", padding: "0.5rem" }}>{s.max_reduction_c}</td>
                <td style={{ border: "1px solid #ccc", padding: "0.5rem" }}>{s.baseline_mean_lst}</td>
                <td style={{ border: "1px solid #ccc", padding: "0.5rem" }}>{s.scenario_mean_lst}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
