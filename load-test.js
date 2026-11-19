import http from 'k6/http';
import { check, sleep } from 'k6';

// Override with: k6 run -e BASE_URL=https://your-host.example load-test.js
const BASE_URL = __ENV.BASE_URL || 'https://loykrathong-33949.firebaseapp.com';

export const options = {
  scenarios: {
    website_load: {
      executor: 'constant-vus',
      vus: Number(__ENV.VUS || 20),
      duration: __ENV.DURATION || '1m',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<2000'],
  },
};

export default function () {
  const response = http.get(`${BASE_URL}/index.html`, {
    tags: { page: 'home' },
  });

  check(response, {
    'home page returns HTTP 200': (r) => r.status === 200,
    'response is HTML': (r) =>
      String(r.headers['Content-Type'] || '').includes('text/html'),
  });

  sleep(1);
}
