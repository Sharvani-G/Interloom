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

  // 1. Setup listing with maxApplicants = 3 for quicker concurrent testing
  const maxApplicants = 3;
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

  // 2. Create 6 student accounts (more than maxApplicants) and generate tokens
  console.log("Creating 6 temporary student accounts and tokens...");
  const students = [];
  for (let i = 1; i <= 6; i++) {
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

  // 3. Launch concurrent requests to apply to the listing
  console.log("Firing 6 concurrent apply requests simultaneously...");
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

  results.forEach((res) => {
    console.log(`Student: ${res.email} -> Status: ${res.status}, Success: ${res.success}, Error: ${res.error ? res.error.code : "None"}`);
    if (res.success) {
      successCount++;
    } else {
      failureCount++;
    }
  });

  console.log("------------------------------------------");
  console.log(`Total Successes: ${successCount}`);
  console.log(`Total Failures: ${failureCount}`);

  // 4. Verify DB state
  const updatedListing = await prisma.listing.findUnique({
    where: { id: listingId }
  });

  console.log(`Final Listing State in DB:`);
  console.log(`- applicant_count: ${updatedListing.applicantCount}`);
  console.log(`- status: ${updatedListing.status}`);
  console.log("==========================================");

  // Assertions
  if (successCount === maxApplicants && updatedListing.applicantCount === maxApplicants && updatedListing.status === "AUTO_CLOSED") {
    console.log("TEST SUCCESSFUL: Atomic cap works perfectly! Exactly max_applicants applications succeeded and listing auto-closed.");
  } else {
    console.error("TEST FAILED: Race condition detected or incorrect status!");
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
