const crypto = require("crypto");
const Rider = require("../../models/Rider");
const User = require("../../models/User");
const Sacco = require("../../models/Sacco");
const sendNotification = require("../../utils/notifyUtils");

function clean(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizePhone(phone) {
  return clean(phone).replace(/\s+/g, "");
}

function normalizeEmail(email) {
  return clean(email).toLowerCase();
}

function normalizeName(name) {
  return clean(name).toLowerCase();
}

function generateTemporaryPassword() {
  const token = crypto.randomBytes(6).toString("base64").replace(/[^a-zA-Z0-9]/g, "").slice(0, 6);
  return `TG${token}#${Math.floor(10 + Math.random() * 89)}`;
}

function riderMatchesSaccoRoster(rider, sacco) {
  if (!sacco || !Array.isArray(sacco.members) || sacco.members.length === 0) return false;

  const riderPhone = normalizePhone(rider.phoneNumber);
  const riderEmail = normalizeEmail(rider.email);
  const riderName = normalizeName(rider.fullName);

  return sacco.members.some((member) => {
    const memberPhone = normalizePhone(member.phoneNumber);
    const memberEmail = normalizeEmail(member.email);
    const memberName = normalizeName(member.fullName);

    return (
      (riderPhone && memberPhone && riderPhone === memberPhone) ||
      (riderEmail && memberEmail && riderEmail === memberEmail) ||
      (riderName && memberName && riderName === memberName)
    );
  });
}

async function sendPendingCredentialsNotification({ rider, tempPassword }) {
  if (!rider.userId) return;

  const loginMessage = `Twin-G rider update: your application is now pending. Login with phone ${rider.phoneNumber}. Temporary password: ${tempPassword}`;

  await sendNotification({
    recipientId: rider.userId,
    userType: "rider",
    title: "Rider onboarding moved to pending",
    message: `${loginMessage}. Upload your driving license, valid insurance, and sacco proof in the app.`,
    type: "profile_update",
    relatedId: rider._id,
    relatedModel: "Rider",
  });

  console.log("📲 SMS QUEUED (provider required):", {
    to: rider.phoneNumber,
    message: loginMessage,
  });
}

async function ensureRiderUserWithTempPassword(rider) {
  const tempPassword = generateTemporaryPassword();

  const email = normalizeEmail(rider.email);
  const fullName = clean(rider.fullName) || "Rider";

  let user = null;

  if (rider.userId) {
    user = await User.findById(rider.userId).select("+password");
  }

  if (!user) {
    user = await User.findOne({ phone: rider.phoneNumber }).select("+password");
  }

  if (!user && email) {
    user = await User.findOne({ email }).select("+password");
  }

  if (user && user.role !== "rider") {
    throw new Error("Existing account with this phone/email belongs to a different role");
  }

  if (!user) {
    user = await User.create({
      name: fullName,
      phone: rider.phoneNumber,
      email: email || undefined,
      password: tempPassword,
      role: "rider",
      isActive: true,
      riderId: rider._id,
    });
  } else {
    user.name = fullName;
    if (email) user.email = email;
    user.phone = rider.phoneNumber;
    user.password = tempPassword;
    user.isActive = true;
    user.riderId = rider._id;
    await user.save();
  }

  rider.userId = user._id;
  rider.generatedPasswordSetAt = new Date();

  return { user, tempPassword };
}

const registerSacco = async (req, res) => {
  try {
    const name = clean(req.body.name);
    const stage = clean(req.body.stage);
    const chairmanName = clean(req.body.chairmanName);
    const chairmanPhone = normalizePhone(req.body.chairmanPhone);
    const chairmanEmail = normalizeEmail(req.body.chairmanEmail);
    const members = Array.isArray(req.body.members) ? req.body.members : [];

    if (!name || !stage || !chairmanName || !chairmanPhone) {
      return res.status(400).json({
        success: false,
        message: "name, stage, chairmanName and chairmanPhone are required",
      });
    }

    const existing = await Sacco.findOne({ name: { $regex: new RegExp(`^${name}$`, "i") } });
    if (existing) {
      return res.status(409).json({ success: false, message: "Sacco already registered" });
    }

    const sacco = await Sacco.create({
      name,
      stage,
      chairmanName,
      chairmanPhone,
      chairmanEmail: chairmanEmail || undefined,
      members,
      createdBy: req.user.userId,
    });

    return res.status(201).json({ success: true, sacco });
  } catch (error) {
    console.error("Register sacco error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
const uploadRiderDocuments = async (req, res) => {
  try {
    const { riderId } = req.params;
    const rider = await Rider.findById(riderId);

    if (!rider) {
      return res.status(404).json({ success: false, message: "Rider not found" });
    }

    const profileImageFile = req.files?.profileImage?.[0];
    const drivingLicenseFile = req.files?.drivingLicense?.[0];
    const insuranceFile = req.files?.validInsurance?.[0];
    const saccoProofFile = req.files?.saccoProof?.[0];

    if (!profileImageFile && !drivingLicenseFile && !insuranceFile && !saccoProofFile) {
      return res.status(400).json({
        success: false,
        message: "At least one file (passport, driving license, insurance, or sacco proof) is required",
      });
    }

    // Initialize onboardingDocuments if it doesn't exist
    if (!rider.onboardingDocuments) {
      rider.onboardingDocuments = {};
    }

    // Update documents that were uploaded
    if (profileImageFile) {
      rider.profileImage = profileImageFile.path || profileImageFile.filename;
    }
    if (drivingLicenseFile) {
      rider.onboardingDocuments.drivingLicenseUrl = drivingLicenseFile.path || drivingLicenseFile.filename;
    }
    if (insuranceFile) {
      rider.onboardingDocuments.validInsuranceUrl = insuranceFile.path || insuranceFile.filename;
    }
    if (saccoProofFile) {
      rider.onboardingDocuments.saccoProofUrl = saccoProofFile.path || saccoProofFile.filename;
    }

    rider.onboardingDocuments.uploadedAt = new Date();

    // Update registration status
    const hasAllDocs =
      rider.onboardingDocuments.drivingLicenseUrl &&
      rider.onboardingDocuments.validInsuranceUrl &&
      rider.onboardingDocuments.saccoProofUrl;

    if (hasAllDocs) {
      rider.onboardingDocuments.verified = true;
      rider.onboardingDocuments.verifiedAt = new Date();
      rider.onboardingDocuments.verifiedBy = req.user.userId;
      rider.registrationStatus = "verified";
      if (!rider.completedSteps.includes("documents")) {
        rider.completedSteps.push("documents");
      }
    } else {
      rider.registrationStatus = "documents_submitted";
    }

    await rider.save();

    // Send notification to rider
    if (rider.userId) {
      await sendNotification({
        recipientId: rider.userId,
        userType: "rider",
        title: hasAllDocs ? "Documents uploaded and verified" : "Documents uploaded by admin",
        message: hasAllDocs
          ? "Your rider documents were uploaded by admin and marked as verified. Your account can now be activated."
          : "Your rider documents have been uploaded by admin. Remaining documents will be needed before verification.",
        type: "profile_update",
        relatedId: rider._id,
        relatedModel: "Rider",
      });
    }

    return res.json({
      success: true,
      message: "Files uploaded successfully",
      rider: {
        id: rider._id,
        profileImage: rider.profileImage,
        onboardingDocuments: rider.onboardingDocuments,
        registrationStatus: rider.registrationStatus,
      },
    });
  } catch (error) {
    console.error("Upload rider documents error:", error);
    return res.status(500).json({ success: false, message: error.message || "Server error" });
  }
};


const listSaccos = async (req, res) => {
  try {
    const saccos = await Sacco.find().sort({ createdAt: -1 });
    return res.json({ success: true, count: saccos.length, saccos });
  } catch (error) {
    console.error("List saccos error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

const createRiderByAdmin = async (req, res) => {
  try {
    const fullName = clean(req.body.fullName);
    const whatsappPhone = normalizePhone(req.body.whatsappPhone);
    const email = normalizeEmail(req.body.email);
    const stage = clean(req.body.stage);
    const saccoName = clean(req.body.sacco);

    if (!fullName || !whatsappPhone || !stage || !saccoName) {
      return res.status(400).json({
        success: false,
        message: "fullName, whatsappPhone, stage and sacco are required",
      });
    }

    const sacco = await Sacco.findOne({
      name: { $regex: new RegExp(`^${saccoName}$`, "i") },
      isActive: true,
    });

    if (!sacco) {
      return res.status(400).json({ success: false, message: "Sacco is not registered with the platform" });
    }

    let rider = await Rider.findOne({ phoneNumber: whatsappPhone });
    if (!rider && email) rider = await Rider.findOne({ email });

    if (!rider) {
      rider = await Rider.create({
        fullName,
        phoneNumber: whatsappPhone,
        email: email || undefined,
        stage,
        declaredSaccoName: sacco.name,
        saccoId: sacco._id,
        source: "admin",
        status: "submitted",
        registrationStatus: "application_submitted",
        completedSteps: ["application_submitted"],
        applicationSubmittedAt: new Date(),
      });
    } else {
      rider.fullName = fullName;
      rider.phoneNumber = whatsappPhone;
      rider.email = email || rider.email;
      rider.stage = stage;
      rider.declaredSaccoName = sacco.name;
      rider.saccoId = sacco._id;
    }

    const { tempPassword } = await ensureRiderUserWithTempPassword(rider);

    rider.status = "pending";
    rider.registrationStatus = "pending_verification";
    rider.pendingAt = new Date();
    rider.adminNotes = clean(req.body.adminNotes);

    await rider.save();
    await sendPendingCredentialsNotification({ rider, tempPassword });

    return res.status(201).json({
      success: true,
      message: "Rider created and moved to pending",
      rider: {
        id: rider._id,
        status: rider.status,
        registrationStatus: rider.registrationStatus,
      },
      credentials: {
        phone: rider.phoneNumber,
        temporaryPassword: tempPassword,
      },
    });
  } catch (error) {
    console.error("Admin create rider error:", error);
    return res.status(500).json({ success: false, message: error.message || "Server error" });
  }
};

const listRiderApplications = async (req, res) => {
  try {
    const query = {};
    if (req.query.status) query.status = clean(req.query.status);

    const riders = await Rider.find(query)
      .populate("saccoId", "name stage isActive")
      .sort({ createdAt: -1 });

    return res.json({ success: true, count: riders.length, riders });
  } catch (error) {
    console.error("List rider applications error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

const getRiderApplicationById = async (req, res) => {
  try {
    const { riderId } = req.params;
    const rider = await Rider.findById(riderId).populate("saccoId", "name stage isActive chairmanName chairmanPhone");

    if (!rider) {
      return res.status(404).json({ success: false, message: "Rider not found" });
    }

    return res.json({ success: true, rider });
  } catch (error) {
    console.error("Get rider by id error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

const assignRiderSacco = async (req, res) => {
  try {
    const { riderId } = req.params;
    const saccoId = clean(req.body.saccoId);
    const adminNotes = clean(req.body.adminNotes);

    if (!saccoId) {
      return res.status(400).json({ success: false, message: "saccoId is required" });
    }

    const rider = await Rider.findById(riderId);
    if (!rider) {
      return res.status(404).json({ success: false, message: "Rider not found" });
    }

    if (!rider.onboardingDocuments?.verified) {
      return res.status(400).json({
        success: false,
        message: "Assigning or changing sacco is only allowed after documents are verified",
      });
    }

    const sacco = await Sacco.findById(saccoId);
    if (!sacco) {
      return res.status(400).json({
        success: false,
        message: "Selected sacco is not registered",
      });
    }

    if (!["pending", "active"].includes(String(sacco.status || "").toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: "Selected sacco must be pending or active",
      });
    }

    rider.saccoId = sacco._id;
    rider.declaredSaccoName = sacco.name;
    if (adminNotes) {
      rider.adminNotes = adminNotes;
    }

    await rider.save();

    if (rider.userId) {
      await sendNotification({
        recipientId: rider.userId,
        userType: "rider",
        title: "Sacco assignment updated",
        message: `Your rider account sacco has been updated to ${sacco.name}.`,
        type: "profile_update",
        relatedId: rider._id,
        relatedModel: "Rider",
      });
    }

    return res.json({
      success: true,
      message: "Rider sacco updated successfully",
      rider: {
        id: rider._id,
        saccoId: rider.saccoId,
        declaredSaccoName: rider.declaredSaccoName,
      },
    });
  } catch (error) {
    console.error("Assign rider sacco error:", error);
    return res.status(500).json({ success: false, message: error.message || "Server error" });
  }
};

const updateRiderApplicationStatus = async (req, res) => {
  try {
    const { riderId } = req.params;
    const targetStatus = clean(req.body.status).toLowerCase();
    const adminNotes = clean(req.body.adminNotes);

    const allowedStatuses = ["submitted", "pending", "active", "suspended", "rejected"];
    if (!allowedStatuses.includes(targetStatus)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Allowed: ${allowedStatuses.join(", ")}`,
      });
    }

    const rider = await Rider.findById(riderId);
    if (!rider) {
      return res.status(404).json({ success: false, message: "Rider application not found" });
    }

    if (adminNotes) rider.adminNotes = adminNotes;

    if (targetStatus === "pending") {
      let sacco = null;
      if (rider.saccoId) {
        sacco = await Sacco.findById(rider.saccoId);
      }

      if (!sacco && rider.declaredSaccoName) {
        sacco = await Sacco.findOne({
          name: { $regex: new RegExp(`^${rider.declaredSaccoName}$`, "i") },
          isActive: true,
        });
      }

      if (!sacco) {
        return res.status(400).json({
          success: false,
          message: "Cannot move to pending: rider sacco is not registered",
        });
      }

      rider.saccoId = sacco._id;
      const { tempPassword } = await ensureRiderUserWithTempPassword(rider);

      rider.status = "pending";
      rider.registrationStatus = "pending_verification";
      rider.pendingAt = new Date();

      await rider.save();
      await sendPendingCredentialsNotification({ rider, tempPassword });

      return res.json({
        success: true,
        message: "Rider moved to pending and credentials sent",
        rider: {
          id: rider._id,
          status: rider.status,
          registrationStatus: rider.registrationStatus,
        },
        credentials: {
          phone: rider.phoneNumber,
          temporaryPassword: tempPassword,
        },
      });
    }

    if (targetStatus === "active" || targetStatus === "suspended") {
      if (!rider.saccoId) {
        return res.status(400).json({ success: false, message: "Cannot change status without a registered sacco" });
      }

      const hasRequiredDocs =
        !!rider.onboardingDocuments?.drivingLicenseUrl &&
        !!rider.onboardingDocuments?.validInsuranceUrl &&
        !!rider.onboardingDocuments?.saccoProofUrl;

      if (!hasRequiredDocs) {
        return res.status(400).json({
          success: false,
          message: "Cannot change status: required documents not uploaded",
        });
      }

      if (!rider.onboardingDocuments?.verified) {
        return res.status(400).json({
          success: false,
          message: "Cannot change status: documents not verified by admin",
        });
      }

      if (targetStatus === "active") {
        const sacco = await Sacco.findById(rider.saccoId);
        
        // Auto-add rider to sacco roster if not already present (admin has verified docs and assigned sacco)
        if (!riderMatchesSaccoRoster(rider, sacco)) {
          const newMember = {
            fullName: rider.fullName,
            phoneNumber: rider.phoneNumber,
            email: rider.email || "",
            idNumber: "",
            motorbikeModel: "",
            motorbikeRegNumber: "",
          };
          
          sacco.members.push(newMember);
          await sacco.save();
          
          console.log(`✅ Auto-added rider ${rider.fullName} to sacco ${sacco.name} roster`);
        }
      }
    }

    if (targetStatus === "active") {

      rider.status = "active";
      rider.registrationStatus = "verified";
      rider.isVerified = true;
      rider.availabilityStatus = "available";
      rider.activatedAt = new Date();

      await rider.save();

      await sendNotification({
        recipientId: rider.userId,
        userType: "rider",
        title: "Rider account activated",
        message: "Your rider account is now active. You can now receive vendor order notifications.",
        type: "profile_update",
        relatedId: rider._id,
        relatedModel: "Rider",
      });

      return res.json({
        success: true,
        message: "Rider activated successfully",
        rider: {
          id: rider._id,
          status: rider.status,
          registrationStatus: rider.registrationStatus,
        },
      });
    }

    if (targetStatus === "suspended") {
      rider.status = "suspended";
      rider.availabilityStatus = "offline";
      await rider.save();

      return res.json({
        success: true,
        message: "Rider suspended successfully",
        rider: {
          id: rider._id,
          status: rider.status,
          registrationStatus: rider.registrationStatus,
        },
      });
    }

    rider.status = targetStatus;
    if (targetStatus === "rejected") rider.registrationStatus = "rejected";
    if (targetStatus === "submitted") rider.registrationStatus = "application_submitted";

    await rider.save();

    return res.json({
      success: true,
      message: "Rider status updated",
      rider: {
        id: rider._id,
        status: rider.status,
        registrationStatus: rider.registrationStatus,
      },
    });
  } catch (error) {
    console.error("Update rider status error:", error);
    return res.status(500).json({ success: false, message: error.message || "Server error" });
  }
};

const verifyRiderDocuments = async (req, res) => {
  try {
    const { riderId } = req.params;
    const { verified, adminNotes } = req.body;

    const rider = await Rider.findById(riderId).populate("saccoId", "name members");
    if (!rider) {
      return res.status(404).json({ success: false, message: "Rider not found" });
    }

    const hasRequiredDocs =
      !!rider.onboardingDocuments?.drivingLicenseUrl &&
      !!rider.onboardingDocuments?.validInsuranceUrl &&
      !!rider.onboardingDocuments?.saccoProofUrl;

    if (!hasRequiredDocs) {
      return res.status(400).json({
        success: false,
        message: "Cannot verify: rider has not uploaded all required documents",
      });
    }

    if (!rider.saccoId) {
      return res.status(400).json({
        success: false,
        message: "Cannot verify: rider must be assigned to a sacco first",
      });
    }

    // Check if rider details match sacco roster
    const matchesSacco = riderMatchesSaccoRoster(rider, rider.saccoId);
    if (!matchesSacco) {
      return res.status(400).json({
        success: false,
        message: "Verification failed: rider details do not match sacco roster (check name, phone, email)",
      });
    }

    rider.onboardingDocuments.verified = verified !== false;
    rider.onboardingDocuments.verifiedAt = new Date();
    rider.onboardingDocuments.verifiedBy = req.user.userId;

    if (adminNotes) {
      rider.adminNotes = adminNotes;
    }

    await rider.save();

    await sendNotification({
      recipientId: rider.userId,
      userType: "rider",
      title: verified ? "Documents verified" : "Documents verification removed",
      message: verified
        ? "Your documents have been verified by admin. Your account can now be activated."
        : "Your document verification status has been updated.",
      type: "profile_update",
      relatedId: rider._id,
      relatedModel: "Rider",
    });

    return res.json({
      success: true,
      message: verified ? "Documents verified successfully" : "Verification status updated",
      rider: {
        id: rider._id,
        documentsVerified: rider.onboardingDocuments.verified,
        verifiedAt: rider.onboardingDocuments.verifiedAt,
      },
    });
  } catch (error) {
    console.error("Verify rider documents error:", error);
    return res.status(500).json({ success: false, message: error.message || "Server error" });
  }
};

const updateRiderDetails = async (req, res) => {
  try {
    const { riderId } = req.params;
    const { nationalId, motorbikeModel, vehicleRegNumber, adminNotes } = req.body;

    const rider = await Rider.findById(riderId).populate("saccoId");
    if (!rider) {
      return res.status(404).json({ success: false, message: "Rider not found" });
    }

    // Update rider fields
    if (nationalId !== undefined) rider.nationalId = clean(nationalId);
    if (motorbikeModel !== undefined) rider.motorbikeModel = clean(motorbikeModel);
    if (vehicleRegNumber !== undefined) rider.vehicleRegNumber = clean(vehicleRegNumber);
    if (adminNotes !== undefined) rider.adminNotes = clean(adminNotes);

    await rider.save();

    // Sync to sacco roster if rider is assigned to a sacco
    if (rider.saccoId) {
      const sacco = await Sacco.findById(rider.saccoId);
      if (sacco) {
        const memberIndex = sacco.members.findIndex(
          (m) => normalizePhone(m.phoneNumber) === normalizePhone(rider.phoneNumber)
        );

        if (memberIndex !== -1) {
          // Update existing member
          if (nationalId !== undefined) sacco.members[memberIndex].idNumber = rider.nationalId;
          if (motorbikeModel !== undefined) sacco.members[memberIndex].motorbikeModel = rider.motorbikeModel;
          if (vehicleRegNumber !== undefined) sacco.members[memberIndex].motorbikeRegNumber = rider.vehicleRegNumber;
          await sacco.save();
        } else {
          // Add as new member if not in roster
          sacco.members.push({
            fullName: rider.fullName,
            phoneNumber: rider.phoneNumber,
            email: rider.email || "",
            idNumber: rider.nationalId || "",
            motorbikeModel: rider.motorbikeModel || "",
            motorbikeRegNumber: rider.vehicleRegNumber || "",
          });
          await sacco.save();
        }
      }
    }

    return res.json({
      success: true,
      message: "Rider details updated successfully",
      rider: {
        id: rider._id,
        nationalId: rider.nationalId,
        motorbikeModel: rider.motorbikeModel,
        vehicleRegNumber: rider.vehicleRegNumber,
      },
    });
  } catch (error) {
    console.error("Update rider details error:", error);
    return res.status(500).json({ success: false, message: error.message || "Server error" });
  }
};

module.exports = {
  registerSacco,
  listSaccos,
  createRiderByAdmin,
  listRiderApplications,
  getRiderApplicationById,
  assignRiderSacco,
  updateRiderApplicationStatus,
  updateRiderDetails,
  verifyRiderDocuments,
  uploadRiderDocuments,
};
