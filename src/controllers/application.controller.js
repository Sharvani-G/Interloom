const applicationService = require("../services/application.service");
const { successResponse } = require("../utils/envelope");

async function apply(req, res, next) {
  try {
    const result = await applicationService.apply(req.user.id, req.params.id);
    res.status(201).json(successResponse(result));
  } catch (err) {
    next(err);
  }
}

async function withdraw(req, res, next) {
  try {
    const result = await applicationService.withdraw(req.user.id, req.params.id);
    res.status(200).json(successResponse(result));
  } catch (err) {
    next(err);
  }
}

async function getApplicants(req, res, next) {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;

    const { applicants, pagination } = await applicationService.getApplicants(
      req.user.id,
      req.params.id,
      page,
      limit
    );

    res.status(200).json(successResponse(applicants, pagination));
  } catch (err) {
    next(err);
  }
}

async function updateStatus(req, res, next) {
  try {
    const result = await applicationService.updateStatus(
      req.user.id,
      req.params.id,
      req.body.status
    );
    res.status(200).json(successResponse(result));
  } catch (err) {
    next(err);
  }
}

async function bulkUpdateStatus(req, res, next) {
  try {
    const { applicationIds, status } = req.body;
    const result = await applicationService.bulkUpdateStatus(
      req.user.id,
      applicationIds,
      status
    );
    res.status(200).json(successResponse(result));
  } catch (err) {
    next(err);
  }
}

module.exports = {
  apply,
  withdraw,
  getApplicants,
  updateStatus,
  bulkUpdateStatus
};
