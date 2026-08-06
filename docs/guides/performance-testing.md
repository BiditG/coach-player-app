# Performance Testing with k6

k6 is a modern load testing tool. Use it to validate API endpoints under load before production.

## 1. Install

```bash
# macOS
brew install k6

# Linux (Debian/Ubuntu)
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D68
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update && sudo apt-get install k6
```

## 2. Basic Load Test

Create `tests/perf/smoke.js`:
```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 10 },  // ramp up
    { duration: '1m', target: 10 },   // steady
    { duration: '10s', target: 0 },   // ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],  // 95% of requests under 500ms
    http_req_failed: ['rate<0.01'],    // <1% error rate
  },
};

export default function () {
  const res = http.get('http://localhost:3000/api/health');
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 200ms': (r) => r.timings.duration < 200,
  });
  sleep(1);
}
```

## 3. Run

```bash
# Start your app first
npm run dev &

# Run the test
k6 run tests/perf/smoke.js
```

## 4. API Endpoint Test

Create `tests/perf/api-test.js` for authenticated endpoints:
```javascript
import http from 'k6/http';
import { check } from 'k6';

export const options = {
  vus: 5,
  duration: '30s',
};

export default function () {
  const params = {
    headers: { 'Authorization': `Bearer ${__ENV.TEST_TOKEN}` },
  };
  const res = http.get('http://localhost:3000/api/your-endpoint', params);
  check(res, { 'status is 200': (r) => r.status === 200 });
}
```

Run with: `k6 run -e TEST_TOKEN=xxx tests/perf/api-test.js`

## Resources

- https://k6.io/docs/
- https://k6.io/docs/using-k6/thresholds/
