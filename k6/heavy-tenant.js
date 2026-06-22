import http from 'k6/http';
import { check, sleep, group } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000/api/v1';

const TENANT_EMAIL = __ENV.TENANT_EMAIL || 'admin@tenant1.com';
const TENANT_PASSWORD = __ENV.TENANT_PASSWORD || 'Admin123!';

export const options = {
  stages: [
    { duration: '30s', target: 50 },
    { duration: '1m', target: 200 },
    { duration: '30s', target: 200 },
    { duration: '1m', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<3000'],
    http_req_failed: ['rate<0.10'],
  },
};

let token = null;
let companyId = null;

export default function () {
  if (!token) {
    const res = http.post(`${BASE_URL}/auth/login`, JSON.stringify({
      email: TENANT_EMAIL,
      password: TENANT_PASSWORD,
    }), { headers: { 'Content-Type': 'application/json' } });

    check(res, { 'login ok': (r) => r.status === 200 });
    if (res.status !== 200) return;

    const body = JSON.parse(res.body);
    token = body.data?.token || body.token;
    companyId = body.data?.company_id || body.company_id;
    return;
  }

  group('Heavy single-tenant load', function () {
    http.get(`${BASE_URL}/attendance?page=1&limit=20`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    sleep(0.3);

    http.get(`${BASE_URL}/leave?page=1&limit=20`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    sleep(0.3);

    http.get(`${BASE_URL}/payroll/payslips?page=1&limit=20`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    sleep(0.3);

    http.get(`${BASE_URL}/dashboard/summary`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    sleep(0.5);
  });
}
