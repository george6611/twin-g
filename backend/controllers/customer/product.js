const mongoose = require("mongoose"); // make sure to require this
const Category = require("../../models/Category");
const Product = require("../../models/Product");
const Vendor = require("../../models/Vendor");
const { getDistance } = require("../../services/geoService");

const getAllProducts = async (req, res) => {
  try {
    let {
      category,
      search,
      page = 1,
      limit = 20,
      minPrice,
      maxPrice,
      minRating,
      maxDistance,
      lat,
      lng,
    } = req.query;

    console.log("GetAllProducts - Query Params:", req.query);

    // Ensure numeric types
    page = parseInt(page, 10) || 1;
    limit = parseInt(limit, 10) || 20;

    const filter = { isActive: true };

    // ----------------------
    // Category filter
    // ----------------------
    if (category) {
      if (mongoose.Types.ObjectId.isValid(category)) {
        filter.categoryId = new mongoose.Types.ObjectId(category);
      } else {
        console.warn("Invalid category ID ignored:", category);
        // Ignore invalid category instead of returning 400
      }
    }

    // ----------------------
    // Search filter
    // ----------------------
    if (search) filter.name = { $regex: search, $options: "i" };

    // ----------------------
    // Price filter
    // ----------------------
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }

    // ----------------------
    // Rating filter
    // ----------------------
    if (minRating) filter.averageRating = { $gte: Number(minRating) };

    // ----------------------
    // Pagination
    // ----------------------
    const skip = (page - 1) * limit;

    // ----------------------
    // Fetch products
    // ----------------------
    const products = await Product.find(filter)
      .populate("vendorId", "shopName logo location")
      .populate("categoryId", "name")
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    // ----------------------
    // Distance calculation
    // ----------------------
    const customerLat = lat ? parseFloat(lat) : null;
    const customerLng = lng ? parseFloat(lng) : null;

    const productsWithDistance = products.map((p) => {
      let distance = null;
      if (customerLat && customerLng && p.vendorId?.location) {
        // Extract coordinates from GeoJSON format
        let vendorLat, vendorLng;
        if (p.vendorId.location.coordinates) {
          // GeoJSON format: {coordinates: [lng, lat], type: "Point"}
          [vendorLng, vendorLat] = p.vendorId.location.coordinates;
        } else {
          // Fallback to direct lat/lng fields
          vendorLat = p.vendorId.location.latitude;
          vendorLng = p.vendorId.location.longitude;
        }

        if (vendorLat !== undefined && vendorLng !== undefined) {
          distance = getDistance(
            { latitude: customerLat, longitude: customerLng },
            { latitude: vendorLat, longitude: vendorLng }
          );
        }
      }
      return { ...p.toObject(), distance };
    });

    // ----------------------
    // Filter by maxDistance if provided
    // ----------------------
    const finalProducts =
      maxDistance && customerLat && customerLng
        ? productsWithDistance.filter((p) => p.distance <= Number(maxDistance))
        : productsWithDistance;

    // Total count BEFORE distance filtering (for pagination)
    const total = await Product.countDocuments(filter);

    // ----------------------
    // Send response
    // ----------------------
    res.json({
      success: true,
      total,
      page,
      pages: Math.ceil(total / limit),
      products: finalProducts,
    });
  } catch (err) {
    console.error("❌ Error fetching products:", err);
    res.status(500).json({ message: "Error fetching products" });
  }
};




// ---------------------- GET SINGLE PRODUCT ----------------------
const getProductById = async (req, res) => {
  try {
    const { lat, lng } = req.query; // optional customer location
    const product = await Product.findById(req.params.id)
      .populate("vendorId", "shopName logo location description rating phone")
      .populate("categoryId", "name");

    if (!product)
      return res.status(404).json({ message: "Product not found" });

    // 🔹 calculate distance
    let distance = null;
    if (lat && lng && product.vendorId?.location) {
      // Extract coordinates from GeoJSON format
      let vendorLat, vendorLng;
      if (product.vendorId.location.coordinates) {
        // GeoJSON format: {coordinates: [lng, lat], type: "Point"}
        [vendorLng, vendorLat] = product.vendorId.location.coordinates;
      } else {
        // Fallback to direct lat/lng fields
        vendorLat = product.vendorId.location.latitude;
        vendorLng = product.vendorId.location.longitude;
      }

      if (vendorLat !== undefined && vendorLng !== undefined) {
        distance = getDistance(
          { latitude: parseFloat(lat), longitude: parseFloat(lng) },
          { latitude: vendorLat, longitude: vendorLng }
        );
      }
    }

    res.json({
      success: true,
      product: { ...product.toObject(), distance },
    });
  } catch (err) {
    console.error("❌ Error fetching product details:", err);
    res.status(500).json({ message: "Error fetching product details" });
  }
};

// ---------------------- GET ALL CATEGORIES ----------------------
const getCategories = async (req, res) => {
  try {
    const categories = await Category.find({ isActive: true }).sort("name");
    res.json({ success: true, categories });
  } catch (err) {
    console.error("❌ Error fetching categories:", err);
    res.status(500).json({ message: "Error fetching categories" });
  }
};


const getSubCategoriesByCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;

    const subCategories = await Category.find({
      parentCategory: categoryId,
      status: "active",
    }).sort("name");

    res.json({ success: true, subCategories });
  } catch (err) {
    console.error("❌ Error fetching subcategories:", err);
    res.status(500).json({ message: "Error fetching subcategories" });
  }
};



// ---------------------- SEARCH ----------------------

const search = async (req, res) => {
  try {
    let { query, type, page = 1, limit = 20 } = req.query;

    if (!query || !type) {
      return res.status(400).json({ message: "Query and type are required" });
    }

    // Ensure pagination is numeric
    page = Number(page) || 1;
    limit = Number(limit) || 20;
    const skip = (page - 1) * limit;

    let results = [];

    switch (type) {
      case "category":
        results = await Category.find({
          name: { $regex: query, $options: "i" },
          isActive: true,
        })
          .sort("name")
          .skip(skip)
          .limit(limit);
        break;

      case "product":
        results = await Product.find({
          name: { $regex: query, $options: "i" },
          isActive: true,
        })
          .populate({
            path: "vendorId",
            select: "shopName location logo",
            match: { _id: { $type: "objectId" } }, // ignore invalid vendorId
          })
          .populate({
            path: "categoryId",
            select: "name",
            match: { _id: { $type: "objectId" } }, // ignore invalid categoryId
          })
          .skip(skip)
          .limit(limit);
        break;

      case "vendor":
        results = await Vendor.find({
          shopName: { $regex: query, $options: "i" },
          isActive: true,
        })
          .skip(skip)
          .limit(limit);
        break;

      default:
        return res.status(400).json({ message: "Invalid type" });
    }

    res.json({
      success: true,
      total: results.length,
      page,
      results,
    });
  } catch (err) {
    console.error("❌ Error performing search:", err);
    res.status(500).json({
      message: "Error performing search",
      details: err.message,
    });
  }
};







module.exports = { getAllProducts, getProductById, getCategories,getSubCategoriesByCategory, search };
