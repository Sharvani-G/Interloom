const prisma = require("../utils/db");
const { NotFoundError, ConflictError } = require("../utils/errors");
const auditService = require("./audit.service");

async function getProfile(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { companyProfile: true }
  });

  if (!user || user.role !== "COMPANY" || !user.companyProfile) {
    throw new NotFoundError("Company profile not found", "PROFILE_NOT_FOUND");
  }

  const profile = user.companyProfile;
  return {
    userId: profile.userId,
    email: user.email,
    companyName: profile.companyName,
    isApproved: profile.isApproved,
    createdAt: profile.createdAt
  };
}

async function updateProfile(userId, data) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { companyProfile: true }
  });

  if (!user || user.role !== "COMPANY" || !user.companyProfile) {
    throw new NotFoundError("Company profile not found", "PROFILE_NOT_FOUND");
  }

  const { email, companyName } = data;
  let updatedEmail = user.email;

  const updatedProfile = await prisma.$transaction(async (tx) => {
    if (email && email.toLowerCase() !== user.email.toLowerCase()) {
      const emailStr = email.toLowerCase();
      const existingUser = await tx.user.findUnique({
        where: { email: emailStr }
      });
      if (existingUser) {
        throw new ConflictError("Email already registered by another user", "EMAIL_EXISTS");
      }

      await tx.user.update({
        where: { id: userId },
        data: { email: emailStr }
      });
      updatedEmail = emailStr;
    }

    if (companyName) {
      await tx.company.update({
        where: { userId },
        data: { companyName }
      });
    }

    return tx.company.findUnique({
      where: { userId }
    });
  });

  await auditService.logEvent({
    actorId: userId,
    actorType: "COMPANY",
    action: "UPDATE_PROFILE",
    resourceType: "COMPANY_PROFILE",
    resourceId: userId,
    beforeState: user.companyProfile,
    afterState: updatedProfile
  });

  return {
    userId: updatedProfile.userId,
    email: updatedEmail,
    companyName: updatedProfile.companyName,
    isApproved: updatedProfile.isApproved,
    createdAt: updatedProfile.createdAt
  };
}

async function getListings(userId, page = 1, limit = 20) {
  const skip = (page - 1) * limit;

  const total = await prisma.listing.count({
    where: { companyId: userId }
  });

  const listings = await prisma.listing.findMany({
    where: { companyId: userId },
    include: {
      skills: {
        include: {
          skill: true
        }
      }
    },
    orderBy: { createdAt: "desc" },
    skip,
    take: limit
  });

  const data = listings.map((l) => ({
    id: l.id,
    title: l.title,
    description: l.description,
    stipend: l.stipend,
    location: l.location,
    applicationDeadline: l.applicationDeadline,
    maxApplicants: l.maxApplicants,
    applicantCount: l.applicantCount,
    status: l.status,
    createdAt: l.createdAt,
    updatedAt: l.updatedAt,
    skills: l.skills.map((ls) => ({
      name: ls.skill.name,
      isRequired: ls.isRequired
    }))
  }));

  return {
    listings: data,
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
  getListings
};
