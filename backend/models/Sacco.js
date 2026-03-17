const mongoose = require("mongoose");

const SaccoMemberSchema = new mongoose.Schema(
  {
    fullName: { 
      type: String, 
      trim: true,
      maxlength: [100, "Member name cannot exceed 100 characters"],
      match: [/^[a-zA-Z\s\-']*$/, "Member name can only contain letters, spaces, hyphens, and apostrophes"],
    },
    phoneNumber: { 
      type: String, 
      trim: true,
      maxlength: [20, "Phone number cannot exceed 20 characters"],
      match: [/^[0-9+\-\s()]*$/, "Phone number can only contain digits, +, -, spaces, and parentheses"],
    },
    email: { 
      type: String, 
      trim: true, 
      lowercase: true,
      maxlength: [254, "Email cannot exceed 254 characters"],
      match: [/^[a-zA-Z0-9._+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, "Invalid email format"],
    },
    idNumber: { 
      type: String, 
      trim: true,
      maxlength: [50, "ID number cannot exceed 50 characters"],
      match: [/^[a-zA-Z0-9\-]*$/, "ID number can only contain letters, numbers, and hyphens"],
    },
    motorbikeModel: { 
      type: String, 
      trim: true,
      maxlength: [100, "Motorbike model cannot exceed 100 characters"],
      match: [/^[a-zA-Z0-9\s\-]*$/, "Motorbike model can only contain letters, numbers, spaces, and hyphens"],
    },
    motorbikeRegNumber: { 
      type: String, 
      trim: true,
      maxlength: [20, "Registration number cannot exceed 20 characters"],
      match: [/^[a-zA-Z0-9\-\s]*$/, "Registration number can only contain letters, numbers, hyphens, and spaces"],
    },
  },
  { _id: false }
);

const SaccoSchema = new mongoose.Schema(
  {
    name: { 
      type: String, 
      required: true, 
      trim: true, 
      unique: true,
      maxlength: [200, "Sacco name cannot exceed 200 characters"],
      match: [/^[a-zA-Z0-9\s\-'&]*$/, "Sacco name can only contain letters, numbers, spaces, and basic punctuation"],
    },
    stage: { 
      type: String, 
      required: true, 
      trim: true,
      maxlength: [100, "Stage cannot exceed 100 characters"],
    },
    
    // Officials
    chairmanName: { 
      type: String, 
      required: true, 
      trim: true,
      maxlength: [100, "Chairman name cannot exceed 100 characters"],
      match: [/^[a-zA-Z\s\-']*$/, "Chairman name can only contain letters, spaces, hyphens, and apostrophes"],
    },
    chairmanPhone: { 
      type: String, 
      required: true, 
      trim: true,
      maxlength: [20, "Chairman phone cannot exceed 20 characters"],
      match: [/^[0-9+\-\s()]*$/, "Chairman phone can only contain digits, +, -, spaces, and parentheses"],
    },
    chairmanEmail: { 
      type: String, 
      trim: true, 
      lowercase: true,
      maxlength: [254, "Chairman email cannot exceed 254 characters"],
      match: [/^[a-zA-Z0-9._+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, "Invalid email format"],
    },
    secretaryName: { 
      type: String, 
      trim: true,
      maxlength: [100, "Secretary name cannot exceed 100 characters"],
      match: [/^[a-zA-Z\s\-']*$/, "Secretary name can only contain letters, spaces, hyphens, and apostrophes"],
    },
    secretaryPhone: { 
      type: String, 
      trim: true,
      maxlength: [20, "Secretary phone cannot exceed 20 characters"],
      match: [/^[0-9+\-\s()]*$/, "Secretary phone can only contain digits, +, -, spaces, and parentheses"],
    },
    secretaryEmail: { 
      type: String, 
      trim: true, 
      lowercase: true,
      maxlength: [254, "Secretary email cannot exceed 254 characters"],
      match: [/^[a-zA-Z0-9._+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, "Invalid email format"],
    },
    treasurerName: { 
      type: String, 
      trim: true,
      maxlength: [100, "Treasurer name cannot exceed 100 characters"],
      match: [/^[a-zA-Z\s\-']*$/, "Treasurer name can only contain letters, spaces, hyphens, and apostrophes"],
    },
    treasurerPhone: { 
      type: String, 
      trim: true,
      maxlength: [20, "Treasurer phone cannot exceed 20 characters"],
      match: [/^[0-9+\-\s()]*$/, "Treasurer phone can only contain digits, +, -, spaces, and parentheses"],
    },
    treasurerEmail: { 
      type: String, 
      trim: true, 
      lowercase: true,
      maxlength: [254, "Treasurer email cannot exceed 254 characters"],
      match: [/^[a-zA-Z0-9._+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, "Invalid email format"],
    },
    
    // Status and verification
    status: {
      type: String,
      enum: ["pending", "active", "suspended", "rejected"],
      default: "pending",
      index: true,
    },
    
    // Documents (images only)
    registrationDocument: { type: String }, // URL to uploaded image
    additionalDocuments: [{ type: String }], // Array of image URLs
    
    // Members roster
    members: { type: [SaccoMemberSchema], default: [] },
    numberOfMembers: { type: Number, default: 0 },
    
    // Approval tracking
    isActive: { type: Boolean, default: false },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    approvedAt: { type: Date },
    adminNotes: { 
      type: String,
      maxlength: [1000, "Admin notes cannot exceed 1000 characters"],
    },
    
    // Creation tracking
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

// Update numberOfMembers before save
SaccoSchema.pre("save", function (next) {
  if (this.members) {
    this.numberOfMembers = this.members.length;
  }
  next();
});

module.exports = mongoose.model("Sacco", SaccoSchema);
