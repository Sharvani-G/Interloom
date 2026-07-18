const prisma = require("../utils/db");
const crypto = require("crypto");
const { calculateCompletenessScore } = require("../utils/matching");
const {
  NotFoundError,
  ConflictError,
  BadRequestError
} = require("../utils/errors");
const auditService = require("./audit.service");

// Helper to hash OTP using SHA256
function sha256(text) {
  return crypto.createHash("sha256").update(text).digest("hex");
}

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function getProfile(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      studentProfile: {
        include: {
          skills: {
            include: {
              skill: true
            }
          }
        }
      }
    }
  });

  if (!user || user.role !== "STUDENT" || !user.studentProfile) {
    throw new NotFoundError("Student profile not found", "PROFILE_NOT_FOUND");
  }

  const profile = user.studentProfile;
  const skillsList = profile.skills.map((ss) => ss.skill.name);
  
  // Calculate completeness score
  const scoreData = {
    ...profile,
    skills: skillsList
  };
  const completenessScore = calculateCompletenessScore(scoreData);

  return {
    userId: profile.userId,
    email: user.email,
    name: profile.name,
    college: profile.college,
    branch: profile.branch,
    graduationYear: profile.graduationYear,
    cgpa: profile.cgpa,
    githubUrl: profile.githubUrl,
    linkedinUrl: profile.linkedinUrl,
    bio: profile.bio,
    resumeUrl: profile.resumeUrl,
    isEmailVerified: profile.isEmailVerified,
    skills: skillsList,
    completenessScore,
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt
  };
}

async function updateProfile(userId, data) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { studentProfile: true }
  });

  if (!user || user.role !== "STUDENT" || !user.studentProfile) {
    throw new NotFoundError("Student profile not found", "PROFILE_NOT_FOUND");
  }

  const { email, skills, ...profileFields } = data;
  let emailUpdated = false;
  let debug_otp = null;
  let updatedEmail = user.email;

  // Run in a transaction
  const updatedProfile = await prisma.$transaction(async (tx) => {
    // 1. Email re-verification trigger
    if (email && email.toLowerCase() !== user.email.toLowerCase()) {
      const emailStr = email.toLowerCase();
      // Check domain
      if (!emailStr.endsWith(".edu") && !emailStr.endsWith(".ac.in")) {
        throw new BadRequestError("Student email must belong to an approved academic domain (.edu or .ac.in)", "INVALID_EMAIL_DOMAIN");
      }

      // Check if taken
      const existingUser = await tx.user.findUnique({
        where: { email: emailStr }
      });
      if (existingUser) {
        throw new ConflictError("Email already registered by another user", "EMAIL_EXISTS");
      }

      // Update User email
      await tx.user.update({
        where: { id: userId },
        data: { email: emailStr }
      });
      updatedEmail = emailStr;

      // Reset verification flag in profile
      profileFields.isEmailVerified = false;
      emailUpdated = true;
    }

    // 2. Normalize and update skills if provided
    if (skills !== undefined) {
      // Clear existing student skills
      await tx.studentSkill.deleteMany({
        where: { studentId: userId }
      });

      if (skills.length > 0) {
        // Upsert skills in skill table and collect IDs
        const skillConnections = [];
        for (const skillName of skills) {
          const formattedName = skillName.trim();
          if (formattedName) {
            const skill = await tx.skill.upsert({
              where: { name: formattedName },
              update: {},
              create: { name: formattedName }
            });
            skillConnections.push({
              studentId: userId,
              skillId: skill.id
            });
          }
        }

        // Re-create connections
        if (skillConnections.length > 0) {
          await tx.studentSkill.createMany({
            data: skillConnections
          });
        }
      }
    }

    // 3. Update profile fields
    const updated = await tx.studentProfile.update({
      where: { userId },
      data: profileFields,
      include: {
        skills: {
          include: {
            skill: true
          }
        }
      }
    });

    // 4. Generate new OTP if email changed
    if (emailUpdated) {
      const otp = generateOtp();
      const otpHash = sha256(otp);
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 15);

      // Expire previous OTPs
      await tx.otpVerification.updateMany({
        where: { userId, purpose: "EMAIL_CHANGE", consumed: false },
        data: { expiresAt: new Date() }
      });

      await tx.otpVerification.create({
        data: {
          userId,
          otpHash,
          purpose: "EMAIL_CHANGE",
          expiresAt
        }
      });

      console.log(`[DEBUG] OTP for student email change verification ${updatedEmail}: ${otp}`);
      debug_otp = otp;
    }

    return updated;
  });

  const skillsList = updatedProfile.skills.map((ss) => ss.skill.name);
  const scoreData = {
    ...updatedProfile,
    skills: skillsList
  };
  const completenessScore = calculateCompletenessScore(scoreData);

  const response = {
    userId: updatedProfile.userId,
    email: updatedEmail,
    name: updatedProfile.name,
    college: updatedProfile.college,
    branch: updatedProfile.branch,
    graduationYear: updatedProfile.graduationYear,
    cgpa: updatedProfile.cgpa,
    githubUrl: updatedProfile.githubUrl,
    linkedinUrl: updatedProfile.linkedinUrl,
    bio: updatedProfile.bio,
    resumeUrl: updatedProfile.resumeUrl,
    isEmailVerified: updatedProfile.isEmailVerified,
    skills: skillsList,
    completenessScore,
    createdAt: updatedProfile.createdAt,
    updatedAt: updatedProfile.updatedAt
  };

  if (emailUpdated && debug_otp) {
    response.debug_otp = debug_otp;
  }

  await auditService.logEvent({
    actorId: userId,
    actorType: "STUDENT",
    action: "UPDATE_PROFILE",
    resourceType: "STUDENT_PROFILE",
    resourceId: userId,
    beforeState: user.studentProfile,
    afterState: updatedProfile
  });

  return response;
}

async function deleteProfile(userId) {
  // Block if student has any application in SUBMITTED, UNDER_REVIEW, or SHORTLISTED state
  const activeApplications = await prisma.application.findFirst({
    where: {
      studentId: userId,
      status: {
        in: ["SUBMITTED", "UNDER_REVIEW", "SHORTLISTED"]
      }
    }
  });

  if (activeApplications) {
    throw new BadRequestError(
      "Cannot delete profile with active applications (Submitted, Under Review, Shortlisted)",
      "ACTIVE_APPLICATIONS_EXIST"
    );
  }

  // Delete User and profile will cascade delete
  await prisma.user.delete({
    where: { id: userId }
  });

  await auditService.logEvent({
    actorId: userId,
    actorType: "STUDENT",
    action: "DELETE_PROFILE",
    resourceType: "STUDENT_PROFILE",
    resourceId: userId,
    beforeState: activeApplications ? null : { userId } // activeApplications is null here
  });

  return {
    message: "Student account deleted successfully"
  };
}

async function getApplications(userId, page = 1, limit = 20) {
  const skip = (page - 1) * limit;

  const total = await prisma.application.count({
    where: { studentId: userId }
  });

  const applications = await prisma.application.findMany({
    where: { studentId: userId },
    include: {
      listing: {
        include: {
          company: true,
          skills: {
            include: {
              skill: true
            }
          }
        }
      }
    },
    orderBy: { appliedAt: "desc" },
    skip,
    take: limit
  });

  const data = applications.map((app) => {
    return {
      id: app.id,
      status: app.status,
      appliedAt: app.appliedAt,
      updatedAt: app.updatedAt,
      listing: {
        id: app.listing.id,
        title: app.listing.title,
        stipend: app.listing.stipend,
        location: app.listing.location,
        status: app.listing.status,
        companyName: app.listing.company.companyName,
        skills: app.listing.skills.map((ls) => ({
          name: ls.skill.name,
          isRequired: ls.isRequired
        }))
      }
    };
  });

  return {
    applications: data,
    pagination: {
      page,
      limit,
      total
    }
  };
}

module.exports = {
  getProfile,
  updateProfile,
  deleteProfile,
  getApplications
};
