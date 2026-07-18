function calculateCompletenessScore(profile) {
  let score = 0;
  if (profile.name) score += 10;
  if (profile.college) score += 10;
  if (profile.branch) score += 10;
  if (profile.graduationYear) score += 10;
  if (profile.cgpa !== undefined && profile.cgpa !== null) score += 10;
  if (profile.githubUrl) score += 10;
  if (profile.linkedinUrl) score += 10;
  if (profile.bio) score += 10;
  if (profile.resumeUrl) score += 10;
  
  if (profile.skills && profile.skills.length > 0) {
    score += 10;
  }
  return score;
}

function getBranchYearAlignment(student, listing) {
  const titleLower = listing.title.toLowerCase();
  const descLower = listing.description.toLowerCase();
  
  let targetBranch = "Computer Science";
  if (titleLower.includes("data") || descLower.includes("data")) {
    targetBranch = "Data Science";
  } else if (titleLower.includes("product") || descLower.includes("product")) {
    targetBranch = "Business Administration";
  }
  
  let targetYear = 2027;

  const studentBranch = student.branch || "";
  const studentYear = student.graduationYear;

  const isBranchMatch = studentBranch.toLowerCase() === targetBranch.toLowerCase();
  const isYearMatch = studentYear === targetYear;

  if (isBranchMatch && isYearMatch) {
    return 100;
  } else if (isBranchMatch && !isYearMatch) {
    return 70;
  } else if (!isBranchMatch && isYearMatch) {
    return 60;
  } else {
    return 40;
  }
}

function calculateMatchScore(student, listing) {
  const requiredSkills = listing.skills ? listing.skills.filter(ls => ls.isRequired) : [];
  let requiredScore = 100;
  if (requiredSkills.length > 0) {
    const studentSkills = new Set((student.skills || []).map(s => s.toLowerCase()));
    const matched = requiredSkills.filter(ls => studentSkills.has(ls.skill.name.toLowerCase())).length;
    requiredScore = (matched / requiredSkills.length) * 100;
  }

  const preferredSkills = listing.skills ? listing.skills.filter(ls => !ls.isRequired) : [];
  let preferredScore = 100;
  if (preferredSkills.length > 0) {
    const studentSkills = new Set((student.skills || []).map(s => s.toLowerCase()));
    const matched = preferredSkills.filter(ls => studentSkills.has(ls.skill.name.toLowerCase())).length;
    preferredScore = (matched / preferredSkills.length) * 100;
  }

  const alignmentScore = getBranchYearAlignment(student, listing);
  const completenessScore = calculateCompletenessScore(student);

  const now = new Date();
  const postedAt = new Date(listing.createdAt);
  const diffTime = Math.abs(now - postedAt);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const recencyScore = Math.max(0, 100 - diffDays * (100 / 30));

  const finalScore = 0.40 * requiredScore + 0.20 * preferredScore + 0.15 * alignmentScore + 0.15 * completenessScore + 0.10 * recencyScore;
  return Math.round(finalScore * 100) / 100;
}

module.exports = {
  calculateCompletenessScore,
  calculateMatchScore
};
