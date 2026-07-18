# Design Decisions

### Email Re-verification
When a student updates their email address to a new value, the system resets the `isEmailVerified` flag to false and generates a new registration/verification OTP. However, to prevent locking out the student from their profile during this process, they retain full access to login, view, and edit their profile details. The only operational restriction is that they are blocked from submitting new listing applications (via POST `/apply`) until the new email address is verified.

### Skill Edit on Active Listing
Editing the required or preferred skills of an active job listing has direct implications on the student matching engine. To prevent high write overhead and avoid caching stale metrics, all matching scores are computed dynamically in-memory at query-time rather than stored in the database. When listing requirements are updated, the database operations are entirely decoupled from applicant records, ensuring that scores for existing applicants are evaluated fresh on every subsequent request.

### Auto-Close and Reopen
To enforce applicant limits without manual intervention, listing status transitions to `AUTO_CLOSED` automatically when the applicant cap is reached. This state is modeled distinctly from manual `CLOSED` status in the database schema to ensure that if a student withdraws their application, the count is decremented and the listing dynamically transitions back to `ACTIVE`. This automated reopening loop is strictly restricted to `AUTO_CLOSED` listings, ensuring manual closures remain permanently terminal.
