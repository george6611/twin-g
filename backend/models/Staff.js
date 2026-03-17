const mongoose = require("mongoose");

const StaffSchema = new mongoose.Schema(
  {
    // Reference to User account (auth/identity)
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    // Vendor & Branch assignment
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      required: true,
      index: true,
    },

    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      required: true,
      index: true,
    },

    // Staff details
    position: {
      type: String,
      default: "Staff",
    },

    staffLevel: {
      type: String,
      enum: ["junior", "senior", "manager", "supervisor"],
      default: "junior",
    },

    // Permissions/Capabilities
    permissions: [
      {
        type: String,
        enum: [
          "manage_orders",
          "manage_inventory",
          "manage_staff",
          "view_reports",
          "access_branch_settings",
          "manage_deliveries",
          "handle_returns",
        ],
      },
    ],

    // Assignment tracking
    assignedDate: {
      type: Date,
      default: Date.now,
    },

    // Status
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    // Performance metrics
    totalOrdersHandled: { type: Number, default: 0 },
    performanceRating: { type: Number, min: 0, max: 5, default: 0 },
    notes: String,
  },
  { timestamps: true }
);

// Indexes for common queries
StaffSchema.index({ vendorId: 1, branchId: 1 });
StaffSchema.index({ vendorId: 1, staffLevel: 1 });
StaffSchema.index({ branchId: 1, isActive: 1 });

module.exports = mongoose.model("Staff", StaffSchema);
