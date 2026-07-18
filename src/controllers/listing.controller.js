const listingService = require("../services/listing.service");
const { successResponse } = require("../utils/envelope");

async function createListing(req, res, next) {
  try {
    const result = await listingService.createListing(req.user.id, req.body);
    res.status(201).json(successResponse(result));
  } catch (err) {
    next(err);
  }
}

async function updateListing(req, res, next) {
  try {
    const result = await listingService.updateListing(req.user.id, req.params.id, req.body);
    res.status(200).json(successResponse(result));
  } catch (err) {
    next(err);
  }
}

async function updateListingStatus(req, res, next) {
  try {
    const result = await listingService.updateListingStatus(
      req.user.id,
      req.params.id,
      req.body.status
    );
    res.status(200).json(successResponse(result));
  } catch (err) {
    next(err);
  }
}

async function getListingById(req, res, next) {
  try {
    const userId = req.user ? req.user.id : null;
    const userRole = req.user ? req.user.role : null;
    const result = await listingService.getListingById(req.params.id, userId, userRole);
    res.status(200).json(successResponse(result));
  } catch (err) {
    next(err);
  }
}

async function getListings(req, res, next) {
  try {
    const userId = req.user ? req.user.id : null;
    const userRole = req.user ? req.user.role : null;

    const filters = {
      location: req.query.location,
      minStipend: req.query.minStipend,
      maxStipend: req.query.maxStipend,
      search: req.query.search,
      sortBy: req.query.sortBy,
      page: parseInt(req.query.page, 10) || 1,
      limit: parseInt(req.query.limit, 10) || 20
    };

    const { listings, pagination } = await listingService.getListings(
      filters,
      userId,
      userRole
    );

    res.status(200).json(successResponse(listings, pagination));
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createListing,
  updateListing,
  updateListingStatus,
  getListingById,
  getListings
};
