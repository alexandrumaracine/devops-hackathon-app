import http from 'k6/http';
import { sleep, check } from 'k6';

export let options = {
  // cloud: {
  //   region: "eu-west",   // Frankfurt
  // },
  stages: [
    { duration: '2s', target: 2 },   // warm-up
    { duration: '200s', target: 100 },  // small load
    { duration: '3s', target: 2 },   // cool down
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
