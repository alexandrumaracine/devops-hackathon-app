import fs from "node:fs";

const openaiKey = process.env.OPENAI_API_KEY;
if (!openaiKey) {
  console.error("Missing OPENAI_API_KEY env var.");
  process.exit(1);
}

const summaryPath = process.argv[2] || "summary.json";
const replicasPath = process.argv[3] || "replicas.ndjson";

const summaryRaw = fs.existsSync(summaryPath) ? fs.readFileSync(summaryPath, "utf8") : "{}";
const replicasRaw = fs.existsSync(replicasPath) ? fs.readFileSync(replicasPath, "utf8") : "";

let summary;
try { summary = JSON.parse(summaryRaw); }
catch { summary = { _parseError: true, raw: summaryRaw.slice(0, 20000) }; }

const replicasSample = replicasRaw.split("\n").filter(Boolean).slice(-400).join("\n");

const prompt = `
You are a senior SRE and performance engineer.

You are given results from a short autoscaling load test on Azure Container Apps.

Inputs:
(A) k6 summary JSON
(B) Replica timeline (ndjson, timestamped)
(C) Azure metrics timeline (ndjson, timestamped) including:
    - Requests
    - RequestsPerSecond
    - CPU usage
    - Memory usage

Your goals:
1) Explain application performance (latency, errors, throughput).
2) Correlate k6 load stages with:
   - replica count changes
   - CPU / memory usage
   - request volume
3) Determine WHY autoscaling happened (or didn’t).
4) Identify scaling lag and likely root cause.
5) Give concrete, actionable recommendations.

Strict output format:

# Executive summary (max 5 lines)

# Load & performance
- Requests/s:
- Error rate:
- p95 latency:
- Notes:

# Autoscaling analysis
- When scale-out started:
- Replica progression:
- Scaling lag (seconds):
- Stability after scale-out:

# Resource & metrics analysis
- CPU behavior:
- Memory behavior:
- Traffic pattern:

# Root cause hypothesis
- ...

# Recommendations
- Scaling rules:
- Resource sizing:
- App or test changes:

(A) k6 summary:
${JSON.stringify(summary).slice(0, 120000)}

(B) replicas timeline:
${replicasSample || "(none)"}

(C) metrics timeline:
${metricsRaw.split("\n").slice(-200).join("\n") || "(none)"}
`.trim();

async function run() {
  const resp = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${openaiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-5 mini",
      input: prompt,
      // optional: store: false, // if you want to disable storage
    }),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    console.error("OpenAI API error:", resp.status, errText);
    process.exit(1);
  }

  const data = await resp.json();

  const chunks = [];
  if (Array.isArray(data.output)) {
    for (const item of data.output) {
      if (Array.isArray(item.content)) {
        for (const c of item.content) {
          if (c.type === "output_text" && typeof c.text === "string") chunks.push(c.text);
        }
      }
    }
  }

  const out = chunks.join("\n").trim() || JSON.stringify(data, null, 2);
  console.log(out);
  fs.writeFileSync("ai_report.md", out + "\n");
}

run().catch((e) => {
  console.error("Failed:", e);
  process.exit(1);
});
