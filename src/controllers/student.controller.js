const studentService = require("../services/student.service");
const { successResponse } = require("../utils/envelope");

async function getProfile(req, res, next) {
  try {
    const result = await studentService.getProfile(req.user.id);
    res.status(200).json(successResponse(result));
  } catch (err) {
    next(err);
  }
}

async function updateProfile(req, res, next) {
  try {
    const result = await studentService.updateProfile(req.user.id, req.body);
    res.status(200).json(successResponse(result));
  } catch (err) {
    next(err);
  }
}

async function deleteProfile(req, res, next) {
  try {
    const result = await studentService.deleteProfile(req.user.id);
    res.status(200).json(successResponse(result));
  } catch (err) {
    next(err);
  }
}

async function getApplications(req, res, next) {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;

    const { applications, pagination } = await studentService.getApplications(
      req.user.id,
      page,
      limit
    );

    res.status(200).json(successResponse(applications, pagination));
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getProfile,
  updateProfile,
  deleteProfile,
  getApplications
};
