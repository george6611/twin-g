// controllers/riderProfileController.js
const Rider = require("../../models/Rider");

// 🧩 Helper to update registrationStatus & completedSteps
const updateRegistrationProgress = (rider, step) => {
  if (!rider.completedSteps.includes(step)) {
    rider.completedSteps.push(step);
  }

  switch (step) {
    case "vehicle_info":
      rider.registrationStatus = "vehicle_info_submitted";
      break;
    case "documents":
      rider.registrationStatus = "documents_submitted";
      break;
    case "profile_complete":
      rider.registrationStatus = "profile_complete";
      break;
    default:
      break;
  }
};

// 🧩 Update Vehicle Info
const updateVehicleInfo = async (req, res) => {
  const userId = req.user.id; // Assuming auth middleware sets req.user
  const { vehicleType, vehicleRegNumber, vehicleImage, saccoId } = req.body;

  try {
    const rider = await Rider.findOne({ userId });
    if (!rider) return res.status(404).json({ message: "Rider profile not found" });

    // Update fields only if provided
    if (vehicleType) rider.vehicleType = vehicleType.toLowerCase();
    if (vehicleRegNumber) rider.vehicleRegNumber = vehicleRegNumber;
    if (vehicleImage) rider.vehicleImage = vehicleImage;
    if (saccoId) rider.saccoId = saccoId;

    // Update registration progress
    updateRegistrationProgress(rider, "vehicle_info");

    await rider.save();
    res.json({ message: "Vehicle info updated", rider });
  } catch (err) {
    console.error("Error updating vehicle info:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// 🧩 Upload / Update Documents
const updateDocuments = async (req, res) => {
  const userId = req.user.id;
  const { documents } = req.body; // array of { type, url }

  try {
    const rider = await Rider.findOne({ userId });
    if (!rider) return res.status(404).json({ message: "Rider profile not found" });

    if (!Array.isArray(documents) || documents.length === 0)
      return res.status(400).json({ message: "Documents array required" });

    // Merge or overwrite existing documents
    documents.forEach((doc) => {
      const index = rider.documents.findIndex((d) => d.type === doc.type);
      if (index > -1) {
        rider.documents[index].url = doc.url;
        rider.documents[index].verified = false; // reset verification if updated
      } else {
        rider.documents.push({ ...doc, verified: false });
      }
    });

    // Update registration progress
    updateRegistrationProgress(rider, "documents");

    await rider.save();
    res.json({ message: "Documents updated", rider });
  } catch (err) {
    console.error("Error updating documents:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// 🧩 Update Personal Profile & Bank Info
const updateProfile = async (req, res) => {
  const userId = req.user.id;
  const {
    profileImage,
    dateOfBirth,
    bankName,
    bankAccountNumber,
    emergencyContactName,
    emergencyContactPhone,
  } = req.body;

  try {
    const rider = await Rider.findOne({ userId });
    if (!rider) return res.status(404).json({ message: "Rider profile not found" });

    // Update only provided fields
    if (profileImage) rider.profileImage = profileImage;
    if (dateOfBirth) rider.dateOfBirth = dateOfBirth;
    if (bankName) rider.bankName = bankName;
    if (bankAccountNumber) rider.bankAccountNumber = bankAccountNumber;
    if (emergencyContactName) rider.emergencyContactName = emergencyContactName;
    if (emergencyContactPhone) rider.emergencyContactPhone = emergencyContactPhone;

    // Update registration progress
    updateRegistrationProgress(rider, "profile_complete");

    await rider.save();
    res.json({ message: "Personal profile updated", rider });
  } catch (err) {
    console.error("Error updating personal profile:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// 🧩 Get Rider Profile
const getProfile = async (req, res) => {
  const userId = req.user.id;

  try {
    const rider = await Rider.findOne({ userId }).populate("saccoId", "name");
    if (!rider) return res.status(404).json({ message: "Rider profile not found" });

    res.json({ rider });
  } catch (err) {
    console.error("Error fetching rider profile:", err);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  updateVehicleInfo,
  updateDocuments,
  updateProfile,
  getProfile,
};
