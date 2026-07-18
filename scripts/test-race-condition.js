const { PrismaClient } = require("@prisma/client");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const prisma = new PrismaClient();
const PORT = process.env.PORT || 3000;
const BASE_URL = `http://localhost:${PORT}/api`;

async function testRaceCondition() {
  console.log("==========================================");
  console.log("STARTING RACE CONDITION TEST FOR APPLICANT CAP");
  console.log("==========================================");

  const maxApplicants = 1;
  console.log(`Creating test company & listing with max_applicants = ${maxApplicants}...`);

  // Create a temp test company
  const companyUser = await prisma.user.create({
    data: {
      email: `test-company-${Date.now()}@test.com`,
      passwordHash: "dummy-hash",
      role: "COMPANY",
      companyProfile: {
        create: {
          companyName: "Race Condition Corp",
          isApproved: true
        }
      }
    }
  });

  // Create a listing in ACTIVE state
  const deadline = new Date();
  deadline.setDate(deadline.getDate() + 5);
  const listing = await prisma.listing.create({
    data: {
      companyId: companyUser.id,
      title: "Race Condition Intern",
      description: "Test listing for cap race condition",
      stipend: 500,
      location: "REMOTE",
      applicationDeadline: deadline,
      maxApplicants,
      status: "ACTIVE"
    }
  });

  const listingId = listing.id;
  console.log(`Created Listing ID: ${listingId} (max_applicants: ${maxApplicants})`);

  // Create 5 student accounts and generate tokens
  console.log("Creating 5 temporary student accounts and tokens...");
  const students = [];
  for (let i = 1; i <= 5; i++) {
    const email = `student-${i}-${Date.now()}@university.edu`;
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: "dummy-hash",
        role: "STUDENT",
        studentProfile: {
          create: {
            name: `Student ${i}`,
            college: "Test University",
            branch: "Computer Science",
            graduationYear: 2027,
            cgpa: 8.5,
            isEmailVerified: true
          }
        }
      }
    });

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: "10m" }
    );

    students.push({ user, token });
  }

  // Launch 5 concurrent requests
  console.log("Firing 5 concurrent apply requests simultaneously...");
  const promises = students.map(({ token, user }) => {
    return fetch(`${BASE_URL}/listings/${listingId}/apply`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      }
    }).then(async (res) => {
      const data = await res.json();
      return {
        email: user.email,
        status: res.status,
        success: data.success,
        error: data.error
      };
    });
  });

  const results = await Promise.all(promises);

  console.log("------------------------------------------");
  console.log("RESULTS:");
  let successCount = 0;
  let failureCount = 0;
  let listingFullCount = 0;
  let status500Count = 0;
  let mismatchCount = 0;

  results.forEach((res) => {
    const errCode = res.error ? res.error.code : "None";
    console.log(`Student: ${res.email} -> Status: ${res.status}, Success: ${res.success}, Error: ${errCode}`);
    
    if (res.status === 500) {
      status500Count++;
    }

    if (res.success) {
      successCount++;
    } else {
      failureCount++;
      if (errCode === "LISTING_FULL") {
        listingFullCount++;
      } else {
        mismatchCount++;
        console.warn(`[MISMATCH] Expected LISTING_FULL, got error code: ${errCode} for student ${res.email}`);
      }
    }
  });

  console.log("------------------------------------------");
  console.log(`Total Successes: ${successCount}`);
  console.log(`Total Failures: ${failureCount}`);
  console.log(`LISTING_FULL Failures: ${listingFullCount}`);
  console.log(`500 Internal Errors: ${status500Count}`);
  console.log(`Mismatches: ${mismatchCount}`);
  console.log("------------------------------------------");

  // Verify DB state
  const updatedListing = await prisma.listing.findUnique({
    where: { id: listingId }
  });

  console.log(`Final Listing State in DB:`);
  console.log(`- applicant_count: ${updatedListing.applicantCount}`);
  console.log(`- status: ${updatedListing.status}`);
  console.log("==========================================");

  // Assertion check output
  const isMatch = (mismatchCount === 0);
  if (successCount === 1 && failureCount === 4 && isMatch && status500Count === 0) {
    console.log("VERIFICATION RESULT: 1 Success / 4 Failed / all LISTING_FULL / no 500s");
  } else {
    console.warn("VERIFICATION RESULT: DISCREPANCY DETECTED!");
    console.log(`Successes: ${successCount} (expected 1)`);
    console.log(`Failures: ${failureCount} (expected 4)`);
    console.log(`Mismatches (non-LISTING_FULL): ${mismatchCount} (expected 0)`);
    console.log(`500 errors: ${status500Count} (expected 0)`);
  }

  // Clean up
  console.log("Cleaning up temp users & listing...");
  await prisma.application.deleteMany({ where: { listingId } });
  await prisma.listing.delete({ where: { id: listingId } });
  await prisma.company.delete({ where: { userId: companyUser.id } });
  
  for (const s of students) {
    await prisma.studentProfile.delete({ where: { userId: s.user.id } });
    await prisma.user.delete({ where: { id: s.user.id } });
  }
  await prisma.user.delete({ where: { id: companyUser.id } });
  console.log("Cleanup completed.");
}

testRaceCondition()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
