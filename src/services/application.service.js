const prisma = require("../utils/db");
const { NotFoundError, ForbiddenError, BadRequestError, ConflictError } = require("../utils/errors");
const { calculateMatchScore } = require("../utils/matching");
const notificationService = require("./notification.service");
const auditService = require("./audit.service");

async function apply(studentId, listingId) {
  // 1. Check student profile and email verification
  const student = await prisma.studentProfile.findUnique({
    where: { userId: studentId },
    include: {
      skills: {
        include: {
          skill: true
        }
      }
    }
  });

  if (!student) {
    throw new NotFoundError("Student profile not found", "PROFILE_NOT_FOUND");
  }

  if (!student.isEmailVerified) {
    throw new BadRequestError(
      "Student email is not verified. Please verify your email before applying.",
      "EMAIL_NOT_VERIFIED"
    );
  }

  // 2. Check duplicate application
  const existingApp = await prisma.application.findUnique({
    where: {
      studentId_listingId: { studentId, listingId }
    }
  });

  if (existingApp) {
    throw new ConflictError("You have already applied to this listing", "ALREADY_APPLIED");
  }

  // 3. Check listing status and deadline
  const listing = await prisma.listing.findUnique({
    where: { id: listingId }
  });

  if (!listing) {
    throw new NotFoundError("Listing not found", "LISTING_NOT_FOUND");
  }

  if (listing.status === "AUTO_CLOSED" || listing.applicantCount >= listing.maxApplicants) {
    throw new BadRequestError("Application cap reached for this listing", "LISTING_FULL");
  }

  if (listing.status !== "ACTIVE") {
    throw new BadRequestError("Listing is not active", "LISTING_NOT_ACTIVE");
  }

  if (new Date(listing.applicationDeadline) <= new Date()) {
    throw new BadRequestError("Application deadline has passed", "DEADLINE_PASSED");
  }

  // 4. Perform atomic update to increment applicant count and set AUTO_CLOSED if full
  const updatedListings = await prisma.$queryRawUnsafe(
    `UPDATE listings
     SET applicant_count = applicant_count + 1,
         status = CASE WHEN applicant_count + 1 >= max_applicants THEN 'AUTO_CLOSED'::"ListingStatus" ELSE status END
     WHERE id = $1 AND status = 'ACTIVE' AND applicant_count < max_applicants AND application_deadline > $2
     RETURNING *`,
    listingId,
    new Date()
  );

  if (!updatedListings || updatedListings.length === 0) {
    // Determine the exact failure reason
    const currentListing = await prisma.listing.findUnique({ where: { id: listingId } });
    if (!currentListing) {
      throw new NotFoundError("Listing not found", "LISTING_NOT_FOUND");
    }
    if (currentListing.status === "AUTO_CLOSED" || currentListing.applicantCount >= currentListing.maxApplicants) {
      throw new BadRequestError("Application cap reached for this listing", "LISTING_FULL");
    }
    if (currentListing.status !== "ACTIVE") {
      throw new BadRequestError("Listing is not active", "LISTING_NOT_ACTIVE");
    }
    if (new Date(currentListing.applicationDeadline) <= new Date()) {
      throw new BadRequestError("Application deadline has passed", "DEADLINE_PASSED");
    }
    throw new BadRequestError("Failed to submit application", "APPLY_FAILED");
  }

  // 5. Create application record
  const application = await prisma.application.create({
    data: {
      studentId,
      listingId,
      status: "SUBMITTED"
    },
    include: {
      listing: true
    }
  });

  // 6. Send notification to company
  await notificationService.createNotification(
    application.listing.companyId,
    "APPLICATION_SUBMITTED",
    `A student has applied to your listing: ${application.listing.title}`
  );

  await auditService.logEvent({
    actorId: studentId,
    actorType: "STUDENT",
    action: "SUBMIT_APPLICATION",
    resourceType: "APPLICATION",
    resourceId: application.id,
    afterState: application
  });

  return application;
}

async function withdraw(studentId, applicationId) {
  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    include: { listing: true }
  });

  if (!application) {
    throw new NotFoundError("Application not found", "APPLICATION_NOT_FOUND");
  }

  if (application.studentId !== studentId) {
    throw new ForbiddenError("You do not own this application", "NOT_APPLICATION_OWNER");
  }

  if (application.status !== "SUBMITTED") {
    throw new BadRequestError(
      "Only applications in SUBMITTED state can be withdrawn",
      "INVALID_WITHDRAW_STATE"
    );
  }

  const listingId = application.listingId;

  // Run in a transaction
  await prisma.$transaction(async (tx) => {
    // Delete application
    await tx.application.delete({
      where: { id: applicationId }
    });

    // Atomic decrement and status reopen if it was AUTO_CLOSED
    await tx.$queryRawUnsafe(
      `UPDATE listings
       SET applicant_count = applicant_count - 1,
           status = CASE WHEN status = 'AUTO_CLOSED' AND applicant_count - 1 < max_applicants THEN 'ACTIVE'::"ListingStatus" ELSE status END
       WHERE id = $1`,
      listingId
    );
  });

  await auditService.logEvent({
    actorId: studentId,
    actorType: "STUDENT",
    action: "WITHDRAW_APPLICATION",
    resourceType: "APPLICATION",
    resourceId: applicationId,
    beforeState: application
  });

  return {
    message: "Application withdrawn successfully"
  };
}

async function getApplicants(companyId, listingId, page = 1, limit = 20) {
  const listing = await prisma.listing.findUnique({
    where: { id: listingId }
  });

  if (!listing) {
    throw new NotFoundError("Listing not found", "LISTING_NOT_FOUND");
  }

  if (listing.companyId !== companyId) {
    throw new ForbiddenError("You are not the owner of this listing", "NOT_LISTING_OWNER");
  }

  const skip = (page - 1) * limit;

  // Fetch all applications for this listing to calculate scores & sort
  const allApplications = await prisma.application.findMany({
    where: { listingId },
    include: {
      student: {
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

  const formattedApplicants = allApplications.map((app) => {
    const student = app.student;
    const studentSkills = student.skills.map((ss) => ss.skill.name);
    const scoreData = {
      ...student,
      skills: studentSkills
    };

    const matchScore = calculateMatchScore(scoreData, listing);

    return {
      applicationId: app.id,
      status: app.status,
      appliedAt: app.appliedAt,
      student: {
        userId: student.userId,
        name: student.name,
        college: student.college,
        branch: student.branch,
        graduationYear: student.graduationYear,
        cgpa: student.cgpa,
        githubUrl: student.githubUrl,
        linkedinUrl: student.linkedinUrl,
        bio: student.bio,
        resumeUrl: student.resumeUrl,
        skills: studentSkills
      },
      matchScore
    };
  });

  // Sort by match score descending
  formattedApplicants.sort((a, b) => b.matchScore - a.matchScore);

  const total = formattedApplicants.length;
  const paginated = formattedApplicants.slice(skip, skip + limit);

  return {
    applicants: paginated,
    pagination: {
      page,
      limit,
      total
    }
  };
}

async function updateStatus(companyId, applicationId, newStatus) {
  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    include: { listing: true }
  });

  if (!application) {
    throw new NotFoundError("Application not found", "APPLICATION_NOT_FOUND");
  }

  if (application.listing.companyId !== companyId) {
    throw new ForbiddenError("You are not the owner of this listing", "NOT_LISTING_OWNER");
  }

  const currentStatus = application.status;

  // Forward-only validation:
  const validTransitions = {
    SUBMITTED: ["UNDER_REVIEW", "SHORTLISTED", "OFFER_EXTENDED", "REJECTED"],
    UNDER_REVIEW: ["SHORTLISTED", "OFFER_EXTENDED", "REJECTED"],
    SHORTLISTED: ["OFFER_EXTENDED", "REJECTED"],
    OFFER_EXTENDED: [],
    REJECTED: []
  };

  if (!validTransitions[currentStatus].includes(newStatus)) {
    throw new BadRequestError(
      `Invalid application status transition from ${currentStatus} to ${newStatus}`,
      "INVALID_STATUS_TRANSITION"
    );
  }

  const updated = await prisma.application.update({
    where: { id: applicationId },
    data: { status: newStatus },
    include: { listing: true }
  });

  // Notify student
  await notificationService.createNotification(
    application.studentId,
    "APPLICATION_STATUS_UPDATED",
    `Your application for ${application.listing.title} is now ${newStatus}`
  );

  await auditService.logEvent({
    actorId: companyId,
    actorType: "COMPANY",
    action: "UPDATE_APPLICATION_STATUS",
    resourceType: "APPLICATION",
    resourceId: applicationId,
    beforeState: { status: currentStatus },
    afterState: { status: newStatus }
  });

  return updated;
}

async function bulkUpdateStatus(companyId, applicationIds, newStatus) {
  let successCount = 0;

  await prisma.$transaction(async (tx) => {
    for (const id of applicationIds) {
      const application = await tx.application.findUnique({
        where: { id },
        include: { listing: true }
      });

      if (!application) {
        throw new NotFoundError(`Application ${id} not found`, "APPLICATION_NOT_FOUND");
      }

      if (application.listing.companyId !== companyId) {
        throw new ForbiddenError(
          `You are not the owner of listing for application ${id}`,
          "NOT_LISTING_OWNER"
        );
      }

      const currentStatus = application.status;

      // Forward-only validation
      const validTransitions = {
        SUBMITTED: ["UNDER_REVIEW", "SHORTLISTED", "OFFER_EXTENDED", "REJECTED"],
        UNDER_REVIEW: ["SHORTLISTED", "OFFER_EXTENDED", "REJECTED"],
        SHORTLISTED: ["OFFER_EXTENDED", "REJECTED"],
        OFFER_EXTENDED: [],
        REJECTED: []
      };

      if (!validTransitions[currentStatus].includes(newStatus)) {
        throw new BadRequestError(
          `Invalid application status transition from ${currentStatus} to ${newStatus} for application ${id}`,
          "INVALID_STATUS_TRANSITION"
        );
      }

      await tx.application.update({
        where: { id },
        data: { status: newStatus }
      });

      // Notify student
      await notificationService.createNotification(
        application.studentId,
        "APPLICATION_STATUS_UPDATED",
        `Your application for ${application.listing.title} is now ${newStatus}`
      );

      await auditService.logEvent({
        actorId: companyId,
        actorType: "COMPANY",
        action: "UPDATE_APPLICATION_STATUS",
        resourceType: "APPLICATION",
        resourceId: id,
        beforeState: { status: currentStatus },
        afterState: { status: newStatus }
      });

      successCount++;
    }
  });

  return {
    successCount,
    message: `Successfully updated status of ${successCount} applications`
  };
}

module.exports = {
  apply,
  withdraw,
  getApplicants,
  updateStatus,
  bulkUpdateStatus
};
