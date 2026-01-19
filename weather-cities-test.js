// import http from "k6/http";
// import { check, sleep } from "k6";

// const cities = [
//   "Berlin", "London", "Paris", "Rome", "Madrid",
//   "Vienna", "Prague", "Warsaw", "Budapest", "Brussels",
//   "Amsterdam", "Copenhagen", "Stockholm", "Oslo", "Helsinki",
//   "Lisbon", "Dublin", "Zurich", "Geneva", "Munich",
//   "Hamburg", "Cologne", "Frankfurt", "Stuttgart", "Dusseldorf",
//   "Milan", "Turin", "Venice", "Florence", "Naples",
//   "Barcelona", "Valencia", "Seville", "Bilbao", "Malaga",
//   "Athens", "Thessaloniki", "Sofia", "Bucharest", "Cluj-Napoca",
//   "Zagreb", "Ljubljana", "Belgrade", "Sarajevo", "Skopje",
//   "Tirana", "Podgorica"
// ];

// // Backend base URL (Container App)
// const BASE_URL = __ENV.TARGET_URL || "http://localhost:3000";

// export const options = {
//   vus: Number(__ENV.VUS) || 10,
//   duration: __ENV.TEST_DURATION || "30s",

//   thresholds: {
//     http_req_failed: ["rate<0.01"],        // <1% errors
//     http_req_duration: ["p(95)<2000"],     // p95 < 2s
//   },
// };

// export default function () {
//   const city = cities[Math.floor(Math.random() * cities.length)];
//   const url = `${BASE_URL}/weather?city=${encodeURIComponent(city)}`;

//   const res = http.get(url);

//   check(res, {
//     "status is 200": (r) => r.status === 200,
//   });

//   // small think time to simulate real users
//   sleep(1);
// }

import http from "k6/http";
import { check, sleep } from "k6";

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

const BASE_URL = __ENV.TARGET_URL;

export const options = {
  stages: [
    { duration: "1m", target: 50 },   // warm-up
    { duration: "2m", target: 150 },  // should trigger scale to 2
    { duration: "2m", target: 300 },  // scale to 3+
    { duration: "2m", target: 500 },  // push towards max
  ],

  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<3000"],
  },
};

export default function () {
  const city = cities[Math.floor(Math.random() * cities.length)];
  const url = `${BASE_URL}/weather?city=${encodeURIComponent(city)}`;

  const res = http.get(url);

  check(res, {
    "status is 200": (r) => r.status === 200,
  });

  // IMPORTANT: small sleep to keep concurrency high
  sleep(0.1);
}
