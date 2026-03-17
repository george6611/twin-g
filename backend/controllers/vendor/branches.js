const Branch = require("../../models/Branch");
const Vendor = require("../../models/Vendor");

// ==================== CREATE BRANCH ====================
const createBranch = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { name, description, address, phone, email, manager, latitude, longitude, isPrimary } = req.body;

    console.log("🟢 [CREATE BRANCH] Controller hit!");
    console.log("🟢 [CREATE BRANCH] vendorId:", vendorId);
    console.log("🟢 [CREATE BRANCH] User:", { role: req.user?.role, userId: req.user?.id });
    console.log("🟢 [CREATE BRANCH] Payload received:", { name, phone, city: address?.city });

    // Validate input
    if (!name || !vendorId) {
      console.log("❌ [CREATE BRANCH] Missing name or vendorId");
      return res.status(400).json({ message: "Name and vendorId are required" });
    }

    if (latitude === null || latitude === undefined || longitude === null || longitude === undefined) {
      console.log("❌ [CREATE BRANCH] Missing coordinates");
      return res.status(400).json({ message: "Latitude and longitude coordinates are required" });
    }
    
    console.log("✅ [CREATE BRANCH] Validation passed");

    // Verify vendor exists
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      console.log("❌ [CREATE BRANCH] Vendor not found:", vendorId);
      return res.status(404).json({ message: "Vendor not found" });
    }

    // Verify requesting user is a vendor and owns this vendor
    if (req.user.role !== "vendor" && req.user.role !== "admin") {
      return res.status(403).json({ message: "Not authorized" });
    }

    if (req.user.role === "vendor" && req.user.vendorId?.toString() !== vendorId) {
      return res.status(403).json({ message: "You can only add branches to your own vendor" });
    }

    console.log("✅ [CREATE BRANCH] Validation passed, creating branch...");

    // Create branch
    const branch = await Branch.create({
      vendorId,
      name,
      description,
      address: address || {},
      phone,
      email,
      manager,
      isPrimary: isPrimary || false,
      location: {
        type: "Point",
        coordinates: [parseFloat(longitude), parseFloat(latitude)], // GeoJSON: [lng, lat]
      },
    });

    console.log("✅ [CREATE BRANCH] Branch created:", { branchId: branch._id, name: branch.name });

    res.status(201).json({
      message: "Branch created successfully",
      data: branch,
      success: true,
    });
  } catch (err) {
    console.error("❌ [CREATE BRANCH] Error:", err);
    res.status(500).json({ message: "Server error: " + err.message });
  }
};

// ==================== GET VENDOR BRANCHES ====================
const getVendorBranches = async (req, res) => {
  try {
    const { vendorId } = req.params;

    console.log("🟢 [GET BRANCHES]", {
      vendorId,
      userId: req.user?.id,
      userRole: req.user?.role,
      userVendorId: req.user?.vendorId,
    });

    // Verify vendor exists
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      console.log("❌ [GET BRANCHES] Vendor not found:", vendorId);
      return res.status(404).json({ message: "Vendor not found" });
    }

    // Verify requesting user is a vendor and owns this vendor or is admin
    if (req.user.role !== "vendor" && req.user.role !== "admin") {
      console.log("❌ [GET BRANCHES] Not authorized - wrong role:", req.user.role);
      return res.status(403).json({ message: "Not authorized" });
    }

    if (req.user.role === "vendor" && req.user.vendorId?.toString() !== vendorId) {
      console.log("❌ [GET BRANCHES] Not authorized - wrong vendor:", {
        userVendorId: req.user.vendorId?.toString(),
        requestVendorId: vendorId,
      });
      return res.status(403).json({ message: "You can only view your own branches" });
    }

    // Get branches
    const branches = await Branch.find({ vendorId })
      .sort({ isPrimary: -1, createdAt: 1 });

    console.log("✅ [GET BRANCHES] Found", branches.length, "branches");

    res.json({
      success: true,
      data: {
        items: branches,
        total: branches.length,
      },
    });
  } catch (err) {
    console.error("❌ [GET BRANCHES] Error:", err);
    res.status(500).json({ message: "Server error: " + err.message });
  }
};

// ==================== GET SINGLE BRANCH ====================
const getBranch = async (req, res) => {
  try {
    const { vendorId, branchId } = req.params;

    console.log("🟢 [GET BRANCH] Request:", { vendorId, branchId });

    // Verify vendor exists
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({ message: "Vendor not found" });
    }

    // Find branch
    const branch = await Branch.findById(branchId);
    if (!branch || branch.vendorId?.toString() !== vendorId) {
      return res.status(404).json({ message: "Branch not found" });
    }

    // Verify requesting user
    if (req.user.role !== "vendor" && req.user.role !== "admin") {
      return res.status(403).json({ message: "Not authorized" });
    }

    if (req.user.role === "vendor" && req.user.vendorId?.toString() !== vendorId) {
      return res.status(403).json({ message: "You can only view your own branches" });
    }

    console.log("✅ [GET BRANCH] Branch found");

    res.json({
      success: true,
      data: branch,
    });
  } catch (err) {
    console.error("❌ [GET BRANCH] Error:", err);
    res.status(500).json({ message: "Server error: " + err.message });
  }
};

// ==================== UPDATE BRANCH ====================
const updateBranch = async (req, res) => {
  try {
    const { vendorId, branchId } = req.params;
    const updates = req.body;

    console.log("🟢 [UPDATE BRANCH] Request:", { vendorId, branchId });

    // Verify vendor exists
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({ message: "Vendor not found" });
    }

    // Verify requesting user is a vendor and owns this vendor
    if (req.user.role !== "vendor" && req.user.role !== "admin") {
      return res.status(403).json({ message: "Not authorized" });
    }

    if (req.user.role === "vendor" && req.user.vendorId?.toString() !== vendorId) {
      return res.status(403).json({ message: "You can only update your own branches" });
    }

    // Find branch
    const branch = await Branch.findById(branchId);
    if (!branch || branch.vendorId?.toString() !== vendorId) {
      return res.status(404).json({ message: "Branch not found" });
    }

    // Update allowed fields
    Object.assign(branch, updates);
    await branch.save();

    console.log("✅ [UPDATE BRANCH] Branch updated successfully");

    res.json({
      message: "Branch updated successfully",
      data: branch,
    });
  } catch (err) {
    console.error("❌ [UPDATE BRANCH] Error:", err);
    res.status(500).json({ message: "Server error: " + err.message });
  }
};

// ==================== DELETE BRANCH ====================
const deleteBranch = async (req, res) => {
  try {
    const { vendorId, branchId } = req.params;

    console.log("🟢 [DELETE BRANCH] Request:", { vendorId, branchId });

    // Verify vendor exists
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({ message: "Vendor not found" });
    }

    // Verify requesting user is a vendor and owns this vendor
    if (req.user.role !== "vendor" && req.user.role !== "admin") {
      return res.status(403).json({ message: "Not authorized" });
    }

    if (req.user.role === "vendor" && req.user.vendorId?.toString() !== vendorId) {
      return res.status(403).json({ message: "You can only delete your own branches" });
    }

    // Find branch
    const branch = await Branch.findById(branchId);
    if (!branch || branch.vendorId?.toString() !== vendorId) {
      return res.status(404).json({ message: "Branch not found" });
    }

    // Don't allow deleting if it's the only branch or primary branch
    const branchCount = await Branch.countDocuments({ vendorId });
    if (branchCount === 1) {
      return res.status(400).json({ message: "Cannot delete the only branch. Create another branch first." });
    }

    await Branch.findByIdAndDelete(branchId);

    console.log("✅ [DELETE BRANCH] Branch deleted successfully");

    res.json({ message: "Branch deleted successfully" });
  } catch (err) {
    console.error("❌ [DELETE BRANCH] Error:", err);
    res.status(500).json({ message: "Server error: " + err.message });
  }
};

module.exports = {
  createBranch,
  getVendorBranches,
  getBranch,
  updateBranch,
  deleteBranch,
};
