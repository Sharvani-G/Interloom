const companyService = require("../services/company.service");
const { successResponse } = require("../utils/envelope");

async function getProfile(req, res, next) {
  try {
    const result = await companyService.getProfile(req.user.id);
    res.status(200).json(successResponse(result));
  } catch (err) {
    next(err);
  }
}

async function updateProfile(req, res, next) {
  try {
    const result = await companyService.updateProfile(req.user.id, req.body);
    res.status(200).json(successResponse(result));
  } catch (err) {
    next(err);
  }
}

async function getListings(req, res, next) {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;

    const { listings, pagination } = await companyService.getListings(
      req.user.id,
      page,
      limit
    );

    res.status(200).json(successResponse(listings, pagination));
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getProfile,
  updateProfile,
  getListings
};
