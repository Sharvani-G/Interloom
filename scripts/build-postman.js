const fs = require("fs");
const path = require("path");

const baseEnvelope = (data = {}, pagination = null) => ({
  success: true,
  data,
  error: null,
  meta: {
    timestamp: "2026-07-18T12:00:00.000Z",
    ...(pagination ? { pagination } : {})
  }
});

const errorEnvelope = (code, message, details = {}) => ({
  success: false,
  data: null,
  error: { code, message, details },
  meta: { timestamp: "2026-07-18T12:00:00.000Z" }
});

const makeResponse = (name, code, status, body) => ({
  name,
  originalRequest: {
    method: "GET",
    header: [],
    url: { raw: "{{base_url}}", host: ["{{base_url}}"] }
  },
  status,
  code,
  _postman_previewlanguage: "json",
  header: [
    { key: "Content-Type", value: "application/json" }
  ],
  cookie: [],
  body: JSON.stringify(body, null, 2)
});

const collection = {
  info: {
    _postman_id: "internloom-talent-matching-backend",
    "name": "InternLoom Complete API Suite",
    "description": "API collection with fully detailed request payloads and saved expected responses for grading verification.",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  item: [
    {
      name: "Auth",
      item: [
        {
          name: "Register Student",
          request: {
            method: "POST",
            header: [{ key: "Content-Type", value: "application/json" }],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                email: "alice@university.edu",
                password: "Password123!",
                name: "Alice Smith",
                college: "State University",
                branch: "Computer Science",
                graduationYear: 2027,
                cgpa: 9.2,
                githubUrl: "https://github.com/alice",
                linkedinUrl: "https://linkedin.com/in/alice",
                bio: "Passionate developer.",
                resumeUrl: "https://example.com/resumes/alice.pdf"
              }, null, 2)
            },
            url: { raw: "{{base_url}}/auth/register/student", host: ["{{base_url}}"], path: ["auth", "register", "student"] }
          },
          response: [
            makeResponse("Student Registered Successfully", 201, "Created", baseEnvelope({
              userId: "student-uuid-123",
              email: "alice@university.edu",
              debug_otp: "409943"
            }))
          ]
        },
        {
          name: "Register Company",
          request: {
            method: "POST",
            header: [{ key: "Content-Type", value: "application/json" }],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                email: "recruitment@seededtech.com",
                password: "Password123!",
                companyName: "Seeded Tech Corp"
              }, null, 2)
            },
            url: { raw: "{{base_url}}/auth/register/company", host: ["{{base_url}}"], path: ["auth", "register", "company"] }
          },
          response: [
            makeResponse("Company Registered Successfully", 201, "Created", baseEnvelope({
              userId: "company-uuid-123",
              email: "recruitment@seededtech.com"
            }))
          ]
        },
        {
          name: "Verify OTP",
          request: {
            method: "POST",
            header: [{ key: "Content-Type", value: "application/json" }],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                email: "alice@university.edu",
                otp: "409943",
                purpose: "REGISTER"
              }, null, 2)
            },
            url: { raw: "{{base_url}}/auth/verify-otp", host: ["{{base_url}}"], path: ["auth", "verify-otp"] }
          },
          response: [
            makeResponse("OTP Verified Successfully", 200, "OK", baseEnvelope({
              message: "OTP verified successfully. Email is now verified."
            }))
          ]
        },
        {
          name: "Resend OTP",
          request: {
            method: "POST",
            header: [{ key: "Content-Type", value: "application/json" }],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                email: "alice@university.edu",
                purpose: "REGISTER"
              }, null, 2)
            },
            url: { raw: "{{base_url}}/auth/resend-otp", host: ["{{base_url}}"], path: ["auth", "resend-otp"] }
          },
          response: [
            makeResponse("OTP Resent Successfully", 200, "OK", baseEnvelope({
              message: "OTP resent successfully.",
              debug_otp: "591048"
            }))
          ]
        },
        {
          name: "Login",
          request: {
            method: "POST",
            header: [{ key: "Content-Type", value: "application/json" }],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                email: "alice@university.edu",
                password: "Password123!"
              }, null, 2)
            },
            url: { raw: "{{base_url}}/auth/login", host: ["{{base_url}}"], path: ["auth", "login"] }
          },
          response: [
            makeResponse("Login Successful", 200, "OK", baseEnvelope({
              accessToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
              refreshToken: "a6b7c8d9e0...",
              user: {
                id: "student-uuid-123",
                email: "alice@university.edu",
                role: "STUDENT",
                profile: {
                  name: "Alice Smith",
                  isEmailVerified: true
                }
              }
            }))
          ]
        },
        {
          name: "Refresh Access Token",
          request: {
            method: "POST",
            header: [{ key: "Content-Type", value: "application/json" }],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                refreshToken: "a6b7c8d9e0..."
              }, null, 2)
            },
            url: { raw: "{{base_url}}/auth/refresh", host: ["{{base_url}}"], path: ["auth", "refresh"] }
          },
          response: [
            makeResponse("Token Refreshed Successfully", 200, "OK", baseEnvelope({
              accessToken: "eyJhbGciOiJIUzI1Ni...",
              refreshToken: "b7c8d9e0f1..."
            }))
          ]
        },
        {
          name: "Logout",
          request: {
            method: "POST",
            header: [{ key: "Content-Type", value: "application/json" }],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                refreshToken: "a6b7c8d9e0..."
              }, null, 2)
            },
            url: { raw: "{{base_url}}/auth/logout", host: ["{{base_url}}"], path: ["auth", "logout"] }
          },
          response: [
            makeResponse("Logout Successful", 200, "OK", baseEnvelope({
              message: "Logged out successfully"
            }))
          ]
        }
      ]
    },
    {
      name: "Students",
      item: [
        {
          name: "Get Student Profile",
          request: {
            method: "GET",
            header: [{ key: "Authorization", value: "Bearer {{access_token}}" }],
            url: { raw: "{{base_url}}/students/me", host: ["{{base_url}}"], path: ["students", "me"] }
          },
          response: [
            makeResponse("Get Profile Success", 200, "OK", baseEnvelope({
              userId: "student-uuid-123",
              email: "alice@university.edu",
              name: "Alice Smith",
              college: "State University",
              branch: "Computer Science",
              graduationYear: 2027,
              cgpa: 9.2,
              githubUrl: "https://github.com/alice",
              linkedinUrl: "https://linkedin.com/in/alice",
              bio: "Passionate developer.",
              resumeUrl: "https://example.com/resumes/alice.pdf",
              isEmailVerified: true,
              skills: ["React", "JavaScript"],
              completenessScore: 100,
              createdAt: "2026-07-18T12:00:00.000Z",
              updatedAt: "2026-07-18T12:00:00.000Z"
            }))
          ]
        },
        {
          name: "Update Student Profile",
          request: {
            method: "PUT",
            header: [
              { key: "Authorization", value: "Bearer {{access_token}}" },
              { key: "Content-Type", value: "application/json" }
            ],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                skills: ["React", "JavaScript", "SQL"]
              }, null, 2)
            },
            url: { raw: "{{base_url}}/students/me", host: ["{{base_url}}"], path: ["students", "me"] }
          },
          response: [
            makeResponse("Profile Updated Successfully", 200, "OK", baseEnvelope({
              userId: "student-uuid-123",
              email: "alice@university.edu",
              name: "Alice Smith",
              college: "State University",
              branch: "Computer Science",
              graduationYear: 2027,
              cgpa: 9.2,
              skills: ["React", "JavaScript", "SQL"],
              completenessScore: 100
            }))
          ]
        },
        {
          name: "Get Student Applications",
          request: {
            method: "GET",
            header: [{ key: "Authorization", value: "Bearer {{access_token}}" }],
            url: { raw: "{{base_url}}/students/me/applications?page=1&limit=20", host: ["{{base_url}}"], path: ["students", "me", "applications"] }
          },
          response: [
            makeResponse("Get Applications Success", 200, "OK", baseEnvelope([
              {
                id: "application-uuid-456",
                status: "SUBMITTED",
                appliedAt: "2026-07-18T12:10:00.000Z",
                listing: {
                  id: "listing-uuid-789",
                  title: "Software Engineer Intern",
                  stipend: 1500,
                  location: "HYBRID",
                  status: "ACTIVE",
                  companyName: "Seeded Tech Corp",
                  skills: [{ name: "React", isRequired: true }]
                }
              }
            ], { page: 1, limit: 20, total: 1 }))
          ]
        },
        {
          name: "Delete Student Profile",
          request: {
            method: "DELETE",
            header: [{ key: "Authorization", value: "Bearer {{access_token}}" }],
            url: { raw: "{{base_url}}/students/me", host: ["{{base_url}}"], path: ["students", "me"] }
          },
          response: [
            makeResponse("Profile Deleted Successfully", 200, "OK", baseEnvelope({
              message: "Student account deleted successfully"
            }))
          ]
        }
      ]
    },
    {
      name: "Companies",
      item: [
        {
          name: "Get Company Profile",
          request: {
            method: "GET",
            header: [{ key: "Authorization", value: "Bearer {{company_token}}" }],
            url: { raw: "{{base_url}}/companies/me", host: ["{{base_url}}"], path: ["companies", "me"] }
          },
          response: [
            makeResponse("Get Company Profile Success", 200, "OK", baseEnvelope({
              userId: "company-uuid-123",
              email: "recruitment@seededtech.com",
              companyName: "Seeded Tech Corp",
              isApproved: true,
              createdAt: "2026-07-18T12:00:00.000Z"
            }))
          ]
        },
        {
          name: "Update Company Profile",
          request: {
            method: "PUT",
            header: [
              { key: "Authorization", value: "Bearer {{company_token}}" },
              { key: "Content-Type", value: "application/json" }
            ],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                companyName: "Seeded Technology Corporation"
              }, null, 2)
            },
            url: { raw: "{{base_url}}/companies/me", host: ["{{base_url}}"], path: ["companies", "me"] }
          },
          response: [
            makeResponse("Company Updated Successfully", 200, "OK", baseEnvelope({
              userId: "company-uuid-123",
              email: "recruitment@seededtech.com",
              companyName: "Seeded Technology Corporation",
              isApproved: true
            }))
          ]
        },
        {
          name: "Get Company Listings",
          request: {
            method: "GET",
            header: [{ key: "Authorization", value: "Bearer {{company_token}}" }],
            url: { raw: "{{base_url}}/companies/me/listings?page=1&limit=20", host: ["{{base_url}}"], path: ["companies", "me", "listings"] }
          },
          response: [
            makeResponse("Get Listings Success", 200, "OK", baseEnvelope({
              listings: [
                {
                  id: "listing-uuid-789",
                  title: "Software Engineer Intern",
                  description: "Prisma and Express systems.",
                  stipend: 1500,
                  location: "HYBRID",
                  status: "ACTIVE",
                  skills: [{ name: "React", isRequired: true }]
                }
              ],
              pagination: { page: 1, limit: 20, total: 1 }
            }))
          ]
        }
      ]
    },
    {
      name: "Listings",
      item: [
        {
          name: "Create Listing (Draft)",
          request: {
            method: "POST",
            header: [
              { key: "Authorization", value: "Bearer {{company_token}}" },
              { key: "Content-Type", value: "application/json" }
            ],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                title: "Backend Engineer Intern",
                description: "Work with Prisma and Node.js.",
                stipend: 1500,
                location: "HYBRID",
                applicationDeadline: "2026-08-30T12:00:00.000Z",
                maxApplicants: 10,
                skills: [
                  { name: "Node.js", isRequired: true },
                  { name: "SQL", isRequired: true }
                ]
              }, null, 2)
            },
            url: { raw: "{{base_url}}/listings", host: ["{{base_url}}"], path: ["listings"] }
          },
          response: [
            makeResponse("Listing Created Successfully", 201, "Created", baseEnvelope({
              id: "listing-uuid-789",
              companyId: "company-uuid-123",
              title: "Backend Engineer Intern",
              stipend: 1500,
              location: "HYBRID",
              status: "DRAFT",
              skills: [{ name: "Node.js", isRequired: true }]
            }))
          ]
        },
        {
          name: "Update Listing",
          request: {
            method: "PUT",
            header: [
              { key: "Authorization", value: "Bearer {{company_token}}" },
              { key: "Content-Type", value: "application/json" }
            ],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                title: "Backend Specialist Intern",
                stipend: 1700
              }, null, 2)
            },
            url: { raw: "{{base_url}}/listings/:id", host: ["{{base_url}}"], path: ["listings", ":id"], variable: [{ key: "id", value: "listing-uuid-789" }] }
          },
          response: [
            makeResponse("Listing Updated Successfully", 200, "OK", baseEnvelope({
              id: "listing-uuid-789",
              title: "Backend Specialist Intern",
              stipend: 1700
            }))
          ]
        },
        {
          name: "Update Listing Status",
          request: {
            method: "PATCH",
            header: [
              { key: "Authorization", value: "Bearer {{company_token}}" },
              { key: "Content-Type", value: "application/json" }
            ],
            body: {
              mode: "raw",
              raw: JSON.stringify({ status: "ACTIVE" }, null, 2)
            },
            url: { raw: "{{base_url}}/listings/:id/status", host: ["{{base_url}}"], path: ["listings", ":id", "status"], variable: [{ key: "id", value: "listing-uuid-789" }] }
          },
          response: [
            makeResponse("Listing Status Updated", 200, "OK", baseEnvelope({
              id: "listing-uuid-789",
              status: "ACTIVE"
            }))
          ]
        },
        {
          name: "Get Matching Listings",
          request: {
            method: "GET",
            header: [{ key: "Authorization", value: "Bearer {{access_token}}" }],
            url: { raw: "{{base_url}}/listings?sortBy=match&location=HYBRID", host: ["{{base_url}}"], path: ["listings"] }
          },
          response: [
            makeResponse("Get Listings Sorted by Match Success", 200, "OK", baseEnvelope([
              {
                id: "listing-uuid-789",
                title: "Senior React Developer Intern",
                companyName: "Seeded Tech Corp",
                stipend: 2000,
                location: "HYBRID",
                matchScore: 93.67,
                skills: [{ name: "React", isRequired: true }]
              }
            ], { page: 1, limit: 20, total: 1 }))
          ]
        },
        {
          name: "Get Listing By ID",
          request: {
            method: "GET",
            header: [{ key: "Authorization", value: "Bearer {{access_token}}" }],
            url: { raw: "{{base_url}}/listings/:id", host: ["{{base_url}}"], path: ["listings", ":id"], variable: [{ key: "id", value: "listing-uuid-789" }] }
          },
          response: [
            makeResponse("Get Listing By ID Success", 200, "OK", baseEnvelope({
              id: "listing-uuid-789",
              title: "Senior React Developer Intern",
              companyName: "Seeded Tech Corp",
              stipend: 2000,
              location: "HYBRID",
              matchScore: 93.67,
              skills: [{ name: "React", isRequired: true }]
            }))
          ]
        }
      ]
    },
    {
      name: "Applications",
      item: [
        {
          name: "Apply to Listing",
          request: {
            method: "POST",
            header: [{ key: "Authorization", value: "Bearer {{access_token}}" }],
            url: { raw: "{{base_url}}/listings/:id/apply", host: ["{{base_url}}"], path: ["listings", ":id", "apply"], variable: [{ key: "id", value: "listing-uuid-789" }] }
          },
          response: [
            makeResponse("Applied Successfully", 201, "Created", baseEnvelope({
              id: "application-uuid-456",
              studentId: "student-uuid-123",
              listingId: "listing-uuid-789",
              status: "SUBMITTED"
            }))
          ]
        },
        {
          name: "Get Applicants (Sorted by Match)",
          request: {
            method: "GET",
            header: [{ key: "Authorization", value: "Bearer {{company_token}}" }],
            url: { raw: "{{base_url}}/listings/:id/applicants", host: ["{{base_url}}"], path: ["listings", ":id", "applicants"], variable: [{ key: "id", value: "listing-uuid-789" }] }
          },
          response: [
            makeResponse("Get Applicants Success", 200, "OK", baseEnvelope({
              applicants: [
                {
                  applicationId: "application-uuid-456",
                  status: "SUBMITTED",
                  student: {
                    name: "Alice Smith",
                    college: "State University",
                    branch: "Computer Science"
                  },
                  matchScore: 93.67
                }
              ],
              pagination: { page: 1, limit: 20, total: 1 }
            }))
          ]
        },
        {
          name: "Update Application Status",
          request: {
            method: "PATCH",
            header: [
              { key: "Authorization", value: "Bearer {{company_token}}" },
              { key: "Content-Type", value: "application/json" }
            ],
            body: {
              mode: "raw",
              raw: JSON.stringify({ status: "SHORTLISTED" }, null, 2)
            },
            url: { raw: "{{base_url}}/applications/:id/status", host: ["{{base_url}}"], path: ["applications", ":id", "status"], variable: [{ key: "id", value: "application-uuid-456" }] }
          },
          response: [
            makeResponse("Status Updated Successfully", 200, "OK", baseEnvelope({
              id: "application-uuid-456",
              status: "SHORTLISTED"
            }))
          ]
        },
        {
          name: "Withdraw Application",
          request: {
            method: "PATCH",
            header: [{ key: "Authorization", value: "Bearer {{access_token}}" }],
            url: { raw: "{{base_url}}/applications/:id/withdraw", host: ["{{base_url}}"], path: ["applications", ":id", "withdraw"], variable: [{ key: "id", value: "application-uuid-456" }] }
          },
          response: [
            makeResponse("Withdrawn Successfully", 200, "OK", baseEnvelope({
              message: "Application withdrawn successfully"
            }))
          ]
        },
        {
          name: "Bulk Update Status",
          request: {
            method: "PATCH",
            header: [
              { key: "Authorization", value: "Bearer {{company_token}}" },
              { key: "Content-Type", value: "application/json" }
            ],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                applicationIds: ["application-uuid-456"],
                status: "OFFER_EXTENDED"
              }, null, 2)
            },
            url: { raw: "{{base_url}}/applications/bulk-update", host: ["{{base_url}}"], path: ["applications", "bulk-update"] }
          },
          response: [
            makeResponse("Bulk Update Completed", 200, "OK", baseEnvelope({
              successCount: 1,
              message: "Successfully updated status of 1 applications"
            }))
          ]
        }
      ]
    },
    {
      name: "Notifications",
      item: [
        {
          name: "Get My Notifications",
          request: {
            method: "GET",
            header: [{ key: "Authorization", value: "Bearer {{access_token}}" }],
            url: { raw: "{{base_url}}/notifications", host: ["{{base_url}}"], path: ["notifications"] }
          },
          response: [
            makeResponse("Get Notifications Success", 200, "OK", baseEnvelope({
              notifications: [
                {
                  id: "notify-uuid-999",
                  type: "APPLICATION_STATUS_UPDATED",
                  message: "Your application for Senior React Developer Intern is now SHORTLISTED",
                  isRead: false
                }
              ],
              pagination: { page: 1, limit: 20, total: 1 }
            }))
          ]
        },
        {
          name: "Mark Notification Read",
          request: {
            method: "PATCH",
            header: [{ key: "Authorization", value: "Bearer {{access_token}}" }],
            url: { raw: "{{base_url}}/notifications/:id/read", host: ["{{base_url}}"], path: ["notifications", ":id", "read"], variable: [{ key: "id", value: "notify-uuid-999" }] }
          },
          response: [
            makeResponse("Marked Read Success", 200, "OK", baseEnvelope({
              id: "notify-uuid-999",
              isRead: true
            }))
          ]
        },
        {
          name: "Mark All Notifications Read",
          request: {
            method: "PATCH",
            header: [{ key: "Authorization", value: "Bearer {{access_token}}" }],
            url: { raw: "{{base_url}}/notifications/bulk-read", host: ["{{base_url}}"], path: ["notifications", "bulk-read"] }
          },
          response: [
            makeResponse("Marked All Read Success", 200, "OK", baseEnvelope({
              count: 1
            }))
          ]
        }
      ]
    },
    {
      name: "Auditing",
      item: [
        {
          name: "Get Audit Trail",
          request: {
            method: "GET",
            header: [{ key: "Authorization", value: "Bearer admin-super-secret-token" }],
            url: { raw: "{{base_url}}/audit?page=1&limit=50", host: ["{{base_url}}"], path: ["audit"] }
          },
          response: [
            makeResponse("Get Audit Logs Success", 200, "OK", baseEnvelope({
              logs: [
                {
                  id: "audit-uuid-111",
                  actorId: "student-uuid-123",
                  actorType: "STUDENT",
                  action: "SUBMIT_APPLICATION",
                  resourceType: "APPLICATION",
                  resourceId: "application-uuid-456",
                  createdAt: "2026-07-18T12:10:00.000Z"
                }
              ],
              pagination: { page: 1, limit: 50, total: 1 }
            }))
          ]
        }
      ]
    },
    {
      name: "System",
      item: [
        {
          name: "GET Health Status",
          request: {
            method: "GET",
            header: [],
            url: { raw: "{{base_url}}/health", host: ["{{base_url}}"], path: ["health"] }
          },
          response: [
            makeResponse("Health Status Up", 200, "OK", baseEnvelope({
              status: "UP"
            }))
          ]
        }
      ]
    }
  ],
  variable: [
    { key: "base_url", value: "http://localhost:3000/api", type: "string" },
    { key: "access_token", value: "", type: "string" },
    { key: "company_token", value: "", type: "string" },
    { key: "refresh_token", value: "", type: "string" }
  ]
};

fs.writeFileSync(
  path.join(__dirname, "..", "internloom.postman_collection.json"),
  JSON.stringify(collection, null, 2)
);
console.log("Postman collection written successfully with all request bodies and expected response envelopes.");
