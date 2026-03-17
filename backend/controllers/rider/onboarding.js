const Rider = require("../../models/Rider");
const Sacco = require("../../models/Sacco");

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

const submitRiderApplication = async (req, res) => {
  try {
    const fullName = clean(req.body.fullName);
    const whatsappPhone = normalizePhone(req.body.whatsappPhone);
    const email = normalizeEmail(req.body.email);
    const stage = clean(req.body.stage);
    const saccoName = clean(req.body.sacco);

    if (!fullName || fullName.length < 3) {
      return res.status(400).json({ success: false, message: "Valid full name is required" });
    }

    if (!whatsappPhone || whatsappPhone.length < 10) {
      return res.status(400).json({ success: false, message: "Valid WhatsApp phone number is required" });
    }

    if (!stage) {
      return res.status(400).json({ success: false, message: "Stage is required" });
    }

    if (!saccoName) {
      return res.status(400).json({ success: false, message: "Sacco is required" });
    }

    const existing = await Rider.findOne({
      $or: [{ phoneNumber: whatsappPhone }, ...(email ? [{ email }] : [])],
    });

    if (existing && existing.status === "active") {
      return res.status(409).json({ success: false, message: "Rider account already active" });
    }

    if (existing) {
      existing.fullName = fullName;
      existing.phoneNumber = whatsappPhone;
      existing.email = email || existing.email;
      existing.stage = stage;
      existing.declaredSaccoName = saccoName;
      existing.source = existing.source || "website";
      existing.status = "submitted";
      existing.registrationStatus = "application_submitted";
      existing.applicationSubmittedAt = new Date();
      existing.adminNotes = "";
      await existing.save();

      return res.status(200).json({
        success: true,
        message: "Application re-submitted successfully",
        riderId: existing._id,
        status: existing.status,
      });
    }

    const rider = await Rider.create({
      fullName,
      phoneNumber: whatsappPhone,
      email: email || undefined,
      stage,
      declaredSaccoName: saccoName,
      source: "website",
      status: "submitted",
      registrationStatus: "application_submitted",
      applicationSubmittedAt: new Date(),
      completedSteps: ["application_submitted"],
    });

    return res.status(201).json({
      success: true,
      message: "Rider application submitted successfully",
      riderId: rider._id,
      status: rider.status,
    });
  } catch (error) {
    console.error("Submit rider application error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

const uploadOnboardingDocuments = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?._id;
    const rider = await Rider.findOne({ userId });

    if (!rider) {
      return res.status(404).json({ success: false, message: "Rider profile not found" });
    }

    if (rider.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "Rider must be in pending status before uploading onboarding documents",
      });
    }

    const drivingLicenseFile = req.files?.drivingLicense?.[0];
    const insuranceFile = req.files?.validInsurance?.[0];
    const saccoProofFile = req.files?.saccoProof?.[0];

    if (!drivingLicenseFile || !insuranceFile || !saccoProofFile) {
      return res.status(400).json({
        success: false,
        message: "Driving license, valid insurance, and sacco proof are required",
      });
    }

    rider.onboardingDocuments = {
      drivingLicenseUrl: drivingLicenseFile.path || drivingLicenseFile.filename,
      validInsuranceUrl: insuranceFile.path || insuranceFile.filename,
      saccoProofUrl: saccoProofFile.path || saccoProofFile.filename,
      uploadedAt: new Date(),
    };

    rider.registrationStatus = "documents_submitted";
    if (!rider.completedSteps.includes("documents")) {
      rider.completedSteps.push("documents");
    }

    let sacco = null;
    if (rider.saccoId) {
      sacco = await Sacco.findById(rider.saccoId);
    }

    if (!sacco && rider.declaredSaccoName) {
      sacco = await Sacco.findOne({
        name: { $regex: new RegExp(`^${rider.declaredSaccoName}$`, "i") },
        isActive: true,
      });
      if (sacco) rider.saccoId = sacco._id;
    }

    const isMemberMatch = riderMatchesSaccoRoster(rider, sacco);

    if (isMemberMatch) {
      rider.status = "active";
      rider.isVerified = true;
      rider.registrationStatus = "verified";
      rider.activatedAt = new Date();
      if (!rider.completedSteps.includes("profile_complete")) {
        rider.completedSteps.push("profile_complete");
      }
    } else {
      rider.status = "pending";
      rider.registrationStatus = "pending_verification";
    }

    await rider.save();

    return res.json({
      success: true,
      message: isMemberMatch
        ? "Documents verified and rider is now active"
        : "Documents received. Awaiting sacco roster verification",
      rider: {
        id: rider._id,
        status: rider.status,
        registrationStatus: rider.registrationStatus,
      },
    });
  } catch (error) {
    console.error("Upload rider onboarding documents error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

module.exports = {
  submitRiderApplication,
  uploadOnboardingDocuments,
};
