const prisma = require("../utils/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const {
  ValidationError,
  ConflictError,
  NotFoundError,
  UnauthorizedError,
  BadRequestError
} = require("../utils/errors");

// Helper to hash OTP and Tokens using SHA256
function sha256(text) {
  return crypto.createHash("sha256").update(text).digest("hex");
}

// Generate 6-digit numeric OTP
function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function registerStudent(data) {
  const { email, password, name, college, branch, graduationYear, cgpa, githubUrl, linkedinUrl, bio, resumeUrl } = data;

  const emailStr = email.toLowerCase();
  // Double-check domain restriction
  if (!emailStr.endsWith(".edu") && !emailStr.endsWith(".ac.in")) {
    throw new BadRequestError("Student email must belong to an approved academic domain (.edu or .ac.in)", "INVALID_EMAIL_DOMAIN");
  }

  // Check if email already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: emailStr }
  });
  if (existingUser) {
    throw new ConflictError("Email already registered", "EMAIL_EXISTS");
  }

  const passwordHash = await bcrypt.hash(password, 10);

  // Use a transaction to create the user and student profile
  const user = await prisma.$transaction(async (tx) => {
    const newUser = await tx.user.create({
      data: {
        email: emailStr,
        passwordHash,
        role: "STUDENT"
      }
    });

    await tx.studentProfile.create({
      data: {
        userId: newUser.id,
        name,
        college,
        branch,
        graduationYear,
        cgpa,
        githubUrl: githubUrl || null,
        linkedinUrl: linkedinUrl || null,
        bio: bio || null,
        resumeUrl: resumeUrl || null,
        isEmailVerified: false
      }
    });

    return newUser;
  });

  // Generate OTP
  const otp = generateOtp();
  const otpHash = sha256(otp);
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + 15); // OTP valid for 15 mins

  await prisma.otpVerification.create({
    data: {
      userId: user.id,
      otpHash,
      purpose: "REGISTER",
      expiresAt
    }
  });

  // Log to console as required
  console.log(`[DEBUG] OTP for student registration ${emailStr}: ${otp}`);

  // Return data along with debug_otp (dev-only debug helper)
  return {
    userId: user.id,
    email: user.email,
    debug_otp: otp
  };
}

async function registerCompany(data) {
  const { email, password, companyName } = data;
  const emailStr = email.toLowerCase();

  // Check if email exists
  const existingUser = await prisma.user.findUnique({
    where: { email: emailStr }
  });
  if (existingUser) {
    throw new ConflictError("Email already registered", "EMAIL_EXISTS");
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.$transaction(async (tx) => {
    const newUser = await tx.user.create({
      data: {
        email: emailStr,
        passwordHash,
        role: "COMPANY"
      }
    });

    await tx.company.create({
      data: {
        userId: newUser.id,
        companyName,
        isApproved: false // Pre-approved = false by default
      }
    });

    return newUser;
  });

  return {
    userId: user.id,
    email: user.email
  };
}

async function verifyOtp(data) {
  const { email, otp, purpose } = data;
  const emailStr = email.toLowerCase();

  const user = await prisma.user.findUnique({
    where: { email: emailStr }
  });
  if (!user) {
    throw new NotFoundError("User not found", "USER_NOT_FOUND");
  }

  const otpHash = sha256(otp);

  const otpVerification = await prisma.otpVerification.findFirst({
    where: {
      userId: user.id,
      otpHash,
      purpose,
      consumed: false,
      expiresAt: { gt: new Date() }
    }
  });

  if (!otpVerification) {
    throw new BadRequestError("Invalid or expired OTP", "INVALID_OTP");
  }

  // Consume OTP and verify student email
  await prisma.$transaction(async (tx) => {
    await tx.otpVerification.update({
      where: { id: otpVerification.id },
      data: { consumed: true }
    });

    if (user.role === "STUDENT") {
      await tx.studentProfile.update({
        where: { userId: user.id },
        data: { isEmailVerified: true }
      });
    }
  });

  return {
    message: "OTP verified successfully. Email is now verified."
  };
}

async function resendOtp(data) {
  const { email, purpose } = data;
  const emailStr = email.toLowerCase();

  const user = await prisma.user.findUnique({
    where: { email: emailStr },
    include: { studentProfile: true }
  });
  if (!user) {
    throw new NotFoundError("User not found", "USER_NOT_FOUND");
  }

  // Expire all previous unused OTPs for this user and purpose
  await prisma.otpVerification.updateMany({
    where: {
      userId: user.id,
      purpose,
      consumed: false
    },
    data: {
      expiresAt: new Date() // Expire them immediately
    }
  });

  // Generate new OTP
  const otp = generateOtp();
  const otpHash = sha256(otp);
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + 15);

  await prisma.otpVerification.create({
    data: {
      userId: user.id,
      otpHash,
      purpose,
      expiresAt
    }
  });

  console.log(`[DEBUG] Resent OTP for ${emailStr} (Purpose: ${purpose}): ${otp}`);

  return {
    message: "OTP resent successfully.",
    debug_otp: otp
  };
}

async function login(data) {
  const { email, password } = data;
  const emailStr = email.toLowerCase();

  const user = await prisma.user.findUnique({
    where: { email: emailStr },
    include: {
      studentProfile: true,
      companyProfile: true
    }
  });

  if (!user) {
    throw new UnauthorizedError("Invalid email or password", "INVALID_CREDENTIALS");
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
  if (!isPasswordValid) {
    throw new UnauthorizedError("Invalid email or password", "INVALID_CREDENTIALS");
  }

  // Generate tokens
  const accessToken = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: "1h" }
  );

  const refreshToken = crypto.randomBytes(40).toString("hex");
  const refreshTokenHash = sha256(refreshToken);
  
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // Refresh token valid for 7 days

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: refreshTokenHash,
      expiresAt
    }
  });

  // Construct return profile
  const profile = user.role === "STUDENT" 
    ? { name: user.studentProfile.name, isEmailVerified: user.studentProfile.isEmailVerified }
    : { companyName: user.companyProfile.companyName, isApproved: user.companyProfile.isApproved };

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      profile
    }
  };
}

async function refreshToken(data) {
  const { refreshToken } = data;
  const tokenHash = sha256(refreshToken);

  const tokenRecord = await prisma.refreshToken.findFirst({
    where: {
      tokenHash,
      revoked: false,
      expiresAt: { gt: new Date() }
    },
    include: {
      user: true
    }
  });

  if (!tokenRecord) {
    throw new UnauthorizedError("Invalid or expired refresh token", "INVALID_REFRESH_TOKEN");
  }

  const user = tokenRecord.user;

  // Revoke current refresh token (token rotation)
  await prisma.refreshToken.update({
    where: { id: tokenRecord.id },
    data: { revoked: true }
  });

  // Issue new access + refresh tokens
  const newAccessToken = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: "1h" }
  );

  const newRefreshToken = crypto.randomBytes(40).toString("hex");
  const newRefreshTokenHash = sha256(newRefreshToken);

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: newRefreshTokenHash,
      expiresAt
    }
  });

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken
  };
}

async function logout(data) {
  const { refreshToken } = data;
  const tokenHash = sha256(refreshToken);

  await prisma.refreshToken.updateMany({
    where: {
      tokenHash
    },
    data: {
      revoked: true
    }
  });

  return {
    message: "Logged out successfully"
  };
}

module.exports = {
  registerStudent,
  registerCompany,
  verifyOtp,
  resendOtp,
  login,
  refreshToken,
  logout
};
