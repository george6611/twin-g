const Customer = require("../../models/Customer");
const Vendor = require("../../models/Vendor");
const Rider = require("../../models/Rider");
const Notification = require("../../models/Notifications");

// ---------------------- GET PROFILE ----------------------
const getProfile = async (req, res) => {
  try {
    console.log("🔍 getProfile called with req.user:", req.user);
    
    if (!req.user) {
      return res.status(401).json({ success: false, message: "User not authenticated" });
    }

    // Map roles to models
    const models = { customer: Customer, vendor: Vendor, rider: Rider };
    const Model = models[req.user.role];

    if (!Model) {
      return res.status(500).json({ success: false, message: "User role model not found" });
    }

    console.log(`🔍 Looking for ${req.user.role} with userId:`, req.user.userId);

    // Fetch the full user from the correct model
    let fullProfile = await Model.findOne({ userId: req.user.userId }).select("-password");

    console.log(`📦 Found profile:`, fullProfile ? "Yes" : "No");

    // If customer, include addresses
    if (req.user.role === "customer" && fullProfile) {
      // If addresses are references, you can populate them:
      // fullProfile = await fullProfile.populate("addresses");
    }

    if (!fullProfile) {
      return res.status(404).json({ success: false, message: `${req.user.role} not found` });
    }

    console.log(`✅ Returning profile data for ${req.user.role}`);
    res.status(200).json({ success: true, data: fullProfile });
  } catch (err) {
    console.error("❌ Error fetching profile:", err);
    res.status(500).json({ success: false, message: "Error fetching profile" });
  }
};


// ---------------------- UPDATE PROFILE ----------------------
const updateProfile = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "User not authenticated" });
    }

    const updates = { ...req.body };

    // Parse addresses if sent as JSON string (from FormData)
    if (updates.addresses && typeof updates.addresses === "string") {
      try {
        updates.addresses = JSON.parse(updates.addresses);
      } catch (err) {
        console.warn("Invalid JSON for addresses:", updates.addresses);
      }
    }

    // Handle uploaded image
    if (req.file) {
      updates.profileImage = `/uploads/${req.user.role}s/${req.file.filename}`;
    }

    // Allowed fields
    const allowedFields = ["name", "email", "phone", "addresses", "profileImage"];
    const filteredUpdates = Object.keys(updates)
      .filter((key) => allowedFields.includes(key))
      .reduce((obj, key) => {
        obj[key] = updates[key];
        return obj;
      }, {});

    // Update the correct model
    const models = { customer: Customer, vendor: Vendor, rider: Rider };
    const Model = models[req.user.role];

    const user = await Model.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: `${req.user.role} not found` });
    }

    // Handle default address logic
    if (filteredUpdates.addresses && Array.isArray(filteredUpdates.addresses)) {
      const hasDefault = filteredUpdates.addresses.some((a) => a.isDefault);
      if (!hasDefault && filteredUpdates.addresses.length > 0) {
        filteredUpdates.addresses[0].isDefault = true;
      }
    }

    Object.assign(user, filteredUpdates);
    const updatedUser = await user.save();

    // Optional notification
    await Notification.create({
      userId: req.user.userId,
      type: "profile_update",
      title: "Profile Updated",
      message: "Your profile details have been successfully updated.",
    });

    res.status(200).json({ success: true, message: "Profile updated successfully", data: updatedUser });
  } catch (err) {
    console.error("❌ Error updating profile:", err);
    res.status(500).json({ success: false, message: "Error updating profile" });
  }
};

module.exports = { getProfile, updateProfile };
