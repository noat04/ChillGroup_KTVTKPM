import http from 'k6/http';
import { check, sleep } from 'k6';

// Test configuration - tăng VU để tìm giới hạn
export const options = {
  vus: 600,        // Số concurrent users - tăng để test capacity
  duration: '1s', // Chạy trong 10 giây
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'], // 95% request < 500ms
    http_req_failed: ['rate<0.1'],                   // Error rate < 10%
  },
};

export default function () {
  // Test login endpoint
  const loginRes = http.post(
    'http://host.docker.internal:8080/api/auth/login',
    JSON.stringify({
      email: `user${Math.random().toString(36).substr(2, 9)}@test.com`,
      password: 'password123',
    }),
    {
      headers: { 'Content-Type': 'application/json' },
    }
  );

  check(loginRes, {
    'login status is 200 or 401': (r) => r.status === 200 || r.status === 401,
  });

  sleep(1);
}
