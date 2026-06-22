import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { SharedArray } from 'k6/data';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000/api/v1';

const tenants = new SharedArray('tenants', function () {
  return Array.from({ length: 10 }, (_, i) => ({
    email: `tenant${i + 1}@test.com`,
    password: 'TestPassword123!',
    companyId: null,
    token: null,
  }));
});

export const options = {
  stages: [
    { duration: '30s', target: 10 },
    { duration: '1m', target: 50 },
    { duration: '30s', target: 100 },
    { duration: '1m', target: 100 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'],
    http_req_failed: ['rate<0.05'],
  },
};

function login(tenant) {
  const res = http.post(`${BASE_URL}/auth/login`, JSON.stringify({
    email: tenant.email,
    password: tenant.password,
  }), { headers: { 'Content-Type': 'application/json' } });

  check(res, { 'login successful': (r) => r.status === 200 });
  if (res.status === 200) {
    const body = JSON.parse(res.body);
    tenant.token = body.data?.token || body.token;
    tenant.companyId = body.data?.company_id || body.company_id;
  }
}

function getAttendance(tenant) {
  const res = http.get(`${BASE_URL}/attendance`, {
    headers: {
      Authorization: `Bearer ${tenant.token}`,
      'Content-Type': 'application/json',
    },
  });
  check(res, { 'attendance list ok': (r) => r.status === 200 });
}

function getLeaves(tenant) {
  const res = http.get(`${BASE_URL}/leave?page=1&limit=10`, {
    headers: {
      Authorization: `Bearer ${tenant.token}`,
      'Content-Type': 'application/json',
    },
  });
  check(res, { 'leave list ok': (r) => r.status === 200 });
}

function getPayrollPeriods(tenant) {
  const res = http.get(`${BASE_URL}/payroll/periods`, {
    headers: {
      Authorization: `Bearer ${tenant.token}`,
      'Content-Type': 'application/json',
    },
  });
  check(res, { 'payroll periods ok': (r) => r.status === 200 });
}

export default function () {
  const idx = (__VU - 1) % tenants.length;
  const tenant = tenants[idx];

  if (!tenant.token) {
    login(tenant);
    sleep(1);
    return;
  }

  group('Mixed workload', function () {
    getAttendance(tenant);
    sleep(Math.random() * 2 + 0.5);
    getLeaves(tenant);
    sleep(Math.random() * 2 + 0.5);
    getPayrollPeriods(tenant);
    sleep(1);
  });
}
