const vendorService = require("../../services/vendor.service");
const Branch = require("../../models/Branch");
const Staff = require("../../models/Staff");
const Product = require("../../models/Product");
const User = require("../../models/User");
const Vendor = require("../../models/Vendor");
const mongoose = require("mongoose");

exports.listVendors = async (req, res) => {
  const result = await vendorService.listVendors({
    ...req.query,
    lat: req.user.address.latitude,
    lng: req.user.address.longitude,
  });

  res.json(result);
};

// ==================== DELETE VENDOR (CASCADE) ====================
exports.deleteVendor = async (req, res) => {
  try {
    const { vendorId } = req.params;
    
    console.log("🗑️  [DELETE VENDOR] Request to delete vendor:", vendorId);

    // Validate vendor ID
    if (!mongoose.Types.ObjectId.isValid(vendorId)) {
      return res.status(400).json({ success: false, error: "Invalid vendor ID" });
    }

    const vendorIdObj = new mongoose.Types.ObjectId(vendorId);

    // Check authorization (admin only)
    if (req.user.role !== "admin") {
      return res.status(403).json({ success: false, error: "Only admins can delete vendors" });
    }

    // Verify vendor exists
    const vendor = await Vendor.findById(vendorIdObj);
    if (!vendor) {
      return res.status(404).json({ success: false, error: "Vendor not found" });
    }

    console.log("🗑️  [DELETE VENDOR] Found vendor, starting cascade delete...");

    // 1. Delete all products for this vendor
    const productsResult = await Product.deleteMany({ vendorId: vendorIdObj });
    console.log("🗑️  [DELETE VENDOR] Deleted", productsResult.deletedCount, "products");

    // 2. Delete all staff records for this vendor
    const staffResult = await Staff.deleteMany({ vendorId: vendorIdObj });
    console.log("🗑️  [DELETE VENDOR] Deleted", staffResult.deletedCount, "staff records");

    // 3. Delete all vendor staff users
    const usersResult = await User.deleteMany({
      vendorId: vendorIdObj,
      role: "vendor_staff",
    });
    console.log("🗑️  [DELETE VENDOR] Deleted", usersResult.deletedCount, "vendor staff users");

    // 4. Delete all branches
    const branchesResult = await Branch.deleteMany({ vendorId: vendorIdObj });
    console.log("🗑️  [DELETE VENDOR] Deleted", branchesResult.deletedCount, "branches");

    // 5. Delete the vendor
    const vendorResult = await Vendor.findByIdAndDelete(vendorIdObj);
    console.log("🗑️  [DELETE VENDOR] Vendor deleted successfully");

    // 6. Delete main vendor user if exists
    const mainVendorUser = await User.findOneAndDelete({
      vendorId: vendorIdObj,
      role: "vendor",
    });
    if (mainVendorUser) {
      console.log("🗑️  [DELETE VENDOR] Deleted main vendor user:", mainVendorUser.email);
    }

    res.json({
      success: true,
      message: "Vendor and all associated data deleted successfully",
      deleted: {
        vendor: vendorResult.name || vendor.name,
        products: productsResult.deletedCount,
        branches: branchesResult.deletedCount,
        staffRecords: staffResult.deletedCount,
        vendorUsers: usersResult.deletedCount,
      },
    });
  } catch (err) {
    console.error("❌ [DELETE VENDOR] Error:", err.message);
    res.status(500).json({ success: false, error: "Server error: " + err.message });
  }
};


exports.getVendorById = async (req, res) => {
  // ...
};
