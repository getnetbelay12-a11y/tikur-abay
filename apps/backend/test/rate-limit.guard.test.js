const test = require('node:test');
const assert = require('node:assert/strict');

const { RateLimitGuard } = require('../dist/modules/auth/rate-limit.guard.js');

function createContext(url) {
  const headers = {};
  return {
    getHandler: () => undefined,
    getClass: () => undefined,
    switchToHttp: () => ({
      getRequest: () => ({
        ip: '127.0.0.1',
        originalUrl: url,
        method: 'POST',
        headers: {},
      }),
      getResponse: () => ({
        setHeader(name, value) {
          headers[name] = value;
        },
      }),
    }),
    headers,
  };
}

test('rate limit guard allows up to configured login attempts and then blocks', () => {
  const reflector = { getAllAndOverride: () => undefined };
  const guard = new RateLimitGuard(reflector);

  for (let index = 0; index < 10; index += 1) {
    const context = createContext('/api/v1/auth/login');
    assert.equal(guard.canActivate(context), true);
  }

  const blockedContext = createContext('/api/v1/auth/login');
  assert.throws(() => guard.canActivate(blockedContext), /Too many requests/i);
});

test('rate limit guard skips health endpoint', () => {
  const reflector = { getAllAndOverride: () => undefined };
  const guard = new RateLimitGuard(reflector);
  const context = createContext('/api/v1/health');
  assert.equal(guard.canActivate(context), true);
});
