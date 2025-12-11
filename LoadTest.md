📈 Performance Testing with Grafana Cloud & k6

This project integrates k6 performance testing with Grafana Cloud, allowing automated load testing from GitHub Actions and detailed visualization of performance metrics.

The goal is to evaluate how the weather API behaves under load, ensure stability under concurrent access, and provide visibility into performance characteristics over time.

🚀 Overview

The load test targets the production endpoint:

https://heythere.endavahub.net/api/weather?city=<city>


Five capital cities are selected randomly on each virtual-user iteration:

Berlin

London

Paris

Rome

Madrid

The test gradually ramps up to 100 virtual users, sustains load for several minutes, then cools down.

📜 k6 Load Test Script (weather-test.js)
import http from 'k6/http';
import { sleep, check } from 'k6';

export let options = {
  stages: [
    { duration: '2s', target: 2 },      // warm-up
    { duration: '200s', target: 100 },  // sustained load
    { duration: '3s', target: 2 },      // cool down
  ],
  insecureSkipTLSVerify: true, // remove if using valid SSL
};

// 5 capital cities
const cities = ["Berlin", "London", "Paris", "Rome", "Madrid"];

export default function () {
  const city = cities[Math.floor(Math.random() * cities.length)];
  const url = `https://heythere.endavahub.net/api/weather?city=${city}`;

  let res = http.get(url);

  check(res, {
    "status is 200": (r) => r.status === 200,
    "response time < 500ms": (r) => r.timings.duration < 500,
  });

  sleep(1);
}

⚙️ GitHub Actions Integration

The performance test is executed automatically using GitHub Actions.
A workflow triggers k6 inside a Docker container and sends results to Grafana Cloud:

docker run --rm \
  -e K6_CLOUD_TOKEN=$K6_CLOUD_TOKEN \
  -v ${{ github.workspace }}:/scripts \
  grafana/k6 cloud /scripts/k6/weather-test.js


A JSON performance report is also generated and uploaded as a pipeline artifact.

https://hackathondevops.grafana.net/a/k6-app/runs/6298409?insights=-open&tab=analysis

📊 Key Performance Metrics
VU (Virtual User)

A simulated user executing your script in parallel.

Stages

Stages define how traffic ramps up and down during the test.

P95 Response Time

95% of all requests completed faster than this measured value.
Useful for identifying tail-latency issues.

RPS (Requests per Second)

Indicates overall throughput and how many calls the API can serve under load.

VU-hours

Billing metric for Grafana Cloud.
(1 VU running for 1 hour = 1 VU-hour.)

🧪 Example Test Results Summary

From a sample run:

1.2k total requests

100 VUs running for several minutes

Peak throughput around ~7.6 requests/sec

0 HTTP failures

P95 latency around ~9.9 seconds

Interpretation

The API remained stable under heavy load.

Latency increased during high concurrency, which is expected under sustained pressure.

No errors were encountered, showing good backend resilience.

This test provides a useful baseline for tracking performance improvements over time.

🛠 Recommended Improvements
✔ Add Thresholds (automated pass/fail)

Convert your performance test into a CI "quality gate":

thresholds: {
  http_req_duration: ["p(95) < 1000"],
  http_req_failed: ["rate < 0.01"],
}

✔ Add Real Scenarios

Improve realism by using multiple parallel scenarios:

scenarios: {
  ramp_load: {
    executor: "ramping-vus",
    stages: [
      { duration: "30s", target: 50 },
      { duration: "2m", target: 100 },
      { duration: "30s", target: 0 },
    ],
  },
}

✔ Add Error Logging

Helpful for debugging:

if (res.status !== 200) {
  console.error(`Failed for ${city}: status ${res.status}`);
}

✔ Multiple Test Types

You can create separate profiles:

Smoke Test (1–5 VUs)

Load Test (20–50 VUs)

Stress Test (50–200+ VUs)

Spike Test (instant jump to 100 VUs)

✔ Add Tagging for Better Grafana Insights
tags: { endpoint: "weather-api" }

✅ Summary

This project includes a full performance testing pipeline using k6, Grafana Cloud, and GitHub Actions, providing consistent visibility into API performance.

What works well today:

Automatic load testing pipeline

Live visualization in Grafana Cloud

Ability to scale up to 100+ VUs

Stable API responses under significant load

Ability to expand into more complex performance scenarios

This foundation supports continuous optimization of application responsiveness and stability.