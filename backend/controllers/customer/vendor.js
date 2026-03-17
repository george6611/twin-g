const mongoose = require("mongoose");
const vendorService = require("../../services/vendor.service");
const Vendor = require("../../models/Vendor");
const Category = require("../../models/Category");
const Product = require("../../models/Product");

//
// 🟢 1️⃣ Get all vendors — no filters (via service)
//


exports.getVendors = async (req, res) => {
  try {
    let { search, categoryId, subCategoryId, lat, lng, limit } = req.query;

    limit = parseInt(limit) || 50; // default limit
    const filter = {};

    // 🔹 Search by shopName (case-insensitive)
    if (search) {
      const regex = new RegExp(search, "i");
      filter.shopName = { $regex: regex };
    }

    // 🔹 Filter by category or sub-category
    if (subCategoryId && mongoose.Types.ObjectId.isValid(subCategoryId)) {
      filter.subCategories = mongoose.Types.ObjectId(subCategoryId);
    } else if (categoryId && mongoose.Types.ObjectId.isValid(categoryId)) {
      const children = await Category.find({ parentCategory: categoryId }).select("_id");
      const ids = [new mongoose.Types.ObjectId(categoryId), ...children.map(c => c._id)];
      filter.categories = { $in: ids };
    }

    // 🔹 Fetch vendors
    const vendors = await Vendor.find(filter)
      .limit(limit)
      .select("_id shopName shopLogo rating location categories subCategories") // include rating and location
      .lean();

    // 🔹 Calculate distance if lat/lng provided
    let customerLat, customerLng;
    if (lat && lng) {
      customerLat = parseFloat(lat);
      customerLng = parseFloat(lng);
    }

    // 🔹 Map fields to frontend-friendly names
    const normalizedVendors = vendors.map((v) => {
      let distance = null;
      if (customerLat && customerLng && v.location) {
        // Extract coordinates from GeoJSON format
        let vendorLat, vendorLng;
        if (v.location.coordinates) {
          [vendorLng, vendorLat] = v.location.coordinates;
        } else {
          vendorLat = v.location.latitude;
          vendorLng = v.location.longitude;
        }

        if (vendorLat !== undefined && vendorLng !== undefined) {
          const { getDistance } = require("../../services/geoService");
          distance = getDistance(
            { latitude: customerLat, longitude: customerLng },
            { latitude: vendorLat, longitude: vendorLng }
          );
        }
      }

      return {
        _id: v._id,
        name: v.shopName || "Unnamed Vendor",
        logo: v.shopLogo ? `${process.env.API_URL || ""}${v.shopLogo}` : null,
        rating: v.rating || 0,
        distance,
        categories: v.categories || [],
        subCategories: v.subCategories || [],
      };
    });

    return res.status(200).json(normalizedVendors);
  } catch (err) {
    console.error("❌ Error fetching vendors:", err);
    return res.status(500).json({ error: "Failed to fetch vendors", details: err.message });
  }
};
//
// 🟣 2️⃣ Filter vendors — now handled by same service
//
exports.filterVendors = exports.getVendors;

//
// 🔵 3️⃣ Get single vendor + their products
//
exports.getVendorById = async (req, res) => {
  try {
    const vendorId = req.params.id;
    const { categoryId, subCategoryId } = req.query;

    const vendor = await Vendor.findById(vendorId).populate("categories", "name slug");
    if (!vendor) return res.status(404).json({ error: "Vendor not found" });

    const filter = { vendorId };

    if (subCategoryId && mongoose.Types.ObjectId.isValid(subCategoryId)) {
      filter.subCategoryId = subCategoryId;
    } else if (categoryId && mongoose.Types.ObjectId.isValid(categoryId)) {
      const childCategories = await Category.find({ parentCategory: categoryId }).select("_id");
      const relatedIds = [new mongoose.Types.ObjectId(categoryId), ...childCategories.map(c => c._id)];
      filter.$or = [
        { categoryId: { $in: relatedIds } },
        { subCategoryId: { $in: relatedIds } },
      ];
    }

    const products = await Product.find(filter)
      .populate("categoryId", "name parentCategory")
      .populate("subCategoryId", "name parentCategory")
      .select("_id name description price images categoryId subCategoryId");

    return res.status(200).json({ ...vendor.toObject(), products });
  } catch (err) {
    console.error("❌ Error fetching vendor:", err);
    return res.status(500).json({ error: "Failed to fetch vendor details", details: err.message });
  }
};

//
// 🟠 4️⃣ Get vendor items
//
exports.getVendorItems = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { categoryId, subCategoryId } = req.query;

    if (!vendorId) return res.status(400).json({ error: "Vendor ID is required" });

    const filter = { vendorId };

    if (subCategoryId && mongoose.Types.ObjectId.isValid(subCategoryId)) {
      filter.subCategoryId = subCategoryId;
    } else if (categoryId && mongoose.Types.ObjectId.isValid(categoryId)) {
      const children = await Category.find({ parentCategory: categoryId }).select("_id");
      const ids = [new mongoose.Types.ObjectId(categoryId), ...children.map(c => c._id)];

      filter.$or = [
        { categoryId: { $in: ids } },
        { subCategoryId: { $in: ids } },
      ];
    }

    const items = await Product.find(filter)
      .select("_id name description price images categoryId subCategoryId")
      .populate("categoryId", "name parentCategory")
      .populate("subCategoryId", "name parentCategory");

    return res.status(200).json(items);
  } catch (err) {
    console.error("❌ Error fetching vendor items:", err);
    return res.status(500).json({ error: "Failed to fetch vendor items", details: err.message });
  }
};

//
// 🟡 5️⃣ Update vendor details
//
exports.updateVendor = async (req, res) => {
  try {
    const vendorId = req.params.id;
    const updates = req.body;

    const vendor = await Vendor.findById(vendorId);
    if (!vendor) return res.status(404).json({ message: "Vendor not found" });

    Object.keys(updates).forEach(key => vendor[key] = updates[key]);
    const updatedVendor = await vendor.save();

    return res.status(200).json({ message: "Vendor updated successfully", vendor: updatedVendor });
  } catch (err) {
    console.error("❌ Error updating vendor:", err);
    return res.status(500).json({ error: "Failed to update vendor", details: err.message });
  }
};
