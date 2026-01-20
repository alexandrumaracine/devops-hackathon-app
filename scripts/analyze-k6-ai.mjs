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
You are a senior SRE + performance engineer.

You will be given:
(A) k6 summary JSON
(B) a timeline of Azure Container Apps replica snapshots captured during the test.
Each replica snapshot is one JSON object per line with a timestamp.

Goals:
1) Interpret performance: throughput, latency (p50/p90/p95/p99 if present), error rate, checks, trends.
2) Interpret autoscaling: when replicas increased/decreased, whether scaling lagged behind load, any instability.
3) Provide actionable recommendations for Azure Container Apps scaling rules and app resources.

Output format (strict):
# Executive summary (max 6 lines)
- ...

# Key metrics
- Requests/s: ...
- Error rate: ...
- Latency: p50=..., p95=..., p99=...
- Duration: ...
- Notes: ...

# Autoscaling timeline insights
- ...

# Likely bottlenecks (ranked)
1) ...
2) ...

# Recommendations (concrete)
- Scaling rule adjustments: ...
- Resource adjustments (CPU/mem/concurrency): ...
- Test improvements: ...

Here is (A) k6 summary JSON:
${JSON.stringify(summary).slice(0, 120000)}

Here is (B) replicas timeline (ndjson, last ~400 lines):
${replicasSample || "(no replicas data)"}
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
