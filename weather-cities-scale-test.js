import http from "k6/http";
import { check, sleep } from "k6";

/**
 * City list to create realistic request variance
 * (prevents cache-only behavior)
 */
const cities = [
  "Berlin", "London", "Paris", "Rome", "Madrid",
  "Vienna", "Prague", "Warsaw", "Budapest", "Brussels",
  "Amsterdam", "Copenhagen", "Stockholm", "Oslo", "Helsinki",
  "Lisbon", "Dublin", "Zurich", "Geneva", "Munich",
  "Hamburg", "Cologne", "Frankfurt", "Stuttgart", "Dusseldorf",
  "Milan", "Turin", "Venice", "Florence", "Naples",
  "Barcelona", "Valencia", "Seville", "Bilbao", "Malaga",
  "Athens", "Thessaloniki", "Sofia", "Bucharest", "Cluj-Napoca",
  "Zagreb", "Ljubljana", "Belgrade", "Sarajevo", "Skopje",
  "Tirana", "Podgorica"
];

/**
 * Backend base URL (Azure Container App)
 * This MUST be passed from GitHub Actions
 */
const BASE_URL = __ENV.TARGET_URL;

if (!BASE_URL) {
  throw new Error("TARGET_URL env var is required");
}

/**
 * Test profile designed to:
 * - Warm up
 * - Trigger autoscaling
 * - Stress max replicas
 */
export const options = {
  stages: [
    { duration: "1m", target: 50 },    // warm-up
    { duration: "2m", target: 150 },   // should trigger scale-out
    { duration: "2m", target: 300 },   // further scaling
    { duration: "2m", target: 500 },   // push towards max replicas
    { duration: "1m", target: 0 },     // cool-down
  ],

  thresholds: {
    http_req_failed: ["rate<0.01"],       // <1% errors
    http_req_duration: ["p(95)<3000"],    // p95 < 3s
  },

  /**
   * These tags help AI reasoning later
   */
  tags: {
    test_type: "autoscaling",
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

  /**
   * Very small think time:
   * - keeps concurrency high
   * - allows scaling signals to appear
   */
  sleep(0.1);
}
