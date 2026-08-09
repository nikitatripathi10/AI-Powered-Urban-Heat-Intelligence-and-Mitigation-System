import { jsPDF } from "jspdf";
import { formatPopulation, formatTemperature, formatRisk } from "./formatters";

export function exportReport({ city, stats, hotspots }) {
  const doc = new jsPDF();
  const margin = 20;
  let y = margin;

  doc.setFontSize(20);
  doc.setTextColor(255, 107, 43);
  doc.text("THERMA — Urban Heat Intelligence", margin, y);
  y += 12;

  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Report generated: ${new Date().toLocaleString()}`, margin, y);
  y += 16;

  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text(`City: ${city}`, margin, y);
  y += 10;

  doc.setFontSize(11);
  const lines = [
    `Zones Mapped: ${stats?.zonesMapped ?? 0}`,
    `Critical Zones: ${stats?.criticalZones ?? 0}`,
    `People at Risk: ${stats?.peopleAtRisk ?? "0K"}`,
    `Average Temperature: ${formatTemperature(stats?.avgTemperature ?? 0)}`,
    `Average Risk Score: ${formatRisk(stats?.avgRiskScore ?? 0)}`,
    `Protected Population: ${stats?.protectedPopulation ?? "0K"}`,
  ];

  lines.forEach((line) => {
    doc.text(line, margin, y);
    y += 8;
  });

  y += 8;
  doc.setFontSize(12);
  doc.text("Top Hotspots", margin, y);
  y += 10;

  doc.setFontSize(9);
  const topHotspots = [...(hotspots ?? [])]
    .sort((a, b) => b.riskScore - a.riskScore)
    .slice(0, 10);

  topHotspots.forEach((h) => {
    if (y > 270) {
      doc.addPage();
      y = margin;
    }
    doc.text(
      `Zone ${h.id} | ${h.level} | ${formatTemperature(h.temp)} | Risk: ${formatRisk(h.riskScore)} | Pop: ${formatPopulation(h.population)}`,
      margin,
      y
    );
    y += 7;
  });

  doc.save(`therma-report-${city.toLowerCase()}-${Date.now()}.pdf`);
}
