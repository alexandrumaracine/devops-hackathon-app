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
 * ~4 minutes total
 *
 * Goals:
 * - Warm-up without stressing OpenWeather
 * - Light concurrency increase
 * - Observe latency stability
 * - CI-safe execution
 */
export const options = {
  stages: [
    { duration: "30s", target: 5 },   // warm-up
    { duration: "1m", target: 15 },   // light load
    { duration: "1m", target: 30 },   // moderate sustained load
    { duration: "1m", target: 40 },   // peak (safe)
    { duration: "30s", target: 0 },   // cool-down
  ],

  thresholds: {
    http_req_failed: ["rate<0.01"],        // <1% errors
    http_req_duration: ["p(95)<2500"],     // p95 < 2.5s
  },

  tags: {
    test_type: "autoscaling-light",
    app: "skycastnow-backend",
    duration: "4m",
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
   * Increased think time:
   * - lowers request rate
   * - reduces OpenWeather pressure
   * - still realistic for user behavior
   */
  sleep(0.5);
}
