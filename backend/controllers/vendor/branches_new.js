const Branch = require("../../models/Branch");
const Vendor = require("../../models/Vendor");
const User = require("../../models/User");
const Order = require("../../models/Order");

// ==================== CREATE BRANCH ====================
exports.createBranch = async (req, res) => {
  try {
    console.log("\n🟢 [BRANCHES:CREATE] ==========================================");
    console.log("🟢 Request body:", JSON.stringify(req.body, null, 2).substring(0, 200));
    console.log("🟢 User:", req.user?.role);
    console.log("🟢 VendorId from params:", req.params.vendorId);

    const { vendorId } = req.params;
    const {
      name,
      description,
      address,
      phone,
      email,
      manager,
      latitude,
      longitude,
      isPrimary,
    } = req.body;

    // Validate
    if (!name) return res.status(400).json({ error: "Branch name required" });
    if (!latitude || !longitude) return res.status(400).json({ error: "Coordinates required" });
    if (!vendorId) return res.status(400).json({ error: "Vendor ID required" });

    // Check vendor exists
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      console.log("❌ Vendor not found:", vendorId);
      return res.status(404).json({ error: "Vendor not found" });
    }

    console.log("✅ Vendor found:", vendor.shopName);

    // Check required fields for active status
    const requiredFields = ['phone', 'email', 'manager'];
    const missingFields = [];
    
    if (!phone || !phone.trim()) missingFields.push('phone');
    if (!email || !email.trim()) missingFields.push('email');
    if (!manager || !manager.trim()) missingFields.push('manager');
    
    // Determine status based on completeness
    const isComplete = missingFields.length === 0;
    const status = isComplete ? 'active' : 'pending';
    
    console.log('📋 Branch completeness check:', {
      isComplete,
      status,
      missingFields: missingFields.length > 0 ? missingFields : 'none'
    });

    // Create branch
    const branch = new Branch({
      vendorId,
      name,
      description,
      address: address || {},
      phone,
      email,
      manager,
      status,
      isComplete,
      missingFields,
      isPrimary: isPrimary || false,
      isActive: true,
      location: {
        type: "Point",
        coordinates: [longitude, latitude],
      },
    });

    const saved = await branch.save();
    console.log("✅ [BRANCHES:CREATE] Branch saved:", saved._id);

    res.status(201).json({
      success: true,
      message: "Branch created successfully",
      data: saved,
    });
  } catch (err) {
    console.error("❌ [BRANCHES:CREATE] Error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

// ==================== GET ALL BRANCHES ====================
exports.getVendorBranches = async (req, res) => {
  try {
    console.log("\n🔵 [BRANCHES:LIST] Fetching branches for vendor:", req.params.vendorId);

    const { vendorId } = req.params;
    const branches = await Branch.find({ vendorId }).sort({ isPrimary: -1, createdAt: 1 });

    console.log("✅ Found", branches.length, "branches");

    res.json({
      success: true,
      data: {
        items: branches,
        total: branches.length,
      },
    });
  } catch (err) {
    console.error("❌ [BRANCHES:LIST] Error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

// ==================== GET SINGLE BRANCH ====================
exports.getBranch = async (req, res) => {
  try {
    const { vendorId, branchId } = req.params;
    const branch = await Branch.findOne({ _id: branchId, vendorId });

    if (!branch) {
      return res.status(404).json({ error: "Branch not found" });
    }

    res.json({ success: true, data: branch });
  } catch (err) {
    console.error("Error getting branch:", err.message);
    res.status(500).json({ error: err.message });
  }
};

// ==================== GET BRANCH STATS ====================
exports.getBranchStats = async (req, res) => {
  try {
    const { vendorId, branchId } = req.params;
    const branch = await Branch.findOne({ _id: branchId, vendorId });

    if (!branch) {
      return res.status(404).json({ error: "Branch not found" });
    }

    const staffCount = await User.countDocuments({
      vendorId,
      branchId,
      role: "vendor_staff",
      isActive: true,
    });

    const activeOrderStatuses = ["pending", "confirmed", "preparing", "ready", "picked", "in_transit"];
    const activeOrders = await Order.countDocuments({
      vendorId,
      status: { $in: activeOrderStatuses },
    });

    return res.json({
      success: true,
      data: {
        branchId,
        branchName: branch.name,
        staffCount,
        activeOrders,
        totalOrders: branch.ordersCount || 0,
        status: branch.status,
      },
    });
  } catch (err) {
    console.error("Error getting branch stats:", err.message);
    res.status(500).json({ error: err.message });
  }
};

// ==================== GET BRANCH STAFF ====================
exports.getBranchStaff = async (req, res) => {
  try {
    const { vendorId, branchId } = req.params;
    const mongoose = require('mongoose');
    const Staff = require('../../models/Staff');
    
    console.log("🟢 [GET BRANCH STAFF] Request:", { vendorId, branchId });
    
    // Validate IDs
    if (!mongoose.Types.ObjectId.isValid(vendorId) || !mongoose.Types.ObjectId.isValid(branchId)) {
      return res.status(400).json({ success: false, error: "Invalid vendorId or branchId" });
    }

    const vendorIdObj = new mongoose.Types.ObjectId(vendorId);
    const branchIdObj = new mongoose.Types.ObjectId(branchId);
    
    const branch = await Branch.findOne({ _id: branchIdObj, vendorId: vendorIdObj });

    if (!branch) {
      console.warn("❌ [GET BRANCH STAFF] Branch not found:", { branchId: branchIdObj, vendorId: vendorIdObj });
      return res.status(404).json({ success: false, error: "Branch not found" });
    }

    // Get staff records from Staff model
    const staff = await Staff.find({
      vendorId: vendorIdObj,
      branchId: branchIdObj,
    })
      .populate("userId", "name email phone isActive createdAt")
      .sort({ createdAt: -1 });

    console.log("✅ [GET BRANCH STAFF] Found", staff.length, "staff members");

    // Transform to include both staff and user details
    const staffWithDetails = staff.map((s) => ({
      id: s._id,
      staffId: s._id,
      userId: s.userId._id,
      name: s.userId.name,
      email: s.userId.email,
      phone: s.userId.phone,
      position: s.position,
      staffLevel: s.staffLevel,
      role: "vendor_staff",
      isActive: s.isActive,
      permissions: s.permissions,
      createdAt: s.createdAt,
    }));

    return res.json({
      success: true,
      data: staffWithDetails,
    });
  } catch (err) {
    console.error("❌ [GET BRANCH STAFF] Error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
};

// ==================== GET BRANCH ORDERS ====================
exports.getBranchOrders = async (req, res) => {
  try {
    const { vendorId, branchId } = req.params;
    const { limit = 10 } = req.query;

    const branch = await Branch.findOne({ _id: branchId, vendorId });
    if (!branch) {
      return res.status(404).json({ error: "Branch not found" });
    }

    // Note: Order model currently has no branchId field. Return latest vendor orders as fallback.
    const orders = await Order.find({ vendorId })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit, 10) || 10)
      .select("_id status totalAmount createdAt customerId");

    return res.json({
      success: true,
      data: orders,
    });
  } catch (err) {
    console.error("Error getting branch orders:", err.message);
    res.status(500).json({ error: err.message });
  }
};

// ==================== GET BRANCH ACTIVITY ====================
exports.getBranchActivity = async (req, res) => {
  try {
    const { vendorId, branchId } = req.params;
    const { limit = 20 } = req.query;

    const branch = await Branch.findOne({ _id: branchId, vendorId });
    if (!branch) {
      return res.status(404).json({ error: "Branch not found" });
    }

    const activity = [
      {
        type: "branch_created",
        message: `Branch \"${branch.name}\" was created`,
        timestamp: branch.createdAt,
      },
      {
        type: "branch_updated",
        message: `Branch \"${branch.name}\" was last updated`,
        timestamp: branch.updatedAt,
      },
    ]
      .filter((item) => !!item.timestamp)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, parseInt(limit, 10) || 20);

    return res.json({
      success: true,
      data: activity,
    });
  } catch (err) {
    console.error("Error getting branch activity:", err.message);
    res.status(500).json({ error: err.message });
  }
};

// ==================== UPDATE BRANCH ====================
exports.updateBranch = async (req, res) => {
  try {
    const { vendorId, branchId } = req.params;
    const branch = await Branch.findOneAndUpdate(
      { _id: branchId, vendorId },
      req.body,
      { new: true, runValidators: true }
    );

    if (!branch) {
      return res.status(404).json({ error: "Branch not found" });
    }

    res.json({ success: true, data: branch });
  } catch (err) {
    console.error("Error updating branch:", err.message);
    res.status(500).json({ error: err.message });
  }
};

// ==================== DELETE BRANCH ====================
exports.deleteBranch = async (req, res) => {
  try {
    const { vendorId, branchId } = req.params;
    const Branch = require('../../models/Branch');
    const Staff = require('../../models/Staff');
    const mongoose = require('mongoose');

    // Check if it's the only branch
    const count = await Branch.countDocuments({ vendorId });
    if (count === 1) {
      return res.status(400).json({ error: "Cannot delete the only branch" });
    }

    const branchIdObj = new mongoose.Types.ObjectId(branchId);
    const vendorIdObj = new mongoose.Types.ObjectId(vendorId);

    const branch = await Branch.findOne({ _id: branchIdObj, vendorId: vendorIdObj });

    if (!branch) {
      return res.status(404).json({ error: "Branch not found" });
    }

    console.log("🗑️  [DELETE BRANCH] Deleting branch:", branchId);

    // Get staff count to decrement from branch
    const staffToDelete = await Staff.countDocuments({
      vendorId: vendorIdObj,
      branchId: branchIdObj,
    });

    console.log("🗑️  [DELETE BRANCH] Found", staffToDelete, "staff members to delete");

    // Delete all staff associated with this branch
    const staffDeleteResult = await Staff.deleteMany({
      vendorId: vendorIdObj,
      branchId: branchIdObj,
    });

    console.log("🗑️  [DELETE BRANCH] Deleted", staffDeleteResult.deletedCount, "staff records");

    // Delete associated User records (vendor_staff)
    const User = require('../../models/User');
    const userDeleteResult = await User.deleteMany({
      vendorId: vendorIdObj,
      branchId: branchIdObj,
      role: 'vendor_staff',
    });

    console.log("🗑️  [DELETE BRANCH] Deleted", userDeleteResult.deletedCount, "user records");

    // Delete the branch itself
    const deleteResult = await Branch.findOneAndDelete({
      _id: branchIdObj,
      vendorId: vendorIdObj,
    });

    console.log("🗑️  [DELETE BRANCH] Branch deleted successfully");

    res.json({
      success: true,
      message: "Branch and associated staff deleted",
      deleted: {
        staffCount: staffDeleteResult.deletedCount,
        userCount: userDeleteResult.deletedCount,
      },
    });
  } catch (err) {
    console.error("❌ [DELETE BRANCH] Error:", err.message);
    res.status(500).json({ error: err.message });
  }
};
