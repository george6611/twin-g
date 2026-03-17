const mongoose = require("mongoose");
const Vendor = require("../models/Vendor");

async function listVendors(params) {
  const {
    categoryId,
    subCategoryId,
    minRating,
    maxDistance,
    lat,
    lng,
    search,
    sort = "nearest",
    page = 1,
    limit = 10,
  } = params;



  const pageNum = Math.max(Number(page), 1);
  const limitNum = Math.min(Math.max(Number(limit), 1), 50);
  const skip = (pageNum - 1) * limitNum;

  const pipeline = [];

  // Convert category and subcategory to ObjectId and filter
  const baseMatch = { status: "active", isVerified: true };
  console.log(params)
if (categoryId) {
  baseMatch.categories = { $in: [new mongoose.Types.ObjectId(categoryId)] };
  console.log(baseMatch.categories)
}
if (subCategoryId) {
  baseMatch.subCategories = { $in: [new mongoose.Types.ObjectId(subCategoryId)] };
}


  if (minRating) baseMatch.rating = { $gte: Number(minRating) };
  if (search) baseMatch.shopName = { $regex: search, $options: "i" };

  if (lat && lng) {
    pipeline.push({
      $geoNear: {
        near: { type: "Point", coordinates: [Number(lng), Number(lat)] },
        distanceField: "distance",
        spherical: true,
        query: baseMatch,
        maxDistance: maxDistance ? Number(maxDistance) * 1000 : undefined,
      },
    });
  } else {
    pipeline.push({ $match: baseMatch });
  }

  // ---------------- Sorting ----------------
  const sortMap = {
    nearest: lat && lng ? { distance: 1 } : { createdAt: -1 },
    rating: { rating: -1 },
    newest: { createdAt: -1 },
  };
  pipeline.push({ $sort: sortMap[sort] || sortMap.newest });

  // ---------------- Projection ----------------
  pipeline.push({
    $project: {
      _id: 1,
      shopName: 1,
      shopDescription: 1,
      address: 1,
      deliveryAvailable: 1,
      isOpen: 1,
      rating: 1,
      distanceKm: { $round: [{ $divide: ["$distance", 1000] }, 3] }, // meters → km
    },
  });

  // ---------------- Pagination ----------------
  pipeline.push({
    $facet: {
      data: [{ $skip: skip }, { $limit: limitNum }],
      metadata: [{ $count: "total" }],
    },
  });

  const result = await Vendor.aggregate(pipeline);
  const vendors = result[0]?.data || [];
  const total = result[0]?.metadata[0]?.total || 0;
  const totalPages = Math.ceil(total / limitNum);

  return {
    data: vendors,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages,
      hasNext: pageNum < totalPages,
      hasPrev: pageNum > 1,
    },
  };
}

module.exports = { listVendors };
