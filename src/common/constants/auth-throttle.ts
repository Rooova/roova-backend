// Applied to login/register/forgot-password routes across all three auth
// controllers — a standard brute-force/spam deterrent, tracked per-IP by
// ThrottlerGuard's default tracker.
export const AUTH_THROTTLE = { default: { limit: 5, ttl: 60_000 } };
