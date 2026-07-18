const authService = require("../services/auth.service");
const { successResponse } = require("../utils/envelope");

async function registerStudent(req, res, next) {
  try {
    const result = await authService.registerStudent(req.body);
    res.status(201).json(successResponse(result));
  } catch (err) {
    next(err);
  }
}

async function registerCompany(req, res, next) {
  try {
    const result = await authService.registerCompany(req.body);
    res.status(201).json(successResponse(result));
  } catch (err) {
    next(err);
  }
}

async function verifyOtp(req, res, next) {
  try {
    const result = await authService.verifyOtp(req.body);
    res.status(200).json(successResponse(result));
  } catch (err) {
    next(err);
  }
}

async function resendOtp(req, res, next) {
  try {
    const result = await authService.resendOtp(req.body);
    res.status(200).json(successResponse(result));
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const result = await authService.login(req.body);
    res.status(200).json(successResponse(result));
  } catch (err) {
    next(err);
  }
}

async function refreshToken(req, res, next) {
  try {
    const result = await authService.refreshToken(req.body);
    res.status(200).json(successResponse(result));
  } catch (err) {
    next(err);
  }
}

async function logout(req, res, next) {
  try {
    const result = await authService.logout(req.body);
    res.status(200).json(successResponse(result));
  } catch (err) {
    next(err);
  }
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
