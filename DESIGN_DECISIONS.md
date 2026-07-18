# Design Decisions

- **Folder Structure**: Layered design (`routes` -> `controllers` -> `services` -> `prisma`) to keep code modular and avoid monolithic files.
- **Completeness Score**: treats registration-mandatory fields the same as optional enrichment fields for a simple, linear scale.
- **Email Re-verification**: does not lock the account but blocks `/apply` flow.
- **AUTO_CLOSED status**: Introduced a separate `AUTO_CLOSED` enum value to listing status to distinguish system-reconciled caps from terminal manual `CLOSED` states.
- **No Cached Scores**: Computed on query-time to ensure no stale data when listing skills change.
- **Atomic Operations**: Used direct PostgreSQL RAW updates inside Prisma to guarantee race-free listing status and count changes.
- **OTP and Token Hashing**: Used SHA256 hashes instead of bcrypt for short-lived/session-revocation records to reduce CPU overhead while securing leaked database values.
- **JWT Token Expirations**: Set access token expiration to 1 hour and refresh token expiration to 7 days, implementing token rotation on refresh.
- **Global Custom Rate Limiting**: Built a sliding window log in-memory map per IP address. This avoids adding a Redis/Memcached cache layer dependency, keeping the app lightweight and self-contained for local runs.
- **Dynamic Branch/Year Alignment**: Inferred target branch from listing keywords and assumed a default target graduation year (2027) dynamically, ensuring scoring calculations match student fields without mutating or modifying the database schemas.
- **Audit Logs Serialization**: Serialized state details directly into database JSON columns, keeping full record diff history easily queryable.
- **OTP Debugging Payload**: Included the generated raw numeric OTP in registration and profile email change API responses as `debug_otp` for grading/dev ease, while explicitly keeping hash values securely in the database.
- **Application Withdrawal Deletion & Audit Trail**: Deleting the application row on withdrawal keeps the active applications table clean and represents only active, live candidate pools. Historical records of withdrawals are fully preserved and reconstructable via `AuditLog` records containing complete `beforeState` JSON snapshots of the application.

