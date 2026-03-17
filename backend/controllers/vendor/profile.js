const Vendor = require("../../models/Vendor");

// @desc    Get logged-in vendor profile
// @route   GET /api/vendor/profile
// @access  Private (Vendor only)
const getProfile = async (req, res) => {
  try {
    const vendor = await Vendor.findOne({ userId: req.user.userId })
      .populate("categories", "name")
      .populate("products", "name price")
      .populate("activeOrders", "status totalAmount")
      .populate("recentTransactions");

    if (!vendor) {
      return res
        .status(404)
        .json({ success: false, message: "Vendor profile not found" });
    }

    res.status(200).json({ success: true, vendor });
  } catch (error) {
    console.error("Error getting vendor profile:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// @desc    Update vendor profile
// @route   PUT /api/vendor/profile
// @access  Private (Vendor only)
const updateProfile = async (req, res) => {
  try {
    const updates = req.body;
    const file = req.file;

    if (file) {
      updates.shopLogo = `/uploads/${file.filename}`;
    }

    if (updates.latitude && updates.longitude) {
      updates.location = {
        latitude: parseFloat(updates.latitude),
        longitude: parseFloat(updates.longitude),
      };
      delete updates.latitude;
      delete updates.longitude;
    }

    const allowedFields = [
      "shopName",
      "shopDescription",
      "address",
      "contact",
      "location",
      "openingHours",
      "deliveryAvailable",
      "commissionRate",
      "bankDetails",
      "shopLogo",
      "isOpen",
    ];

    const filteredUpdates = Object.keys(updates)
      .filter((key) => allowedFields.includes(key))
      .reduce((obj, key) => {
        obj[key] = updates[key];
        return obj;
      }, {});

    const vendor = await Vendor.findOneAndUpdate(
      { userId: req.user.userId },
      { $set: filteredUpdates },
      { new: true, runValidators: true }
    );

    if (!vendor) {
      return res.status(404).json({ success: false, message: "Vendor not found" });
    }

    res.status(200).json({ success: true, vendor });
  } catch (error) {
    console.error("Error updating vendor profile:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// @desc    Upload vendor documents
// @route   POST /api/vendor/profile/documents
// @access  Private (Vendor only)
const uploadDocuments = async (req, res) => {
  try {
    const files = req.files;

    if (!files || files.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "No documents uploaded" });
    }

    const newDocs = files.map((file) => ({
      type: file.fieldname || "document",
      url: `/uploads/${file.filename}`,
      verified: false,
    }));

    const vendor = await Vendor.findOneAndUpdate(
      { userId: req.user.id },
      { $push: { documents: { $each: newDocs } } },
      { new: true }
    );

    res.status(200).json({ success: true, vendor });
  } catch (error) {
    console.error("Error uploading documents:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// @desc    Get vendor details by ID (for customers)
// @route   GET /api/vendorPublic/:vendorId
// @access  Public or Private (customers)
const getVendorById = async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.params.vendorId).select(
      "shopName phone location logo rating description"
    );

    if (!vendor)
      return res.status(404).json({ message: "Vendor not found" });

    res.json({
      success: true,
      vendor,
    });
  } catch (err) {
    console.error("❌ Error fetching vendor:", err);
    res.status(500).json({ message: "Error fetching vendor" });
  }
};

// ✅ Export all functions together
module.exports = {
  getProfile,
  updateProfile,
  uploadDocuments,
  getVendorById,
};
