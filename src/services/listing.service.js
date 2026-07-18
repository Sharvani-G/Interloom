const prisma = require("../utils/db");
const { NotFoundError, ForbiddenError, BadRequestError } = require("../utils/errors");
const { calculateMatchScore } = require("../utils/matching");
const auditService = require("./audit.service");

async function createListing(companyId, data) {
  const company = await prisma.company.findUnique({
    where: { userId: companyId }
  });

  if (!company) {
    throw new NotFoundError("Company profile not found", "PROFILE_NOT_FOUND");
  }

  if (!company.isApproved) {
    throw new ForbiddenError(
      "Your company account is not approved by administrator yet. Creation blocked.",
      "COMPANY_NOT_APPROVED"
    );
  }

  const { skills, ...listingFields } = data;

  const newListing = await prisma.$transaction(async (tx) => {
    const listing = await tx.listing.create({
      data: {
        ...listingFields,
        companyId,
        status: "DRAFT"
      }
    });

    if (skills && skills.length > 0) {
      const skillsConnections = [];
      for (const skillObj of skills) {
        const name = skillObj.name.trim();
        if (name) {
          const skill = await tx.skill.upsert({
            where: { name },
            update: {},
            create: { name }
          });
          skillsConnections.push({
            listingId: listing.id,
            skillId: skill.id,
            isRequired: skillObj.isRequired !== undefined ? skillObj.isRequired : true
          });
        }
      }

      if (skillsConnections.length > 0) {
        await tx.listingSkill.createMany({
          data: skillsConnections
        });
      }
    }

    return tx.listing.findUnique({
      where: { id: listing.id },
      include: {
        skills: {
          include: {
            skill: true
          }
        }
      }
    });
  });

  await auditService.logEvent({
    actorId: companyId,
    actorType: "COMPANY",
    action: "CREATE_LISTING",
    resourceType: "LISTING",
    resourceId: newListing.id,
    afterState: newListing
  });

  return formatListing(newListing);
}

async function updateListing(companyId, listingId, data) {
  const listing = await prisma.listing.findUnique({
    where: { id: listingId }
  });

  if (!listing) {
    throw new NotFoundError("Listing not found", "LISTING_NOT_FOUND");
  }

  if (listing.companyId !== companyId) {
    throw new ForbiddenError("You are not the owner of this listing", "NOT_LISTING_OWNER");
  }

  if (listing.status === "CLOSED") {
    throw new BadRequestError("Cannot update a closed listing", "LISTING_CLOSED");
  }

  const { skills, ...listingFields } = data;

  const updated = await prisma.$transaction(async (tx) => {
    await tx.listing.update({
      where: { id: listingId },
      data: listingFields
    });

    if (skills !== undefined) {
      // Delete existing skills
      await tx.listingSkill.deleteMany({
        where: { listingId }
      });

      if (skills.length > 0) {
        const skillsConnections = [];
        for (const skillObj of skills) {
          const name = skillObj.name.trim();
          if (name) {
            const skill = await tx.skill.upsert({
              where: { name },
              update: {},
              create: { name }
            });
            skillsConnections.push({
              listingId,
              skillId: skill.id,
              isRequired: skillObj.isRequired !== undefined ? skillObj.isRequired : true
            });
          }
        }

        if (skillsConnections.length > 0) {
          await tx.listingSkill.createMany({
            data: skillsConnections
          });
        }
      }
    }

    return tx.listing.findUnique({
      where: { id: listingId },
      include: {
        skills: {
          include: {
            skill: true
          }
        }
      }
    });
  });

  await auditService.logEvent({
    actorId: companyId,
    actorType: "COMPANY",
    action: "UPDATE_LISTING",
    resourceType: "LISTING",
    resourceId: listingId,
    beforeState: listing,
    afterState: updated
  });

  return formatListing(updated);
}

async function updateListingStatus(companyId, listingId, newStatus) {
  const listing = await prisma.listing.findUnique({
    where: { id: listingId }
  });

  if (!listing) {
    throw new NotFoundError("Listing not found", "LISTING_NOT_FOUND");
  }

  if (listing.companyId !== companyId) {
    throw new ForbiddenError("You are not the owner of this listing", "NOT_LISTING_OWNER");
  }

  const currentStatus = listing.status;

  // Strict transitions validation:
  // DRAFT -> ACTIVE or CLOSED
  // ACTIVE -> CLOSED
  // AUTO_CLOSED -> CLOSED
  // CLOSED is terminal
  let isValid = false;
  if (currentStatus === "DRAFT" && (newStatus === "ACTIVE" || newStatus === "CLOSED")) {
    isValid = true;
  } else if (currentStatus === "ACTIVE" && newStatus === "CLOSED") {
    isValid = true;
  } else if (currentStatus === "AUTO_CLOSED" && newStatus === "CLOSED") {
    isValid = true;
  }

  if (!isValid) {
    throw new BadRequestError(
      `Invalid listing status transition from ${currentStatus} to ${newStatus}`,
      "INVALID_STATUS_TRANSITION"
    );
  }

  // If transitioning to ACTIVE and cap is already met or deadline passed, it should immediately be AUTO_CLOSED?
  // Let's just update to target status, but check if we transition to ACTIVE.
  let targetStatus = newStatus;
  if (newStatus === "ACTIVE") {
    if (listing.applicantCount >= listing.maxApplicants || new Date(listing.applicationDeadline) <= new Date()) {
      targetStatus = "AUTO_CLOSED";
    }
  }

  const updated = await prisma.listing.update({
    where: { id: listingId },
    data: { status: targetStatus },
    include: {
      skills: {
        include: {
          skill: true
        }
      }
    }
  });

  await auditService.logEvent({
    actorId: companyId,
    actorType: "COMPANY",
    action: "UPDATE_LISTING_STATUS",
    resourceType: "LISTING",
    resourceId: listingId,
    beforeState: { status: currentStatus },
    afterState: { status: targetStatus }
  });

  return formatListing(updated);
}

async function getListingById(listingId, currentUserId, currentUserRole) {
  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    include: {
      company: true,
      skills: {
        include: {
          skill: true
        }
      }
    }
  });

  if (!listing) {
    throw new NotFoundError("Listing not found", "LISTING_NOT_FOUND");
  }

  const formatted = formatListing(listing);
  formatted.companyName = listing.company.companyName;

  // If logged in student, calculate and attach match score
  if (currentUserId && currentUserRole === "STUDENT") {
    const student = await getStudentProfileForMatching(currentUserId);
    if (student) {
      formatted.matchScore = calculateMatchScore(student, listing);
    }
  }

  return formatted;
}

async function getListings(filters, currentUserId, currentUserRole) {
  const { location, minStipend, maxStipend, search, sortBy, page = 1, limit = 20 } = filters;
  const skip = (page - 1) * limit;

  // Query conditions for student/public (only ACTIVE and not expired)
  const where = {};
  if (currentUserRole !== "COMPANY") {
    where.status = "ACTIVE";
    where.applicationDeadline = { gt: new Date() };
  }

  if (location) {
    where.location = location;
  }

  if (minStipend !== undefined || maxStipend !== undefined) {
    where.stipend = {};
    if (minStipend !== undefined) where.stipend.gte = parseInt(minStipend, 10);
    if (maxStipend !== undefined) where.stipend.lte = parseInt(maxStipend, 10);
  }

  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
      { company: { companyName: { contains: search, mode: "insensitive" } } }
    ];
  }

  // If sortBy=match and is student, fetch all candidates, sort in-memory, and slice
  if (sortBy === "match" && currentUserRole === "STUDENT") {
    const allListings = await prisma.listing.findMany({
      where,
      include: {
        company: true,
        skills: {
          include: {
            skill: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    const student = await getStudentProfileForMatching(currentUserId);
    if (!student) {
      throw new NotFoundError("Student profile not found", "PROFILE_NOT_FOUND");
    }

    const formattedListings = allListings.map((l) => {
      const formatted = formatListing(l);
      formatted.companyName = l.company.companyName;
      formatted.matchScore = calculateMatchScore(student, l);
      return formatted;
    });

    // Sort by match score descending
    formattedListings.sort((a, b) => b.matchScore - a.matchScore);

    const total = formattedListings.length;
    const paginated = formattedListings.slice(skip, skip + limit);

    return {
      listings: paginated,
      pagination: {
        page,
        limit,
        total
      }
    };
  }

  // Normal paginated flow (sortBy !== match or not student)
  const total = await prisma.listing.count({ where });

  const listings = await prisma.listing.findMany({
    where,
    include: {
      company: true,
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

  let student = null;
  if (currentUserRole === "STUDENT" && currentUserId) {
    student = await getStudentProfileForMatching(currentUserId);
  }

  const data = listings.map((l) => {
    const formatted = formatListing(l);
    formatted.companyName = l.company.companyName;
    if (student) {
      formatted.matchScore = calculateMatchScore(student, l);
    }
    return formatted;
  });

  return {
    listings: data,
    pagination: {
      page,
      limit,
      total
    }
  };
}

// Helpers
function formatListing(l) {
  return {
    id: l.id,
    companyId: l.companyId,
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
    skills: l.skills
      ? l.skills.map((ls) => ({
          name: ls.skill.name,
          isRequired: ls.isRequired
        }))
      : []
  };
}

async function getStudentProfileForMatching(userId) {
  const profile = await prisma.studentProfile.findUnique({
    where: { userId },
    include: {
      skills: {
        include: {
          skill: true
        }
      }
    }
  });

  if (!profile) return null;

  return {
    ...profile,
    skills: profile.skills.map((ss) => ss.skill.name)
  };
}

module.exports = {
  createListing,
  updateListing,
  updateListingStatus,
  getListingById,
  getListings
};
