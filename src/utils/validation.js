const { z } = require("zod");

// Custom validation for Student email domain
const studentEmailSchema = z.string().email().refine((email) => {
  const lower = email.toLowerCase();
  return lower.endsWith(".edu") || lower.endsWith(".ac.in");
}, {
  message: "Student email must belong to an approved academic domain (.edu or .ac.in)"
});

const registerStudentSchema = z.object({
  email: studentEmailSchema,
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(1, "Name is required"),
  college: z.string().min(1, "College is required"),
  branch: z.string().min(1, "Branch is required"),
  graduationYear: z.number().int().min(1900).max(2100, "Invalid graduation year"),
  cgpa: z.number().min(0.0).max(10.0, "CGPA must be between 0.0 and 10.0"),
  githubUrl: z.string().url("Invalid GitHub URL").optional().nullable().or(z.literal("")),
  linkedinUrl: z.string().url("Invalid LinkedIn URL").optional().nullable().or(z.literal("")),
  bio: z.string().optional().nullable().or(z.literal("")),
  resumeUrl: z.string().url("Invalid Resume URL").optional().nullable().or(z.literal(""))
});

const registerCompanySchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  companyName: z.string().min(1, "Company name is required")
});

const loginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(1, "Password is required")
});

const verifyOtpSchema = z.object({
  email: z.string().email(),
  otp: z.string().length(6, "OTP must be 6 digits"),
  purpose: z.enum(["REGISTER", "EMAIL_CHANGE"])
});

const resendOtpSchema = z.object({
  email: z.string().email(),
  purpose: z.enum(["REGISTER", "EMAIL_CHANGE"])
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required")
});

const updateStudentSchema = z.object({
  email: studentEmailSchema.optional(),
  name: z.string().min(1).optional(),
  college: z.string().min(1).optional(),
  branch: z.string().min(1).optional(),
  graduationYear: z.number().int().min(1900).max(2100).optional(),
  cgpa: z.number().min(0.0).max(10.0).optional(),
  githubUrl: z.string().url("Invalid GitHub URL").optional().nullable().or(z.literal("")),
  linkedinUrl: z.string().url("Invalid LinkedIn URL").optional().nullable().or(z.literal("")),
  bio: z.string().optional().nullable().or(z.literal("")),
  resumeUrl: z.string().url("Invalid Resume URL").optional().nullable().or(z.literal("")),
  skills: z.array(z.string()).optional()
});

const updateCompanySchema = z.object({
  email: z.string().email("Invalid email format").optional(),
  companyName: z.string().min(1, "Company name is required").optional()
});

const createListingSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  stipend: z.number().int().nonnegative("Stipend must be a non-negative integer"),
  location: z.enum(["REMOTE", "HYBRID", "ONSITE"]),
  applicationDeadline: z.string().datetime().refine((val) => new Date(val) > new Date(), {
    message: "Deadline must be in the future"
  }),
  maxApplicants: z.number().int().positive("Max applicants must be at least 1"),
  skills: z.array(
    z.object({
      name: z.string().min(1, "Skill name cannot be empty"),
      isRequired: z.boolean().default(true)
    })
  ).optional().default([])
});

const updateListingSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  stipend: z.number().int().nonnegative().optional(),
  location: z.enum(["REMOTE", "HYBRID", "ONSITE"]).optional(),
  applicationDeadline: z.string().datetime().refine((val) => new Date(val) > new Date(), {
    message: "Deadline must be in the future"
  }).optional(),
  maxApplicants: z.number().int().positive().optional(),
  skills: z.array(
    z.object({
      name: z.string().min(1),
      isRequired: z.boolean()
    })
  ).optional()
});

const updateListingStatusSchema = z.object({
  status: z.enum(["DRAFT", "ACTIVE", "CLOSED"])
});

const updateApplicationStatusSchema = z.object({
  status: z.enum(["UNDER_REVIEW", "SHORTLISTED", "OFFER_EXTENDED", "REJECTED"])
});

const bulkUpdateApplicationsSchema = z.object({
  applicationIds: z.array(z.string().uuid("Invalid application ID format")),
  status: z.enum(["UNDER_REVIEW", "SHORTLISTED", "OFFER_EXTENDED", "REJECTED"])
});

module.exports = {
  registerStudentSchema,
  registerCompanySchema,
  loginSchema,
  verifyOtpSchema,
  resendOtpSchema,
  refreshSchema,
  updateStudentSchema,
  updateCompanySchema,
  createListingSchema,
  updateListingSchema,
  updateListingStatusSchema,
  updateApplicationStatusSchema,
  bulkUpdateApplicationsSchema
};
