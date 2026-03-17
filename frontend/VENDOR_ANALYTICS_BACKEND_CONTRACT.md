# Vendor Analytics Backend Contract

## Purpose
Defines backend enforcement requirements for vendor analytics endpoints used by:
- `/vendor/analytics`
- `/vendor/analytics/orders`
- `/vendor/analytics/revenue`
- `/vendor/analytics/branches`
- `/vendor/analytics/staff`

## Security Rules (Mandatory)
1. Validate authenticated user session (`401` when invalid).
2. Validate user is vendor or vendor staff (`403` otherwise).
3. Validate requested `vendorId` equals authenticated user's vendor scope.
4. For vendor staff:
   - Force branch scope to `assignedBranchId`.
   - Ignore/override any client-provided `branchId` that differs.
   - For staff analytics endpoint, return only the authenticated staff member unless role grants broader scope.
5. Whitelist query params and reject unsupported keys (`400`).
6. Apply rate limiting on heavy aggregation endpoints.
7. Audit log all analytics exports and high-cost query requests.

## Endpoint Matrix
Base: `/api/vendors/:vendorId/analytics`

### Overview
- `GET /summary`
- `GET /revenue-trend`
- `GET /status-distribution`
- `GET /branch-performance`
- `GET /staff-activity`

### Deep Pages
- `GET /orders`
- `GET /orders/export?format=csv`
- `GET /revenue`
- `GET /branches`
- `GET /staff`

### Future
- `GET /predictive`

## Supported Filters
- `dateRange`: `today | 7d | 30d | custom`
- `startDate`: `YYYY-MM-DD` (required for custom)
- `endDate`: `YYYY-MM-DD` (required for custom)
- `branchId`: main vendor only (staff overridden)
- `granularity`: `daily | weekly`
- `groupBy`: `daily | weekly | monthly`
- `page`, `limit`

## Validation Requirements
- `startDate <= endDate`
- Maximum date window should be bounded (recommended 366 days)
- `limit` bounded with sane max (recommended 200)
- Enum values validated against allow-list

## Response Shape (Recommended)
```json
{
  "success": true,
  "data": {
    "summary": {},
    "items": []
  },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 0,
    "cached": false
  }
}
```

## Caching & Scalability Guidance
- Use cached materialized aggregates for:
  - revenue trends
  - status distributions
  - branch ranking
- TTL recommendation: 1-5 minutes for overview, 15-60 minutes for heavy deep metrics.
- Use async jobs for large export generation.
- Prefer cursor pagination for high-volume logs.

## Error Semantics
- `400`: invalid filters, unsupported query keys, invalid date ranges
- `401`: unauthenticated
- `403`: vendor mismatch or unauthorized scope
- `404`: vendor/branch not found in scope
- `429`: rate limit reached
- `500`: internal processing error

## Anti-Tampering Checklist
- Never trust client-provided role flags.
- Compute role and scope from session claims only.
- Never return cross-vendor aggregates in vendor endpoints.
- For staff, enforce branch and staff self-scope in SQL/aggregation pipeline.

## Performance Targets (Recommended)
- P95 overview response: < 600ms (cached)
- P95 deep analytics response: < 1500ms
- CSV export initiation: < 500ms, with async completion for large ranges
