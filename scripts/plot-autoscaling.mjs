import fs from "fs";
import { ChartJSNodeCanvas } from "chartjs-node-canvas";

const width = 1200;
const height = 600;
const chart = new ChartJSNodeCanvas({ width, height });

function readNDJSON(file) {
  return fs
    .readFileSync(file, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((line, idx) => {
      try {
        return JSON.parse(line);
      } catch (err) {
        console.warn(`⚠️ Invalid JSON at line ${idx + 1}, skipping`);
        return null;
      }
    })
    .filter(Boolean);
}

const replicas = readNDJSON("replicas.ndjson");
const metrics  = readNDJSON("metrics.ndjson");

/* ---------- Replica timeline ---------- */
const replicaLabels = replicas.map(r => r.ts);
const replicaCounts = replicas.map(r => r.replicaCount ?? 0);

const replicaConfig = {
  type: "line",
  data: {
    labels: replicaLabels,
    datasets: [{
      label: "Replica count",
      data: replicaCounts,
      tension: 0.1,
      fill: false
    }]
  },
  options: {
    plugins: { title: { display: true, text: "Azure Container Apps – Replica Count" }},
    scales: { y: { beginAtZero: true } }
  }
};

const replicaImage = await chart.renderToBuffer(replicaConfig);
fs.writeFileSync("replicas.png", replicaImage);

/* ---------- CPU / Memory timeline ---------- */
const cpuPoints = [];
const memPoints = [];
const metricLabels = [];

for (const m of metrics) {
  const rows = m?.logAnalytics?.tables?.[0]?.rows;
  if (!rows || rows.length === 0) continue;

  const row = rows[0];
  const cols = m.logAnalytics.tables[0].columns.map(c => c.name);
  const idx = n => cols.indexOf(n);

  metricLabels.push(m.ts);
  cpuPoints.push(row[idx("cpu_avg")] ?? null);
  memPoints.push(row[idx("mem_avg")] ?? null);
}

const resourceConfig = {
  type: "line",
  data: {
    labels: metricLabels,
    datasets: [
      { label: "CPU avg (%)", data: cpuPoints, yAxisID: "y" },
      { label: "Memory avg (bytes)", data: memPoints, yAxisID: "y1" }
    ]
  },
  options: {
    plugins: { title: { display: true, text: "Container Resource Usage" }},
    scales: {
      y: { position: "left", beginAtZero: true },
      y1: { position: "right", beginAtZero: true, grid: { drawOnChartArea: false } }
    }
  }
};

const resourceImage = await chart.renderToBuffer(resourceConfig);
fs.writeFileSync("resources.png", resourceImage);

console.log("Generated graphs:");
console.log("- replicas.png");
console.log("- resources.png");
