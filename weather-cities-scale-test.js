import http from "k6/http";
import { check, sleep } from "k6";

/**
 * City list to create realistic request variance
 */
const cities = [
  "Berlin", "London", "Paris", "Rome", "Madrid",
  "Vienna", "Prague", "Warsaw", "Budapest", "Brussels",
  "Amsterdam", "Copenhagen", "Stockholm", "Oslo",
  "Lisbon", "Dublin", "Zurich", "Munich",
  "Milan", "Venice", "Florence", "Naples",
  "Barcelona", "Valencia", "Seville",
  "Athens", "Bucharest", "Cluj-Napoca"
];

/**
 * Backend base URL
 */
const BASE_URL = __ENV.TARGET_URL;
if (!BASE_URL) {
  throw new Error("TARGET_URL env var is required");
}

/**
 * ~6–7 minutes total
 *
 * Goals:
 * - Fast ramp to trigger scale-out immediately
 * - Sustain high pressure to reach max replicas
 * - Observe latency stabilization after scaling
 * - Validate error-free behavior at capacity
 */
export const options = {
  stages: [
    { duration: "30s", target: 20 },   // fast warm-up
    { duration: "30s", target: 50 },   // force scale-out
    { duration: "1m",  target: 80 },   // heavy load
    { duration: "3m",  target: 100 },  // sustained pressure (max stress)
    { duration: "1m",  target: 0 },    // cool-down
  ],

  thresholds: {
    http_req_failed: ["rate<0.02"],      // <2% errors under stress
    http_req_duration: ["p(95)<3000"],   // p95 < 3s under load
  },

  tags: {
    test_type: "autoscaling-hard",
    app: "skycastnow-backend",
    duration: "6m",
  },
};

export default function () {
  const city = cities[Math.floor(Math.random() * cities.length)];
  const url = `${BASE_URL}/weather?city=${encodeURIComponent(city)}`;

  const res = http.get(url, {
    tags: { endpoint: "/weather" },
  });

  check(res, {
    "status is 200": (r) => r.status === 200,
  });

  /**
   * Small think time:
   * - keeps RPS high
   * - avoids unrealistically tight loops
   */
  sleep(0.2);
}
