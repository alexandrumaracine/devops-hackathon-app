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
 * Backend base URL (Azure Container App)
 */
const BASE_URL = __ENV.TARGET_URL;
if (!BASE_URL) {
  throw new Error("TARGET_URL env var is required");
}

/**
 * ~3.5 minutes total
 * Designed to:
 * - Warm up quickly
 * - Trigger at least one scale-out
 * - Observe stabilization
 */
export const options = {
  stages: [
    { duration: "45s", target: 30 },   // warm-up
    { duration: "60s", target: 120 },  // trigger scale-out
    { duration: "60s", target: 220 },  // sustained pressure
    { duration: "30s", target: 0 },    // cool-down
  ],

  thresholds: {
    http_req_failed: ["rate<0.02"],
    http_req_duration: ["p(95)<3500"],
  },

  tags: {
    test_type: "autoscaling-short",
    app: "skycastnow-backend",
  },
};

export default function () {
  const city = cities[Math.floor(Math.random() * cities.length)];
  const url = `${BASE_URL}/weather?city=${encodeURIComponent(city)}`;

  const res = http.get(url);

  check(res, {
    "status is 200": (r) => r.status === 200,
  });

  // keep concurrency high
  sleep(0.15);
}
