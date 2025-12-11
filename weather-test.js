import http from 'k6/http';
import { sleep, check } from 'k6';

export let options = {
  stages: [
    { duration: '2s', target: 100 },   // warm-up
    { duration: '15m', target: 100 },  // small load
    { duration: '3s', target: 100 },   // cool down
  ],
  insecureSkipTLSVerify: true,
};

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
