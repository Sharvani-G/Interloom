# InternLoom Talent Matching Backend

InternLoom is a high-performance, robust campus hiring RESTful backend built with Node.js, Express, and PostgreSQL (via Prisma ORM). It features role-based access control, atomic cap-safe student application submissions, dynamic matching rankings computed at query time, audit logs, global custom rate limits, and an interactive HTML simulation dashboard.

---

## 🚀 Quick Start (Run locally in under 2 minutes)

### 1. Configure Environment Variables
Create a `.env` file in the project root:
```env
PORT=3000
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/internloom?schema=public"
JWT_ACCESS_SECRET="your-jwt-access-token-secret-change-in-production"
JWT_REFRESH_SECRET="your-jwt-refresh-token-secret-change-in-production"
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Run Database Migrations and Seed Data
```bash
npx prisma migrate dev --name init
npx prisma db seed
```

### 4. Start the Application
```bash
npm start
```
The server will start on [http://localhost:3000](http://localhost:3000).

---

## 🎨 Interactive Dashboard
We serve a premium simulation dashboard at the root URL. Just navigate to:
👉 **[http://localhost:3000/](http://localhost:3000/)**

The dashboard allows you to:
1. Simulate different actors (Student, Company, Admin).
2. Login dynamically with one click using seeded demo accounts.
3. Apply to jobs, fetch matching listings with dynamic scores, inspect notifications, and view audit trail tables in real-time.

---

## 🧪 Running Concurrency / Race Condition Tests (Bonus B)
To verify our atomic cap checking (preventing race conditions when multiple students apply for the last remaining slot simultaneously):
1. Make sure the Express server is running (`npm start`).
2. Run the concurrency test script:
```bash
node scripts/test-race-condition.js
```
The script registers a listing with `maxApplicants = 3` and executes 6 simultaneous apply requests from different student accounts. It will output confirmation that exactly 3 applications succeeded and that the listing transitioned immediately to `AUTO_CLOSED`.

---

## ⚖️ Dynamic Matching Algorithm & Big-O Complexity

Matching scores are calculated dynamically on query-time using student profiles and listing requirements. **No cached scores are maintained in the database**, avoiding stale matching indexes.

### Formula
$$Score = 0.4 \cdot Req + 0.2 \cdot Pref + 0.15 \cdot Alignment + 0.15 \cdot Completeness + 0.1 \cdot Recency$$

1. **Required Skill Match (40%):** percentage of listing's required skills that the student has.
2. **Preferred Skill Match (20%):** percentage of listing's preferred skills that the student has.
3. **Branch/Year Alignment (15%):**
   - Branch exact match + Year exact match = 100
   - Branch exact match + Year mismatch = 70
   - Branch mismatch + Year exact match = 60
   - Branch mismatch + Year mismatch = 40
4. **Profile Completeness (15%):** Each populated student field contributes 10% (max 100%): `name`, `college`, `branch`, `graduationYear`, `cgpa`, `githubUrl`, `linkedinUrl`, `bio`, `resumeUrl`, and `skills` (having $\ge 1$ skill).
5. **Recency (10%):** Linear decay over 30 days: `Math.max(0, 100 - daysSincePosted * (100/30))`.

### Complexity Analysis
- **N+1 Avoidance:** In `getListings` or `getApplicants`, we fetch student/listing relation records (like `skills`) in a single query transaction join, loading target student details as a single lookup payload.
- **In-Memory Score Matching:** We convert student skills into a `Set` ($O(1)$ lookups) and evaluate matching in $O(k)$ time per listing, where $k$ is the number of requirements on that listing.
- **Complexity:** For $n$ listings matching filter conditions, matching calculation has **$O(n \cdot k)$ complexity**, which is extremely efficient for paginated student feeds.

---

## 📑 API Endpoint Directory

### 🔐 Authentication
- `POST /api/auth/register/student` - Create a student user (domain restricted to `.edu` or `.ac.in`). Returns a registration `debug_otp`.
- `POST /api/auth/register/company` - Create an unapproved company user.
- `POST /api/auth/verify-otp` - Verifies student OTP and activates profile.
- `POST /api/auth/resend-otp` - Resends OTP for registration or email changes.
- `POST /api/auth/login` - Returns JWT Access Token (expires in 1hr) + Refresh Token (expires in 7 days).
- `POST /api/auth/refresh` - Issues a new access token using a valid refresh token.
- `POST /api/auth/logout` - Revokes refresh tokens.

### 🎓 Students
- `GET /api/students/me` - Fetch own profile details + calculated profile completeness score.
- `PUT /api/students/me` - Update profile fields and skills array. Triggers new OTP if email changes.
- `DELETE /api/students/me` - Cascade deletes account. **Blocked if student has active applications (`SUBMITTED`, `UNDER_REVIEW`, `SHORTLISTED`).**
- `GET /api/students/me/applications` - Fetch own application logs (paginated).

### 🏢 Companies
- `GET /api/companies/me` - Fetch company details.
- `PUT /api/companies/me` - Update company name or login email.
- `GET /api/companies/me/listings` - Retrieve listings created by this company (paginated).

### 📋 Job Listings
- `POST /api/listings` - Create listing in `DRAFT` status (requires approved company).
- `PUT /api/listings/:id` - Edit listing details and skills (blocked if status is manual `CLOSED`).
- `PATCH /api/listings/:id/status` - Transition status. Enforces strict machine: `DRAFT` $\rightarrow$ `ACTIVE` or `CLOSED` $\rightarrow$ `CLOSED`.
- `GET /api/listings` - Fetch job listings (student view: only returns `ACTIVE` listings; sortable by match score using `sortBy=match`, paginated).
- `GET /api/listings/:id` - Fetch detailed listing information. If requested by a student, includes their match score.

### 📨 Applications
- `POST /api/listings/:id/apply` - Submit application. Uses raw atomic Postgres update query to guarantee no cap race conditions.
- `GET /api/listings/:id/applicants` - Retrieve listing applicant cards sorted by matching scores (company only).
- `PATCH /api/applications/:id/status` - Transition application status (forward-only transitions).
- `PATCH /api/applications/:id/withdraw` - Student withdraws application. Deletes submission and decrements applicant count, resetting listings from `AUTO_CLOSED` to `ACTIVE` if cap allows.
- `PATCH /api/applications/bulk-update` - Bulk update status for multiple applications in one request.

### 🔔 Notifications
- `GET /api/notifications` - Retrieve list of user notifications (paginated).
- `PATCH /api/notifications/:id/read` - Mark single notification as read.
- `PATCH /api/notifications/bulk-read` - Mark all notifications as read.

### 🕵️ Audit Trail
- `GET /api/audit` - View system audit logs (Admin only, requires `x-admin-token: admin-super-secret-token` header).

---

## 🛠️ Tricky Decisions Logged

1. **Email Re-verification:** When changing email, the account is not locked but rather `isEmailVerified` is reset. The login is allowed, but the student is blocked from calling `/apply` until they verify the new email OTP.
2. **Auto-Closed vs Closed:** Manual `CLOSED` status is terminal. `AUTO_CLOSED` is a system-driven state that will automatically transition back to `ACTIVE` if a student withdraws their application and applicant count falls below the cap.
3. **Atomic Cap Check:** Concurrency checks are handled directly at the database level inside a query transaction, preventing over-subscribing.
