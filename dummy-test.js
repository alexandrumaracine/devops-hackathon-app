import http from 'k6/http';
import { sleep, check } from 'k6';

const TEST_DURATION = __ENV.TEST_DURATION || '5m';
const VUS = Number(__ENV.VUS || 50);
const TARGET_URL = __ENV.TARGET_URL || 'https://jsonplaceholder.typicode.com/posts';

export const options = {
  vus: VUS,
  duration: TEST_DURATION,
};

export default function () {
  const res = http.get(`${TARGET_URL}`);
  check(res, {
    'status is 200': r => r.status === 200,
  });
  sleep(1);
}
