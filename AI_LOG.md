# AI Log

- **Phase 0 scaffold pre-plan**: Scaffolding initialized, checked PostgreSQL server and Node/NPM availability.
- **Phase 0 start**: Setup folder structure, configure package.json and Express dependencies.
- **Phase 1 Schema**: Defined full `schema.prisma`, ran migrations on PostgreSQL, implemented and ran seeding script `prisma/seed.js`.
- **Phase 2 Auth**: Created JWT token auth, role authorization middlewares, registration, login, refresh, logout services & controllers, and verified all validation tests.
- **Phase 3-4 Profiles & Listings**: Implemented company profile CRUD, own listings fetching, listing creation/update endpoints, and DRAFT->ACTIVE->CLOSED status transition constraints.
- **Phase 5 Applications**: Implemented applying with atomic Postgres updates, AUTO_CLOSED status transition on cap, and withdrawals reverting listing back to ACTIVE. Implemented status transition rules and bulk update capability.
- **Phase 6 Matching Engine**: Programmed dynamic matching score calculations on query-time (O(n*k) complexity) using required/preferred skills, branch/year alignment, completeness, and recency.
- **Phase 7 Notifications**: Created dispatch notification engine triggered on applications and status updates.
- **Phase 8-9 Submission**: Added comprehensive Zod validation schemas to all endpoints and created test collection and README.
- **Bonuses (A, B, C, D)**: Developed global sliding-window rate limiter, concurrency race-condition test script, database audit logging, and static HTML simulation dashboard.
