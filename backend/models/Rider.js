const mongoose = require("mongoose");

const RiderSchema = new mongoose.Schema(
  {
    // Link to the user account
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", unique: true, sparse: true },

    // Vehicle info
    vehicleType: { type: String, enum: ["bike", "car", "other"], default: "bike" },
    vehicleNumber: { 
      type: String, 
      maxlength: [20, "Vehicle number cannot exceed 20 characters"],
      match: [/^[a-zA-Z0-9\-\s]*$/, "Vehicle number can only contain letters, numbers, hyphens, and spaces"],
    },
    vehicleRegNumber: { 
      type: String,
      maxlength: [20, "Vehicle registration number cannot exceed 20 characters"],
      match: [/^[a-zA-Z0-9\-\s]*$/, "Vehicle registration number can only contain letters, numbers, hyphens, and spaces"],
    },
    motorbikeModel: { 
      type: String,
      maxlength: [100, "Motorbike model cannot exceed 100 characters"],
      match: [/^[a-zA-Z0-9\s\-]*$/, "Motorbike model can only contain letters, numbers, spaces, and hyphens"],
    },
    vehicleImage: { type: String },

    // Rider official documents
    licenseNumber: { 
      type: String,
      maxlength: [50, "License number cannot exceed 50 characters"],
      match: [/^[a-zA-Z0-9\-]*$/, "License number can only contain letters, numbers, and hyphens"],
    },
    nationalId: { 
      type: String,
      maxlength: [50, "National ID cannot exceed 50 characters"],
      match: [/^[a-zA-Z0-9\-]*$/, "National ID can only contain letters, numbers, and hyphens"],
    },
    documents: [
      {
        type: { type: String }, // e.g., "Insurance", "Background Check"
        url: String,
        verified: { type: Boolean, default: false },
      },
    ],

    // Profile info
    fullName: { 
      type: String,
      maxlength: [100, "Full name cannot exceed 100 characters"],
      match: [/^[a-zA-Z\s\-']*$/, "Full name can only contain letters, spaces, hyphens, and apostrophes"],
    },
    profileImage: { type: String },
    phoneNumber: { 
      type: String, 
      required: true,
      maxlength: [20, "Phone number cannot exceed 20 characters"],
      match: [/^[0-9+\-\s()]*$/, "Phone number can only contain digits, +, -, spaces, and parentheses"],
    },
    email: { 
      type: String,
      maxlength: [254, "Email cannot exceed 254 characters"],
      match: [/^[a-zA-Z0-9._+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, "Invalid email format"],
      lowercase: true,
    },
    stage: { type: String },
    source: { type: String, enum: ["website", "admin", "mobile"], default: "website" },
    declaredSaccoName: { 
      type: String,
      maxlength: [200, "Sacco name cannot exceed 200 characters"],
    },
    dateOfBirth: { type: Date },

    // Employment / affiliation
    saccoId: { type: mongoose.Schema.Types.ObjectId, ref: "Sacco" }, // Rider belongs to a Sacco
    dateJoined: { type: Date, default: Date.now },

    // Real-time tracking
    currentLocation: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], default: [0, 0] }, // [longitude, latitude]
    },
    onlineSince: { type: Date },
    availabilityStatus: { type: String, enum: ["available", "busy", "offline"], default: "offline" },
    shift: {
      start: { type: Date },
      end: { type: Date },
    },

    // Performance metrics
    rating: { type: Number, default: 0 },
    completedDeliveries: { type: Number, default: 0 },
    cancelledDeliveries: { type: Number, default: 0 },
    totalEarnings: { type: Number, default: 0 },
    earningsHistory: [{ type: mongoose.Schema.Types.ObjectId, ref: "Transaction" }],
    payoutHistory: [{ type: mongoose.Schema.Types.ObjectId, ref: "Transaction" }],

    // Delivery assignments
    deliveries: [{ type: mongoose.Schema.Types.ObjectId, ref: "Delivery" }],

    // Safety / emergency
    emergencyContactName: { 
      type: String,
      maxlength: [100, "Emergency contact name cannot exceed 100 characters"],
      match: [/^[a-zA-Z\s\-']*$/, "Emergency contact name can only contain letters, spaces, hyphens, and apostrophes"],
    },
    emergencyContactPhone: { 
      type: String,
      maxlength: [20, "Emergency contact phone cannot exceed 20 characters"],
      match: [/^[0-9+\-\s()]*$/, "Emergency contact phone can only contain digits, +, -, spaces, and parentheses"],
    },

    // Bank info (for payouts)
    bankName: { 
      type: String,
      maxlength: [100, "Bank name cannot exceed 100 characters"],
    },
    bankAccountNumber: { 
      type: String,
      maxlength: [50, "Bank account number cannot exceed 50 characters"],
      match: [/^[a-zA-Z0-9\-]*$/, "Bank account number can only contain letters, numbers, and hyphens"],
    },

    // Account status
    isVerified: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ["submitted", "pending", "active", "suspended", "rejected"],
      default: "submitted",
      index: true,
    },
    adminNotes: { 
      type: String,
      maxlength: [1000, "Admin notes cannot exceed 1000 characters"],
    },
    applicationSubmittedAt: { type: Date },
    pendingAt: { type: Date },
    activatedAt: { type: Date },
    generatedPasswordSetAt: { type: Date },

    onboardingDocuments: {
      drivingLicenseUrl: { type: String },
      validInsuranceUrl: { type: String },
      saccoProofUrl: { type: String },
      uploadedAt: { type: Date },
      verified: { type: Boolean, default: false },
      verifiedAt: { type: Date },
      verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    },

    // Progressive registration tracking
    registrationStatus: {
      type: String,
      enum: [
        "basic_info_submitted",
        "application_submitted",
        "vehicle_info_submitted",
        "documents_submitted",
        "profile_complete",
        "pending_verification",
        "verified",
        "rejected"
      ],
      default: "basic_info_submitted"
    },
    completedSteps: [{ type: String }] // optional, tracks completed steps like ["basic_info", "vehicle_info"]
  },
  { timestamps: true }
);

// Enable geospatial queries for real-time tracking
RiderSchema.index({ currentLocation: "2dsphere" });

module.exports = mongoose.model("Rider", RiderSchema);
