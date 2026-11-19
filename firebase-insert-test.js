import http from 'k6/http';
import { check } from 'k6';

// Uses the exact Realtime Database URL configured by this project.
const DB_URL =
  __ENV.FIREBASE_DB_URL ||
  'https://loykrathong-33949-default-rtdb.asia-southeast1.firebasedatabase.app';

export const options = {
  scenarios: {
    firebase_insert: {
      executor: 'per-vu-iterations',
      vus: Number(__ENV.VUS || 20),
      iterations: 1,
      maxDuration: '2m',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<2000'],
    checks: ['rate>0.99'],
  },
};

export default function () {
  // Realtime Database rules require the record's id to equal its child key.
  // Use PUT with a unique, Firebase-safe key rather than POST /Wishes.json.
  const id = `K6-LOAD-${Date.now()}-${__VU}-${__ITER}`;
  const payload = {
    id,
    fullName: `K6 Load Test ${__VU}`,
    employeeCode: id,
    department: 'K6-LOAD-TEST',
    whName: 'K6-TEST',
    krathongType: 'lotus',
    wish: 'Automated Firebase insert load test',
    createdAt: Date.now(),
  };

  const response = http.put(
    `${DB_URL}/Wishes/${id}.json`,
    JSON.stringify(payload),
    {
      headers: { 'Content-Type': 'application/json' },
      timeout: '30s',
      tags: { operation: 'firebase_insert' },
    }
  );

  check(response, {
    'Firebase insert returns HTTP 200': (r) => r.status === 200,
    'Firebase returns inserted record': (r) => {
      try {
        const saved = r.json();
        return saved && saved.id === id && saved.employeeCode === id;
      } catch {
        return false;
      }
    },
  });
}
