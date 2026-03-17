const Sacco = require("../../models/Sacco");
const Rider = require("../../models/Rider");
const User = require("../../models/User");
const sendNotification = require("../../utils/notifyUtils");
const path = require("path");

function clean(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizePhone(phone) {
  return clean(phone).replace(/\s+/g, "");
}

function normalizeEmail(email) {
  return clean(email).toLowerCase();
}

// Helper: Create or update rider for sacco official
async function createOfficialAsRider(officialData, sacco) {
  const { fullName, phoneNumber, email, position } = officialData;

  if (!fullName || !phoneNumber) return null;

  try {
    // Check if rider already exists
    let rider = await Rider.findOne({ phoneNumber });

    if (!rider) {
      // Create new rider
      rider = await Rider.create({
        fullName,
        phoneNumber,
        email: email || undefined,
        stage: sacco.stage,
        declaredSaccoName: sacco.name,
        saccoId: sacco._id,
        status: "submitted",
        source: "admin",
        applicationSubmittedAt: new Date(),
      });

      // Create user account for the rider
      const tempPassword = `TG${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      const user = await User.create({
        name: fullName,
        phone: phoneNumber,
        email: email || undefined,
        password: tempPassword,
        role: "rider",
        isActive: true,
        riderId: rider._id,
      });

      rider.userId = user._id;
      await rider.save();

      // Send notification
      await sendNotification({
        recipientId: user._id,
        userType: "rider",
        title: `Registered as ${sacco.name} ${position}`,
        message: `You have been registered as the ${position} of ${sacco.name} sacco. Login with phone ${phoneNumber}. Temporary password: ${tempPassword}. Please upload your documents to complete registration.`,
        type: "profile_update",
        relatedId: sacco._id,
        relatedModel: "Sacco",
      });

      console.log(`📲 SMS QUEUED for ${position}:`, {
        to: phoneNumber,
        message: `Twin-G: You're registered as ${position} of ${sacco.name}. Login: ${phoneNumber}. Password: ${tempPassword}`,
      });

      return { rider, tempPassword };
    } else {
      // Update existing rider's sacco
      if (!rider.saccoId) {
        rider.saccoId = sacco._id;
        rider.declaredSaccoName = sacco.name;
        await rider.save();
      }
      return { rider, tempPassword: null };
    }
  } catch (error) {
    console.error(`Error creating rider for ${position}:`, error);
    return null;
  }
}

// Helper: Sync officials to member roster
async function syncOfficialsToRoster(sacco) {
  const officials = [];

  // Chairman
  if (sacco.chairmanName && sacco.chairmanPhone) {
    officials.push({
      fullName: sacco.chairmanName,
      phoneNumber: sacco.chairmanPhone,
      email: sacco.chairmanEmail,
      idNumber: "", // Will be filled when they complete profile
      motorbikeModel: "",
      motorbikeRegNumber: "",
    });
  }

  // Secretary
  if (sacco.secretaryName && sacco.secretaryPhone) {
    officials.push({
      fullName: sacco.secretaryName,
      phoneNumber: sacco.secretaryPhone,
      email: sacco.secretaryEmail,
      idNumber: "",
      motorbikeModel: "",
      motorbikeRegNumber: "",
    });
  }

  // Treasurer
  if (sacco.treasurerName && sacco.treasurerPhone) {
    officials.push({
      fullName: sacco.treasurerName,
      phoneNumber: sacco.treasurerPhone,
      email: sacco.treasurerEmail,
      idNumber: "",
      motorbikeModel: "",
      motorbikeRegNumber: "",
    });
  }

  // Add officials to roster if not already present
  for (const official of officials) {
    const exists = sacco.members.some(
      (m) => normalizePhone(m.phoneNumber) === normalizePhone(official.phoneNumber)
    );
    if (!exists) {
      sacco.members.push(official);
    }
  }

  return officials.length;
}

// List all saccos with optional status filter
const listSaccos = async (req, res) => {
  try {
    const { status } = req.query;
    
    const query = {};
    if (status && status !== "all") {
      query.status = status;
    }

    const saccos = await Sacco.find(query)
      .populate("createdBy", "name email")
      .populate("approvedBy", "name email")
      .sort({ createdAt: -1 });

    return res.json({ success: true, count: saccos.length, saccos });
  } catch (error) {
    console.error("List saccos error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// Get single sacco by ID with full details
const getSaccoById = async (req, res) => {
  try {
    const { saccoId } = req.params;
    
    const sacco = await Sacco.findById(saccoId)
      .populate("createdBy", "name email")
      .populate("approvedBy", "name email");

    if (!sacco) {
      return res.status(404).json({ success: false, message: "Sacco not found" });
    }

    // Calculate what's missing for approval
    const missingFields = [];
    if (!sacco.secretaryName) missingFields.push("Secretary name");
    if (!sacco.treasurerName) missingFields.push("Treasurer name");
    if (!sacco.registrationDocument) missingFields.push("Registration document");
    // Note: Officials count as members, so roster is never empty if officials are set

    return res.json({ 
      success: true, 
      sacco,
      missingFields,
      canApprove: missingFields.length === 0,
    });
  } catch (error) {
    console.error("Get sacco by id error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// Register new sacco (basic info only)
const registerSacco = async (req, res) => {
  try {
    const name = clean(req.body.name);
    const stage = clean(req.body.stage);
    const chairmanName = clean(req.body.chairmanName);
    const chairmanPhone = normalizePhone(req.body.chairmanPhone);
    const chairmanEmail = normalizeEmail(req.body.chairmanEmail);

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
      status: "pending",
      createdBy: req.user.userId,
      members: [
        {
          fullName: chairmanName,
          phoneNumber: chairmanPhone,
          email: chairmanEmail || "",
          idNumber: "",
          motorbikeModel: "",
          motorbikeRegNumber: "",
        },
      ],
    });

    // Create chairman as rider
    const chairmanResult = await createOfficialAsRider(
      {
        fullName: chairmanName,
        phoneNumber: chairmanPhone,
        email: chairmanEmail,
        position: "Chairman",
      },
      sacco
    );

    const response = {
      success: true,
      message: "Sacco registered successfully. Chairman added to roster and created as rider.",
      sacco,
    };

    if (chairmanResult?.tempPassword) {
      response.chairmanCredentials = {
        phone: chairmanPhone,
        temporaryPassword: chairmanResult.tempPassword,
      };
    }

    return res.status(201).json(response);
  } catch (error) {
    console.error("Register sacco error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// Update sacco details (officials, members)
const updateSaccoDetails = async (req, res) => {
  try {
    const { saccoId } = req.params;
    const sacco = await Sacco.findById(saccoId);

    if (!sacco) {
      return res.status(404).json({ success: false, message: "Sacco not found" });
    }

    const newOfficials = [];

    // Update basic info
    if (req.body.name) sacco.name = clean(req.body.name);
    if (req.body.stage) sacco.stage = clean(req.body.stage);

    // Update officials
    if (req.body.chairmanName) sacco.chairmanName = clean(req.body.chairmanName);
    if (req.body.chairmanPhone) sacco.chairmanPhone = normalizePhone(req.body.chairmanPhone);
    if (req.body.chairmanEmail) sacco.chairmanEmail = normalizeEmail(req.body.chairmanEmail);

    // Track new secretary
    const isNewSecretary = !sacco.secretaryName && req.body.secretaryName;
    if (req.body.secretaryName) sacco.secretaryName = clean(req.body.secretaryName);
    if (req.body.secretaryPhone) sacco.secretaryPhone = normalizePhone(req.body.secretaryPhone);
    if (req.body.secretaryEmail) sacco.secretaryEmail = normalizeEmail(req.body.secretaryEmail);

    // Track new treasurer
    const isNewTreasurer = !sacco.treasurerName && req.body.treasurerName;
    if (req.body.treasurerName) sacco.treasurerName = clean(req.body.treasurerName);
    if (req.body.treasurerPhone) sacco.treasurerPhone = normalizePhone(req.body.treasurerPhone);
    if (req.body.treasurerEmail) sacco.treasurerEmail = normalizeEmail(req.body.treasurerEmail);

    // Update members if provided
    if (Array.isArray(req.body.members)) {
      sacco.members = req.body.members.map((member) => ({
        fullName: clean(member.fullName),
        phoneNumber: normalizePhone(member.phoneNumber),
        email: normalizeEmail(member.email),
        idNumber: clean(member.idNumber),
        motorbikeModel: clean(member.motorbikeModel),
        motorbikeRegNumber: clean(member.motorbikeRegNumber),
      }));

      // Sync each member update to corresponding rider if exists
      for (const member of sacco.members) {
        if (!member.phoneNumber) continue;
        const rider = await Rider.findOne({ phoneNumber: member.phoneNumber });
        if (rider) {
          if (member.idNumber) rider.nationalId = member.idNumber;
          if (member.motorbikeModel) rider.motorbikeModel = member.motorbikeModel;
          if (member.motorbikeRegNumber) rider.vehicleRegNumber = member.motorbikeRegNumber;
          await rider.save();
        }
      }
    }

    if (req.body.adminNotes) sacco.adminNotes = clean(req.body.adminNotes);

    // Sync all officials to roster
    const addedCount = await syncOfficialsToRoster(sacco);

    await sacco.save();

    // Create riders for new officials
    const credentials = [];

    if (isNewSecretary && sacco.secretaryName && sacco.secretaryPhone) {
      const secretaryResult = await createOfficialAsRider(
        {
          fullName: sacco.secretaryName,
          phoneNumber: sacco.secretaryPhone,
          email: sacco.secretaryEmail,
          position: "Secretary",
        },
        sacco
      );
      if (secretaryResult?.tempPassword) {
        credentials.push({
          position: "Secretary",
          phone: sacco.secretaryPhone,
          temporaryPassword: secretaryResult.tempPassword,
        });
      }
    }

    if (isNewTreasurer && sacco.treasurerName && sacco.treasurerPhone) {
      const treasurerResult = await createOfficialAsRider(
        {
          fullName: sacco.treasurerName,
          phoneNumber: sacco.treasurerPhone,
          email: sacco.treasurerEmail,
          position: "Treasurer",
        },
        sacco
      );
      if (treasurerResult?.tempPassword) {
        credentials.push({
          position: "Treasurer",
          phone: sacco.treasurerPhone,
          temporaryPassword: treasurerResult.tempPassword,
        });
      }
    }

    const response = {
      success: true,
      message: `Sacco details updated successfully. ${addedCount} official(s) synced to roster.`,
      sacco,
    };

    if (credentials.length > 0) {
      response.newOfficialCredentials = credentials;
    }

    return res.json(response);
  } catch (error) {
    console.error("Update sacco details error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// Upload sacco documents
const uploadSaccoDocuments = async (req, res) => {
  try {
    const { saccoId } = req.params;
    const sacco = await Sacco.findById(saccoId);

    if (!sacco) {
      return res.status(404).json({ success: false, message: "Sacco not found" });
    }

    // Handle registration document (single file)
    if (req.file) {
      sacco.registrationDocument = req.file.path;
    }

    // Handle additional documents (multiple files)
    if (req.files && Array.isArray(req.files)) {
      const newDocUrls = req.files.map(file => file.path);
      sacco.additionalDocuments = [...(sacco.additionalDocuments || []), ...newDocUrls];
    }

    await sacco.save();

    return res.json({ 
      success: true, 
      message: "Documents uploaded successfully",
      sacco 
    });
  } catch (error) {
    console.error("Upload sacco documents error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// Update sacco status
const updateSaccoStatus = async (req, res) => {
  try {
    const { saccoId } = req.params;
    const targetStatus = clean(req.body.status).toLowerCase();
    const adminNotes = clean(req.body.adminNotes);

    const allowedStatuses = ["pending", "active", "suspended", "rejected"];
    if (!allowedStatuses.includes(targetStatus)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Allowed: ${allowedStatuses.join(", ")}`,
      });
    }

    const sacco = await Sacco.findById(saccoId);
    if (!sacco) {
      return res.status(404).json({ success: false, message: "Sacco not found" });
    }

    // Validate requirements for activation
    if (targetStatus === "active") {
      const missingFields = [];
      if (!sacco.secretaryName) missingFields.push("Secretary name");
      if (!sacco.treasurerName) missingFields.push("Treasurer name");
      if (!sacco.registrationDocument) missingFields.push("Registration document");
      // Note: Officials are automatically added to member roster, so we don't check for empty roster

      if (missingFields.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Cannot activate sacco. Missing: ${missingFields.join(", ")}`,
          missingFields,
        });
      }

      sacco.isActive = true;
      sacco.approvedBy = req.user.userId;
      sacco.approvedAt = new Date();
    }

    if (targetStatus === "suspended" || targetStatus === "rejected") {
      sacco.isActive = false;
    }

    sacco.status = targetStatus;
    if (adminNotes) sacco.adminNotes = adminNotes;

    await sacco.save();

    return res.json({
      success: true,
      message: `Sacco status updated to ${targetStatus.toUpperCase()}`,
      sacco: {
        id: sacco._id,
        name: sacco.name,
        status: sacco.status,
        isActive: sacco.isActive,
      },
    });
  } catch (error) {
    console.error("Update sacco status error:", error);
    return res.status(500).json({ success: false, message: error.message || "Server error" });
  }
};

// Add single member to sacco
const addSaccoMember = async (req, res) => {
  try {
    const { saccoId } = req.params;
    const sacco = await Sacco.findById(saccoId);

    if (!sacco) {
      return res.status(404).json({ success: false, message: "Sacco not found" });
    }

    const member = {
      fullName: clean(req.body.fullName),
      phoneNumber: normalizePhone(req.body.phoneNumber),
      email: normalizeEmail(req.body.email),
      idNumber: clean(req.body.idNumber),
      motorbikeModel: clean(req.body.motorbikeModel),
      motorbikeRegNumber: clean(req.body.motorbikeRegNumber),
    };

    if (!member.fullName || !member.phoneNumber || !member.idNumber) {
      return res.status(400).json({
        success: false,
        message: "fullName, phoneNumber, and idNumber are required",
      });
    }

    sacco.members.push(member);
    await sacco.save();

    // Sync to rider if one exists with matching phone
    const rider = await Rider.findOne({ phoneNumber: member.phoneNumber });
    if (rider) {
      rider.nationalId = member.idNumber || rider.nationalId;
      rider.motorbikeModel = member.motorbikeModel || rider.motorbikeModel;
      rider.vehicleRegNumber = member.motorbikeRegNumber || rider.vehicleRegNumber;
      if (!rider.saccoId) rider.saccoId = sacco._id;
      await rider.save();
    }

    return res.json({
      success: true,
      message: "Member added successfully",
      member,
      totalMembers: sacco.numberOfMembers,
    });
  } catch (error) {
    console.error("Add sacco member error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// Delete member from sacco
const deleteSaccoMember = async (req, res) => {
  try {
    const { saccoId, memberIndex } = req.params;
    const sacco = await Sacco.findById(saccoId);

    if (!sacco) {
      return res.status(404).json({ success: false, message: "Sacco not found" });
    }

    const index = parseInt(memberIndex);
    if (isNaN(index) || index < 0 || index >= sacco.members.length) {
      return res.status(400).json({ success: false, message: "Invalid member index" });
    }

    sacco.members.splice(index, 1);
    await sacco.save();

    return res.json({
      success: true,
      message: "Member removed successfully",
      totalMembers: sacco.numberOfMembers,
    });
  } catch (error) {
    console.error("Delete sacco member error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

module.exports = {
  listSaccos,
  getSaccoById,
  registerSacco,
  updateSaccoDetails,
  uploadSaccoDocuments,
  updateSaccoStatus,
  addSaccoMember,
  deleteSaccoMember,
};
