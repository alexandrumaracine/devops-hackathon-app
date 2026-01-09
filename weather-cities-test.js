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

const BASE_URL = __ENV.TARGET_URL || "http://localhost:3000";

export const options = {
  vus: Number(__ENV.VUS) || 10,
  duration: __ENV.TEST_DURATION || "30s",
};

export default function () {
  const city = cities[Math.floor(Math.random() * cities.length)];
  const url = `${BASE_URL}/api/weather?city=${city}`;

  const res = http.get(url);

  check(res, {
    "status is 200": (r) => r.status === 200,
    "response time < 2s": (r) => r.timings.duration < 2000,
  });

  sleep(1);
}
