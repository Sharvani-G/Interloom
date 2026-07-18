const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Clean up database
  await prisma.auditLog.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.otpVerification.deleteMany({});
  await prisma.refreshToken.deleteMany({});
  await prisma.application.deleteMany({});
  await prisma.listingSkill.deleteMany({});
  await prisma.listing.deleteMany({});
  await prisma.studentSkill.deleteMany({});
  await prisma.skill.deleteMany({});
  await prisma.company.deleteMany({});
  await prisma.studentProfile.deleteMany({});
  await prisma.user.deleteMany({});

  // Hash passwords
  const passwordHash = await bcrypt.hash("Password123!", 10);

  // 1. Seed Skills (~15 skills)
  const skillsData = [
    { name: "React" },
    { name: "Node.js" },
    { name: "Python" },
    { name: "SQL" },
    { name: "TypeScript" },
    { name: "Docker" },
    { name: "Go" },
    { name: "Java" },
    { name: "AWS" },
    { name: "Kubernetes" },
    { name: "HTML" },
    { name: "CSS" },
    { name: "JavaScript" },
    { name: "Git" },
    { name: "GraphQL" }
  ];

  console.log("Seeding skills...");
  const skills = [];
  for (const item of skillsData) {
    const s = await prisma.skill.create({ data: item });
    skills.push(s);
  }

  const skillMap = {};
  skills.forEach(s => {
    skillMap[s.name] = s.id;
  });

  // 2. Seed Pre-approved Company
  console.log("Seeding pre-approved company...");
  const companyUser = await prisma.user.create({
    data: {
      email: "recruitment@seededtech.com",
      passwordHash,
      role: "COMPANY",
      companyProfile: {
        create: {
          companyName: "Seeded Tech Corp",
          isApproved: true
        }
      }
    },
    include: {
      companyProfile: true
    }
  });

  // Seed another unapproved company for testing purposes
  await prisma.user.create({
    data: {
      email: "recruitment@startup.com",
      passwordHash,
      role: "COMPANY",
      companyProfile: {
        create: {
          companyName: "Pending Startup Inc",
          isApproved: false
        }
      }
    }
  });

  // 3. Seed Sample Student
  console.log("Seeding sample student...");
  const studentUser = await prisma.user.create({
    data: {
      email: "alice@university.edu",
      passwordHash,
      role: "STUDENT",
      studentProfile: {
        create: {
          name: "Alice Smith",
          college: "State University",
          branch: "Computer Science",
          graduationYear: 2027,
          cgpa: 9.2,
          githubUrl: "https://github.com/alicesmith",
          linkedinUrl: "https://linkedin.com/in/alicesmith",
          bio: "Passionate software engineering student looking for summer internships.",
          resumeUrl: "https://example.com/resumes/alice.pdf",
          isEmailVerified: true
        }
      }
    },
    include: {
      studentProfile: true
    }
  });

  // Assign some skills to the student
  await prisma.studentSkill.createMany({
    data: [
      { studentId: studentUser.id, skillId: skillMap["React"] },
      { studentId: studentUser.id, skillId: skillMap["JavaScript"] },
      { studentId: studentUser.id, skillId: skillMap["HTML"] },
      { studentId: studentUser.id, skillId: skillMap["Git"] }
    ]
  });

  // 4. Seed Sample Listings
  console.log("Seeding sample job listings...");
  
  // Listing 1: Active Software Eng
  const deadline1 = new Date();
  deadline1.setDate(deadline1.getDate() + 15); // 15 days in the future
  const listing1 = await prisma.listing.create({
    data: {
      companyId: companyUser.id,
      title: "Software Engineering Intern",
      description: "Join us to build state-of-the-art developer tools using React, Node.js, and TypeScript.",
      stipend: 1500,
      location: "HYBRID",
      applicationDeadline: deadline1,
      maxApplicants: 20,
      status: "ACTIVE",
      skills: {
        create: [
          { skillId: skillMap["React"], isRequired: true },
          { skillId: skillMap["Node.js"], isRequired: true },
          { skillId: skillMap["TypeScript"], isRequired: false },
          { skillId: skillMap["Git"], isRequired: false }
        ]
      }
    }
  });

  // Listing 2: Active Data Analyst
  const deadline2 = new Date();
  deadline2.setDate(deadline2.getDate() + 30); // 30 days in the future
  const listing2 = await prisma.listing.create({
    data: {
      companyId: companyUser.id,
      title: "Data Analyst Intern",
      description: "Work with data pipelines and build reporting dashboards using SQL and Python.",
      stipend: 1200,
      location: "REMOTE",
      applicationDeadline: deadline2,
      maxApplicants: 10,
      status: "ACTIVE",
      skills: {
        create: [
          { skillId: skillMap["Python"], isRequired: true },
          { skillId: skillMap["SQL"], isRequired: true }
        ]
      }
    }
  });

  // Listing 3: Draft Product Manager
  const deadline3 = new Date();
  deadline3.setDate(deadline3.getDate() + 5);
  const listing3 = await prisma.listing.create({
    data: {
      companyId: companyUser.id,
      title: "Product Manager Intern",
      description: "Define product features and collaborate with engineering teams.",
      stipend: 1800,
      location: "ONSITE",
      applicationDeadline: deadline3,
      maxApplicants: 5,
      status: "DRAFT"
    }
  });

  console.log("Database seeded successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
