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
 * ~10 minutes total
 *
 * Goals:
 * - Gradual warm-up (avoid cold-start bias)
 * - Trigger first scale-out
 * - Observe stabilization under sustained load
 * - Push higher load to test scaling limits
 * - Allow scale-in during cool-down
 */
export const options = {
  stages: [
    { duration: "1m", target: 30 },    // warm-up
    { duration: "2m", target: 120 },   // first scale-out
    { duration: "3m", target: 220 },   // sustained load (steady state)
    { duration: "2m", target: 350 },   // higher pressure / next scale-out
    { duration: "2m", target: 0 },     // cool-down / scale-in
  ],

  thresholds: {
    http_req_failed: ["rate<0.02"],        // <2% errors
    http_req_duration: ["p(95)<4000"],     // p95 < 4s
  },

  /**
   * Tags used later by AI for context
   */
  tags: {
    test_type: "autoscaling-long",
    app: "skycastnow-backend",
    duration: "10m",
  },
};

export default function () {
  const city = cities[Math.floor(Math.random() * cities.length)];
  const url = `${BASE_URL}/weather?city=${encodeURIComponent(city)}`;

  const res = http.get(url);

  check(res, {
    "status is 200": (r) => r.status === 200,
  });

  /**
   * Small think time:
   * - Keeps concurrency high
   * - Still realistic for user behavior
   */
  sleep(0.2);
}
