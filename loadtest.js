import http from 'k6/http';
import { sleep, check } from 'k6';

export let options = {
  stages: [
    { duration: '10s', target: 50 },   // warm-up
    { duration: '20s', target: 200 },  // medium load
    { duration: '20s', target: 500 },  // high load
    { duration: '10s', target: 0 },    // cool down
  ],
};

export default function () {
  const url = 'http://host.docker.internal:3000/weather?city=London';

  let res = http.get(url);

  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500
  });

  sleep(1);
}
