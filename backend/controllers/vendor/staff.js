const User = require("../../models/User");
const Vendor = require("../../models/Vendor");
const Branch = require("../../models/Branch");
const Staff = require("../../models/Staff");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

// ==================== CREATE STAFF ====================
const createStaff = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { name, email, password, branchId } = req.body;

    console.log("🟢 [CREATE STAFF] Request:", { name, email, branchId });

    // Validate input
    if (!name || !email || !password || !branchId) {
      return res.status(400).json({ success: false, error: "Name, email, password, and branchId are required" });
    }

    // Verify vendor exists
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({ message: "Vendor not found" });
    }

    // Verify requesting user is a vendor and owns this vendor
    if (req.user.role !== "vendor" && req.user.role !== "admin") {
      return res.status(403).json({ success: false, error: "Not authorized" });
    }

    if (req.user.role === "vendor" && req.user.vendorId?.toString() !== vendorId) {
      return res.status(403).json({ success: false, error: "You can only add staff to your own vendor" });
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, error: "Email already exists" });
    }

    // Validate branchId format
    if (!mongoose.Types.ObjectId.isValid(branchId)) {
      return res.status(400).json({ success: false, error: "Invalid branchId format" });
    }

    // Verify branch exists and belongs to this vendor
    const branch = await Branch.findOne({ _id: branchId, vendorId });
    if (!branch) {
      return res.status(404).json({ success: false, error: "Branch not found or does not belong to your vendor" });
    }

    console.log("✅ [CREATE STAFF] Validation passed, creating user...");

    // Create staff user
    const staffUser = await User.create({
      name,
      email,
      password,
      phone: email, // Use email as phone (unique constraint)
      role: "vendor_staff",
      vendorId: vendor._id,
      branchId: new mongoose.Types.ObjectId(branchId),
      isActive: true,
      isVerified: false,
    });

    console.log("✅ [CREATE STAFF] User created:", { userId: staffUser._id, email: staffUser.email });

    // Create Staff record with specialized attributes
    const staffRecord = await Staff.create({
      userId: staffUser._id,
      vendorId: vendor._id,
      branchId: new mongoose.Types.ObjectId(branchId),
      position: "Staff",
      staffLevel: "junior",
      permissions: ["manage_orders", "view_reports"],
      assignedDate: new Date(),
      isActive: true,
    });

    console.log("✅ [CREATE STAFF] Staff record created:", { staffId: staffRecord._id });

    // Increment branch staffCount
    await Branch.findByIdAndUpdate(branchId, { $inc: { staffCount: 1 } });

    console.log("✅ [CREATE STAFF] Branch staffCount incremented");

    // Return staff info (without password)
    const staffInfo = {
      id: staffRecord._id,
      userId: staffUser._id,
      name: staffUser.name,
      email: staffUser.email,
      role: staffUser.role,
      position: staffRecord.position,
      staffLevel: staffRecord.staffLevel,
      vendorId: staffRecord.vendorId,
      branchId: staffRecord.branchId,
      isActive: staffRecord.isActive,
      permissions: staffRecord.permissions,
      createdAt: staffRecord.createdAt,
    };

    res.status(201).json({
      success: true,
      message: "Staff member created successfully",
      data: staffInfo,
    });
  } catch (err) {
    console.error("❌ [CREATE STAFF] Error:", err);
    res.status(500).json({ success: false, error: "Server error: " + err.message });
  }
};

// ==================== GET VENDOR STAFF ====================
const getVendorStaff = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    console.log("🟢 [GET STAFF] Request for vendorId:", vendorId);

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
      return res.status(403).json({ message: "You can only view your own staff" });
    }

    // Get staff records from Staff model with User details
    const skip = (page - 1) * limit;
    const staffRecords = await Staff.find({
      vendorId: new mongoose.Types.ObjectId(vendorId),
    })
      .populate("userId", "name email phone isActive")
      .populate("branchId", "name")
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await Staff.countDocuments({
      vendorId: new mongoose.Types.ObjectId(vendorId),
    });

    console.log("✅ [GET STAFF] Found", staffRecords.length, "staff members");

    // Transform to include both staff and user details
    const staffWithDetails = staffRecords.map((staff) => ({
      id: staff._id,
      staffId: staff._id,
      userId: staff.userId._id,
      name: staff.userId.name,
      email: staff.userId.email,
      phone: staff.userId.phone,
      role: "vendor_staff",
      position: staff.position,
      staffLevel: staff.staffLevel,
      branchName: staff.branchId?.name || "",
      branch: staff.branchId?.name || "",
      isActive: staff.isActive,
      permissions: staff.permissions,
      createdAt: staff.createdAt,
    }));

    res.json({
      success: true,
      data: {
        items: staffWithDetails,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (err) {
    console.error("❌ [GET STAFF] Error:", err);
    res.status(500).json({ message: "Server error: " + err.message });
  }
};

// ==================== UPDATE STAFF ====================
const updateStaff = async (req, res) => {
  try {
    const { vendorId, staffId } = req.params;
    const { name, isActive } = req.body;

    console.log("🟢 [UPDATE STAFF] Request for staffId:", staffId);

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
      return res.status(403).json({ message: "You can only update your own staff" });
    }

    // Find staff
    const staff = await User.findById(staffId);
    if (!staff || staff.role !== "vendor_staff" || staff.vendorId?.toString() !== vendorId) {
      return res.status(404).json({ message: "Staff member not found" });
    }

    // Update allowed fields
    if (name) staff.name = name;
    if (isActive !== undefined) staff.isActive = isActive;

    await staff.save();

    console.log("✅ [UPDATE STAFF] Staff updated successfully");

    res.json({
      message: "Staff updated successfully",
      staff: {
        id: staff._id,
        name: staff.name,
        email: staff.email,
        role: staff.role,
        isActive: staff.isActive,
      },
    });
  } catch (err) {
    console.error("❌ [UPDATE STAFF] Error:", err);
    res.status(500).json({ message: "Server error: " + err.message });
  }
};

// ==================== DELETE/DEACTIVATE STAFF ====================
const deactivateStaff = async (req, res) => {
  try {
    const { vendorId, staffId } = req.params;

    console.log("🟢 [DEACTIVATE STAFF] Request for staffId:", staffId);

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
      return res.status(403).json({ message: "You can only deactivate your own staff" });
    }

    // Find staff record
    const staff = await Staff.findOne({ _id: staffId, vendorId })
      .populate("userId", "name email");

    if (!staff) {
      return res.status(404).json({ message: "Staff member not found" });
    }

    // Deactivate staff record
    staff.isActive = false;
    await staff.save();

    // Deactivate associated user
    await User.findByIdAndUpdate(staff.userId._id, { isActive: false });

    // Decrement branch staffCount
    await Branch.findByIdAndUpdate(staff.branchId, { $inc: { staffCount: -1 } });

    console.log("✅ [DEACTIVATE STAFF] Staff deactivated successfully");

    res.json({
      message: "Staff member deactivated",
      staff: {
        id: staff._id,
        name: staff.userId.name,
        email: staff.userId.email,
        isActive: staff.isActive,
      },
    });
  } catch (err) {
    console.error("❌ [DEACTIVATE STAFF] Error:", err);
    res.status(500).json({ message: "Server error: " + err.message });
  }
};

module.exports = {
  createStaff,
  getVendorStaff,
  updateStaff,
  deactivateStaff,
};
