const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const PORT = process.env.PORT || 3000;
const BASE_URL = `http://localhost:${PORT}/api`;

async function runSimulation() {
  console.log("==========================================");
  console.log("RUNNING END-TO-END FLOWS SIMULATION");
  console.log("==========================================");

  // --- FLOW A: STUDENT FLOW ---
  console.log("\n[FLOW A] Starting Student Registration & Matching Flow...");
  
  // 1. Student registers
  const studentEmail = `student-${Date.now()}@university.edu`;
  const registerRes = await fetch(`${BASE_URL}/auth/register/student`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: studentEmail,
      password: "Password123!",
      name: "Grading Student",
      college: "Global Tech",
      branch: "Computer Science",
      graduationYear: 2027,
      cgpa: 9.0
    })
  });
  const registerData = await registerRes.json();
  if (!registerData.success) throw new Error("Student registration failed: " + JSON.stringify(registerData.error));
  console.log(`Student registered. Debug OTP: ${registerData.data.debug_otp}`);

  // 2. Student verifies OTP
  const verifyRes = await fetch(`${BASE_URL}/auth/verify-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: studentEmail,
      otp: registerData.data.debug_otp,
      purpose: "REGISTER"
    })
  });
  const verifyData = await verifyRes.json();
  if (!verifyData.success) throw new Error("Student OTP verification failed: " + JSON.stringify(verifyData.error));
  console.log("Student OTP verified successfully.");

  // 3. Student logs in
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: studentEmail,
      password: "Password123!"
    })
  });
  const loginData = await loginRes.json();
  if (!loginData.success) throw new Error("Student login failed");
  const studentToken = loginData.data.accessToken;
  console.log("Student logged in. Access token received.");

  // 4. Student updates profile with skills
  const updateProfileRes = await fetch(`${BASE_URL}/students/me`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${studentToken}`
    },
    body: JSON.stringify({
      skills: ["React", "Node.js", "SQL"]
    })
  });
  const updateData = await updateProfileRes.json();
  if (!updateData.success) throw new Error("Student update profile failed: " + JSON.stringify(updateData.error));
  console.log(`Student profile updated. Skills: ${updateData.data.skills.join(", ")}, Completeness Score: ${updateData.data.completenessScore}%`);

  // --- FLOW B: COMPANY & APPLICANTS FLOW ---
  console.log("\n[FLOW B] Starting Company Listing & Applicant Ranking Flow...");

  // 1. Company registers
  const companyEmail = `company-${Date.now()}@seededtech.com`;
  const companyRegRes = await fetch(`${BASE_URL}/auth/register/company`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: companyEmail,
      password: "Password123!",
      companyName: "Loom Tech Industries"
    })
  });
  const companyRegData = await companyRegRes.json();
  if (!companyRegData.success) throw new Error("Company registration failed");
  const companyId = companyRegData.data.userId;
  console.log(`Company registered. Company User ID: ${companyId}`);

  // Approve the company in the database so they can post listings
  await prisma.company.update({
    where: { userId: companyId },
    data: { isApproved: true }
  });
  console.log("Company approved inside database.");

  // 2. Company logs in
  const companyLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: companyEmail,
      password: "Password123!"
    })
  });
  const companyLoginData = await companyLoginRes.json();
  const companyToken = companyLoginData.data.accessToken;
  console.log("Company logged in. Access token received.");

  // 3. Company posts a listing with skills
  const deadline = new Date();
  deadline.setDate(deadline.getDate() + 10);
  const postListingRes = await fetch(`${BASE_URL}/listings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${companyToken}`
    },
    body: JSON.stringify({
      title: "Senior React Developer Intern",
      description: "Build robust frontend dashboards with React and Node.",
      stipend: 2000,
      location: "REMOTE",
      applicationDeadline: deadline.toISOString(),
      maxApplicants: 5,
      skills: [
        { name: "React", isRequired: true },
        { name: "Node.js", isRequired: false },
        { name: "SQL", isRequired: false }
      ]
    })
  });
  const listingData = await postListingRes.json();
  if (!listingData.success) throw new Error("Posting listing failed: " + JSON.stringify(listingData.error));
  const listingId = listingData.data.id;
  console.log(`Company posted listing: "${listingData.data.title}" (ID: ${listingId}). Status: ${listingData.data.status}`);

  // Transition listing from DRAFT to ACTIVE
  const statusRes = await fetch(`${BASE_URL}/listings/${listingId}/status`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${companyToken}`
    },
    body: JSON.stringify({ status: "ACTIVE" })
  });
  const statusData = await statusRes.json();
  console.log(`Listing status manual transition complete. Status: ${statusData.data.status}`);

  // 4. Student sees ranked listings (Flow A verify)
  console.log("\n[VERIFICATION] Student searches listings (sorted by match score)...");
  const studentListingsRes = await fetch(`${BASE_URL}/listings?sortBy=match`, {
    headers: { "Authorization": `Bearer ${studentToken}` }
  });
  const studentListingsData = await studentListingsRes.json();
  const matchedListing = studentListingsData.data.find(l => l.id === listingId);
  console.log(`Student matches listing "${matchedListing.title}" with a match score of: ${matchedListing.matchScore}%`);

  // 5. Student applies to the listing
  console.log("\nStudent applying to listing...");
  const applyRes = await fetch(`${BASE_URL}/listings/${listingId}/apply`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${studentToken}` }
  });
  const applyData = await applyRes.json();
  if (!applyData.success) throw new Error("Application failed: " + JSON.stringify(applyData.error));
  console.log("Application submitted successfully. Status: " + applyData.data.status);

  // 6. Company fetches listing applicants (Flow B verify)
  console.log("\n[VERIFICATION] Company fetches applicants (sorted by match score)...");
  const applicantsRes = await fetch(`${BASE_URL}/listings/${listingId}/applicants`, {
    headers: { "Authorization": `Bearer ${companyToken}` }
  });
  const applicantsData = await applicantsRes.json();
  const applicant = applicantsData.data.find(a => a.student.userId === registerData.data.userId || a.student.name === "Grading Student");
  console.log(`Company found applicant "${applicant.student.name}" (Match Score: ${applicant.matchScore}%, Status: ${applicant.status})`);

  // --- FLOW C: AUDITING ---
  console.log("\n[FLOW C] Hitting GET /api/audit (Bonus C Admin Endpoint)...");
  const auditRes = await fetch(`${BASE_URL}/audit?page=1&limit=5`, {
    headers: { "Authorization": "Bearer admin-super-secret-token" }
  });
  const auditData = await auditRes.json();
  if (auditData.success) {
    console.log(`Audit query succeeded. Fetched ${auditData.data.length} logs. Latest entries:`);
    auditData.data.forEach((log) => {
      console.log(`- [${log.createdAt}] Action: ${log.action}, Actor: ${log.actorType}, Resource: ${log.resourceType}`);
    });
  } else {
    console.error("Audit endpoint failed: " + JSON.stringify(auditData.error));
  }

  // Cleanup
  console.log("\nCleaning up simulation accounts...");
  await prisma.application.deleteMany({ where: { listingId } });
  await prisma.listing.delete({ where: { id: listingId } });
  await prisma.studentProfile.delete({ where: { userId: registerData.data.userId } });
  await prisma.company.delete({ where: { userId: companyId } });
  await prisma.user.delete({ where: { id: registerData.data.userId } });
  await prisma.user.delete({ where: { id: companyId } });
  console.log("Cleanup completed.");
}

runSimulation()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
